import type { SupabaseClient } from "@supabase/supabase-js";
import { todayDateString } from "@/lib/os/types";
import { refreshJlptReadinessSnapshot } from "@/lib/learning/jlptReadiness";
import { isMissingGrammarMasterySchemaError } from "@/lib/learning/grammarMastery";

type SkillDimension =
  | "vocabulary_recognition"
  | "vocabulary_production"
  | "kanji_recognition"
  | "grammar_understanding"
  | "grammar_production"
  | "reading_comprehension"
  | "listening_comprehension"
  | "speaking_shadowing"
  | "writing_accuracy"
  | "sentence_mining_retention"
  | "output_consistency"
  | "cultural_literacy";

type SkillScore = {
  dimension: SkillDimension;
  score: number;
  evidence: string;
};

type QuizAttemptRow = {
  quiz_type: string;
  is_correct: boolean | null;
  vocab_id: string | null;
  created_at: string;
};

type BootLogRow = {
  boot_date: string;
  review_layer_done: boolean | null;
  output_layer_done: boolean | null;
  anki_due_completed: number | null;
  anki_due_total: number | null;
  journal_sentences: number | null;
  talk_me_minutes: number | null;
};

type JournalRow = {
  entry_date: string;
  sentence_count: number | null;
};

type RoleplayRow = {
  task_complete: boolean | null;
  score: number | null;
  started_at: string | null;
  created_at: string | null;
};

type WeaknessRow = {
  source: string | null;
  skill_area: string | null;
  severity: string | null;
  created_at: string;
};

type DailyLessonRow = {
  lesson_date: string;
  status: string | null;
  review_cards_created: number | null;
};

type CulturalRow = {
  created_at: string;
};

type MinedSentenceRow = {
  mined_at: string;
};

type VocabFlagRow = {
  id: string;
  has_kanji: boolean | null;
};

type GrammarMasteryRadarRow = {
  mastery_score: number;
  exposure_count: number;
  production_count: number;
  correct_count: number;
  miss_count: number;
  hard_count: number;
  leech_count: number;
};

export type SkillRadarRefreshResult = {
  scoresWritten: number;
  snapshotWritten: boolean;
  errors: string[];
};

const SENTENCE_QUIZ_TYPES = new Set([
  "cloze",
  "production",
  "listening",
  "shadowing",
  "memory_sentence_rebuild",
  "memory_cloze_attack",
]);

