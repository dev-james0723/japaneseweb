export type VocabularyWord = {
  word: string;
  reading?: string;
  meaningTraditionalChinese?: string;
  visualAnchor?: string;
  roleInStory?: string;
};

export type VocabularyStorylineGroup = {
  id: string;
  groupIndex: number;
  titleTraditionalChinese: string;
  storylineJapanese: string;
  storylineTraditionalChinese: string;
  words: VocabularyWord[];
  imagePrompt: string;
  imageUrl?: string | null;
  generationStatus: "pending" | "generating" | "completed" | "failed";
  errorMessage?: string | null;
};

export type VocabularyMemorySession = {
  id: string;
  sourceInput: string | null;
  vocabulary: VocabularyWord[];
  storylineGroups: VocabularyStorylineGroup[];
  createdAt: string;
};

/** Deck UI: storyline row from Supabase (status as string, nullable JSON fields). */
export type VocabularyStorylineGroupView = {
  id: string;
  groupIndex: number;
  titleTraditionalChinese: string;
  storylineJapanese: string;
  storylineTraditionalChinese: string;
  words: {
    word: string;
    reading?: string | null;
    meaningTraditionalChinese?: string | null;
    visualAnchor?: string | null;
    roleInStory?: string | null;
  }[];
  imagePrompt: string;
  imageUrl: string | null;
  generationStatus: string;
  errorMessage: string | null;
};

export type VocabularyMemorySessionView = {
  id: string;
  sourceInput: string | null;
  vocabulary: { word: string; reading?: string; meaningTraditionalChinese?: string }[];
  storylineGroups: VocabularyStorylineGroupView[];
  createdAt: string;
};
