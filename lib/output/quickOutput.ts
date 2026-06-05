import type { SupabaseClient } from "@supabase/supabase-js";
import { getTodayDailyPick, type CulturalContentSummary } from "@/lib/cultural/queries";
import {
  getCommunicationPhase,
  pickCanDoGoal,
  type CanDoGoal,
  type CommunicationPhaseInfo,
} from "@/lib/learning/communicationGoals";
import { todayDateString } from "@/lib/os/types";

export type QuickOutputSelfTalk = {
  todayCount: number;
  todayMaxStage: number;
  sevenDayCount: number;
  lastPhrase: string | null;
  lastContext: string | null;
};

export type QuickOutputConnection = {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  explanation: string | null;
  exampleSentence: string | null;
};

export type QuickOutputWeakness = {
  label: string;
  skillArea: string;
  severity: string;
  source: string;
  prompt: string | null;
  correctAnswer: string | null;
};

export type QuickOutputContext = {
  date: string;
  phase: number;
  targetJlpt: string;
  communicationPhase: CommunicationPhaseInfo;
  canDoGoal: CanDoGoal;
  primaryPrompt: string;
  promptSource: string;
  outputPrompt: QuickOutputPrompt | null;
  grammarFocus: string | null;
  shadowingLine: string | null;
  inputHook: string | null;
  dailyPick: CulturalContentSummary | null;
  selfTalk: QuickOutputSelfTalk;
  connections: QuickOutputConnection[];
  weakness: QuickOutputWeakness | null;
  errors: string[];
};

export type QuickOutputPrompt = {
  id: string;
  status: string;
  promptText: string;
  proofReference: string | null;
  completedAt: string | null;
};

type SettingsRow = {
  current_phase: number | null;
  phase_started_at: string | null;
  target_jlpt: string | null;
};

type DailyLessonRow = {
  id: string;
  hook_zh: string | null;
  output_mission: string | null;
  shadowing_line: string | null;
  key_grammar: unknown;
};

type DailyOutputPromptRow = {
  id: string;
  prompt_text: string;
  input_hook: string | null;
  target_jlpt: string | null;
  grammar_focus: string[] | null;
  vocab_focus: string[] | null;
  status: string;
  proof_reference: string | null;
  completed_at: string | null;
};

type SentencePromptRow = {
  prompt: string | null;
  answer: string | null;
  sentence_ja: string | null;
  key_grammar: string[] | null;
};

type SelfTalkRow = {
  log_date: string;
  stage_level: number;
  sample_phrase: string | null;
  context: string | null;
  created_at: string;
};

type RelationshipRow = {
  id: string;
  relationship_type: string;
  explanation: string | null;
  example_sentence: string | null;
  source_vocab_id: string;
  target_vocab_id: string;
};

type VocabNameRow = {
  id: string;
  japanese: string;
};

type WeaknessRow = {
  source: string;
  skill_area: string;
  severity: string;
  prompt: string | null;
  correct_answer: string | null;
  metadata: Record<string, unknown> | null;
};

