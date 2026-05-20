import { z } from "zod";
import {
  aiOptionalNullablePriorityTier,
  aiOptionalNullableString,
  aiRequiredStringMin1,
} from "@/lib/ai/zodAiCoercion";

const S = aiOptionalNullableString;

export const AIVocabItemSchema = z.object({
  japanese: aiRequiredStringMin1(),
  kana: S(),
  romaji: S(),
  meaning_zh: S(),
  meaning_en: S(),
  part_of_speech: S(),
  jlpt_level: S(),
  priority_tier: aiOptionalNullablePriorityTier(),
});

export const AIGeneratedDeckSchema = z.object({
  title: aiRequiredStringMin1(),
  items: z.array(AIVocabItemSchema).min(1).max(40),
});

export type AIGeneratedDeck = z.infer<typeof AIGeneratedDeckSchema>;
export type AIVocabItem = z.infer<typeof AIVocabItemSchema>;

export const OCRVocabItemSchema = z.object({
  japanese: aiRequiredStringMin1(),
  kana: S(),
  romaji: S(),
  meaning_zh: S(),
  meaning_en: S(),
  part_of_speech: S(),
  jlpt_level: S(),
  example_sentence: S(),
});

export const OCRResultSchema = z.object({
  title: aiRequiredStringMin1(),
  items: z.array(OCRVocabItemSchema).min(1).max(80),
});

export type OCRResult = z.infer<typeof OCRResultSchema>;

// Word enrichment schema (Phase 5)
export const VerbFormsSchema = z.object({
  dictionary_form: S(),
  masu_form: S(),
  te_form: S(),
  ta_form: S(),
  nai_form: S(),
  potential_form: S(),
  passive_form: S(),
  causative_form: S(),
  causative_passive_form: S(),
  conditional_form: S(),
  volitional_form: S(),
  imperative_form: S(),
  transitivity: S(),
  particle_pattern: S(),
});

export const AdjFormsSchema = z.object({
  adjective_type: S(),
  negative_form: S(),
  past_form: S(),
  past_negative_form: S(),
  adverbial_form: S(),
  noun_modifying_example: S(),
});

export const EnrichedVocabSchema = z.object({
  japanese: aiRequiredStringMin1(),
  kana: S(),
  romaji: S(),
  meaning_zh: S(),
  meaning_en: S(),
  part_of_speech: S(),
  jlpt_level: S(),
  priority_tier: aiOptionalNullablePriorityTier(),
  register_label: S(),
  core_explanation: S(),
  mnemonic: S(),
  examples: z
    .array(
      z.object({
        japanese: aiRequiredStringMin1(),
        romaji: S(),
        meaning_zh: S(),
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
        source_japanese: aiRequiredStringMin1(),
        target_japanese: aiRequiredStringMin1(),
        relationship_type: aiRequiredStringMin1(),
        explanation: S(),
        example_sentence: S(),
      }),
    )
    .max(40),
  mixed_sentences: z
    .array(
      z.object({
        japanese: aiRequiredStringMin1(),
        romaji: S(),
        meaning_zh: S(),
      }),
    )
    .max(10),
});

export type ConnectionsResult = z.infer<typeof ConnectionsResultSchema>;
