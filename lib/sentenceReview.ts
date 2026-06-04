export type SentenceReviewPromptType = "cloze" | "listening" | "production" | "shadowing";

export type SentenceReviewSource = {
  id: string;
  user_id: string;
  sentence_ja: string;
  kana_reading?: string | null;
  translation_zh?: string | null;
  difficulty_jlpt?: "N5" | "N4" | "N3" | "N2" | "N1" | null;
  key_vocab?: string[] | null;
  key_grammar?: string[] | null;
  cloze_target?: string | null;
};

export type SentenceReviewPromptInsert = {
  user_id: string;
  mined_sentence_id: string;
  prompt_type: SentenceReviewPromptType;
  prompt: string;
  answer: string;
  sentence_ja: string;
  kana_reading: string | null;
  translation_zh: string | null;
  difficulty_jlpt: "N5" | "N4" | "N3" | "N2" | "N1" | null;
  key_vocab: string[];
  key_grammar: string[];
};

export function buildSentenceReviewPrompts(source: SentenceReviewSource): SentenceReviewPromptInsert[] {
  const sentence = source.sentence_ja.trim();
  const translation = source.translation_zh?.trim() || "請用自己的話講出意思。";
  const keyVocab = compactArray(source.key_vocab);
  const keyGrammar = compactArray(source.key_grammar);
  const target = chooseClozeTarget(source, keyVocab);
  const cloze = target ? maskFirst(sentence, target) : sentence;

  const base = {
    user_id: source.user_id,
    mined_sentence_id: source.id,
    sentence_ja: sentence,
    kana_reading: source.kana_reading?.trim() || null,
    translation_zh: source.translation_zh?.trim() || null,
    difficulty_jlpt: source.difficulty_jlpt ?? null,
    key_vocab: keyVocab,
    key_grammar: keyGrammar,
  };

  return [
    {
      ...base,
      prompt_type: "cloze",
      prompt: cloze,
      answer: target || sentence,
    },
    {
      ...base,
      prompt_type: "listening",
      prompt: "先聽音，不看文字。講出意思，再寫出你聽到的關鍵詞。",
      answer: sentence,
    },
    {
      ...base,
      prompt_type: "production",
      prompt: translation,
      answer: sentence,
    },
    {
      ...base,
      prompt_type: "shadowing",
      prompt: "Listen once, repeat with text, then repeat without text.",
      answer: sentence,
    },
  ];
}

export function sentencePromptLabel(type: SentenceReviewPromptType): string {
  if (type === "cloze") return "填空回想";
  if (type === "listening") return "聽音辨句";
  if (type === "production") return "意思產出";
  return "跟讀影子練習";
}

function chooseClozeTarget(source: SentenceReviewSource, keyVocab: string[]): string | null {
  const explicit = source.cloze_target?.trim();
  if (explicit) return explicit;
  const vocab = keyVocab.find((token) => source.sentence_ja.includes(token));
  if (vocab) return vocab;
  const match = source.sentence_ja.match(/[一-龯ぁ-んァ-ン]{2,8}/);
  return match?.[0] ?? null;
}

function maskFirst(sentence: string, target: string): string {
  if (!target || !sentence.includes(target)) return sentence;
  return sentence.replace(target, "＿＿＿");
}

function compactArray(values: string[] | null | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean))).slice(0, 8);
}
