"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/ai/openai";
import { runJournalCorrection } from "@/lib/ai/runJournalCorrection";
import { todayDateString } from "@/lib/os/types";
import { patchBootLogAction } from "@/lib/actions/os";

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

  let corrections: unknown = null;
  let naturalVersion: string | null = null;
  let noticeGaps: string[] = [];
  let sentenceCount = countSentences(parsed.data.content);

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
  }

  const wordCount = parsed.data.content.replace(/\s+/g, "").length;

  const { data: row, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      entry_date: todayDateString(),
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

  // mark output layer + bump journal_sentences total for today
  const { data: todayEntries } = await supabase
    .from("journal_entries")
    .select("sentence_count")
    .eq("user_id", user.id)
    .eq("entry_date", todayDateString());
  const totalSentencesToday = (todayEntries ?? []).reduce((s, e) => s + (e.sentence_count ?? 0), 0);
  await patchBootLogAction({ journalSentences: totalSentencesToday });
  await supabase
    .from("os_boot_logs")
    .update({ output_layer_done: true, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("boot_date", todayDateString());

  revalidatePath("/journal");
  revalidatePath("/dashboard");
  return { ok: true as const, entryId: row?.id, corrections, naturalVersion, noticeGaps };
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
