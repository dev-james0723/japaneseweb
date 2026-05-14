export type Difficulty = "beginner" | "intermediate" | "advanced";

const LEVEL_MAP: Record<Difficulty, string> = {
  beginner: "JLPT N5–N4 程度，最常用的日常詞彙",
  intermediate: "JLPT N3–N2 程度，常見但稍進階",
  advanced: "JLPT N2–N1 程度，包含書面與正式用法",
};

export function buildGenerateVocabularyPrompt(opts: {
  topic: string;
  difficulty: Difficulty;
  count: number;
}) {
  const { topic, difficulty, count } = opts;
  return [
    `你是一位專業日文教學設計師。請為主題「${topic}」生成 ${count} 個實用的日文單字。`,
    `難度：${LEVEL_MAP[difficulty]}。`,
    `要求：`,
    `- 單字必須在該主題下高頻、實用。`,
    `- 不要重複，不要過於罕見。`,
    `- 動詞請給辭書形，形容詞請給原形（い形 / な形皆可）。`,
    `- Romaji 使用 Hepburn 羅馬字，長音用宏（ō, ū）或雙寫（ou, uu）皆可，保持一致。`,
    `- 中文解釋使用繁體中文，簡短精確。`,
    `- part_of_speech 限用：noun / verb / i-adjective / na-adjective / adverb / expression。`,
    `- jlpt_level 為 N5 / N4 / N3 / N2 / N1。`,
    `- priority_tier：1 = 主動產出、2 = 被動識別、3 = 輕度接觸。`,
    ``,
    `只回傳 JSON，格式如下，不要包含任何說明文字或 markdown 圍欄：`,
    `{`,
    `  "title": "標題（繁中，可包含主題）",`,
    `  "items": [`,
    `    {`,
    `      "japanese": "日文",`,
    `      "kana": "假名讀音",`,
    `      "romaji": "羅馬拼音",`,
    `      "meaning_zh": "繁中意思",`,
    `      "part_of_speech": "詞性",`,
    `      "jlpt_level": "N5",`,
    `      "priority_tier": 1`,
    `    }`,
    `  ]`,
    `}`,
  ].join("\n");
}
