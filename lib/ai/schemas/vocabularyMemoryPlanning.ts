import { z } from "zod";
import {
  aiOptionalNullableString,
  aiRequiredStringMin1,
} from "@/lib/ai/zodAiCoercion";

const S = aiOptionalNullableString;

/** Stage 1 AI output — vocabulary list + dynamic storyline groups. */
export const VocabularyMemoryListWordSchema = z.object({
  word: aiRequiredStringMin1(),
  reading: S(),
  meaningTraditionalChinese: S(),
});

export const VocabularyMemoryStoryWordSchema = z.object({
  word: aiRequiredStringMin1(),
  reading: S(),
  meaningTraditionalChinese: S(),
  visualAnchor: S(),
  roleInStory: S(),
});

export const VocabularyMemoryStorylineGroupSchema = z.object({
  groupId: z.number().int().positive().optional(),
  titleTraditionalChinese: aiRequiredStringMin1(),
  storylineJapanese: aiRequiredStringMin1(),
  storylineTraditionalChinese: aiRequiredStringMin1(),
  words: z.array(VocabularyMemoryStoryWordSchema).min(1),
  imagePrompt: aiRequiredStringMin1(),
});

export const VocabularyMemoryPlanningSchema = z.object({
  vocabulary: z.array(VocabularyMemoryListWordSchema).min(1),
  storylineGroups: z.array(VocabularyMemoryStorylineGroupSchema).min(1),
});

export type VocabularyMemoryPlanning = z.infer<typeof VocabularyMemoryPlanningSchema>;