export async function refreshSkillRadarSnapshot({
  supabase,
  userId,
  measuredAt = todayDateString(),
}: {
  supabase: SupabaseClient;
  userId: string;
  measuredAt?: string;
}): Promise<SkillRadarRefreshResult> {
  const since = dateDaysAgo(measuredAt, 13);
  const sinceIso = `${since}T00:00:00Z`;
  const errors: string[] = [];

  const [
    attemptsResult,
    logsResult,
    journalsResult,
    roleplaysResult,
    weaknessesResult,
    lessonsResult,
    culturalResult,
    minedResult,
    grammarMasteryResult,
  ] = await Promise.all([
    supabase
      .from("quiz_attempts")
      .select("quiz_type, is_correct, vocab_id, created_at")
      .eq("user_id", userId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(240),
    supabase
      .from("os_boot_logs")
      .select("boot_date, review_layer_done, output_layer_done, anki_due_completed, anki_due_total, journal_sentences, talk_me_minutes")
      .eq("user_id", userId)
      .gte("boot_date", since),
    supabase
      .from("journal_entries")
      .select("entry_date, sentence_count")
      .eq("user_id", userId)
      .gte("entry_date", since),
    supabase
      .from("roleplay_sessions")
      .select("task_complete, score, started_at, created_at")
      .eq("user_id", userId)
      .gte("started_at", sinceIso),
    supabase
      .from("weakness_events")
      .select("source, skill_area, severity, created_at")
      .eq("user_id", userId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("daily_lessons")
      .select("lesson_date, status, review_cards_created")
      .eq("user_id", userId)
      .gte("lesson_date", since),
    supabase
      .from("cultural_contents")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", sinceIso)
      .limit(60),
    supabase
      .from("mined_sentences")
      .select("mined_at")
      .eq("user_id", userId)
      .gte("mined_at", sinceIso)
      .limit(120),
    supabase
      .from("grammar_mastery")
      .select("mastery_score, exposure_count, production_count, correct_count, miss_count, hard_count, leech_count")
      .eq("user_id", userId)
      .limit(240),
  ]);

  errors.push(...resultErrors({
    attempts: attemptsResult.error?.message,
    logs: logsResult.error?.message,
    journals: journalsResult.error?.message,
    roleplays: roleplaysResult.error?.message,
    weaknesses: weaknessesResult.error?.message,
    lessons: lessonsResult.error?.message,
    cultural: culturalResult.error?.message,
    mined: minedResult.error?.message,
    grammarMastery: grammarMasteryResult.error && !isMissingGrammarMasterySchemaError(grammarMasteryResult.error)
      ? grammarMasteryResult.error.message
      : undefined,
  }));

  const attempts = rows<QuizAttemptRow>(attemptsResult.data);
  const logs = rows<BootLogRow>(logsResult.data);
  const journals = rows<JournalRow>(journalsResult.data);
  const roleplays = rows<RoleplayRow>(roleplaysResult.data);
  const weaknesses = rows<WeaknessRow>(weaknessesResult.data);
  const lessons = rows<DailyLessonRow>(lessonsResult.data);
  const cultural = rows<CulturalRow>(culturalResult.data);
  const mined = rows<MinedSentenceRow>(minedResult.data);
  const grammarMastery = isMissingGrammarMasterySchemaError(grammarMasteryResult.error)
    ? []
    : rows<GrammarMasteryRadarRow>(grammarMasteryResult.data);

  const vocabIds = Array.from(new Set(attempts.map((attempt) => attempt.vocab_id).filter((id): id is string => Boolean(id))));
  const kanjiVocabIds = await fetchKanjiVocabIds(supabase, userId, vocabIds, errors);
  const scores = buildScores({
    attempts,
    logs,
    journals,
    roleplays,
    weaknesses,
    lessons,
    cultural,
    mined,
    grammarMastery,
    kanjiVocabIds,
  });

  if (!scores.length) {
    return { scoresWritten: 0, snapshotWritten: false, errors };
  }

  const scoreRows = scores.map((score) => ({
    user_id: userId,
    dimension: score.dimension,
    score: score.score,
    evidence: score.evidence,
    source: "computed",
    measured_at: measuredAt,
  }));

  const { data: writtenScores, error: scoreError } = await supabase
    .from("skill_scores")
    .upsert(scoreRows, { onConflict: "user_id,dimension,measured_at,source" })
    .select("id");
  if (scoreError) errors.push("skill_scores: " + scoreError.message);

  const { error: snapshotError } = await supabase
    .from("radar_snapshots")
    .upsert(
      {
        user_id: userId,
        snapshot_date: measuredAt,
        source: "computed",
        scores: Object.fromEntries(scores.map((score) => [score.dimension, score.score])),
        evidence: Object.fromEntries(scores.map((score) => [score.dimension, score.evidence])),
      },
      { onConflict: "user_id,snapshot_date,source" },
    );
  if (snapshotError) errors.push("radar_snapshots: " + snapshotError.message);
  if (!snapshotError) {
    const readiness = await refreshJlptReadinessSnapshot({
      supabase,
      userId,
      snapshotDate: measuredAt,
      source: "computed",
    });
    errors.push(...readiness.errors);
  }

  return {
    scoresWritten: scoreError ? 0 : (writtenScores?.length ?? scoreRows.length),
    snapshotWritten: !snapshotError,
    errors,
  };
}

function buildScores({
  attempts,
  logs,
  journals,
  roleplays,
  weaknesses,
  lessons,
  cultural,
  mined,
  grammarMastery,
  kanjiVocabIds,
}: {
  attempts: QuizAttemptRow[];
  logs: BootLogRow[];
  journals: JournalRow[];
  roleplays: RoleplayRow[];
  weaknesses: WeaknessRow[];
  lessons: DailyLessonRow[];
  cultural: CulturalRow[];
  mined: MinedSentenceRow[];
  grammarMastery: GrammarMasteryRadarRow[];
  kanjiVocabIds: Set<string>;
}): SkillScore[] {
  return compactScores([
    scoreFromAccuracy(
      "vocabulary_recognition",
      attempts.filter((attempt) => Boolean(attempt.vocab_id) && attempt.quiz_type !== "production"),
      "vocab recognition attempts",
    ),
    scoreFromAccuracy(
      "vocabulary_production",
      attempts.filter((attempt) => Boolean(attempt.vocab_id) && attempt.quiz_type === "production"),
      "vocab production attempts",
    ),
    scoreFromAccuracy(
      "kanji_recognition",
      attempts.filter((attempt) => attempt.vocab_id != null && kanjiVocabIds.has(attempt.vocab_id)),
      "kanji vocab attempts",
    ),
    grammarUnderstandingScore(attempts, grammarMastery),
    grammarProductionScore(weaknesses, attempts, grammarMastery),
    readingScore(lessons, cultural),
    scoreFromAccuracy(
      "listening_comprehension",
      attempts.filter((attempt) => attempt.quiz_type === "listening"),
      "listening attempts",
    ),
    speakingScore(logs, roleplays, attempts),
    writingScore(journals, weaknesses),
    scoreFromAccuracy(
      "sentence_mining_retention",
      attempts.filter((attempt) => !attempt.vocab_id && SENTENCE_QUIZ_TYPES.has(attempt.quiz_type)),
      "sentence review/game attempts",
    ) ?? minedSentenceActivationScore(mined),
    outputConsistencyScore(logs, journals, roleplays),
    culturalScore(cultural, lessons),
  ]);
}

async function fetchKanjiVocabIds(
  supabase: SupabaseClient,
  userId: string,
  vocabIds: string[],
  errors: string[],
) {
  if (!vocabIds.length) return new Set<string>();
  const { data, error } = await supabase
    .from("vocabulary_items")
    .select("id, has_kanji")
    .eq("user_id", userId)
    .in("id", vocabIds.slice(0, 200));
  if (error) {
    errors.push("vocabulary_items: " + error.message);
    return new Set<string>();
  }
  return new Set(rows<VocabFlagRow>(data).filter((row) => row.has_kanji).map((row) => row.id));
}

function scoreFromAccuracy(
  dimension: SkillDimension,
  attempts: QuizAttemptRow[],
  noun: string,
): SkillScore | null {
  const answered = attempts.filter((attempt) => attempt.is_correct != null);
  if (!answered.length) return null;
  const correct = answered.filter((attempt) => attempt.is_correct).length;
  return {
    dimension,
    score: clampScore((correct / answered.length) * 100),
    evidence: `${correct}/${answered.length} ${noun}`,
  };
}

function grammarUnderstandingScore(attempts: QuizAttemptRow[], mastery: GrammarMasteryRadarRow[]): SkillScore | null {
  const quizScore = scoreFromAccuracy(
    "grammar_understanding",
    attempts.filter((attempt) => attempt.quiz_type.startsWith("weekly_") || attempt.quiz_type === "memory_grammar_duel"),
    "grammar quiz/game answers",
  );
  const masteryRows = mastery.filter((row) => row.exposure_count > 0);
  if (!masteryRows.length) return quizScore;

  const masteryAverage = average(masteryRows.map((row) => row.mastery_score));
  if (!quizScore) {
    return {
      dimension: "grammar_understanding",
      score: clampScore(masteryAverage),
      evidence: `${masteryRows.length} grammar mastery rows`,
    };
  }

  return {
    dimension: "grammar_understanding",
    score: clampScore(quizScore.score * 0.55 + masteryAverage * 0.45),
    evidence: `${quizScore.evidence} · ${masteryRows.length} mastery rows`,
  };
}

function grammarProductionScore(
  weaknesses: WeaknessRow[],
  attempts: QuizAttemptRow[],
  mastery: GrammarMasteryRadarRow[],
): SkillScore | null {
  const grammarSignals = weaknesses.filter((row) => row.skill_area === "grammar" || row.skill_area === "pragmatics");
  const productionAttempts = attempts.filter((attempt) => attempt.quiz_type === "production");
  const productionMastery = mastery.filter((row) => row.production_count > 0 || row.miss_count > 0 || row.hard_count > 0 || row.leech_count > 0);
  if (!grammarSignals.length && !productionAttempts.length && !productionMastery.length) return null;

  const productionAccuracy = accuracy(productionAttempts);
  const masteryBase = productionMastery.length ? average(productionMastery.map((row) => row.mastery_score)) : null;
  const base = productionAccuracy ?? masteryBase ?? 82;
  const penalty = severityPenalty(grammarSignals);
  return {
    dimension: "grammar_production",
    score: clampScore(base - penalty),
    evidence: `${grammarSignals.length} grammar/register weakness signals · ${productionMastery.length} mastery rows`,
  };
}

function readingScore(lessons: DailyLessonRow[], cultural: CulturalRow[]): SkillScore | null {
  const completedLessons = lessons.filter((lesson) => lesson.status === "done" || (lesson.review_cards_created ?? 0) > 0).length;
  const readingTouches = completedLessons + cultural.length;
  if (!readingTouches) return null;
  return {
    dimension: "reading_comprehension",
    score: clampScore(35 + completedLessons * 18 + cultural.length * 8),
    evidence: `${completedLessons} lesson completions · ${cultural.length} cultural reads`,
  };
}

function speakingScore(logs: BootLogRow[], roleplays: RoleplayRow[], attempts: QuizAttemptRow[]): SkillScore | null {
  const talkMinutes = logs.reduce((sum, log) => sum + (log.talk_me_minutes ?? 0), 0);
  const completedRoleplays = roleplays.filter((roleplay) => roleplay.task_complete).length;
  const roleplayScores = roleplays.map((roleplay) => roleplay.score).filter((score): score is number => typeof score === "number");
  const shadowingAttempts = attempts.filter((attempt) => attempt.quiz_type === "shadowing");
  if (!talkMinutes && !completedRoleplays && !shadowingAttempts.length) return null;

  const shadowingAccuracy = accuracy(shadowingAttempts) ?? 0;
  const roleplayAverage = roleplayScores.length ? average(roleplayScores) : 0;
  const activityScore = Math.min(100, (talkMinutes / 70) * 55 + completedRoleplays * 16 + shadowingAttempts.length * 5);
  const score = roleplayScores.length || shadowingAttempts.length
    ? activityScore * 0.55 + Math.max(roleplayAverage, shadowingAccuracy) * 0.45
    : activityScore;
  return {
    dimension: "speaking_shadowing",
    score: clampScore(score),
    evidence: `${talkMinutes} min · ${completedRoleplays} roleplay · ${shadowingAttempts.length} shadowing`,
  };
}

function writingScore(journals: JournalRow[], weaknesses: WeaknessRow[]): SkillScore | null {
  const sentenceCount = journals.reduce((sum, journal) => sum + (journal.sentence_count ?? 0), 0);
  const journalWeaknesses = weaknesses.filter((row) => row.source === "journal");
  if (!sentenceCount && !journalWeaknesses.length) return null;

  const penalty = severityPenalty(journalWeaknesses);
  const volumeBoost = Math.min(20, sentenceCount * 1.5);
  return {
    dimension: "writing_accuracy",
    score: clampScore(70 + volumeBoost - penalty),
    evidence: `${sentenceCount} journal sentences · ${journalWeaknesses.length} correction signals`,
  };
}

function minedSentenceActivationScore(mined: MinedSentenceRow[]): SkillScore | null {
  if (!mined.length) return null;
  return {
    dimension: "sentence_mining_retention",
    score: clampScore(25 + mined.length * 6),
    evidence: `${mined.length} newly mined sentences awaiting review`,
  };
}

function outputConsistencyScore(logs: BootLogRow[], journals: JournalRow[], roleplays: RoleplayRow[]): SkillScore | null {
  const dates = new Set<string>();
  for (const log of logs) {
    if (log.output_layer_done || (log.journal_sentences ?? 0) > 0) dates.add(log.boot_date);
  }
  for (const journal of journals) {
    if ((journal.sentence_count ?? 0) > 0) dates.add(journal.entry_date);
  }
  for (const roleplay of roleplays) {
    if (roleplay.task_complete) dates.add(dayFromIso(roleplay.started_at ?? roleplay.created_at ?? ""));
  }
  if (!dates.size) return null;
  return {
    dimension: "output_consistency",
    score: clampScore((dates.size / 14) * 100),
    evidence: `${dates.size}/14 output days`,
  };
}

function culturalScore(cultural: CulturalRow[], lessons: DailyLessonRow[]): SkillScore | null {
  const contentTouches = cultural.length;
  const lessonTouches = lessons.length;
  if (!contentTouches && !lessonTouches) return null;
  return {
    dimension: "cultural_literacy",
    score: clampScore(30 + contentTouches * 10 + lessonTouches * 7),
    evidence: `${contentTouches} cultural items · ${lessonTouches} daily lessons`,
  };
}

function accuracy(attempts: QuizAttemptRow[]) {
  const answered = attempts.filter((attempt) => attempt.is_correct != null);
  if (!answered.length) return null;
  return (answered.filter((attempt) => attempt.is_correct).length / answered.length) * 100;
}

function severityPenalty(rows: WeaknessRow[]) {
  return rows.reduce((sum, row) => {
    if (row.severity === "leech") return sum + 14;
    if (row.severity === "miss") return sum + 8;
    if (row.severity === "hard") return sum + 4;
    return sum + 2;
  }, 0);
}

function compactScores(scores: Array<SkillScore | null>) {
  return scores.filter((score): score is SkillScore => Boolean(score));
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function resultErrors(values: Record<string, string | undefined>) {
  return Object.entries(values)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, message]) => `${label}: ${message}`);
}

function dateDaysAgo(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function dayFromIso(value: string) {
  return value.slice(0, 10);
}
