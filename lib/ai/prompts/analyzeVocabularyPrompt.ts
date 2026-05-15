export function buildAnalyzeVocabularyPrompt(items: { japanese: string }[]) {
  return [
    `你是日文教學設計師。請為下列每個單字補上完整的學習資訊。`,
    `回傳嚴格 JSON，外層為 { "items": [...] }，順序與輸入相同。`,
    `每個項目需要：japanese、kana、romaji（Hepburn）、meaning_zh（繁中）、meaning_en、part_of_speech、jlpt_level、priority_tier (1=主動產出, 2=被動識別, 3=輕度接觸)、register_label、core_explanation。`,
    `若為動詞，請加 verb_forms { dictionary_form, masu_form, te_form, ta_form, nai_form, potential_form, passive_form, causative_form, causative_passive_form, conditional_form, volitional_form, imperative_form, transitivity, particle_pattern }。`,
    `若為形容詞，請加 adjective_forms { adjective_type:"い"|"な", negative_form, past_form, past_negative_form, adverbial_form, noun_modifying_example }。`,
    `請提供 1–3 個 examples（{japanese, romaji, meaning_zh}）。`,
    `mnemonic：簡短繁中記憶法，可融合粵語諧音或圖像比喻。`,
    `不要 markdown 圍欄、不要解釋。`,
    `輸入單字列表：`,
    JSON.stringify(items.map((x) => x.japanese)),
  ].join("\n");
}
