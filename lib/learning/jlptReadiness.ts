import type { SupabaseClient } from "@supabase/supabase-js";
import { todayDateString } from "@/lib/os/types";

type GoalRow = {
  id: string;
  target_level: string | null;
  deadline: string | null;
  daily_minutes: number | null;
  weekly_days: number | null;
  intensity: string | null;
};

type RadarRow = {
  snapshot_date: string;
  scores: unknown;
  evidence: unknown;
};

type SkillScoreRow = {
  dimension: string;
  score: number;
  evidence: string | null;
  measured_at: string;
};

type BootLogRow = {
  boot_date: string;
  review_layer_done: boolean | null;
  input_layer_done: boolean | null;
  output_layer_done: boolean | null;
  debug_layer_done: boolean | null;
};

type QuizAttemptRow = {
  is_correct: boolean | null;
  created_at: string;
};

export type JlptReadinessRefreshResult = {
  snapshotWritten: boolean;
  readinessScore: number | null;
  paceStatus: "ahead" | "on_track" | "behind" | "no_deadline" | null;
  errors: string[];
};

export async function refreshJlptReadinessSnapshot({
  supabase,
  userId,
  snapshotDate = todayDateString(),
  source = "computed",
}: {
  supabase: SupabaseClient;
  userId: string;
  snapshotDate?: string;
  source?: "computed" | "weekly_review" | "monthly_audit" | "manual";
}): Promise<JlptReadinessRefreshResult> {
  const errors: string[] = [];
  const { data: goalData, error: goalError } = await supabase
    .from("user_goals")
    .select("id, target_level, deadline, daily_minutes, weekly_days, intensity")
    .eq("user_id", userId)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (goalError) {
    return { snapshotWritten: false, readinessScore: null, paceStatus: null, errors: [goalError.message] };
  }
  const goal = (goalData ?? null) as GoalRow | null;
  if (!goal) {
    return { snapshotWritten: false, readinessScore: null, paceStatus: null, errors };
  }

  const since = dateDaysAgo(snapshotDate, 13);
  const [radarResult, scoreResult, bootResult, quizResult] = await Promise.all([
    supabase
      .from("radar_snapshots")
      .select("snapshot_date, scores, evidence")
      .eq("user_id", userId)
      .eq("source", "computed")
      .lte("snapshot_date", snapshotDate)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("skill_scores")
      .select("dimension, score, evidence, measured_at")
      .eq("user_id", userId)
      .lte("measured_at", snapshotDate)
      .order("measured_at", { ascending: false })
      .limit(48),
    supabase
      .from("os_boot_logs")
      .select("boot_date, review_layer_done, input_layer_done, output_layer_done, debug_layer_done")
      .eq("user_id", userId)
      .gte("boot_date", since),
    supabase
      .from("quiz_attempts")
      .select("is_correct, created_at")
      .eq("user_id", userId)
      .gte("created_at", `${since}T00:00:00Z`),
  ]);

  errors.push(...resultErrors({
    radar: radarResult.error?.message,
    scores: scoreResult.error?.message,
    boot: bootResult.error?.message,
    quiz: quizResult.error?.message,
  }));

  const latestRadar = (radarResult.data ?? null) as RadarRow | null;
  const scores = mergeScores(
    numericRecord(latestRadar?.scores),
    rows<SkillScoreRow>(scoreResult.data),
  );
  const readiness = buildReadiness({
    scores,
    goal,
    bootLogs: rows<BootLogRow>(bootResult.data),
    attempts: rows<QuizAttemptRow>(quizResult.data),
    snapshotDate,
    latestRadarDate: latestRadar?.snapshot_date ?? null,
  });

  const { error: snapshotError } = await supabase
    .from("jlpt_readiness_snapshots")
    .upsert(
      {
        user_id: userId,
        user_goal_id: goal.id,
        target_level: readiness.targetLevel,
        snapshot_date: snapshotDate,
        readiness_score: readiness.readinessScore,
        vocabulary_score: readiness.vocabularyScore,
        grammar_score: readiness.grammarScore,
        reading_score: readiness.readingScore,
        listening_score: readiness.listeningScore,
        output_score: readiness.outputScore,
        consistency_score: readiness.consistencyScore,
        projected_ready_date: readiness.projectedReadyDate,
        days_until_deadline: readiness.daysUntilDeadline,
        pace_status: readiness.paceStatus,
        evidence: readiness.evidence,
        source,
      },
      { onConflict: "user_id,user_goal_id,snapshot_date,source" },
    );

  if (snapshotError) errors.push("jlpt_readiness_snapshots: " + snapshotError.message);

  if (!snapshotError && source !== "computed") {
    const event = await recordGoalEvent({
      supabase,
      userId,
      goalId: goal.id,
      eventType: "readiness_snapshot",
      title: `JLPT readiness ${readiness.readinessScore}%`,
      detail: readiness.paceLine,
      metadata: {
        source,
        target_level: readiness.targetLevel,
        pace_status: readiness.paceStatus,
        projected_ready_date: readiness.projectedReadyDate,
      },
    });
    errors.push(...event.errors);
  }

  return {
    snapshotWritten: !snapshotError,
    readinessScore: readiness.readinessScore,
    paceStatus: readiness.paceStatus,
    errors,
  };
}

