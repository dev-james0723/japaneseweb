"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/ai/openai";
import { runSentenceMining } from "@/lib/ai/runSentenceMining";
import { type MinedSentence } from "@/lib/ai/schemas/sentenceMining";
import { buildSentenceReviewPrompts } from "@/lib/sentenceReview";
import { recordContentInteractionForUser } from "@/lib/actions/contentInteractions";
import { recordGrammarExposures } from "@/lib/learning/grammarMastery";

const MineSchema = z.object({
  text: z.string().min(10).max(5000),
  sourceType: z.enum(["nhk", "youtube", "talk_me", "manual", "podcast", "article", "other"]).default("manual"),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  sourceTitle: z.string().max(200).optional(),
});

export async function mineSentencesAction(input: z.input<typeof MineSchema>) {
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
  createGrammarPoints: z.boolean().optional().default(false),
  grammarSourceReference: z.string().max(500).optional().nullable(),
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

export async function saveMinedSentencesAction(input: z.input<typeof SaveSchema>) {
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

  const { data: savedRows, error } = await supabase
    .from("mined_sentences")
    .insert(rows)
    .select("id, user_id, sentence_ja, kana_reading, translation_zh, difficulty_jlpt, key_vocab, key_grammar, cloze_target");
  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };

  const prompts = (savedRows ?? []).flatMap((sentence) => buildSentenceReviewPrompts(sentence));
  let warning: string | undefined;
  if (prompts.length) {
    const { error: promptError } = await supabase.from("sentence_review_prompts").insert(prompts);
    if (promptError) {
      warning = "句子已儲存，但複習卡建立失敗：" + promptError.message;
    }
  }

  let grammarPoints = 0;
  if (parsed.data.createGrammarPoints) {
    grammarPoints = await createGrammarPointsFromMinedSentences({
      supabase,
      userId: user.id,
      sourceReference:
        parsed.data.grammarSourceReference ||
        parsed.data.sourceUrl ||
        parsed.data.sourceTitle ||
        null,
      sentences: parsed.data.sentences,
    });
  }

  const grammarPatterns = Array.from(
    new Set(rows.flatMap((row) => row.key_grammar).map((pattern) => pattern.trim()).filter(Boolean)),
  ).slice(0, 12);
  if (grammarPatterns.length) {
    const grammarExposure = await recordGrammarExposures({
      supabase,
      userId: user.id,
      exposures: grammarPatterns.map((pattern) => ({
        pattern,
        exposureType: "mine",
        result: "seen",
        sourceSurface: parsed.data.sourceType === "article" ? "article_mining" : "manual_mining",
        sourceReference: parsed.data.grammarSourceReference || parsed.data.sourceUrl || parsed.data.sourceTitle || "/mining",
        evidenceText: rows.find((row) => row.key_grammar.includes(pattern))?.sentence_ja ?? null,
        metadata: {
          source_type: parsed.data.sourceType,
          source_title: parsed.data.sourceTitle ?? null,
          create_grammar_points: parsed.data.createGrammarPoints,
        },
      })),
    });
    if (grammarExposure.errors.length) {
      console.error("[mining] grammar exposure:", grammarExposure.errors.join(" / "));
    }
  }

  await recordContentInteractionForUser({
    supabase,
    userId: user.id,
    input: {
      interactionType: "mine",
      sourceSurface: "manual_mining",
      deepLink: parsed.data.sourceUrl || "/mining",
      itemsCreated: rows.length + (warning ? 0 : prompts.length) + grammarPoints,
      metadata: {
        source_type: parsed.data.sourceType,
        source_title: parsed.data.sourceTitle ?? null,
        sentences_saved: rows.length,
        review_prompts: warning ? 0 : prompts.length,
        grammar_points: grammarPoints,
        warning,
      },
    },
  });

  revalidatePath("/mining");
  revalidatePath("/review");
  revalidatePath("/daily-feed");
  if (grammarPoints) revalidatePath("/grammar");
  return { ok: true as const, saved: rows.length, reviewPrompts: warning ? 0 : prompts.length, grammarPoints, warning };
}

async function createGrammarPointsFromMinedSentences({
  supabase,
  userId,
  sourceReference,
  sentences,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  sourceReference: string | null;
  sentences: z.infer<typeof SaveSchema>["sentences"];
}) {
  const examplesByPattern = new Map<
    string,
    {
      sentence_ja: string;
      translation_zh: string;
      difficulty_jlpt?: "N5" | "N4" | "N3" | "N2" | "N1" | null;
    }
  >();

  for (const sentence of sentences) {
    for (const rawPattern of sentence.key_grammar.slice(0, 3)) {
      const pattern = rawPattern.trim();
      if (!pattern || examplesByPattern.has(pattern)) continue;
      examplesByPattern.set(pattern, {
        sentence_ja: sentence.sentence_ja,
        translation_zh: sentence.translation_zh,
        difficulty_jlpt: sentence.difficulty_jlpt ?? null,
      });
    }
  }

  const patterns = Array.from(examplesByPattern.keys()).slice(0, 12);
  if (!patterns.length) return 0;

  const { data: existing } = await supabase
    .from("grammar_points")
    .select("pattern")
    .eq("user_id", userId)
    .in("pattern", patterns);
  const existingPatterns = new Set((existing ?? []).map((item) => item.pattern));

  const rows = patterns
    .filter((pattern) => !existingPatterns.has(pattern))
    .map((pattern) => {
      const example = examplesByPattern.get(pattern);
      return {
        user_id: userId,
        pattern,
        jlpt_level: example?.difficulty_jlpt ?? null,
        core_meaning: "由 Professor 輸出採礦建立；請補充核心意思同接續。",
        examples: example ? [{ ja: example.sentence_ja, zh: example.translation_zh }] : [],
        source_type: "professor_output",
        source_reference: sourceReference,
      };
    });

  if (!rows.length) return 0;
  const { data, error } = await supabase.from("grammar_points").insert(rows).select("id");
  if (error) {
    console.error("[professor mining] grammar points:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}
