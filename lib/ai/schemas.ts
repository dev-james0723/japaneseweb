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

export const OCRVocabItemSchema = z.object({
  japanese: z.string().min(1),
  kana: z.string().optional().nullable(),
  romaji: z.string().optional().nullable(),
  meaning_zh: z.string().optional().nullable(),
  meaning_en: z.string().optional().nullable(),
  part_of_speech: z.string().optional().nullable(),
  jlpt_level: z.string().optional().nullable(),
  example_sentence: z.string().optional().nullable(),
});

export const OCRResultSchema = z.object({
  title: z.string().min(1),
  items: z.array(OCRVocabItemSchema).min(1).max(80),
});

export type OCRResult = z.infer<typeof OCRResultSchema>;

// Word enrichment schema (Phase 5)
export const VerbFormsSchema = z.object({
  dictionary_form: z.string().optional().nullable(),
  masu_form: z.string().optional().nullable(),
  te_form: z.string().optional().nullable(),
  ta_form: z.string().optional().nullable(),
  nai_form: z.string().optional().nullable(),
  potential_form: z.string().optional().nullable(),
  passive_form: z.string().optional().nullable(),
  causative_form: z.string().optional().nullable(),
  causative_passive_form: z.string().optional().nullable(),
  conditional_form: z.string().optional().nullable(),
  volitional_form: z.string().optional().nullable(),
  imperative_form: z.string().optional().nullable(),
  transitivity: z.string().optional().nullable(),
  particle_pattern: z.string().optional().nullable(),
});

export const AdjFormsSchema = z.object({
  adjective_type: z.string().optional().nullable(),
  negative_form: z.string().optional().nullable(),
  past_form: z.string().optional().nullable(),
  past_negative_form: z.string().optional().nullable(),
  adverbial_form: z.string().optional().nullable(),
  noun_modifying_example: z.string().optional().nullable(),
});

export const EnrichedVocabSchema = z.object({
  japanese: z.string().min(1),
  kana: z.string().optional().nullable(),
  romaji: z.string().optional().nullable(),
  meaning_zh: z.string().optional().nullable(),
  meaning_en: z.string().optional().nullable(),
  part_of_speech: z.string().optional().nullable(),
  jlpt_level: z.string().optional().nullable(),
  priority_tier: z.number().int().min(1).max(3).optional().nullable(),
  register_label: z.string().optional().nullable(),
  core_explanation: z.string().optional().nullable(),
  mnemonic: z.string().optional().nullable(),
  examples: z
    .array(
      z.object({
        japanese: z.string(),
        romaji: z.string().optional().nullable(),
        meaning_zh: z.string().optional().nullable(),
      }),
    )
    .max(4)
    .optional()
    .nullable(),
  verb_forms: VerbFormsSchema.optional().nullable(),
  adjective_forms: AdjFormsSchema.optional().nullable(),
});

export type EnrichedVocab = z.infer<typeof EnrichedVocabSchema>;

export const ConnectionsResultSchema = z.object({
  relationships: z
    .array(
      z.object({
        source_japanese: z.string(),
        target_japanese: z.string(),
        relationship_type: z.string(),
        explanation: z.string().optional().nullable(),
        example_sentence: z.string().optional().nullable(),
      }),
    )
    .max(40),
  mixed_sentences: z
    .array(
      z.object({
        japanese: z.string(),
        romaji: z.string().optional().nullable(),
        meaning_zh: z.string().optional().nullable(),
      }),
    )
    .max(10),
});

export type ConnectionsResult = z.infer<typeof ConnectionsResultSchema>;
