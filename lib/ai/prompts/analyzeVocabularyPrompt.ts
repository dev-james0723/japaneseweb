export type AnalyzeVocabInputItem = {
  japanese: string;
  kana?: string | null;
  romaji?: string | null;
};

export function buildAnalyzeVocabularyPrompt(items: AnalyzeVocabInputItem[]) {
  const payload = items.map((x) => ({
    japanese: x.japanese,
    kana: x.kana ?? null,
    romaji: x.romaji ?? null,
  }));

  return [
    `你是日文教學設計師。請為下列每個單字補上完整的學習資訊。`,
    `回傳嚴格 JSON，外層為 { "items": [...] }，順序與輸入相同。`,
    `每個項目需要：japanese、kana、romaji（Hepburn）、meaning_zh（繁中）、meaning_en、part_of_speech、jlpt_level、priority_tier (1=主動產出, 2=被動識別, 3=輕度接觸)、register_label、core_explanation。`,
    `若為動詞，請加 verb_forms { dictionary_form, masu_form, te_form, ta_form, nai_form, potential_form, passive_form, causative_form, causative_passive_form, conditional_form, volitional_form, imperative_form, transitivity, particle_pattern }。`,
    `若為形容詞，請加 adjective_forms { adjective_type:"い"|"な", negative_form, past_form, past_negative_form, adverbial_form, noun_modifying_example }。`,
    `請提供 1–3 個 examples（{japanese, romaji, meaning_zh}）。`,
    `mnemonic（諧音提示，必填）：`,
    `- 必須用「日文讀音 → 繁中近音詞」協助記憶：先點出該單字讀音（以輸入的 kana／romaji 為準；若兩者皆 null 則自行判斷標準讀音），再寫一兩個讀音接近的繁中詞語，最後用一句話把近音詞與字義串起。`,
    `- 可混用國語／粵語近音，但重點是「聽起來像」，不是解釋漢字字形、筆畫或純畫面聯想。`,
    `- 禁止：只描述季節／事物本身、把日文漢字拆部首講故事、或完全不提讀音近似關係的「小百科式」句子。`,
    `- 風格範例（供語氣參考，勿照抄）：「コーヒー」讀音像「高飛」，喝了咖啡精神高飛；「ケーキ」像「記憶」，吃蛋糕會留下美好記憶。`,
    `不要 markdown 圍欄、不要解釋。`,
    `輸入單字（含已知讀音時請沿用）：`,
    JSON.stringify(payload),
  ].join("\n");
}