export async function recordGoalEvent({
  supabase,
  userId,
  goalId,
  eventType,
  title,
  detail,
  metadata = {},
}: {
  supabase: SupabaseClient;
  userId: string;
  goalId: string | null;
  eventType:
    | "goal_created"
    | "goal_updated"
    | "plan_adjusted"
    | "phase_advanced"
    | "readiness_snapshot"
    | "weekly_reflection"
    | "monthly_audit"
    | "manual_note";
  title: string;
  detail?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean; errors: string[] }> {
  const { error } = await supabase.from("goal_events").insert({
    user_id: userId,
    user_goal_id: goalId,
    event_type: eventType,
    title,
    detail: detail ?? null,
    metadata,
  });
  return { ok: !error, errors: error ? ["goal_events: " + error.message] : [] };
}

function buildReadiness({
  scores,
  goal,
  bootLogs,
  attempts,
  snapshotDate,
  latestRadarDate,
}: {
  scores: Record<string, number>;
  goal: GoalRow;
  bootLogs: BootLogRow[];
  attempts: QuizAttemptRow[];
  snapshotDate: string;
  latestRadarDate: string | null;
}) {
  const vocabularyScore = averageOrFallback([
    scores.vocabulary_recognition,
    scores.vocabulary_production,
    scores.kanji_recognition,
  ]);
  const grammarScore = averageOrFallback([
    scores.grammar_understanding,
    scores.grammar_production,
  ]);
  const readingScore = scoreValue(scores.reading_comprehension);
  const listeningScore = scoreValue(scores.listening_comprehension);
  const outputScore = averageOrFallback([
    scores.speaking_shadowing,
    scores.writing_accuracy,
    scores.sentence_mining_retention,
  ]);
  const consistencyScore = consistencyFromEvidence(scores.output_consistency, bootLogs);
  const quizAccuracy = accuracy(attempts);
  const targetLevel = normalizeJlpt(goal.target_level);

  const readinessScore = clampScore(
    vocabularyScore * 0.22 +
    grammarScore * 0.22 +
    readingScore * 0.18 +
    listeningScore * 0.16 +
    outputScore * 0.12 +
    consistencyScore * 0.10,
  );
  const projectedReadyDate = projectedDate({
    snapshotDate,
    readinessScore,
    dailyMinutes: goal.daily_minutes ?? 45,
    weeklyDays: goal.weekly_days ?? 5,
    intensity: goal.intensity,
    quizAccuracy,
  });
  const daysUntilDeadline = goal.deadline ? dayDiff(snapshotDate, goal.deadline) : null;
  const paceStatus = paceStatusFor({
    deadline: goal.deadline,
    projectedReadyDate,
    snapshotDate,
  });
  const paceLine = paceStatus === "no_deadline"
    ? "No deadline set; projection is based on current evidence pace."
    : `Projected ready ${projectedReadyDate ?? "unknown"} vs deadline ${goal.deadline}.`;

  return {
    targetLevel,
    readinessScore,
    vocabularyScore,
    grammarScore,
    readingScore,
    listeningScore,
    outputScore,
    consistencyScore,
    projectedReadyDate,
    daysUntilDeadline,
    paceStatus,
    paceLine,
    evidence: {
      latest_radar_date: latestRadarDate,
      boot_days_14: bootLogs.filter((log) =>
        [log.review_layer_done, log.input_layer_done, log.output_layer_done, log.debug_layer_done].some(Boolean),
      ).length,
      quiz_attempts_14: attempts.length,
      quiz_accuracy_14: quizAccuracy,
      dimensions: scores,
    },
  };
}

function mergeScores(radarScores: Record<string, number>, rowsData: SkillScoreRow[]) {
  const merged = { ...radarScores };
  const seen = new Set(Object.keys(merged));
  for (const row of rowsData) {
    if (seen.has(row.dimension)) continue;
    merged[row.dimension] = row.score;
    seen.add(row.dimension);
  }
  return merged;
}

function projectedDate({
  snapshotDate,
  readinessScore,
  dailyMinutes,
  weeklyDays,
  intensity,
  quizAccuracy,
}: {
  snapshotDate: string;
  readinessScore: number;
  dailyMinutes: number;
  weeklyDays: number;
  intensity: string | null;
  quizAccuracy: number | null;
}) {
  if (readinessScore >= 90) return snapshotDate;
  const intensityBoost = intensity === "hardcore" ? 1.4 : intensity === "exam" ? 1.2 : intensity === "chill" ? 0.8 : 1;
  const accuracyBoost = quizAccuracy == null ? 1 : 0.8 + Math.max(0, quizAccuracy) / 500;
  const pointsPerWeek = Math.max(1.1, (1.4 + dailyMinutes / 45 + weeklyDays * 0.18) * intensityBoost * accuracyBoost);
  const weeks = Math.ceil((90 - readinessScore) / pointsPerWeek);
  const date = new Date(`${snapshotDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
}

function paceStatusFor({
  deadline,
  projectedReadyDate,
  snapshotDate,
}: {
  deadline: string | null;
  projectedReadyDate: string | null;
  snapshotDate: string;
}): "ahead" | "on_track" | "behind" | "no_deadline" {
  if (!deadline || !projectedReadyDate) return "no_deadline";
  const buffer = dayDiff(projectedReadyDate, deadline);
  if (buffer >= 14) return "ahead";
  if (buffer >= 0) return "on_track";
  if (dayDiff(snapshotDate, deadline) < 0) return "behind";
  return "behind";
}

function consistencyFromEvidence(outputConsistency: number | undefined, bootLogs: BootLogRow[]) {
  if (typeof outputConsistency === "number") return scoreValue(outputConsistency);
  const activeDays = bootLogs.filter((log) =>
    [log.review_layer_done, log.input_layer_done, log.output_layer_done, log.debug_layer_done].some(Boolean),
  ).length;
  return clampScore((activeDays / 14) * 100);
}

function averageOrFallback(values: Array<number | undefined>) {
  const real = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!real.length) return 0;
  return clampScore(real.reduce((sum, value) => sum + value, 0) / real.length);
}

function scoreValue(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? clampScore(value) : 0;
}

function accuracy(attempts: QuizAttemptRow[]) {
  const answered = attempts.filter((attempt) => attempt.is_correct != null);
  if (!answered.length) return null;
  return Math.round((answered.filter((attempt) => attempt.is_correct).length / answered.length) * 100);
}

function numericRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, score]) => [key, typeof score === "number" && Number.isFinite(score) ? score : null] as const)
      .filter((entry): entry is readonly [string, number] => entry[1] !== null),
  );
}

function rows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function resultErrors(values: Record<string, string | undefined>) {
  return Object.entries(values)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, message]) => `${label}: ${message}`);
}

function normalizeJlpt(value: string | null): "N5" | "N4" | "N3" | "N2" | "N1" {
  if (value === "N5" || value === "N4" || value === "N3" || value === "N2" || value === "N1") return value;
  return "N2";
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dateDaysAgo(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function dayDiff(from: string, to: string) {
  const fromTime = new Date(`${from}T00:00:00Z`).getTime();
  const toTime = new Date(`${to}T00:00:00Z`).getTime();
  if (Number.isNaN(fromTime) || Number.isNaN(toTime)) return 0;
  return Math.ceil((toTime - fromTime) / (1000 * 60 * 60 * 24));
}
