import { z } from "zod";

export const JournalCorrectionSchema = z.object({
  corrections: z
    .array(
      z.object({
        original: z.string(),
        corrected: z.string(),
        category: z.enum(["grammar", "vocabulary", "kana", "particle", "register", "style"]),
        explanation_zh: z.string(),
      }),
    )
    .max(20),
  natural_version: z.string(),
  notice_gaps: z.array(z.string()).max(10),
  praise: z.string().nullable().optional(),
  sentence_count: z.number().int().min(0),
});
export type JournalCorrection = z.infer<typeof JournalCorrectionSchema>;
