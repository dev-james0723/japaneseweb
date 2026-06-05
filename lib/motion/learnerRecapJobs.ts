import type { SupabaseClient } from "@supabase/supabase-js";
import { todayDateString, weekStartDate } from "@/lib/os/types";
import type { Json } from "@/lib/supabase/database.types";

export type LearnerRecapStatus = "queued" | "rendering" | "completed" | "failed" | "cancelled";
export type LearnerRecapEngine = "remotion" | "hyperframes";
export type LearnerRecapKind = "daily" | "weekly";

export type LearnerRecapPayload = {
  kind: LearnerRecapKind;
  title: string;
  dateRange: {
    start: string;
    end: string;
    label: string;
  };
  metrics: {
    activeDays: number;
    completedLayers: number;
    reviewCompleted: number;
    reviewTotal: number;
    newCards: number;
    journalSentences: number;
    talkMinutes: number;
    inputEvents: number;
    outputPromptsCompleted: number;
    roleplaysCompleted: number;
    weaknessEvents: number;
    skillAverage: number | null;
  };
  highlights: string[];
  learningThread: string[];
  skillScores: Array<{
    dimension: string;
    score: number;
    evidence: string | null;
  }>;
  weaknesses: Array<{
    label: string;
    severity: string;
    source: string;
  }>;
  outputPrompt: {
    promptText: string;
    status: string;
    proofReference: string | null;
  } | null;
  sources: string[];
  errors: string[];
};

export type LearnerRecapMotionManifest = {
  compositionId: string;
  engineTargets: LearnerRecapEngine[];
  durationSeconds: number;
  aspectRatio: "16:9";
  title: string;
  subtitle: string;
  scenes: Array<{
    id: string;
    durationSeconds: number;
    title: string;
    onScreenText: string;
    motionDirection: string;
    evidence: string;
  }>;
  visualSystem: {
    palette: string[];
    typography: string;
    reducedMotion: string;
  };
};

export type LearnerRecapOutputs = {
  provider: "handoff" | "remotion_lambda" | "vercel_sandbox";
  handoffUrl: string;
  message: string;
  remotion: {
    composition: string;
    output: string;
    renderCommand: string[];
  };
  hyperframes: {
    compositionHtml: string;
    variables: Record<string, Json>;
    renderCommand: string[];
  };
  files?: {
    remotionMp4?: string;
    hyperframesMp4?: string;
  };
};

export type LearnerRecapVideoSummary = {
  id: string;
  kind: LearnerRecapKind;
  status: LearnerRecapStatus;
  title: string;
  dateLabel: string;
  renderJobId: string | null;
  payload: LearnerRecapPayload;
  manifest: LearnerRecapMotionManifest;
  outputs: LearnerRecapOutputs;
  errorMessage: string | null;
  renderRequestedAt: string | null;
  updatedAt: string;
};

export type LearnerRenderJobSummary = {
  id: string;
  jobType: string;
  engine: LearnerRecapEngine;
  status: LearnerRecapStatus;
  sourceTable: string | null;
  sourceId: string | null;
  outputs: LearnerRecapOutputs;
  errorMessage: string | null;
  renderRequestedAt: string | null;
  createdAt: string;
};

export type LearnerRecapOverview = {
  schemaReady: boolean;
  todayDate: string;
  weekStart: string;
  daily: LearnerRecapVideoSummary | null;
  weekly: LearnerRecapVideoSummary | null;
  renderJobs: LearnerRenderJobSummary[];
  errors: string[];
};

type BootLogRow = {
  boot_date: string;
  boot_layer_done: boolean | null;
  input_layer_done: boolean | null;
  review_layer_done: boolean | null;
  output_layer_done: boolean | null;
  debug_layer_done: boolean | null;
  anki_due_completed: number | null;
  anki_due_total: number | null;
  new_cards_added: number | null;
  journal_sentences: number | null;
  talk_me_minutes: number | null;
  total_minutes: number | null;
};

type DailyLessonRow = {
  hook_zh: string | null;
  output_mission: string | null;
  shadowing_line: string | null;
  key_grammar: Json | null;
  review_cards_created: number | null;
  status: string | null;
};

type DailyOutputPromptRow = {
  prompt_text: string;
  status: string;
  proof_reference: string | null;
  grammar_focus: string[] | null;
  vocab_focus: string[] | null;
};

type ContentInteractionRow = {
  interaction_type: string;
  duration_seconds: number | null;
  items_created: number | null;
  deep_link: string | null;
};

type WeaknessRow = {
  source: string | null;
  skill_area: string | null;
  severity: string | null;
  metadata: Json | null;
};

type SkillScoreRow = {
  dimension: string;
  score: number;
  evidence: string | null;
};

type RadarSnapshotRow = {
  scores: Json;
  evidence: Json;
};

type JournalRow = {
  sentence_count: number | null;
};

type RoleplayRow = {
  task_complete: boolean | null;
  score: number | null;
};

type RecapVideoRow = {
  id: string;
  status: string;
  title: string;
  render_job_id: string | null;
  recap_payload: Json;
  motion_manifest: Json;
  outputs: Json;
  error_message: string | null;
  render_requested_at: string | null;
  updated_at: string;
};

type DailyRecapVideoRow = RecapVideoRow & {
  recap_date: string;
};

type WeeklyRecapVideoRow = RecapVideoRow & {
  week_start_date: string;
  week_end_date: string;
};

