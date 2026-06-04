import type { CulturalCategory } from "@/lib/cultural/categories";
import type { LanguageBlend } from "@/lib/cultural/languageBlend";

export function generateCulturalArticlePrompt(params: {
  topic: string;
  category: CulturalCategory;
  userPhase: number;
  blend: LanguageBlend;
  cantoneseContext?: boolean;
}): string {
  const { topic, category, userPhase, blend, cantoneseContext = true } = params;
  return `
你係一個專業日本文化研究者 + 香港人視角嘅日文老師。

## Task
為呢個 topic 寫一篇文化文章：「${topic}」
Category: ${category}
讀者 phase: ${userPhase}/6 (1=N5 入門, 6=N2 接近)
語言比例指引：日文 ${Math.round(blend.ja_ratio * 100)}% / 繁中 ${Math.round(blend.zh_ratio * 100)}%，${blend.show_kana_ruby ? "把漢字 reading 放入 kana_ruby / kana 欄位，正文不要用括號重複標音" : "可減少 ruby"}

## 文章結構要求

1. **標題**：日文 + 繁中
2. **一句話總結**：日文 (適合 phase ${userPhase}) + 繁中
3. **文章主體**：分 4-6 個段落
   - 每個段落同時提供 日文 + 繁中 翻譯
   - 日文難度配合 phase ${userPhase}
   - ja 欄只放自然日文正文，不要寫「漢字（かな）」括號標音
   - kana_ruby 欄可放已加 ruby 的版本或純假名輔助，但不要污染 ja 欄
4. **Cultural Notes**：用繁體中文，3-5 行純文字 bullet points，深入解釋文化背景
5. **Cantonese Lens**：${cantoneseContext ? "用廣東話／香港文化做對比（重要！）" : "可省略"}
   - e.g. 「祇園祭 ≈ 香港大坑舞火龍嘅規模 × 京都嘅典雅」
6. **Key Vocab**：抽 5-10 個關鍵單字
   - 每個含: word, kana, meaning_zh, jlpt_level, example_sentence
7. **Key Grammar**：抽 1-2 個關鍵文法
   - 每個含: pattern, meaning_zh, example_ja
8. **Estimated reading time**：分鐘數

## Style Requirements

- 學術 + 親切，唔好 dry
- 有 narrative storytelling 元素
- 提供 1 個 "surprising_fact" 令讀者印象深刻
- 避免常見英語 wiki 嘅 cliché
- 禁止輸出 HTML tag（例如 <ul>, <li>, <b>）或 markdown code fence
- title_ja / summary_ja / body_paragraphs[].ja / example_sentence / example_ja 都不要包含括號式 reading（例如 夏祭り（なつまつり））

## Output Format (STRICT JSON)

{
  "title_ja": string,
  "title_zh": string,
  "summary_ja": string,
  "summary_zh": string,
  "estimated_minutes": number,
  "difficulty_jlpt": "N5"|"N4"|"N3"|"N2"|"N1",
  "body_paragraphs": [
    { "ja": string, "zh": string, "kana_ruby": string }
  ],
  "cultural_notes": string,
  "cantonese_lens": string,
  "key_vocab": [
    { "word": string, "kana": string, "meaning_zh": string, "jlpt_level": string, "example_sentence": string }
  ],
  "key_grammar": [
    { "pattern": string, "meaning_zh": string, "example_ja": string }
  ],
  "surprising_fact": string
}

只回 JSON，唔好有任何 markdown wrap 或者 preamble。
`.trim();
}

export function generateTopicSuggestionPrompt(params: {
  category: CulturalCategory;
  phase: number;
  season: string;
  seasonHint: string;
  avoidTopics: string[];
}): string {
  const avoid =
    params.avoidTopics.length > 0
      ? `避免與以下近期主題重複：${params.avoidTopics.join("、")}`
      : "無近期重複限制";
  return `
你係日本文化策展人。請為香港日文學習者（phase ${params.phase}/6）建議一個今日文化文章 topic。

Category: ${params.category}
季節：${params.season}（${params.seasonHint}）
${avoid}

回傳 STRICT JSON：{ "topic": string, "topic_zh": string }
topic 用日文或中日混合短句；topic_zh 用繁中。只回 JSON。
`.trim();
}
