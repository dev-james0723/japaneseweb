import { z } from "zod";

const limitedStringArray = (max: number) =>
  z.preprocess((value) => {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, max);
  }, z.array(z.string()).max(max));

export const MinedSentenceSchema = z.object({
  sentence_ja: z.string().min(1),
  kana_reading: z.string().nullable().optional(),
  translation_zh: z.string().min(1),
  difficulty_jlpt: z.enum(["N5", "N4", "N3", "N2", "N1"]).nullable().optional(),
  key_vocab: limitedStringArray(5).default([]),
  key_grammar: limitedStringArray(3).default([]),
  cloze_target: z.string().nullable().optional(),
  rationale: z.string().nullable().optional(),
});
export type MinedSentence = z.infer<typeof MinedSentenceSchema>;

export const SentenceMiningResultSchema = z.object({
  sentences: z.preprocess(
    (value) => Array.isArray(value) ? value.slice(0, 5) : [],
    z.array(MinedSentenceSchema).max(5),
  ),
});
export type SentenceMiningResult = z.infer<typeof SentenceMiningResultSchema>;
