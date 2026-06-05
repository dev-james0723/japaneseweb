"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todayDateString } from "@/lib/os/types";
import { getOpenAI } from "@/lib/ai/openai";
import { runJournalCorrection } from "@/lib/ai/runJournalCorrection";
import { recordOutputCorrections, type GrammarDoctorResult } from "@/lib/output/grammarDoctor";
import { completeLatestDailyOutputPrompt } from "@/lib/output/dailyOutputPrompts";

const QuickLogSchema = z.object({
  stageLevel: z.number().int().min(1).max(4),
  samplePhrase: z.string().max(500).optional().nullable(),
  context: z.enum(["morning", "commute", "work", "night", "other"]).default("other"),
});

export async function logSelfTalkAction(input: z.infer<typeof QuickLogSchema>) {
  const parsed = QuickLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };
  const today = todayDateString();

  const { data: savedLog, error } = await supabase.from("self_talk_progressions").insert({
    user_id: user.id,
    log_date: today,
    stage_level: parsed.data.stageLevel,
    sample_phrase: parsed.data.samplePhrase ?? null,
    context: parsed.data.context,
  }).select("id").maybeSingle();
  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };

  let grammarDoctor: GrammarDoctorResult | null = null;
  const phrase = parsed.data.samplePhrase?.trim();
  const openai = phrase ? getOpenAI() : null;
  if (phrase && openai) {
    const { data: settings } = await supabase
      .from("user_os_settings")
      .select("current_phase, target_jlpt")
      .eq("user_id", user.id)
      .maybeSingle();
    const phase = settings?.current_phase ?? 1;
    const targetJlpt = settings?.target_jlpt ?? "N2";
    const ai = await runJournalCorrection({ openai, content: phrase, phase, targetJlpt });
    if (ai.ok && ai.result.corrections.length) {
      grammarDoctor = await recordOutputCorrections({
        supabase,
        userId: user.id,
        source: "self_talk",
        sourceReference: savedLog?.id ?? null,
        noticeGaps: ai.result.notice_gaps,
        difficultyJlpt: normalizeJlpt(targetJlpt),
        corrections: ai.result.corrections.map((correction) => ({
          original: correction.original,
          corrected: correction.corrected,
          category: correction.category,
          explanationZh: correction.explanation_zh,
        })),
      });
      if (grammarDoctor.errors.length) {
        console.error("[self-talk] grammar doctor:", grammarDoctor.errors.join(" / "));
      }
    } else if (!ai.ok) {
      console.error("[self-talk] correction:", ai.error);
    }
  }

  if (phrase) {
    const outputPrompt = await completeLatestDailyOutputPrompt({
      supabase,
      userId: user.id,
      promptDate: today,
      responseTextJa: phrase,
      proofReference: savedLog?.id ? `self_talk:${savedLog.id}` : "self_talk",
      sourceSurface: "self_talk",
      metadata: {
        stage_level: parsed.data.stageLevel,
        context: parsed.data.context,
      },
    });
    if (!outputPrompt.ok) {
      console.error("[self-talk] daily output prompt:", outputPrompt.reason);
    }
  }

  revalidatePath("/self-talk");
  revalidatePath("/dashboard");
  revalidatePath("/quick-output");
  revalidatePath("/daily-feed");
  if (grammarDoctor) {
    revalidatePath("/grammar");
    revalidatePath("/grammar-map");
    revalidatePath("/repair");
    revalidatePath("/review");
  }
  return { ok: true as const, grammarDoctor };
}

function normalizeJlpt(value: string): "N5" | "N4" | "N3" | "N2" | "N1" | null {
  return value === "N5" || value === "N4" || value === "N3" || value === "N2" || value === "N1"
    ? value
    : null;
}
