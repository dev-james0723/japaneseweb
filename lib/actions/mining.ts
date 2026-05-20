"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/ai/openai";
import { runSentenceMining } from "@/lib/ai/runSentenceMining";
import { type MinedSentence } from "@/lib/ai/schemas/sentenceMining";

const MineSchema = z.object({
  text: z.string().min(10).max(5000),
  sourceType: z.enum(["nhk", "youtube", "talk_me", "manual", "podcast", "article", "other"]).default("manual"),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  sourceTitle: z.string().max(200).optional(),
});

export async function mineSentencesAction(input: z.infer<typeof MineSchema>) {
  const parsed = MineSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const openai = getOpenAI();
  if (!openai) return { ok: false as const, error: "未設定 OPENAI_API_KEY。" };

  const { data: settings } = await supabase
    .from("user_os_settings")
    .select("current_phase")
    .eq("user_id", user.id)
    .maybeSingle();
  const phase = settings?.current_phase ?? 1;

  const ai = await runSentenceMining({ openai, text: parsed.data.text, phase });
  if (!ai.ok) return { ok: false as const, error: ai.error };

  return { ok: true as const, sentences: ai.result.sentences };
}

const SaveSchema = z.object({
  sourceType: z.enum(["nhk", "youtube", "talk_me", "manual", "podcast", "article", "other"]).default("manual"),
  sourceUrl: z.string().optional().nullable(),
  sourceTitle: z.string().max(200).optional().nullable(),
  sentences: z.array(z.object({
    sentence_ja: z.string(),
    kana_reading: z.string().nullable().optional(),
    translation_zh: z.string(),
    difficulty_jlpt: z.enum(["N5", "N4", "N3", "N2", "N1"]).nullable().optional(),
    key_vocab: z.array(z.string()).default([]),
    key_grammar: z.array(z.string()).default([]),
    cloze_target: z.string().nullable().optional(),
  })).min(1).max(10),
});

export async function saveMinedSentencesAction(input: z.infer<typeof SaveSchema>) {
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const rows = parsed.data.sentences.map((s: MinedSentence) => ({
    user_id: user.id,
    source_type: parsed.data.sourceType,
    source_url: parsed.data.sourceUrl || null,
    source_title: parsed.data.sourceTitle || null,
    sentence_ja: s.sentence_ja,
    kana_reading: s.kana_reading ?? null,
    translation_zh: s.translation_zh,
    difficulty_jlpt: s.difficulty_jlpt ?? null,
    key_vocab: s.key_vocab ?? [],
    key_grammar: s.key_grammar ?? [],
    cloze_target: s.cloze_target ?? null,
  }));

  const { error } = await supabase.from("mined_sentences").insert(rows);
  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };

  revalidatePath("/mining");
  return { ok: true as const, saved: rows.length };
}
