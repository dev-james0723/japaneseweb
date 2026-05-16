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
    `Create one high-quality Japanese vocabulary memory illustration based on the following storyline group.`,
    ``,
    `GOAL`,
    `The image should help learners remember Japanese vocabulary through picture memory, visual association, and storyline-based connection. Prioritize memorability, clarity, and concrete visual anchors over pure aesthetics.`,
    ``,
    `STORYLINE TITLE`,
    input.titleTraditionalChinese.trim(),
    ``,
    `JAPANESE STORYLINE`,
    input.storylineJapanese.trim(),
    ``,
    `TRADITIONAL CHINESE TRANSLATION`,
    input.storylineTraditionalChinese.trim(),
    ``,
    `TARGET VOCABULARY WORDS`,
    vocabBlock,
    ``,
    `VISUAL ANCHORS`,
    anchorBlock,
    ``,
    `ADDITIONAL SCENE DIRECTION (English — from vocabulary planner; follow closely)`,
    planner || `Interpret the Japanese storyline visually with maximum clarity and memorability.`,
    ``,
    `IMAGE REQUIREMENTS`,
    `Create a vivid, cinematic, slightly humorous Japanese-inspired memory scene that clearly visualizes the storyline.`,
    `Turn the Japanese storyline, Traditional Chinese translation, visual anchors, and planner scene direction above into concrete visible set pieces, props, signage, weather, time of day, and character actions so each vocabulary item is unmistakably present in the frame.`,
    `Weave all target vocabulary into ONE coherent continuous scene (not a collage of unrelated panels, not a generic word cloud).`,
    ``,
    `LABEL REQUIREMENTS`,
    `Add clear Japanese labels next to the relevant objects, actions, places, or characters.`,
    `Use the exact Japanese vocabulary forms provided under TARGET VOCABULARY WORDS.`,
    `If a Japanese label contains kanji, show the hiragana reading above it in furigana / ruby text style.`,
    `Example label style:`,
    ``,
    `とうきょうえき`,
    `東京駅`,
    ``,
    `ちゅうかりょうり`,
    `中華料理`,
    ``,
    `Kana-only words do not require extra furigana unless helpful.`,
    `The labels should be readable, subtle, and placed close to the correct visual element.`,
    ``,
    `STYLE`,
    `- high-quality educational illustration`,
    `- cinematic but bright enough for studying`,
    `- Japanese-inspired visual atmosphere`,
    `- warm, vivid, expressive, slightly magical realism`,
    `- slightly humorous but not chaotic`,
    `- clean composition`,
    `- strong depth and scene detail`,
    `- learner-friendly clarity`,
    `- no overcrowding`,
    ``,
    `STRICT RULES`,
    `- Every target vocabulary word must be visually represented.`,
    `- Every target vocabulary word must have a Japanese label.`,
    `- Kanji labels must include hiragana reading above them.`,
    `- Do not add unrelated text.`,
    `- Do not add watermark.`,
    `- Do not make the image too dark.`,
    `- Do not create a generic collage.`,
    `- Do not omit any vocabulary word.`,
    `- Do not use English labels unless explicitly requested.`,
    `- The image should be one coherent scene, not separate unrelated objects.`,
    ``,
    `ASPECT RATIO`,
    `16:9`,
  ].join("\n");
}
