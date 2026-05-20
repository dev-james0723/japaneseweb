"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/ai/openai";
import { runTrilingualEnrichmentForDeck } from "@/lib/ai/runTrilingualEnrichment";
import { checkWeeklyQuota } from "@/lib/os/quota";

const DeckIdSchema = z.object({ deckId: z.string().uuid() });

export async function enrichDeckTrilingualAction(input: z.infer<typeof DeckIdSchema>) {
  const parsed = DeckIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const openai = getOpenAI();
  if (!openai) return { ok: false as const, error: "未設定 OPENAI_API_KEY。" };

  const result = await runTrilingualEnrichmentForDeck({
    supabase,
    openai,
    userId: user.id,
    deckId: parsed.data.deckId,
  });

  if (!result.ok) return { ok: false as const, error: result.error };
  revalidatePath(`/decks/${parsed.data.deckId}`);
  return { ok: true as const, enrichedCount: result.enrichedCount };
}

export async function getWeeklyQuotaAction() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };
  const quota = await checkWeeklyQuota(supabase, user.id);
  return { ok: true as const, quota };
}

const UpdateVocabStageSchema = z.object({
  vocabId: z.string().uuid(),
  activeStage: z.number().int().min(1).max(4),
});

export async function updateVocabActiveStageAction(
  input: z.infer<typeof UpdateVocabStageSchema>,
) {
  const parsed = UpdateVocabStageSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const { error } = await supabase
    .from("vocabulary_items")
    .update({ active_stage: parsed.data.activeStage, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.vocabId)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };
  revalidatePath("/decks");
  return { ok: true as const };
}
