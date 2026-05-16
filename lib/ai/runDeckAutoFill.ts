import type OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runAnalyzeVocabularyForDeck } from "@/lib/ai/runAnalyzeVocabularyForDeck";
import { generateDeckSceneImage } from "@/lib/ai/generateDeckSceneImage";
import { runVocabularyMemoryForDeck } from "@/lib/vocabularyMemory/runVocabularyMemoryForDeck";

export type DeckAutoFillStep =
  | { step: "analyze"; result: "ok" | "skipped" | "error"; detail?: string }
  | { step: "deck_scene"; result: "ok" | "skipped" | "error"; detail?: string }
  | { step: "memory"; result: "ok" | "skipped" | "error"; detail?: string };

export type DeckAutoFillOutcome =
  | { ok: true; skipped: true; reason?: string }
  | {
      ok: true;
      skipped?: false;
      steps: DeckAutoFillStep[];
      memoryImageFailures?: number;
    }
  | { ok: false; error: string; steps?: DeckAutoFillStep[] };

const MAX_ATTEMPTS = 5;

export async function runDeckAutoFillPipeline(opts: {
  supabase: SupabaseClient;
  openai: InstanceType<typeof OpenAI>;
  userId: string;
  deckId: string;
}): Promise<DeckAutoFillOutcome> {
  const { supabase, openai, userId, deckId } = opts;
  const steps: DeckAutoFillStep[] = [];

  const { data: deckRow, error: deckReadErr } = await supabase
    .from("decks")
    .select("ai_auto_fill_completed, ai_auto_fill_attempts")
    .eq("id", deckId)
    .eq("user_id", userId)
    .maybeSingle();

  if (deckReadErr || !deckRow) {
    return { ok: false, error: "詞庫不存在。" };
  }

  if (deckRow.ai_auto_fill_completed) {
    return { ok: true, skipped: true, reason: "already_completed" };
  }

  if (deckRow.ai_auto_fill_attempts >= MAX_ATTEMPTS) {
    return {
      ok: false,
      error: `自動 AI 補充已嘗試 ${MAX_ATTEMPTS} 次仍未完成，請稍後再整理頁面或聯絡支援。`,
    };
  }

  const { data: claimed, error: claimErr } = await supabase
    .from("decks")
    .update({ ai_auto_fill_attempts: deckRow.ai_auto_fill_attempts + 1 })
    .eq("id", deckId)
    .eq("user_id", userId)
    .eq("ai_auto_fill_attempts", deckRow.ai_auto_fill_attempts)
    .eq("ai_auto_fill_completed", false)
    .select("id")
    .maybeSingle();

  if (claimErr || !claimed) {
    return { ok: true, skipped: true, reason: "concurrent_or_raced" };
  }

  const markError = async (msg: string) => {
    await supabase.from("decks").update({ ai_auto_fill_last_error: msg }).eq("id", deckId);
  };

  const markDone = async () => {
    await supabase
      .from("decks")
      .update({
        ai_auto_fill_completed: true,
        ai_auto_fill_last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deckId);
  };

  try {
    const analyzed = await runAnalyzeVocabularyForDeck({ supabase, openai, userId, deckId });
    if (!analyzed.ok) {
      steps.push({ step: "analyze", result: "error", detail: analyzed.error });
      await markError(analyzed.error);
      return { ok: false, error: analyzed.error, steps };
    }
    steps.push({ step: "analyze", result: "ok" });

    const scene = await generateDeckSceneImage({ supabase, openai, userId, deckId });
    if (!scene.ok) {
      steps.push({ step: "deck_scene", result: "error", detail: scene.error });
      await markError(scene.error);
      return { ok: false, error: scene.error, steps };
    }
    steps.push({
      step: "deck_scene",
      result: scene.skipped ? "skipped" : "ok",
      detail: scene.skipped ? "already_exists" : undefined,
    });

    const memory = await runVocabularyMemoryForDeck({ supabase, openai, userId, deckId });
    if (!memory.ok) {
      steps.push({ step: "memory", result: "error", detail: memory.error });
      await markError(memory.error);
      return { ok: false, error: memory.error, steps };
    }

    const fails = memory.imageResults.filter((x) => !x.ok).length;
    steps.push({
      step: "memory",
      result: fails === 0 ? "ok" : "ok",
      detail: fails > 0 ? `${fails} group image(s) failed` : undefined,
    });

    await markDone();

    return {
      ok: true,
      steps,
      memoryImageFailures: fails > 0 ? fails : undefined,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "未知錯誤";
    await markError(msg);
    return { ok: false, error: msg, steps };
  }
}
