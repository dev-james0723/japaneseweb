export type StorylineMemoryImagePromptWord = {
  word: string;
  reading?: string | null;
  meaningTraditionalChinese?: string | null;
  visualAnchor?: string | null;
};

export type StorylineMemoryImagePromptInput = {
  titleTraditionalChinese: string;
  storylineJapanese: string;
  storylineTraditionalChinese: string;
  words: StorylineMemoryImagePromptWord[];
  /** Stage-1 English scene brief; merged into the structured prompt. */
  plannerImagePromptEnglish: string;
};

/**
 * Full English prompt for the image model — one coherent 16:9 vocabulary memory scene per group.
 */
export function buildStorylineMemoryStructuredImagePrompt(
  input: StorylineMemoryImagePromptInput,
): string {
  const vocabBlock = input.words
    .map((w) => {
      const r = (w.reading ?? "").trim();
      const m = (w.meaningTraditionalChinese ?? "").trim();
      const readingPart = r ? `（${r}）` : "";
      const meaningPart = m ? `: ${m}` : "";
      return `- ${w.word}${readingPart}${meaningPart}`;
    })
    .join("\n");

  const anchors = input.words
    .map((w) => ({ w, a: (w.visualAnchor ?? "").trim() }))
    .filter((x) => x.a.length > 0);
  const anchorBlock =
    anchors.length > 0
      ? anchors.map(({ w, a }) => `- ${w.word}: ${a}`).join("\n")
      : `- Derive a clear, concrete on-screen anchor for each target word from the storyline and planner direction below.`;

  const planner = (input.plannerImagePromptEnglish ?? "").trim();

  return [
    `Create one high-quality Japanese vocabulary memory illustration for this single storyline group only.`,
    ``,
    `This image should depict one coherent mini-scene based on the Japanese storyline below.`,
    ``,
    `Do not include words from other storyline groups.`,
    `Do not create a collage, storyboard, comic layout, split screen, grid of panels, or mosaic.`,
    `Do not add disconnected mini-panels, bottom strips, side strips, or extra vocabulary tiles to "fit leftover words".`,
    `Do not try to depict multiple unrelated scenes in one frame.`,
    ``,
    `Storyline title:`,
    input.titleTraditionalChinese.trim(),
    ``,
    `Japanese storyline:`,
    input.storylineJapanese.trim(),
    ``,
    `Traditional Chinese translation:`,
    input.storylineTraditionalChinese.trim(),
    ``,
    `Target vocabulary for this image only:`,
    vocabBlock,
    ``,
    `Visual anchors:`,
    anchorBlock,
    ``,
    `Planner scene direction (English — follow unless it conflicts with the single-scene rules above; if it conflicts, obey the single-scene rules):`,
    planner || `Interpret the Japanese storyline visually with maximum clarity and memorability.`,
    ``,
    `Create a vivid, cinematic, bright, learner-friendly Japanese-inspired memory scene.`,
    `Every target word in this group must appear as a clear object, place, action, expression, or environmental detail.`,
    `Add readable Japanese labels beside each relevant visual element.`,
    `If a label contains kanji, show the hiragana reading above the kanji in furigana/ruby-text style.`,
    `Example label style:`,
    ``,
    `とうきょうえき`,
    `東京駅`,
    ``,
    `ちゅうかりょうり`,
    `中華料理`,
    ``,
    `Kana-only words do not require extra furigana unless helpful.`,
    `The labels should be readable and placed close to the correct visual element.`,
    ``,
    `STYLE`,
    `- high-quality educational illustration`,
    `- cinematic but bright enough for studying`,
    `- Japanese-inspired visual atmosphere`,
    `- warm, vivid, expressive, slightly magical realism`,
    `- slightly humorous but not chaotic`,
    `- clean composition with strong depth`,
    `- learner-friendly clarity`,
    `- avoid overcrowding`,
    ``,
    `STRICT RULES`,
    `- Every target vocabulary word in THIS group must be visually represented.`,
    `- Every target vocabulary word must have a Japanese label.`,
    `- Kanji labels must include hiragana reading above them.`,
    `- Do not add unrelated text.`,
    `- Do not add watermark.`,
    `- Do not make the image too dark.`,
    `- Do not use English labels unless explicitly requested.`,
    `- The image must feel like one connected story moment, not a collage of random objects.`,
    ``,
    `ASPECT RATIO`,
    `16:9`,
  ].join("\n");
}
