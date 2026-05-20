export function buildJournalCorrectionPrompt(content: string, phase: number, targetJlpt: string): string {
  return `你係一個日文 native speaker + 教學經驗豐富嘅老師。學生係香港人，母語廣東話／中文，目標 JLPT ${targetJlpt}，目前 Phase ${phase} (1-6)。

學生寫嘅日文 journal：
"""
${content}
"""

## 任務（用繁體中文解釋）
1. **corrections**: 列出每一個語法/用詞/助詞/敬語錯誤。每項：
   - original: 原文 fragment
   - corrected: 修正後嘅版本
   - category: grammar / vocabulary / kana / particle / register / style
   - explanation_zh: 解釋為何錯、native 點寫
2. **natural_version**: 日本人會點完整自然咁寫呢段內容（保留學生原意）
3. **notice_gaps**: 1-5 個學生可以從今日學到嘅 notice gaps（e.g. 「「しか〜ない」用法」「自他動詞 で／に 區別」）
4. **praise**: 一句話讚返學生做得好嘅地方（用日文＋中文）
5. **sentence_count**: 數一數學生寫咗幾多句完整句子

## Output
純 strict JSON，無 markdown：
{
  "corrections": [{"original": ..., "corrected": ..., "category": ..., "explanation_zh": ...}],
  "natural_version": "...",
  "notice_gaps": ["...", "..."],
  "praise": "...",
  "sentence_count": N
}`;
}
