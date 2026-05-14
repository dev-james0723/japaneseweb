import { z } from "zod";

export const AIVocabItemSchema = z.object({
  japanese: z.string().min(1),
  kana: z.string().optional().nullable(),
  romaji: z.string().optional().nullable(),
  meaning_zh: z.string().optional().nullable(),
  meaning_en: z.string().optional().nullable(),
  part_of_speech: z.string().optional().nullable(),
  jlpt_level: z.string().optional().nullable(),
  priority_tier: z.number().int().min(1).max(3).optional().nullable(),
});

export const AIGeneratedDeckSchema = z.object({
  title: z.string().min(1),
  items: z.array(AIVocabItemSchema).min(1).max(40),
});

export type AIGeneratedDeck = z.infer<typeof AIGeneratedDeckSchema>;
export type AIVocabItem = z.infer<typeof AIVocabItemSchema>;
