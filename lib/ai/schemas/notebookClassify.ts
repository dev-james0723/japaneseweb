import { z } from "zod";

export const NotebookClassifyEntryResultSchema = z.object({
  entry_id: z.string().uuid(),
  suggested_folder_id: z.string().uuid().nullable(),
  suggested_folder_name: z.string().max(80).nullable(),
  tags: z.array(z.string().max(40)).max(10).default([]),
  confidence: z.number().min(0).max(1).nullable().optional(),
  reason: z.string().max(300).nullable().optional(),
});

export const NotebookClassifyResultSchema = z.object({
  suggestions: z.array(NotebookClassifyEntryResultSchema).min(1),
});

export type NotebookClassifyResult = z.infer<typeof NotebookClassifyResultSchema>;
