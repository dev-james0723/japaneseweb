export type NotebookEntryKind = "term" | "phrase" | "freeform";

export type NotebookFolder = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type NotebookEntry = {
  id: string;
  user_id: string;
  folder_id: string | null;
  kind: NotebookEntryKind;
  japanese: string | null;
  reading: string | null;
  meaning_zh: string | null;
  meaning_en: string | null;
  content: string | null;
  tags: string[];
  is_favorite: boolean;
  source_vocab_id: string | null;
  ai_suggested_folder_id: string | null;
  ai_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type NotebookClassifySuggestion = {
  entryId: string;
  suggestedFolderId: string | null;
  suggestedFolderName: string | null;
  tags: string[];
  confidence: number | null;
  reason: string | null;
};
