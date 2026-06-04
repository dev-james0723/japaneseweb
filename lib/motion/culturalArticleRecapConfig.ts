export type CulturalArticleRecapScene = {
  headline: string;
  onScreenText: string;
  articleEvidence: string;
  visualPrompt?: string;
};

export type CulturalArticleRecapProps = {
  titleJa: string;
  titleZh: string;
  summaryZh?: string | null;
  vocab: string[];
  specificityKeywords?: string[];
  scenes?: CulturalArticleRecapScene[];
  visualMood?: string;
};

export const CULTURAL_ARTICLE_RECAP_COMPOSITION = {
  id: "CulturalArticleRecap",
  durationInFrames: 180,
  fps: 30,
  width: 1280,
  height: 720,
} as const;

export const CULTURAL_ARTICLE_RECAP_DEFAULT_PROPS: CulturalArticleRecapProps = {
  titleJa: "日本文化沉浸",
  titleZh: "一篇文章，幾個可帶走的日文觀察。",
  summaryZh: "讀一段文化故事，把漢字、假名、語感與香港視角連起來。",
  vocab: ["文化", "語感", "季節", "記憶"],
  specificityKeywords: ["文化", "語感", "季節", "記憶"],
  scenes: [
    {
      headline: "文化觀察",
      onScreenText: "讀一段文化故事，把漢字、假名、語感與香港視角連起來。",
      articleEvidence: "預覽會在文章生成後改用該文章的段落、詞彙和文法。",
    },
    {
      headline: "語言抓手",
      onScreenText: "文章內的關鍵詞會變成可跟讀的 motion chips。",
      articleEvidence: "不再使用與文章無關的通用影片素材。",
    },
  ],
  visualMood: "focused cultural explainer",
};