type RenderJobRow = {
  id: string;
  job_type: string;
  engine: string;
  status: string;
  source_table: string | null;
  source_id: string | null;
  outputs: Json;
  error_message: string | null;
  render_requested_at: string | null;
  created_at: string;
};

const DEFAULT_PALETTE = ["#a8ff60", "#7dd3fc", "#ff8fab", "#f8fafc"];

export async function requestDailyRecapVideo({
  supabase,
  userId,
  date = todayDateString(),
}: {
  supabase: SupabaseClient;
  userId: string;
  date?: string;
}): Promise<LearnerRecapVideoSummary | null> {
  const payload = await buildDailyRecapPayload(supabase, userId, date);
  const manifest = buildRecapMotionManifest(payload);
  return persistRecapVideo({
    supabase,
    userId,
    kind: "daily",
    dateKey: date,
    title: payload.title,
    payload,
    manifest,
  });
}

export async function requestWeeklyRecapVideo({
  supabase,
  userId,
  startDate = weekStartDate(),
}: {
  supabase: SupabaseClient;
  userId: string;
  startDate?: string;
}): Promise<LearnerRecapVideoSummary | null> {
  const endDate = addDays(startDate, 6);
  const payload = await buildWeeklyRecapPayload(supabase, userId, startDate, endDate);
  const manifest = buildRecapMotionManifest(payload);
  return persistRecapVideo({
    supabase,
    userId,
    kind: "weekly",
    dateKey: startDate,
    title: payload.title,
    payload,
    manifest,
  });
}

