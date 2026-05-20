"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todayDateString, type DailyMode, type BootLayer } from "@/lib/os/types";

const ModeSchema = z.enum(["min", "standard", "deep"]);
const LayerSchema = z.enum(["boot", "input", "review", "output", "debug"]);

async function getUserId() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return { supabase, userId: session?.user?.id ?? null };
}

export async function startBootSequenceAction(input: { mode: DailyMode }) {
  const parsed = ModeSchema.safeParse(input.mode);
  if (!parsed.success) return { ok: false as const, error: "Mode 無效。" };
  const { supabase, userId } = await getUserId();
  if (!userId) return { ok: false as const, error: "未登入。" };

  const today = todayDateString();
  const { data: existing } = await supabase
    .from("os_boot_logs")
    .select("id, mode")
    .eq("user_id", userId)
    .eq("boot_date", today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("os_boot_logs")
      .update({ mode: parsed.data, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("os_boot_logs").insert({
      user_id: userId,
      boot_date: today,
      mode: parsed.data,
    });
  }
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function markLayerDoneAction(input: { layer: BootLayer; done: boolean }) {
  const layerParsed = LayerSchema.safeParse(input.layer);
  if (!layerParsed.success) return { ok: false as const, error: "Layer 無效。" };
  const { supabase, userId } = await getUserId();
  if (!userId) return { ok: false as const, error: "未登入。" };

  const today = todayDateString();
  const col = `${layerParsed.data}_layer_done`;

  const { data: existing } = await supabase
    .from("os_boot_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("boot_date", today)
    .maybeSingle();

  if (!existing) {
    await supabase.from("os_boot_logs").insert({
      user_id: userId,
      boot_date: today,
      mode: "standard",
      [col]: input.done,
    });
  } else {
    await supabase
      .from("os_boot_logs")
      .update({ [col]: input.done, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  }
  revalidatePath("/dashboard");
  return { ok: true as const };
}

const UpdateBootLogSchema = z.object({
  talkMeMinutes: z.number().int().min(0).max(600).optional(),
  ankiDueCompleted: z.number().int().min(0).optional(),
  ankiDueTotal: z.number().int().min(0).optional(),
  newCardsAdded: z.number().int().min(0).optional(),
  journalSentences: z.number().int().min(0).optional(),
  totalMinutes: z.number().int().min(0).max(1000).optional(),
});

export async function patchBootLogAction(input: z.infer<typeof UpdateBootLogSchema>) {
  const parsed = UpdateBootLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const { supabase, userId } = await getUserId();
  if (!userId) return { ok: false as const, error: "未登入。" };

  const today = todayDateString();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.talkMeMinutes !== undefined) patch.talk_me_minutes = parsed.data.talkMeMinutes;
  if (parsed.data.ankiDueCompleted !== undefined) patch.anki_due_completed = parsed.data.ankiDueCompleted;
  if (parsed.data.ankiDueTotal !== undefined) patch.anki_due_total = parsed.data.ankiDueTotal;
  if (parsed.data.newCardsAdded !== undefined) patch.new_cards_added = parsed.data.newCardsAdded;
  if (parsed.data.journalSentences !== undefined) patch.journal_sentences = parsed.data.journalSentences;
  if (parsed.data.totalMinutes !== undefined) patch.total_minutes = parsed.data.totalMinutes;

  const { data: existing } = await supabase
    .from("os_boot_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("boot_date", today)
    .maybeSingle();

  if (!existing) {
    await supabase.from("os_boot_logs").insert({
      user_id: userId,
      boot_date: today,
      mode: "standard",
      ...patch,
    });
  } else {
    await supabase.from("os_boot_logs").update(patch).eq("id", existing.id);
  }
  revalidatePath("/dashboard");
  return { ok: true as const };
}

const OsSettingsSchema = z.object({
  currentPhase: z.number().int().min(1).max(6).optional(),
  targetJlpt: z.enum(["N5", "N4", "N3", "N2", "N1"]).optional(),
  targetDate: z.string().optional().nullable(),
  weeklyNewVocabQuota: z.number().int().min(5).max(100).optional(),
  weeklyNewGrammarQuota: z.number().int().min(1).max(20).optional(),
  dailyMode: z.enum(["min", "standard", "deep"]).optional(),
  trilingualLeverageEnabled: z.boolean().optional(),
  talkMeIntegrationEnabled: z.boolean().optional(),
});

export async function updateOsSettingsAction(input: z.infer<typeof OsSettingsSchema>) {
  const parsed = OsSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const { supabase, userId } = await getUserId();
  if (!userId) return { ok: false as const, error: "未登入。" };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const d = parsed.data;
  if (d.currentPhase !== undefined) {
    patch.current_phase = d.currentPhase;
    patch.phase_started_at = new Date().toISOString();
  }
  if (d.targetJlpt !== undefined) patch.target_jlpt = d.targetJlpt;
  if (d.targetDate !== undefined) patch.target_date = d.targetDate;
  if (d.weeklyNewVocabQuota !== undefined) patch.weekly_new_vocab_quota = d.weeklyNewVocabQuota;
  if (d.weeklyNewGrammarQuota !== undefined) patch.weekly_new_grammar_quota = d.weeklyNewGrammarQuota;
  if (d.dailyMode !== undefined) patch.daily_mode = d.dailyMode;
  if (d.trilingualLeverageEnabled !== undefined) patch.trilingual_leverage_enabled = d.trilingualLeverageEnabled;
  if (d.talkMeIntegrationEnabled !== undefined) patch.talk_me_integration_enabled = d.talkMeIntegrationEnabled;

  const { error } = await supabase
    .from("user_os_settings")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true as const };
}