export async function fetchQuickOutputContext(
  supabase: SupabaseClient,
  userId: string,
  date = todayDateString(),
): Promise<QuickOutputContext> {
  const since = new Date(`${date}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - 6);
  const sinceDate = since.toISOString().slice(0, 10);

  const [
    settingsResult,
    lessonResult,
    dailyOutputPromptResult,
    productionResult,
    shadowingResult,
    selfTalkResult,
    relationshipResult,
    weaknessResult,
    dailyPick,
  ] = await Promise.all([
    supabase
      .from("user_os_settings")
      .select("current_phase, phase_started_at, target_jlpt")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("daily_lessons")
      .select("id, hook_zh, output_mission, shadowing_line, key_grammar")
      .eq("user_id", userId)
      .eq("lesson_date", date)
      .maybeSingle(),
    supabase
      .from("daily_output_prompts")
      .select("id, prompt_text, input_hook, target_jlpt, grammar_focus, vocab_focus, status, proof_reference, completed_at")
      .eq("user_id", userId)
      .eq("prompt_date", date)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sentence_review_prompts")
      .select("prompt, answer, sentence_ja, key_grammar")
      .eq("user_id", userId)
      .eq("prompt_type", "production")
      .lte("next_review_date", date)
      .order("is_leech", { ascending: false })
      .order("next_review_date", { ascending: true })
      .limit(1),
    supabase
      .from("sentence_review_prompts")
      .select("prompt, answer, sentence_ja, key_grammar")
      .eq("user_id", userId)
      .eq("prompt_type", "shadowing")
      .lte("next_review_date", date)
      .order("is_leech", { ascending: false })
      .order("next_review_date", { ascending: true })
      .limit(1),
    supabase
      .from("self_talk_progressions")
      .select("log_date, stage_level, sample_phrase, context, created_at")
      .eq("user_id", userId)
      .gte("log_date", sinceDate)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("vocabulary_relationships")
      .select("id, relationship_type, explanation, example_sentence, source_vocab_id, target_vocab_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("weakness_events")
      .select("source, skill_area, severity, prompt, correct_answer, metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    getTodayDailyPick(supabase, userId, date).catch(() => null),
  ]);

  const settings = settingsResult.error ? null : ((settingsResult.data ?? null) as SettingsRow | null);
  const lesson = lessonResult.error ? null : ((lessonResult.data ?? null) as DailyLessonRow | null);
  const outputPromptError =
    dailyOutputPromptResult.error && !isMissingDailyOutputPromptSchemaError(dailyOutputPromptResult.error)
      ? dailyOutputPromptResult.error
      : null;
  const outputPrompt = dailyOutputPromptResult.error
    ? null
    : ((dailyOutputPromptResult.data ?? null) as DailyOutputPromptRow | null);
  const production = productionResult.error
    ? null
    : (((productionResult.data ?? []) as SentencePromptRow[])[0] ?? null);
  const shadowing = shadowingResult.error
    ? null
    : (((shadowingResult.data ?? []) as SentencePromptRow[])[0] ?? null);
  const selfTalkRows = selfTalkResult.error ? [] : ((selfTalkResult.data ?? []) as SelfTalkRow[]);
  const relationshipRows = relationshipResult.error ? [] : ((relationshipResult.data ?? []) as RelationshipRow[]);
  const weaknessRows = weaknessResult.error ? [] : ((weaknessResult.data ?? []) as WeaknessRow[]);

  const phase = settings?.current_phase ?? 1;
  const daysIntoPhase = settings?.phase_started_at ? daysSince(settings.phase_started_at) : 1;
  const canDoGoal = pickCanDoGoal(phase, daysIntoPhase);
  const grammarFocus = firstNonEmpty([
    ...(outputPrompt?.grammar_focus ?? []),
    ...grammarItems(lesson?.key_grammar),
    ...(production?.key_grammar ?? []),
    ...(shadowing?.key_grammar ?? []),
    ...weaknessRows.map((row) => stringMeta(row.metadata, "grammar_point")),
  ]);

  return {
    date,
    phase,
    targetJlpt: settings?.target_jlpt ?? "N2",
    communicationPhase: getCommunicationPhase(phase),
    canDoGoal,
    primaryPrompt: firstNonEmpty([
      outputPrompt?.prompt_text,
      lesson?.output_mission,
      production?.prompt,
      production?.answer,
      dailyPick?.ai_summary_zh ? `用日文講一句你對「${dailyPick.title_zh || dailyPick.title_ja}」的看法。` : null,
      canDoGoal.journalPrompt,
    ]) ?? canDoGoal.journalPrompt,
    promptSource: outputPrompt
      ? outputPrompt.status === "completed"
        ? "Completed output"
        : "Daily output prompt"
      : lesson?.output_mission
      ? "Daily Feed"
      : production
        ? "Production review"
        : dailyPick
          ? "Daily input"
          : "Can-Do goal",
    outputPrompt: outputPrompt ? {
      id: outputPrompt.id,
      status: outputPrompt.status,
      promptText: outputPrompt.prompt_text,
      proofReference: outputPrompt.proof_reference,
      completedAt: outputPrompt.completed_at,
    } : null,
    grammarFocus,
    shadowingLine: lesson?.shadowing_line ?? shadowing?.sentence_ja ?? canDoGoal.shadowingSentences[0] ?? null,
    inputHook: outputPrompt?.input_hook ?? lesson?.hook_zh ?? dailyPick?.ai_summary_zh ?? null,
    dailyPick,
    selfTalk: buildSelfTalkSummary(selfTalkRows, date),
    connections: await buildConnections(supabase, userId, relationshipRows),
    weakness: buildWeaknessFocus(weaknessRows),
    errors: [
      settingsResult.error,
      lessonResult.error,
      outputPromptError,
      productionResult.error,
      shadowingResult.error,
      selfTalkResult.error,
      relationshipResult.error,
      weaknessResult.error,
    ]
      .filter((error): error is NonNullable<typeof error> => Boolean(error) && !isOptionalQuickOutputSchemaError(error))
      .map(quickOutputErrorMessage),
  };
}

function isMissingDailyOutputPromptSchemaError(error: unknown) {
  if (!error) return false;
  const message = quickOutputErrorMessage(error);
  return /does not exist|schema cache|PGRST205|42P01|daily_output_prompts/i.test(message);
}

function isOptionalQuickOutputSchemaError(error: unknown) {
  const message = quickOutputErrorMessage(error);
  return /does not exist|schema cache|PGRST205|42P01/i.test(message)
    && /daily_lessons|daily_output_prompts|sentence_review_prompts|weakness_events/i.test(message);
}

function quickOutputErrorMessage(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return JSON.stringify(error);
}

function buildSelfTalkSummary(rows: SelfTalkRow[], date: string): QuickOutputSelfTalk {
  const todayRows = rows.filter((row) => row.log_date === date);
  const lastWithPhrase = rows.find((row) => row.sample_phrase?.trim());
  return {
    todayCount: todayRows.length,
    todayMaxStage: Math.max(0, ...todayRows.map((row) => row.stage_level)),
    sevenDayCount: rows.length,
    lastPhrase: lastWithPhrase?.sample_phrase ?? null,
    lastContext: lastWithPhrase?.context ?? null,
  };
}

async function buildConnections(
  supabase: SupabaseClient,
  userId: string,
  rows: RelationshipRow[],
): Promise<QuickOutputConnection[]> {
  const ids = Array.from(
    new Set(rows.flatMap((row) => [row.source_vocab_id, row.target_vocab_id]).filter(Boolean)),
  );
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("vocabulary_items")
    .select("id, japanese")
    .eq("user_id", userId)
    .in("id", ids);
  if (error) return [];

  const byId = new Map(((data ?? []) as VocabNameRow[]).map((row) => [row.id, row.japanese]));
  return rows
    .map((row) => ({
      id: row.id,
      source: byId.get(row.source_vocab_id) ?? "?",
      target: byId.get(row.target_vocab_id) ?? "?",
      relationshipType: row.relationship_type,
      explanation: row.explanation,
      exampleSentence: row.example_sentence,
    }))
    .filter((row) => row.source !== "?" || row.target !== "?");
}

function buildWeaknessFocus(rows: WeaknessRow[]): QuickOutputWeakness | null {
  const sorted = [...rows].sort((a, b) => severityScore(b.severity) - severityScore(a.severity));
  const row = sorted[0];
  if (!row) return null;

  return {
    label: stringMeta(row.metadata, "grammar_point") ?? stringMeta(row.metadata, "category") ?? row.skill_area,
    skillArea: row.skill_area,
    severity: row.severity,
    source: row.source,
    prompt: row.prompt,
    correctAnswer: row.correct_answer,
  };
}

function grammarItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      return firstNonEmpty([
        stringValue(record.pattern),
        stringValue(record.grammar),
        stringValue(record.ja),
      ]);
    })
    .filter((item): item is string => Boolean(item));
}

function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (value?.trim()) return value.trim();
  }
  return null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringMeta(metadata: Record<string, unknown> | null, key: string): string | null {
  return stringValue(metadata?.[key]);
}

function daysSince(date: string): number {
  const start = new Date(date).getTime();
  if (!Number.isFinite(start)) return 1;
  return Math.max(1, Math.floor((Date.now() - start) / 86_400_000) + 1);
}

function severityScore(severity: string): number {
  if (severity === "leech") return 3;
  if (severity === "miss") return 2;
  return 1;
}
