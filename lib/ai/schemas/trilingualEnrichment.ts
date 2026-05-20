import { z } from "zod";

export const TrilingualEnrichedItemSchema = z.object({
  japanese: z.string().min(1),
  cantonese_reading: z.string().nullable().optional(),
  is_false_friend: z.boolean().default(false),
  false_friend_warning: z.string().nullable().optional(),
  trilingual_mnemonic: z.string().min(1),
  common_mistake: z.string().nullable().optional(),
  examples: z
    .array(z.object({ ja: z.string(), kana: z.string().optional().nullable(), zh: z.string() }))
    .max(5)
    .optional()
    .default([]),
});
export type TrilingualEnrichedItem = z.infer<typeof TrilingualEnrichedItemSchema>;

export const TrilingualEnrichmentResultSchema = z.object({
  items: z.array(TrilingualEnrichedItemSchema).max(40),
});
export type TrilingualEnrichmentResult = z.infer<typeof TrilingualEnrichmentResultSchema>;
