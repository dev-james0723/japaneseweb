import type { SupabaseClient } from "@supabase/supabase-js";

export type DailyOutputPromptSummary = {
  createdOrUpdated: number;
  completed: number;
};

type SyncDailyOutputPromptInput = {
  supabase: SupabaseClient;
  userId: string;
  promptDate: string;
  promptText: string | null | undefined;
  dailyLessonId?: string | null;
  culturalContentId?: string | null;
  contentItemId?: string | null;
  inputHook?: string | null;
  targetJlpt?: string | null;
  grammarFocus?: string[];
  vocabFocus?: string[];
  canDoId?: string | null;
  sourceSurface?: string;
  metadata?: Record<string, unknown>;
};

type CompleteDailyOutputPromptInput = {
  supabase: SupabaseClient;
  userId: string;
  promptDate: string;
  responseTextJa: string;
  correctedTextJa?: string | null;
  proofReference: string;
  sourceSurface: "journal" | "self_talk" | "roleplay";
  metadata?: Record<string, unknown>;
};

const EMPTY_SUMMARY: DailyOutputPromptSummary = {
  createdOrUpdated: 0,
  completed: 0,
};

export async function syncDailyOutputPrompt({
  supabase,
  userId,
  promptDate,
  promptText,
  dailyLessonId = null,
  culturalContentId = null,
  contentItemId = null,
  inputHook = null,
  targetJlpt = null,
  grammarFocus = [],
  vocabFocus = [],
  canDoId = null,
  sourceSurface = "daily_lesson",
  metadata = {},
}: SyncDailyOutputPromptInput): Promise<
  | { ok: true; summary: DailyOutputPromptSummary; skipped?: boolean; reason?: string }
  | { ok: false; reason: string; summary: DailyOutputPromptSummary }
> {
  const text = promptText?.trim();
  if (!text) return { ok: true, skipped: true, reason: "output prompt text missing", summary: EMPTY_SUMMARY };

  const row = {
    user_id: userId,
    prompt_date: promptDate,
    daily_lesson_id: dailyLessonId,
    cultural_content_id: culturalContentId,
    content_item_id: contentItemId,
    prompt_type: "journal",
    prompt_text: text,
    prompt_language: "zh-Hant",
    input_hook: inputHook?.trim() || null,
    target_jlpt: normalizeJlpt(targetJlpt),
    grammar_focus: compact(grammarFocus, 8),
    vocab_focus: compact(vocabFocus, 8),
    can_do_id: canDoId?.trim() || null,
    status: "new",
    source_surface: sourceSurface,
    metadata,
  };

  const query = dailyLessonId
    ? supabase.from("daily_output_prompts").upsert(row, { onConflict: "daily_lesson_id,prompt_type" })
    : supabase.from("daily_output_prompts").insert(row);
  const { error } = await query;

  if (error) {
    if (isMissingDailyOutputPromptSchemaError(error)) {
      return { ok: true, skipped: true, reason: "daily output prompt schema not applied", summary: EMPTY_SUMMARY };
    }
    return { ok: false, reason: error.message, summary: EMPTY_SUMMARY };
  }

  return { ok: true, summary: { createdOrUpdated: 1, completed: 0 } };
}

export async function completeLatestDailyOutputPrompt({
  supabase,
  userId,
  promptDate,
  responseTextJa,
  correctedTextJa = null,
  proofReference,
  sourceSurface,
  metadata = {},
}: CompleteDailyOutputPromptInput): Promise<
  | { ok: true; summary: DailyOutputPromptSummary; skipped?: boolean; reason?: string }
  | { ok: false; reason: string; summary: DailyOutputPromptSummary }
> {
  const response = responseTextJa.trim();
  if (!response) return { ok: true, skipped: true, reason: "response text missing", summary: EMPTY_SUMMARY };

  const { data: prompt, error: loadError } = await supabase
    .from("daily_output_prompts")
    .select("id")
    .eq("user_id", userId)
    .eq("prompt_date", promptDate)
    .in("status", ["new", "started"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (loadError) {
    if (isMissingDailyOutputPromptSchemaError(loadError)) {
      return { ok: true, skipped: true, reason: "daily output prompt schema not applied", summary: EMPTY_SUMMARY };
    }
    return { ok: false, reason: loadError.message, summary: EMPTY_SUMMARY };
  }

  if (!prompt?.id) {
    return { ok: true, skipped: true, reason: "no open daily output prompt", summary: EMPTY_SUMMARY };
  }

  const { error } = await supabase
    .from("daily_output_prompts")
    .update({
      status: "completed",
      response_text_ja: response,
      corrected_text_ja: correctedTextJa?.trim() || null,
      proof_reference: proofReference,
      completed_at: new Date().toISOString(),
      source_surface: sourceSurface,
      metadata: {
        ...metadata,
        completed_via: sourceSurface,
      },
    })
    .eq("user_id", userId)
    .eq("id", prompt.id);

  if (error) {
    if (isMissingDailyOutputPromptSchemaError(error)) {
      return { ok: true, skipped: true, reason: "daily output prompt schema not applied", summary: EMPTY_SUMMARY };
    }
    return { ok: false, reason: error.message, summary: EMPTY_SUMMARY };
  }

  return { ok: true, summary: { createdOrUpdated: 0, completed: 1 } };
}

function compact(values: string[], limit: number) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit);
}

function normalizeJlpt(value: string | null | undefined) {
  if (value === "N5" || value === "N4" || value === "N3" || value === "N2" || value === "N1") return value;
  return null;
}

function isMissingDailyOutputPromptSchemaError(error: unknown) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  return /does not exist|schema cache|PGRST205|42P01|daily_output_prompts/i.test(message);
}
