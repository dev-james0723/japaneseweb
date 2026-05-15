export function buildDeckScenePrompt(opts: {
  topic?: string | null;
  words: string[];
}) {
  const words = opts.words.slice(0, 10).join("、");
  const topicHint = opts.topic ? `主題：${opts.topic}。` : "";
  return [
    `Create a vivid, slightly humorous Japanese vocabulary memory scene that visually evokes these Japanese words: ${words}. ${topicHint}`,
    `Style: dark cinematic Japanese study room aesthetic, soft warm lamp light, magical realism, single coherent scene.`,
    `Add clear, subtle Japanese kanji labels next to the relevant objects so learners can connect word to image.`,
    `No watermark, no extra text outside labels. 16:9 aspect.`,
  ].join(" ");
}

export function buildMnemonicPrompt(opts: {
  japanese: string;
  meaning?: string | null;
  mnemonic?: string | null;
}) {
  return [
    `Create a single memorable mnemonic image for the Japanese word「${opts.japanese}」`,
    opts.meaning ? `(meaning: ${opts.meaning})` : "",
    opts.mnemonic ? `Mnemonic hint: ${opts.mnemonic}` : "",
    `Style: soft, dreamy, slightly humorous, Japanese illustration aesthetic with subtle glassy lighting.`,
    `Include the Japanese word as a small typographic label. No extra text. Square aspect.`,
  ]
    .filter(Boolean)
    .join(" ");
}