export async function fetchLearnerRecapOverview(
  supabase: SupabaseClient,
  userId: string,
): Promise<LearnerRecapOverview> {
  const todayDate = todayDateString();
  const weekStart = weekStartDate();
  const errors: string[] = [];

  const [dailyResult, weeklyResult, renderJobsResult] = await Promise.all([
    supabase
      .from("daily_recap_videos")
      .select("id, recap_date, status, title, render_job_id, recap_payload, motion_manifest, outputs, error_message, render_requested_at, updated_at")
      .eq("user_id", userId)
      .order("recap_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("weekly_recap_videos")
      .select("id, week_start_date, week_end_date, status, title, render_job_id, recap_payload, motion_manifest, outputs, error_message, render_requested_at, updated_at")
      .eq("user_id", userId)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("render_jobs")
      .select("id, job_type, engine, status, source_table, source_id, outputs, error_message, render_requested_at, created_at")
      .eq("user_id", userId)
      .in("job_type", ["daily_recap", "weekly_recap"])
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const schemaReady = ![dailyResult.error, weeklyResult.error, renderJobsResult.error].some(
    isMissingLearnerRecapSchemaError,
  );
  pushNonMissingError(errors, "daily_recap_videos", dailyResult.error);
  pushNonMissingError(errors, "weekly_recap_videos", weeklyResult.error);
  pushNonMissingError(errors, "render_jobs", renderJobsResult.error);

  return {
    schemaReady,
    todayDate,
    weekStart,
    daily: dailyResult.error || !dailyResult.data
      ? null
      : dailyRecapFromRow(dailyResult.data as DailyRecapVideoRow),
    weekly: weeklyResult.error || !weeklyResult.data
      ? null
      : weeklyRecapFromRow(weeklyResult.data as WeeklyRecapVideoRow),
    renderJobs: renderJobsResult.error
      ? []
      : ((renderJobsResult.data ?? []) as RenderJobRow[]).map(renderJobFromRow),
    errors,
  };
}

export async function fetchLearnerRecapHandoff({
  supabase,
  userId,
  kind,
  dateKey,
}: {
  supabase: SupabaseClient;
  userId: string;
  kind: LearnerRecapKind;
  dateKey: string;
}) {
  if (kind === "daily") {
    const { data, error } = await supabase
      .from("daily_recap_videos")
      .select("id, recap_date, status, title, render_job_id, recap_payload, motion_manifest, outputs, error_message, render_requested_at, updated_at")
      .eq("user_id", userId)
      .eq("recap_date", dateKey)
      .maybeSingle();
    if (error || !data) return { recap: null, renderJob: null, error };
    const recap = dailyRecapFromRow(data as DailyRecapVideoRow);
    return {
      recap,
      renderJob: recap.renderJobId ? await fetchRenderJob(supabase, userId, recap.renderJobId) : null,
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("weekly_recap_videos")
    .select("id, week_start_date, week_end_date, status, title, render_job_id, recap_payload, motion_manifest, outputs, error_message, render_requested_at, updated_at")
    .eq("user_id", userId)
    .eq("week_start_date", dateKey)
    .maybeSingle();
  if (error || !data) return { recap: null, renderJob: null, error };
  const recap = weeklyRecapFromRow(data as WeeklyRecapVideoRow);
  return {
    recap,
    renderJob: recap.renderJobId ? await fetchRenderJob(supabase, userId, recap.renderJobId) : null,
    error: null,
  };
}

export function isMissingLearnerRecapSchemaError(error: unknown) {
  const message = errorMessage(error);
  return /does not exist|schema cache|PGRST205|42P01|daily_recap_videos|weekly_recap_videos|render_jobs/i.test(
    message,
  );
}

async function persistRecapVideo({
  supabase,
  userId,
  kind,
  dateKey,
  title,
  payload,
  manifest,
}: {
  supabase: SupabaseClient;
  userId: string;
  kind: LearnerRecapKind;
  dateKey: string;
  title: string;
  payload: LearnerRecapPayload;
  manifest: LearnerRecapMotionManifest;
}) {
  const now = new Date().toISOString();
  const outputs = buildQueuedRecapOutputs(kind, dateKey, payload, manifest);
  const jobType = kind === "daily" ? "daily_recap" : "weekly_recap";
  const sourceTable = kind === "daily" ? "daily_recap_videos" : "weekly_recap_videos";

  const { data: renderJob, error: renderError } = await supabase
    .from("render_jobs")
    .upsert(
      {
        user_id: userId,
        job_type: jobType,
        engine: "remotion",
        status: "queued",
        source_table: sourceTable,
        source_id: null,
        idempotency_key: `${jobType}:${dateKey}:remotion`,
        input_payload: { payload, manifest } as unknown as Json,
        outputs: outputs as unknown as Json,
        error_message: null,
        render_requested_at: now,
        started_at: null,
        completed_at: null,
      },
      { onConflict: "user_id,idempotency_key" },
    )
    .select("id, job_type, engine, status, source_table, source_id, outputs, error_message, render_requested_at, created_at")
    .single();

  if (renderError || !renderJob) {
    if (!isMissingLearnerRecapSchemaError(renderError)) {
      console.error("[learner recap] render job:", renderError?.message ?? "missing row");
    }
    return null;
  }

  if (kind === "daily") {
    const { data, error } = await supabase
      .from("daily_recap_videos")
      .upsert(
        {
          user_id: userId,
          recap_date: dateKey,
          render_job_id: renderJob.id,
          status: "queued",
          title,
          recap_payload: payload as unknown as Json,
          motion_manifest: manifest as unknown as Json,
          outputs: outputs as unknown as Json,
          error_message: null,
          render_requested_at: now,
          started_at: null,
          completed_at: null,
        },
        { onConflict: "user_id,recap_date" },
      )
      .select("id, recap_date, status, title, render_job_id, recap_payload, motion_manifest, outputs, error_message, render_requested_at, updated_at")
      .single();

    if (error || !data) {
      if (!isMissingLearnerRecapSchemaError(error)) {
        console.error("[learner recap] daily recap:", error?.message ?? "missing row");
      }
      return null;
    }
    await linkRenderJobToRecap(supabase, userId, renderJob.id, data.id, sourceTable);
    return dailyRecapFromRow(data as DailyRecapVideoRow);
  }

  const { data, error } = await supabase
    .from("weekly_recap_videos")
    .upsert(
      {
        user_id: userId,
        week_start_date: dateKey,
        week_end_date: payload.dateRange.end,
        render_job_id: renderJob.id,
        status: "queued",
        title,
        recap_payload: payload as unknown as Json,
        motion_manifest: manifest as unknown as Json,
        outputs: outputs as unknown as Json,
        error_message: null,
        render_requested_at: now,
        started_at: null,
        completed_at: null,
      },
      { onConflict: "user_id,week_start_date" },
    )
    .select("id, week_start_date, week_end_date, status, title, render_job_id, recap_payload, motion_manifest, outputs, error_message, render_requested_at, updated_at")
    .single();

  if (error || !data) {
    if (!isMissingLearnerRecapSchemaError(error)) {
      console.error("[learner recap] weekly recap:", error?.message ?? "missing row");
    }
    return null;
  }
  await linkRenderJobToRecap(supabase, userId, renderJob.id, data.id, sourceTable);
  return weeklyRecapFromRow(data as WeeklyRecapVideoRow);
}

async function linkRenderJobToRecap(
  supabase: SupabaseClient,
  userId: string,
  renderJobId: string,
  recapId: string,
  sourceTable: string,
) {
  await supabase
    .from("render_jobs")
    .update({ source_id: recapId, source_table: sourceTable })
    .eq("id", renderJobId)
    .eq("user_id", userId);
}

async function buildDailyRecapPayload(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<LearnerRecapPayload> {
  const errors: string[] = [];
  const nextDate = addDays(date, 1);
  const [
    bootResult,
    lessonResult,
    promptResult,
    interactionsResult,
    weaknessesResult,
    scoresResult,
    radarResult,
    journalsResult,
    roleplaysResult,
  ] = await Promise.all([
    supabase
      .from("os_boot_logs")
      .select("boot_date, boot_layer_done, input_layer_done, review_layer_done, output_layer_done, debug_layer_done, anki_due_completed, anki_due_total, new_cards_added, journal_sentences, talk_me_minutes, total_minutes")
      .eq("user_id", userId)
      .eq("boot_date", date)
      .maybeSingle(),
    supabase
      .from("daily_lessons")
      .select("hook_zh, output_mission, shadowing_line, key_grammar, review_cards_created, status")
      .eq("user_id", userId)
      .eq("lesson_date", date)
      .maybeSingle(),
    supabase
      .from("daily_output_prompts")
      .select("prompt_text, status, proof_reference, grammar_focus, vocab_focus")
      .eq("user_id", userId)
      .eq("prompt_date", date)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("content_user_interactions")
      .select("interaction_type, duration_seconds, items_created, deep_link")
      .eq("user_id", userId)
      .eq("event_date", date)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("weakness_events")
      .select("source, skill_area, severity, metadata")
      .eq("user_id", userId)
      .gte("created_at", `${date}T00:00:00Z`)
      .lt("created_at", `${nextDate}T00:00:00Z`)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("skill_scores")
      .select("dimension, score, evidence")
      .eq("user_id", userId)
      .eq("measured_at", date)
      .order("score", { ascending: true })
      .limit(8),
    supabase
      .from("radar_snapshots")
      .select("scores, evidence")
      .eq("user_id", userId)
      .eq("snapshot_date", date)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("journal_entries")
      .select("sentence_count")
      .eq("user_id", userId)
      .eq("entry_date", date)
      .limit(12),
    supabase
      .from("roleplay_sessions")
      .select("task_complete, score")
      .eq("user_id", userId)
      .gte("created_at", `${date}T00:00:00Z`)
      .lt("created_at", `${nextDate}T00:00:00Z`)
      .limit(20),
  ]);

  pushNonMissingError(errors, "os_boot_logs", bootResult.error);
  pushNonMissingError(errors, "daily_lessons", lessonResult.error);
  pushNonMissingError(errors, "daily_output_prompts", promptResult.error);
  pushNonMissingError(errors, "content_user_interactions", interactionsResult.error);
  pushNonMissingError(errors, "weakness_events", weaknessesResult.error);
  pushNonMissingError(errors, "skill_scores", scoresResult.error);
  pushNonMissingError(errors, "radar_snapshots", radarResult.error);
  pushNonMissingError(errors, "journal_entries", journalsResult.error);
  pushNonMissingError(errors, "roleplay_sessions", roleplaysResult.error);

  const boot = bootResult.error ? null : ((bootResult.data ?? null) as BootLogRow | null);
  const lesson = lessonResult.error ? null : ((lessonResult.data ?? null) as DailyLessonRow | null);
  const prompts = promptResult.error ? [] : ((promptResult.data ?? []) as DailyOutputPromptRow[]);
  const interactions = interactionsResult.error ? [] : ((interactionsResult.data ?? []) as ContentInteractionRow[]);
  const weaknesses = weaknessesResult.error ? [] : ((weaknessesResult.data ?? []) as WeaknessRow[]);
  const scores = scoresResult.error ? [] : ((scoresResult.data ?? []) as SkillScoreRow[]);
  const radar = radarResult.error ? null : ((radarResult.data ?? null) as RadarSnapshotRow | null);
  const journals = journalsResult.error ? [] : ((journalsResult.data ?? []) as JournalRow[]);
  const roleplays = roleplaysResult.error ? [] : ((roleplaysResult.data ?? []) as RoleplayRow[]);
  const skillScores = scores.length ? scores : skillScoresFromRadar(radar);
  const metrics = buildMetrics({
    bootLogs: boot ? [boot] : [],
    interactions,
    prompts,
    weaknesses,
    skillScores,
    journals,
    roleplays,
  });
  const prompt = prompts[0] ?? null;
  const grammarFocus = firstNonEmpty([
    ...(prompt?.grammar_focus ?? []),
    ...grammarItems(lesson?.key_grammar),
  ]);
  const titleSeed = lesson?.hook_zh ?? prompt?.prompt_text ?? "today learning OS recap";

  return {
    kind: "daily",
    title: `Daily recap - ${date}`,
    dateRange: { start: date, end: date, label: date },
    metrics,
    highlights: buildDailyHighlights({ boot, lesson, prompt, interactions, metrics, grammarFocus, titleSeed }),
    learningThread: buildLearningThread({ lesson, prompt, interactions, weaknesses }),
    skillScores,
    weaknesses: weaknessSummaries(weaknesses),
    outputPrompt: prompt
      ? {
          promptText: prompt.prompt_text,
          status: prompt.status,
          proofReference: prompt.proof_reference,
        }
      : null,
    sources: [
      "os_boot_logs",
      "daily_lessons",
      "daily_output_prompts",
      "content_user_interactions",
      "weakness_events",
      "skill_scores",
      "radar_snapshots",
      "journal_entries",
      "roleplay_sessions",
    ],
    errors,
  };
}

async function buildWeeklyRecapPayload(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<LearnerRecapPayload> {
  const errors: string[] = [];
  const nextDate = addDays(endDate, 1);
  const [
    bootResult,
    promptResult,
    interactionsResult,
    weaknessesResult,
    scoresResult,
    radarResult,
    journalsResult,
    roleplaysResult,
  ] = await Promise.all([
    supabase
      .from("os_boot_logs")
      .select("boot_date, boot_layer_done, input_layer_done, review_layer_done, output_layer_done, debug_layer_done, anki_due_completed, anki_due_total, new_cards_added, journal_sentences, talk_me_minutes, total_minutes")
      .eq("user_id", userId)
      .gte("boot_date", startDate)
      .lte("boot_date", endDate)
      .order("boot_date", { ascending: true }),
    supabase
      .from("daily_output_prompts")
      .select("prompt_text, status, proof_reference, grammar_focus, vocab_focus")
      .eq("user_id", userId)
      .gte("prompt_date", startDate)
      .lte("prompt_date", endDate)
      .order("prompt_date", { ascending: false })
      .limit(20),
    supabase
      .from("content_user_interactions")
      .select("interaction_type, duration_seconds, items_created, deep_link")
      .eq("user_id", userId)
      .gte("event_date", startDate)
      .lte("event_date", endDate)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("weakness_events")
      .select("source, skill_area, severity, metadata")
      .eq("user_id", userId)
      .gte("created_at", `${startDate}T00:00:00Z`)
      .lt("created_at", `${nextDate}T00:00:00Z`)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("skill_scores")
      .select("dimension, score, evidence")
      .eq("user_id", userId)
      .gte("measured_at", startDate)
      .lte("measured_at", endDate)
      .order("measured_at", { ascending: false })
      .limit(16),
    supabase
      .from("radar_snapshots")
      .select("scores, evidence")
      .eq("user_id", userId)
      .gte("snapshot_date", startDate)
      .lte("snapshot_date", endDate)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("journal_entries")
      .select("sentence_count")
      .eq("user_id", userId)
      .gte("entry_date", startDate)
      .lte("entry_date", endDate)
      .limit(40),
    supabase
      .from("roleplay_sessions")
      .select("task_complete, score")
      .eq("user_id", userId)
      .gte("created_at", `${startDate}T00:00:00Z`)
      .lt("created_at", `${nextDate}T00:00:00Z`)
      .limit(60),
  ]);

  pushNonMissingError(errors, "os_boot_logs", bootResult.error);
  pushNonMissingError(errors, "daily_output_prompts", promptResult.error);
  pushNonMissingError(errors, "content_user_interactions", interactionsResult.error);
  pushNonMissingError(errors, "weakness_events", weaknessesResult.error);
  pushNonMissingError(errors, "skill_scores", scoresResult.error);
  pushNonMissingError(errors, "radar_snapshots", radarResult.error);
  pushNonMissingError(errors, "journal_entries", journalsResult.error);
  pushNonMissingError(errors, "roleplay_sessions", roleplaysResult.error);

  const bootLogs = bootResult.error ? [] : ((bootResult.data ?? []) as BootLogRow[]);
  const prompts = promptResult.error ? [] : ((promptResult.data ?? []) as DailyOutputPromptRow[]);
  const interactions = interactionsResult.error ? [] : ((interactionsResult.data ?? []) as ContentInteractionRow[]);
  const weaknesses = weaknessesResult.error ? [] : ((weaknessesResult.data ?? []) as WeaknessRow[]);
  const scores = scoresResult.error ? [] : ((scoresResult.data ?? []) as SkillScoreRow[]);
  const radar = radarResult.error ? null : ((radarResult.data ?? null) as RadarSnapshotRow | null);
  const journals = journalsResult.error ? [] : ((journalsResult.data ?? []) as JournalRow[]);
  const roleplays = roleplaysResult.error ? [] : ((roleplaysResult.data ?? []) as RoleplayRow[]);
  const skillScores = collapseSkillScores(scores.length ? scores : skillScoresFromRadar(radar));
  const metrics = buildMetrics({
    bootLogs,
    interactions,
    prompts,
    weaknesses,
    skillScores,
    journals,
    roleplays,
  });
  const completedPrompt = prompts.find((prompt) => prompt.status === "completed") ?? prompts[0] ?? null;

  return {
    kind: "weekly",
    title: `Weekly recap - ${startDate}`,
    dateRange: { start: startDate, end: endDate, label: `${startDate} -> ${endDate}` },
    metrics,
    highlights: buildWeeklyHighlights({ bootLogs, prompts, interactions, metrics }),
    learningThread: buildLearningThread({ lesson: null, prompt: completedPrompt, interactions, weaknesses }),
    skillScores,
    weaknesses: weaknessSummaries(weaknesses),
    outputPrompt: completedPrompt
      ? {
          promptText: completedPrompt.prompt_text,
          status: completedPrompt.status,
          proofReference: completedPrompt.proof_reference,
        }
      : null,
    sources: [
      "os_boot_logs",
      "daily_output_prompts",
      "content_user_interactions",
      "weakness_events",
      "skill_scores",
      "radar_snapshots",
      "journal_entries",
      "roleplay_sessions",
    ],
    errors,
  };
}

function buildRecapMotionManifest(payload: LearnerRecapPayload): LearnerRecapMotionManifest {
  const metricLine = [
    `${payload.metrics.activeDays} active day${payload.metrics.activeDays === 1 ? "" : "s"}`,
    `${payload.metrics.completedLayers} OS layers`,
    `${payload.metrics.journalSentences} output sentences`,
  ].join(" / ");
  const weakest = payload.weaknesses[0]?.label ?? "next repair target";
  const topSkill = [...payload.skillScores].sort((a, b) => b.score - a.score)[0];

  return {
    compositionId: payload.kind === "daily" ? "LearnerDailyRecap" : "LearnerWeeklyRecap",
    engineTargets: ["remotion", "hyperframes"],
    durationSeconds: payload.kind === "daily" ? 10 : 14,
    aspectRatio: "16:9",
    title: payload.title,
    subtitle: payload.dateRange.label,
    scenes: [
      {
        id: "opening",
        durationSeconds: 2.5,
        title: "Learning pulse",
        onScreenText: metricLine,
        motionDirection:
          "Reveal the date label, then pulse completed OS layers as small evidence bars. Keep motion brief and unobtrusive.",
        evidence: "os_boot_logs",
      },
      {
        id: "input-output-loop",
        durationSeconds: payload.kind === "daily" ? 3 : 4,
        title: "Input to output",
        onScreenText: payload.highlights[0] ?? "Input, recall, output connected.",
        motionDirection:
          "Slide input evidence in from the left and output proof from the right, then connect them with a thin timeline rail.",
        evidence: "daily_lessons + daily_output_prompts + content_user_interactions",
      },
      {
        id: "skill-memory",
        durationSeconds: payload.kind === "daily" ? 2.5 : 4,
        title: "Memory trace",
        onScreenText: topSkill ? `${humanizeDimension(topSkill.dimension)} / ${topSkill.score}` : "Skill radar awaiting evidence",
        motionDirection:
          "Animate four to six compact radar ticks. Use reduced-motion fallback as a static score row.",
        evidence: "skill_scores + radar_snapshots",
      },
      {
        id: "next-repair",
        durationSeconds: payload.kind === "daily" ? 2 : 3.5,
        title: "Next repair",
        onScreenText: `Repair: ${weakest}`,
        motionDirection:
          "Bring the repair chip forward, dim the rest, then end on one practical next action.",
        evidence: "weakness_events",
      },
    ],
    visualSystem: {
      palette: DEFAULT_PALETTE,
      typography: "Use the app UI type scale; no novelty font swaps.",
      reducedMotion:
        "Respect prefers-reduced-motion by replacing animated transitions with instant opacity and static timeline states.",
    },
  };
}

function buildQueuedRecapOutputs(
  kind: LearnerRecapKind,
  dateKey: string,
  payload: LearnerRecapPayload,
  manifest: LearnerRecapMotionManifest,
): LearnerRecapOutputs {
  const slug = `${kind}-recap-${dateKey}`;
  const variables = {
    kind,
    title: payload.title,
    subtitle: payload.dateRange.label,
    metrics: payload.metrics as unknown as Json,
    highlights: payload.highlights as unknown as Json,
    weaknesses: payload.weaknesses as unknown as Json,
    manifest: manifest as unknown as Json,
  };

  return {
    provider: "handoff",
    handoffUrl: `/api/motion/recap/${kind}/${dateKey}/handoff`,
    message:
      "Learner recap manifest is ready. Connect this handoff to Remotion Lambda, Vercel Sandbox, or HyperFrames render automation for MP4 output.",
    remotion: {
      composition: manifest.compositionId,
      output: `/renders/${slug}-remotion.mp4`,
      renderCommand: [
        "npm exec -- remotion render remotion/index.ts",
        manifest.compositionId,
        `public/renders/${slug}-remotion.mp4`,
        `--props='${JSON.stringify({ payload, manifest })}'`,
      ],
    },
    hyperframes: {
      compositionHtml: `hyperframes/${slug}.html`,
      variables,
      renderCommand: [
        "npx",
        "hyperframes",
        "render",
        `hyperframes/${slug}.html`,
        "--variables-file",
        `public/renders/${slug}-variables.json`,
        "--output",
        `public/renders/${slug}-hyperframes.mp4`,
      ],
    },
  };
}

function buildMetrics({
  bootLogs,
  interactions,
  prompts,
  weaknesses,
  skillScores,
  journals,
  roleplays,
}: {
  bootLogs: BootLogRow[];
  interactions: ContentInteractionRow[];
  prompts: DailyOutputPromptRow[];
  weaknesses: WeaknessRow[];
  skillScores: SkillScoreRow[];
  journals: JournalRow[];
  roleplays: RoleplayRow[];
}): LearnerRecapPayload["metrics"] {
  const activeDays = new Set(
    bootLogs
      .filter((log) => layerCount(log) > 0 || (log.total_minutes ?? 0) > 0)
      .map((log) => log.boot_date),
  ).size;
  const completedLayers = bootLogs.reduce((sum, log) => sum + layerCount(log), 0);
  const reviewCompleted = bootLogs.reduce((sum, log) => sum + (log.anki_due_completed ?? 0), 0);
  const reviewTotal = bootLogs.reduce((sum, log) => sum + (log.anki_due_total ?? 0), 0);
  const newCards = bootLogs.reduce((sum, log) => sum + (log.new_cards_added ?? 0), 0);
  const journalSentences =
    bootLogs.reduce((sum, log) => sum + (log.journal_sentences ?? 0), 0) +
    journals.reduce((sum, row) => sum + (row.sentence_count ?? 0), 0);
  const talkMinutes = bootLogs.reduce((sum, log) => sum + (log.talk_me_minutes ?? 0), 0);
  const inputEvents = interactions.filter((row) =>
    ["read", "lesson_complete", "mine", "save", "shadow", "output", "discuss", "quiz"].includes(row.interaction_type),
  ).length;
  const outputPromptsCompleted = prompts.filter((prompt) => prompt.status === "completed").length;
  const roleplaysCompleted = roleplays.filter((row) => row.task_complete).length;
  const skillAverage = skillScores.length
    ? Math.round(skillScores.reduce((sum, score) => sum + score.score, 0) / skillScores.length)
    : null;

  return {
    activeDays,
    completedLayers,
    reviewCompleted,
    reviewTotal,
    newCards,
    journalSentences,
    talkMinutes,
    inputEvents,
    outputPromptsCompleted,
    roleplaysCompleted,
    weaknessEvents: weaknesses.length,
    skillAverage,
  };
}

function buildDailyHighlights({
  boot,
  lesson,
  prompt,
  interactions,
  metrics,
  grammarFocus,
  titleSeed,
}: {
  boot: BootLogRow | null;
  lesson: DailyLessonRow | null;
  prompt: DailyOutputPromptRow | null;
  interactions: ContentInteractionRow[];
  metrics: LearnerRecapPayload["metrics"];
  grammarFocus: string | null;
  titleSeed: string;
}) {
  return compact([
    lesson?.hook_zh ? `Input hook: ${truncate(lesson.hook_zh, 72)}` : `Focus: ${truncate(titleSeed, 72)}`,
    boot ? `${layerCount(boot)}/5 OS layers completed` : null,
    metrics.reviewTotal > 0 ? `${metrics.reviewCompleted}/${metrics.reviewTotal} review cards handled` : null,
    prompt?.status === "completed" ? "Output prompt completed with proof" : prompt?.prompt_text ? `Output prompt ready: ${truncate(prompt.prompt_text, 72)}` : null,
    grammarFocus ? `Grammar memory cue: ${grammarFocus}` : null,
    interactions.length ? `${interactions.length} content interactions captured` : null,
  ]).slice(0, 5);
}

function buildWeeklyHighlights({
  bootLogs,
  prompts,
  interactions,
  metrics,
}: {
  bootLogs: BootLogRow[];
  prompts: DailyOutputPromptRow[];
  interactions: ContentInteractionRow[];
  metrics: LearnerRecapPayload["metrics"];
}) {
  return compact([
    `${metrics.activeDays || bootLogs.length} active learning day${(metrics.activeDays || bootLogs.length) === 1 ? "" : "s"}`,
    `${metrics.completedLayers} OS layers logged this week`,
    metrics.reviewTotal > 0 ? `${metrics.reviewCompleted}/${metrics.reviewTotal} reviews completed` : null,
    metrics.outputPromptsCompleted > 0 ? `${metrics.outputPromptsCompleted} output prompt${metrics.outputPromptsCompleted === 1 ? "" : "s"} completed` : null,
    interactions.length ? `${interactions.length} input/output touchpoints captured` : null,
    prompts.length ? `${prompts.length} daily output prompt${prompts.length === 1 ? "" : "s"} planned` : null,
  ]).slice(0, 5);
}

function buildLearningThread({
  lesson,
  prompt,
  interactions,
  weaknesses,
}: {
  lesson: DailyLessonRow | null;
  prompt: DailyOutputPromptRow | null;
  interactions: ContentInteractionRow[];
  weaknesses: WeaknessRow[];
}) {
  return compact([
    lesson?.hook_zh ? `Input: ${truncate(lesson.hook_zh, 84)}` : null,
    prompt?.prompt_text ? `Output: ${truncate(prompt.prompt_text, 84)}` : null,
    interactions.find((row) => row.interaction_type === "mine") ? "Mining: saved evidence from input" : null,
    interactions.find((row) => row.interaction_type === "shadow") ? "Shadowing: pronunciation/retrieval loop touched" : null,
    weaknesses[0] ? `Repair: ${weaknessLabel(weaknesses[0])}` : null,
  ]).slice(0, 4);
}

function dailyRecapFromRow(row: DailyRecapVideoRow): LearnerRecapVideoSummary {
  return {
    id: row.id,
    kind: "daily",
    status: normalizeStatus(row.status),
    title: row.title,
    dateLabel: row.recap_date,
    renderJobId: row.render_job_id,
    payload: parsePayload(row.recap_payload, "daily", row.recap_date, row.recap_date),
    manifest: parseManifest(row.motion_manifest, row.title, row.recap_date, "daily"),
    outputs: parseOutputs(row.outputs, "daily", row.recap_date),
    errorMessage: row.error_message,
    renderRequestedAt: row.render_requested_at,
    updatedAt: row.updated_at,
  };
}

function weeklyRecapFromRow(row: WeeklyRecapVideoRow): LearnerRecapVideoSummary {
  return {
    id: row.id,
    kind: "weekly",
    status: normalizeStatus(row.status),
    title: row.title,
    dateLabel: `${row.week_start_date} -> ${row.week_end_date}`,
    renderJobId: row.render_job_id,
    payload: parsePayload(row.recap_payload, "weekly", row.week_start_date, row.week_end_date),
    manifest: parseManifest(row.motion_manifest, row.title, row.week_start_date, "weekly"),
    outputs: parseOutputs(row.outputs, "weekly", row.week_start_date),
    errorMessage: row.error_message,
    renderRequestedAt: row.render_requested_at,
    updatedAt: row.updated_at,
  };
}

function renderJobFromRow(row: RenderJobRow): LearnerRenderJobSummary {
  return {
    id: row.id,
    jobType: row.job_type,
    engine: row.engine === "hyperframes" ? "hyperframes" : "remotion",
    status: normalizeStatus(row.status),
    sourceTable: row.source_table,
    sourceId: row.source_id,
    outputs: parseOutputs(row.outputs, row.job_type === "weekly_recap" ? "weekly" : "daily", ""),
    errorMessage: row.error_message,
    renderRequestedAt: row.render_requested_at,
    createdAt: row.created_at,
  };
}

async function fetchRenderJob(supabase: SupabaseClient, userId: string, id: string) {
  const { data, error } = await supabase
    .from("render_jobs")
    .select("id, job_type, engine, status, source_table, source_id, outputs, error_message, render_requested_at, created_at")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return renderJobFromRow(data as RenderJobRow);
}

function parsePayload(
  value: Json,
  kind: LearnerRecapKind,
  start: string,
  end: string,
): LearnerRecapPayload {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Partial<LearnerRecapPayload>;
    if (record.kind && record.metrics && record.dateRange) return record as LearnerRecapPayload;
  }
  return {
    kind,
    title: kind === "daily" ? `Daily recap - ${start}` : `Weekly recap - ${start}`,
    dateRange: { start, end, label: start === end ? start : `${start} -> ${end}` },
    metrics: {
      activeDays: 0,
      completedLayers: 0,
      reviewCompleted: 0,
      reviewTotal: 0,
      newCards: 0,
      journalSentences: 0,
      talkMinutes: 0,
      inputEvents: 0,
      outputPromptsCompleted: 0,
      roleplaysCompleted: 0,
      weaknessEvents: 0,
      skillAverage: null,
    },
    highlights: [],
    learningThread: [],
    skillScores: [],
    weaknesses: [],
    outputPrompt: null,
    sources: [],
    errors: [],
  };
}

function parseManifest(
  value: Json,
  title: string,
  dateKey: string,
  kind: LearnerRecapKind,
): LearnerRecapMotionManifest {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Partial<LearnerRecapMotionManifest>;
    if (record.compositionId && Array.isArray(record.scenes)) {
      return record as LearnerRecapMotionManifest;
    }
  }
  const fallback = parsePayload(null, kind, dateKey, dateKey);
  fallback.title = title;
  return buildRecapMotionManifest(fallback);
}

function parseOutputs(value: Json, kind: LearnerRecapKind, dateKey: string): LearnerRecapOutputs {
  const fallbackPayload = parsePayload(null, kind, dateKey || todayDateString(), dateKey || todayDateString());
  const fallbackManifest = buildRecapMotionManifest(fallbackPayload);
  const fallback = buildQueuedRecapOutputs(kind, dateKey || fallbackPayload.dateRange.start, fallbackPayload, fallbackManifest);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const record = value as Partial<LearnerRecapOutputs>;
  return {
    ...fallback,
    ...record,
    provider:
      record.provider === "remotion_lambda" || record.provider === "vercel_sandbox"
        ? record.provider
        : "handoff",
    handoffUrl: typeof record.handoffUrl === "string" ? record.handoffUrl : fallback.handoffUrl,
    message: typeof record.message === "string" ? record.message : fallback.message,
    remotion: record.remotion ?? fallback.remotion,
    hyperframes: record.hyperframes ?? fallback.hyperframes,
  };
}

function skillScoresFromRadar(row: RadarSnapshotRow | null): SkillScoreRow[] {
  if (!row?.scores || typeof row.scores !== "object" || Array.isArray(row.scores)) return [];
  const scores = row.scores as Record<string, Json | undefined>;
  const evidence = row.evidence && typeof row.evidence === "object" && !Array.isArray(row.evidence)
    ? row.evidence as Record<string, Json | undefined>
    : {};
  return Object.entries(scores)
    .map(([dimension, value]) => ({
      dimension,
      score: typeof value === "number" ? value : Number(value),
      evidence: typeof evidence[dimension] === "string" ? evidence[dimension] as string : null,
    }))
    .filter((score) => Number.isFinite(score.score))
    .sort((a, b) => a.score - b.score)
    .slice(0, 8);
}

function collapseSkillScores(rows: SkillScoreRow[]) {
  const byDimension = new Map<string, SkillScoreRow>();
  for (const row of rows) {
    if (!byDimension.has(row.dimension)) byDimension.set(row.dimension, row);
  }
  return Array.from(byDimension.values()).slice(0, 8);
}

function weaknessSummaries(rows: WeaknessRow[]): LearnerRecapPayload["weaknesses"] {
  return rows
    .map((row) => ({
      label: weaknessLabel(row),
      severity: row.severity ?? "miss",
      source: row.source ?? "unknown",
    }))
    .slice(0, 5);
}

function weaknessLabel(row: WeaknessRow) {
  const metadata = row.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const record = metadata as Record<string, Json | undefined>;
    const grammar = typeof record.grammar_point === "string" ? record.grammar_point : null;
    const category = typeof record.category === "string" ? record.category : null;
    if (grammar?.trim()) return grammar.trim();
    if (category?.trim()) return category.trim();
  }
  return row.skill_area ?? "repair target";
}

function grammarItems(value: Json | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, Json | undefined>;
      return firstNonEmpty([
        stringValue(record.pattern),
        stringValue(record.grammar),
        stringValue(record.ja),
      ]);
    })
    .filter((item): item is string => Boolean(item));
}

function pushNonMissingError(errors: string[], label: string, error: { message?: string } | null | undefined) {
  if (!error || isMissingLearnerRecapSchemaError(error)) return;
  errors.push(`${label}: ${error.message ?? "unknown error"}`);
}

function normalizeStatus(status: string): LearnerRecapStatus {
  if (status === "rendering" || status === "completed" || status === "failed" || status === "cancelled") {
    return status;
  }
  return "queued";
}

function layerCount(log: BootLogRow) {
  return [
    log.boot_layer_done,
    log.input_layer_done,
    log.review_layer_done,
    log.output_layer_done,
    log.debug_layer_done,
  ].filter(Boolean).length;
}

function firstNonEmpty(values: Array<string | null | undefined>) {
  return values.find((value) => value?.trim())?.trim() ?? null;
}

function stringValue(value: Json | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function compact(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value?.trim()));
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function humanizeDimension(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function errorMessage(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return JSON.stringify(error);
}
