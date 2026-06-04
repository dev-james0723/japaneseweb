"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/ai/openai";
import { runSentenceMining } from "@/lib/ai/runSentenceMining";
import { type MinedSentence } from "@/lib/ai/schemas/sentenceMining";
import { buildSentenceReviewPrompts } from "@/lib/sentenceReview";
import { todayDateString } from "@/lib/os/types";
import { patchBootLogAction } from "@/lib/actions/os";

const LogSchema = z.object({
  durationMinutes: z.number().int().min(1).max(600),
  lessonsCompleted: z.array(z.string().max(120)).max(20).default([]),
  mostUsefulSentence: z.string().max(500).optional().nullable(),
  shadowingDone: z.boolean().default(false),
  conversationModeDone: z.boolean().default(false),
  addToMined: z.boolean().default(false),
});

export async function logTalkMeSessionAction(input: z.infer<typeof LogSchema>) {
  const parsed = LogSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const today = todayDateString();
  const d = parsed.data;

  const { error } = await supabase.from("talk_me_sessions").insert({
    user_id: user.id,
    session_date: today,
    duration_minutes: d.durationMinutes,
    lessons_completed: d.lessonsCompleted,
    most_useful_sentence: d.mostUsefulSentence ?? null,
    shadowing_done: d.shadowingDone,
    conversation_mode_done: d.conversationModeDone,
    artifact_saved: !!d.mostUsefulSentence,
  });
  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };

  let reviewPrompts = 0;
  let miningWarning: string | undefined;
  if (d.addToMined && d.mostUsefulSentence?.trim()) {
    const sentence = d.mostUsefulSentence.trim();
    const { data: settings } = await supabase
      .from("user_os_settings")
      .select("current_phase")
      .eq("user_id", user.id)
      .maybeSingle();
    const enriched = await enrichTalkMeSentence(sentence, settings?.current_phase ?? 1);

    const { data: savedSentence, error: minedError } = await supabase.from("mined_sentences").insert({
      user_id: user.id,
      source_type: "talk_me",
      sentence_ja: enriched.sentence_ja,
      kana_reading: enriched.kana_reading ?? null,
      translation_zh: enriched.translation_zh,
      difficulty_jlpt: enriched.difficulty_jlpt ?? null,
      key_vocab: enriched.key_vocab ?? [],
      key_grammar: enriched.key_grammar ?? [],
      cloze_target: enriched.cloze_target ?? null,
    }).select("id, user_id, sentence_ja, kana_reading, translation_zh, difficulty_jlpt, key_vocab, key_grammar, cloze_target").maybeSingle();

    if (minedError) {
      miningWarning = "Talk Me 句子未能加入複習：" + minedError.message;
    } else if (savedSentence) {
      const prompts = buildSentenceReviewPrompts(savedSentence);
      const { error: promptError } = await supabase.from("sentence_review_prompts").insert(prompts);
      if (promptError) {
        miningWarning = "Talk Me 句子已保存，但複習卡建立失敗：" + promptError.message;
      } else {
        reviewPrompts = prompts.length;
      }
    }
  }

  // bump talk_me_minutes + mark input layer done
  const { data: todaySessions } = await supabase
    .from("talk_me_sessions")
    .select("duration_minutes")
    .eq("user_id", user.id)
    .eq("session_date", today);
  const totalMins = (todaySessions ?? []).reduce((s, r) => s + (r.duration_minutes ?? 0), 0);
  await patchBootLogAction({ talkMeMinutes: totalMins });
  await supabase
    .from("os_boot_logs")
    .update({ input_layer_done: true, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("boot_date", today);

  revalidatePath("/talk-me");
  revalidatePath("/dashboard");
  revalidatePath("/mining");
  revalidatePath("/review");
  return { ok: true as const, reviewPrompts, warning: miningWarning };
}

async function enrichTalkMeSentence(sentence: string, phase: number): Promise<MinedSentence> {
  const fallback: MinedSentence = {
    sentence_ja: sentence,
    translation_zh: "",
    difficulty_jlpt: null,
    key_vocab: [],
    key_grammar: [],
    cloze_target: null,
  };

  const openai = getOpenAI();
  if (!openai) return fallback;

  const result = await runSentenceMining({ openai, text: sentence, phase });
  if (!result.ok) return fallback;
  return result.result.sentences[0] ?? fallback;
}
