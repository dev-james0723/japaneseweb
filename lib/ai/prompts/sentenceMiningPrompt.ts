export function buildSentenceMiningPrompt(text: string, phase: number): string {
  return `你係 sentence mining 專家。學生係香港人，目前 Phase ${phase} (1=Installation, 6=Refinement)。

從以下日文 source mine 出最多 5 句，挑選原則：
- 高頻 / 實用 / 日常對話可以用得着
- 難度啱用戶 Phase ${phase}（i+1，唔好太難）
- 含至少 1 個值得學嘅 vocab 或 grammar pattern
- 每句最多列 5 個 key_vocab、最多 3 個 key_grammar，只保留最值得複習的項目
- 避免冷僻、文學化、純書面語句子

## Source
"""
${text}
"""

## Output — 純 strict JSON
{
  "sentences": [
    {
      "sentence_ja": string,
      "kana_reading": string (全句假名 reading),
      "translation_zh": string (繁體中文),
      "difficulty_jlpt": "N5"|"N4"|"N3"|"N2"|"N1",
      "key_vocab": [string] (最多 5 個),
      "key_grammar": [string] (最多 3 個),
      "cloze_target": string (the word/phrase to mask for cloze deletion),
      "rationale": string (為何值得學)
    }
  ]
}

無 markdown，無解釋。`;
}
