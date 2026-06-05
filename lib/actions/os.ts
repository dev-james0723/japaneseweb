"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todayDateString, weekStartDate, type DailyMode, type BootLayer } from "@/lib/os/types";
import { recordGoalEvent, refreshJlptReadinessSnapshot } from "@/lib/learning/jlptReadiness";

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
  secondaryGoal: z.string().trim().max(80).optional().nullable(),
  examMode: z.boolean().optional(),
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

  const { data: settings } = await supabase
    .from("user_os_settings")
    .select("target_jlpt, target_date, weekly_new_vocab_quota, weekly_new_grammar_quota, daily_mode")
    .eq("user_id", userId)
    .maybeSingle();
  const contractError = settings
    ? await syncLearningContract(supabase, userId, settings as LearningContractSettingsRow, {
        secondaryGoal: d.secondaryGoal,
        examMode: d.examMode,
      })
    : null;
  if (contractError?.error) {
    console.error("[goals] learning contract sync:", contractError.error);
  }
  if (contractError?.goalId) {
    const event = await recordGoalEvent({
      supabase,
      userId,
      goalId: contractError.goalId,
      eventType: contractError.eventType,
      title: contractError.eventType === "goal_created" ? "Learning goal created" : "Learning goal updated",
      detail: `Target ${settings?.target_jlpt ?? "N2"} · ${settings?.daily_mode ?? "standard"} mode`,
      metadata: {
        target_jlpt: settings?.target_jlpt ?? null,
        target_date: settings?.target_date ?? null,
        weekly_new_vocab_quota: settings?.weekly_new_vocab_quota ?? null,
        weekly_new_grammar_quota: settings?.weekly_new_grammar_quota ?? null,
        daily_mode: settings?.daily_mode ?? null,
      },
    });
    if (event.errors.length) console.error("[goals] event:", event.errors.join(" / "));

    const readiness = await refreshJlptReadinessSnapshot({ supabase, userId });
    if (readiness.errors.length) console.error("[goals] readiness:", readiness.errors.join(" / "));
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/goals");
  return { ok: true as const };
}

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type LearningContractSettingsRow = {
  target_jlpt: string | null;
  target_date: string | null;
  weekly_new_vocab_quota: number | null;
  weekly_new_grammar_quota: number | null;
  daily_mode: string | null;
};

async function syncLearningContract(
  supabase: SupabaseServerClient,
  userId: string,
  settings: LearningContractSettingsRow,
  extras: { secondaryGoal?: string | null; examMode?: boolean } = {},
): Promise<{ goalId: string | null; eventType: "goal_created" | "goal_updated"; error: string | null } | null> {
  const targetLevel = normalizeJlpt(settings.target_jlpt);
  const dailyMode = normalizeDailyMode(settings.daily_mode);
  const dailyMinutes = dailyMinutesForMode(dailyMode);
  const examMode = extras.examMode === true || dailyMode === "deep";
  const weeklyDays = examMode ? 6 : 5;
  const prioritySkill = examMode ? "grammar" : "balanced";
  const intensity = examMode ? "exam" : intensityForMode(dailyMode);

  const { data: activeGoalData, error: activeGoalError } = await supabase
    .from("user_goals")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeGoalError) {
    return { goalId: null, eventType: "goal_updated", error: activeGoalError.message };
  }

  const activeGoal = activeGoalData as { id: string } | null;
  let goalId = activeGoal?.id ?? null;
  const eventType = goalId ? "goal_updated" : "goal_created";
  const goalPatch: Record<string, unknown> = {
    user_id: userId,
    goal_type: "JLPT",
    target_level: targetLevel,
    deadline: settings.target_date,
    daily_minutes: dailyMinutes,
    weekly_days: weeklyDays,
    priority_skill: prioritySkill,
    intensity,
    active: true,
  };
  if (extras.secondaryGoal !== undefined) {
    const secondaryGoal = extras.secondaryGoal?.trim();
    goalPatch.topics = secondaryGoal ? [secondaryGoal] : [];
  }

  if (goalId) {
    const { error } = await supabase
      .from("user_goals")
      .update(goalPatch)
      .eq("id", goalId)
      .eq("user_id", userId);
    if (error) return { goalId, eventType, error: error.message };
  } else {
    const { data, error } = await supabase
      .from("user_goals")
      .insert(goalPatch)
      .select("id")
      .single();
    if (error) return { goalId: null, eventType, error: error.message };
    goalId = (data as { id: string }).id;
  }

  const targetVocab = settings.weekly_new_vocab_quota ?? 20;
  const targetGrammar = settings.weekly_new_grammar_quota ?? 2;
  const start = weekStartDate();
  const planRows = Array.from({ length: 4 }, (_, index) => {
    const weekNumber = index + 1;
    const vocabTarget = Math.round(targetVocab * (1 + index * 0.08));
    const grammarTarget = Math.max(targetGrammar, Math.round(targetGrammar * (1 + index * 0.1)));
    return {
      user_id: userId,
      user_goal_id: goalId,
      week_start_date: addDays(start, index * 7),
      week_number: weekNumber,
      target_vocab: vocabTarget,
      target_grammar: grammarTarget,
      target_sentences: Math.max(8, Math.round(vocabTarget / 2)),
      target_output_tasks: weeklyDays,
      focus: `${targetLevel} ${prioritySkill} plan · week ${weekNumber}`,
    };
  });
  const { error: planError } = await supabase
    .from("learning_plan_weeks")
    .upsert(planRows, { onConflict: "user_goal_id,week_start_date" });

  return { goalId, eventType, error: planError?.message ?? null };
}

function normalizeJlpt(value: string | null): "N5" | "N4" | "N3" | "N2" | "N1" {
  if (value === "N5" || value === "N4" || value === "N3" || value === "N2" || value === "N1") return value;
  return "N2";
}

function normalizeDailyMode(value: string | null): DailyMode {
  if (value === "min" || value === "standard" || value === "deep") return value;
  return "standard";
}

function dailyMinutesForMode(mode: DailyMode) {
  if (mode === "min") return 15;
  if (mode === "deep") return 90;
  return 45;
}

function intensityForMode(mode: DailyMode): "chill" | "balanced" | "exam" {
  if (mode === "min") return "chill";
  if (mode === "deep") return "exam";
  return "balanced";
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
