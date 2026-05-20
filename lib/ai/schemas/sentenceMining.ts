import { z } from "zod";

export const MinedSentenceSchema = z.object({
  sentence_ja: z.string().min(1),
  kana_reading: z.string().nullable().optional(),
  translation_zh: z.string().min(1),
  difficulty_jlpt: z.enum(["N5", "N4", "N3", "N2", "N1"]).nullable().optional(),
  key_vocab: z.array(z.string()).max(5).default([]),
  key_grammar: z.array(z.string()).max(3).default([]),
  cloze_target: z.string().nullable().optional(),
  rationale: z.string().nullable().optional(),
});
export type MinedSentence = z.infer<typeof MinedSentenceSchema>;

export const SentenceMiningResultSchema = z.object({
  sentences: z.array(MinedSentenceSchema).max(10),
});
export type SentenceMiningResult = z.infer<typeof SentenceMiningResultSchema>;
