import { z } from "zod";

/** Stage 1 AI output — vocabulary list + dynamic storyline groups. */
export const VocabularyMemoryListWordSchema = z.object({
  word: z.string().min(1),
  reading: z.string().optional().nullable(),
  meaningTraditionalChinese: z.string().optional().nullable(),
});

export const VocabularyMemoryStoryWordSchema = z.object({
  word: z.string().min(1),
  reading: z.string().optional().nullable(),
  meaningTraditionalChinese: z.string().optional().nullable(),
  visualAnchor: z.string().optional().nullable(),
  roleInStory: z.string().optional().nullable(),
});

export const VocabularyMemoryStorylineGroupSchema = z.object({
  groupId: z.number().int().positive().optional(),
  titleTraditionalChinese: z.string().min(1),
  storylineJapanese: z.string().min(1),
  storylineTraditionalChinese: z.string().min(1),
  words: z.array(VocabularyMemoryStoryWordSchema).min(1),
  imagePrompt: z.string().min(1),
});

export const VocabularyMemoryPlanningSchema = z.object({
  vocabulary: z.array(VocabularyMemoryListWordSchema).min(1),
  storylineGroups: z.array(VocabularyMemoryStorylineGroupSchema).min(1),
});

export type VocabularyMemoryPlanning = z.infer<typeof VocabularyMemoryPlanningSchema>;
