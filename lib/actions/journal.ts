"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/ai/openai";
import { runJournalCorrection } from "@/lib/ai/runJournalCorrection";
import { todayDateString } from "@/lib/os/types";
import { patchBootLogAction } from "@/lib/actions/os";
import { recordOutputCorrections, type GrammarDoctorResult } from "@/lib/output/grammarDoctor";
import { refreshSkillRadarSnapshot } from "@/lib/learning/skillRadar";
import { completeLatestDailyOutputPrompt } from "@/lib/output/dailyOutputPrompts";

const SaveSchema = z.object({
  content: z.string().min(1).max(4000),
  runAi: z.boolean().default(true),
});

export async function saveJournalEntryAction(input: z.infer<typeof SaveSchema>) {
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const { data: settings } = await supabase
    .from("user_os_settings")
    .select("current_phase, target_jlpt")
    .eq("user_id", user.id)
    .maybeSingle();
  const phase = settings?.current_phase ?? 1;
  const targetJlpt = settings?.target_jlpt ?? "N2";
  const today = todayDateString();

  let corrections: unknown = null;
  let naturalVersion: string | null = null;
  let noticeGaps: string[] = [];
  let sentenceCount = countSentences(parsed.data.content);
  let outputCorrections: Array<{
    original: string;
    corrected: string;
    category: string;
    explanationZh: string;
  }> = [];

  if (parsed.data.runAi) {
    const openai = getOpenAI();
    if (!openai) {
      return { ok: false as const, error: "未設定 OPENAI_API_KEY。可以撳「只儲存」唔做 AI 改錯。" };
    }
    const ai = await runJournalCorrection({ openai, content: parsed.data.content, phase, targetJlpt });
    if (!ai.ok) return { ok: false as const, error: ai.error };
    corrections = { corrections: ai.result.corrections, praise: ai.result.praise };
    naturalVersion = ai.result.natural_version;
    noticeGaps = ai.result.notice_gaps ?? [];
    sentenceCount = ai.result.sentence_count || sentenceCount;
    outputCorrections = ai.result.corrections.map((correction) => ({
      original: correction.original,
      corrected: correction.corrected,
      category: correction.category,
      explanationZh: correction.explanation_zh,
    }));
  }

  const wordCount = parsed.data.content.replace(/\s+/g, "").length;

  const { data: row, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      entry_date: today,
      content_ja: parsed.data.content,
      ai_corrections: corrections,
      ai_natural_version: naturalVersion,
      notice_gap_learnings: noticeGaps,
      sentence_count: sentenceCount,
      word_count: wordCount,
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };

  let grammarDoctor: GrammarDoctorResult | null = null;
  if (outputCorrections.length) {
    grammarDoctor = await recordOutputCorrections({
      supabase,
      userId: user.id,
      source: "journal",
      sourceReference: row?.id ?? null,
      corrections: outputCorrections,
      noticeGaps,
      difficultyJlpt: normalizeJlpt(targetJlpt),
    });
    if (grammarDoctor.errors.length) {
      console.error("[journal] grammar doctor:", grammarDoctor.errors.join(" / "));
    }
  }

  // mark output layer + bump journal_sentences total for today
  const { data: todayEntries } = await supabase
    .from("journal_entries")
    .select("sentence_count")
    .eq("user_id", user.id)
    .eq("entry_date", today);
  const totalSentencesToday = (todayEntries ?? []).reduce((s, e) => s + (e.sentence_count ?? 0), 0);
  await patchBootLogAction({ journalSentences: totalSentencesToday });
  await supabase
    .from("os_boot_logs")
    .update({ output_layer_done: true, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("boot_date", today);

  const outputPrompt = await completeLatestDailyOutputPrompt({
    supabase,
    userId: user.id,
    promptDate: today,
    responseTextJa: parsed.data.content,
    correctedTextJa: naturalVersion,
    proofReference: row?.id ? `journal:${row.id}` : "journal",
    sourceSurface: "journal",
    metadata: {
      sentence_count: sentenceCount,
      word_count: wordCount,
      ai_correction: Boolean(corrections),
    },
  });
  if (!outputPrompt.ok) {
    console.error("[journal] daily output prompt:", outputPrompt.reason);
  }

  const skillRadar = await refreshSkillRadarSnapshot({ supabase, userId: user.id });
  if (skillRadar.errors.length) {
    console.error("[journal] skill radar:", skillRadar.errors.join(" / "));
  }

  revalidatePath("/journal");
  revalidatePath("/dashboard");
  revalidatePath("/quick-output");
  revalidatePath("/daily-feed");
  revalidatePath("/stats");
  revalidatePath("/goals");
  if (grammarDoctor) {
    revalidatePath("/grammar");
    revalidatePath("/grammar-map");
    revalidatePath("/repair");
    revalidatePath("/review");
  }
  return { ok: true as const, entryId: row?.id, corrections, naturalVersion, noticeGaps, grammarDoctor, skillRadar };
}

const NoticeGapToNotebookSchema = z.object({
  noticeGap: z.string().min(1).max(500),
});

export async function noticeGapToNotebookAction(input: z.infer<typeof NoticeGapToNotebookSchema>) {
  const parsed = NoticeGapToNotebookSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const { error } = await supabase.from("notebook_entries").insert({
    user_id: user.id,
    kind: "freeform",
    content: parsed.data.noticeGap,
    tags: ["notice-gap", "journal"],
  });
  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };
  revalidatePath("/notebook");
  return { ok: true as const };
}

function countSentences(text: string): number {
  const matches = text.match(/[。!?！？\.]/g);
  return matches?.length ?? (text.trim() ? 1 : 0);
}

function normalizeJlpt(value: string): "N5" | "N4" | "N3" | "N2" | "N1" | null {
  return value === "N5" || value === "N4" || value === "N3" || value === "N2" || value === "N1"
    ? value
    : null;
}
