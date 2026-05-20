type ItemRef = {
  japanese: string;
  kana?: string | null;
  romaji?: string | null;
  meaning_zh?: string | null;
};

type FalseFriendRef = { kanji: string; chinese_meaning: string; japanese_meaning: string };

export function buildTrilingualEnrichmentPrompt(
  items: ItemRef[],
  falseFriends: FalseFriendRef[],
  currentPhase: number,
): string {
  const itemLines = items
    .map((it, i) => {
      const parts = [
        `#${i + 1}`,
        `japanese: ${it.japanese}`,
        it.kana ? `kana: ${it.kana}` : null,
        it.romaji ? `romaji: ${it.romaji}` : null,
        it.meaning_zh ? `meaning_zh: ${it.meaning_zh}` : null,
      ].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");

  const ffLines = falseFriends
    .map((f) => `- ${f.kanji}: 中文 "${f.chinese_meaning}" vs 日文 "${f.japanese_meaning}"`)
    .join("\n");

  return `你是一個專為 trilingual 香港用戶（廣東話母語、普通話流利、英文 near-native）服務嘅日文學習助手。

用戶目前學習階段: Phase ${currentPhase} (1=Installation, 6=Refinement)。

## 任務
For each 單字，提供：
1. **cantonese_reading**: 漢字嘅廣東話讀音（粵拼，例：「勉強」→「min5 koeng5」）。如果單字冇漢字／純假名，留 null。
2. **is_false_friend** + **false_friend_warning**: 比較對照下面嘅 reference table。如果係假朋友，warning 用「⚠️ 中文你以為係 X，但日文係 Y」嘅格式。
3. **trilingual_mnemonic**: 短、荒謬、易記嘅記憶口訣，必須運用以下其中一種策略：
   - 廣東話／普通話／英文諧音串聯
   - 漢字部首拆解 + 意象
   - 入聲→促音 mapping（粵語入聲尾 -p/-t/-k 多數對應日文促音）
4. **common_mistake**: 中文母語者最常犯嘅錯誤（用法、發音、漢字寫法等）。
5. **examples**: 1-2 個 i+1 難度嘅例句（程度啱 Phase ${currentPhase}），每個有 ja + kana + zh。

## False Friends Reference
${ffLines}

## 單字清單
${itemLines}

## Output
只輸出 strict JSON，schema:
{
  "items": [
    {
      "japanese": string,
      "cantonese_reading": string|null,
      "is_false_friend": boolean,
      "false_friend_warning": string|null,
      "trilingual_mnemonic": string,
      "common_mistake": string|null,
      "examples": [{"ja": string, "kana": string, "zh": string}]
    }
  ]
}

冇 markdown 圍欄、冇解釋、純 JSON。`;
}
