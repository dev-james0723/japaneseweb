export type VocabPlanningInputItem = {
  japanese: string;
  kana?: string | null;
  romaji?: string | null;
  meaning_zh?: string | null;
};

export function buildVocabularyMemoryPlanningPrompt(
  items: VocabPlanningInputItem[],
  topicHint?: string | null,
) {
  const vocabularyList = items
    .map((x) => {
      const bits = [x.japanese];
      if (x.kana) bits.push(`読み: ${x.kana}`);
      if (x.romaji) bits.push(`Romaji: ${x.romaji}`);
      if (x.meaning_zh) bits.push(`繁中義: ${x.meaning_zh}`);
      return bits.join(" | ");
    })
    .join("\n");

  const hint = topicHint?.trim() ? topicHint.trim() : "(none)";

  return [
    `You are a Japanese vocabulary visual-memory designer, Japanese learning assistant, and prompt engineer.`,
    ``,
    `I will provide a Japanese vocabulary list, possibly extracted from text or image.`,
    ``,
    `Your job is to transform the vocabulary list into one or more vivid visual memory storyline groups.`,
    ``,
    `The goal is to help learners remember vocabulary through picture memory, scene-building, connection-making, and short natural storylines.`,
    ``,
    `INPUT VOCABULARY:`,
    vocabularyList,
    ``,
    `OPTIONAL TOPIC HINT:`,
    hint,
    ``,
    `TASK:`,
    `1. Analyze all vocabulary words.`,
    `2. Cluster them into 1 to N storyline groups.`,
    `3. Decide the number of groups dynamically based on the strongest memory and scene connections.`,
    `4. Do not hardcode the number of groups.`,
    `5. Every vocabulary word must appear in exactly one group (match the exact Japanese surface form from the list).`,
    `6. For each group, create a short but natural Japanese storyline in about 2 to 3 sentences.`,
    `7. The Japanese storyline may include additional connecting words, grammar, or non-target words to make the story natural and memorable.`,
    `8. Provide a full Traditional Chinese translation of that storyline.`,
    `9. For each vocabulary word in the group, explain how it appears visually in the image (visualAnchor) and its narrative role (roleInStory).`,
    `10. For any Japanese word containing kanji, provide hiragana reading in the "reading" field.`,
    `11. Create one English image prompt for each group (imagePrompt) that is specific to that storyline only.`,
    ``,
    `GROUPING PRINCIPLES:`,
    `- same location or setting`,
    `- same action chain`,
    `- same daily-life context`,
    `- emotional or social interaction`,
    `- visual compatibility`,
    `- humorous or vivid narrative potential`,
    `- memory usefulness`,
    ``,
    `VISUAL GOAL:`,
    `The generated image should help learners remember vocabulary through strong picture memory.`,
    `The scene should be vivid, concrete, and easy to visualize.`,
    `All target vocabulary must be visibly represented in the image.`,
    ``,
    `LABEL REQUIREMENTS (must be reflected inside each imagePrompt):`,
    `- Use exact Japanese vocabulary labels in the image`,
    `- If a label contains kanji, show hiragana above it in furigana / ruby-text style`,
    `- Keep labels readable and placed near relevant objects/actions`,
    ``,
    `IMAGE PROMPT REQUIREMENTS (English, per group):`,
    `- one vivid, high-quality Japanese vocabulary memory scene`,
    `- one coherent mini-storyline`,
    `- strong scene details`,
    `- every vocabulary word clearly visualized`,
    `- Japanese labels beside the relevant objects/actions/places`,
    `- hiragana above kanji labels in ruby-text style`,
    `- no watermark`,
    `- no unrelated text`,
    `- bright enough for studying`,
    `- strong memorization value`,
    `- high-quality composition`,
    `- aspect ratio: 16:9 unless otherwise specified`,
    ``,
    `OUTPUT ONLY VALID JSON.`,
    `Do not include markdown.`,
    `Do not include commentary outside JSON.`,
    ``,
    `Return this JSON structure:`,
    `{`,
    `  "vocabulary": [`,
    `    { "word": "", "reading": "", "meaningTraditionalChinese": "" }`,
    `  ],`,
    `  "storylineGroups": [`,
    `    {`,
    `      "groupId": 1,`,
    `      "titleTraditionalChinese": "",`,
    `      "storylineJapanese": "",`,
    `      "storylineTraditionalChinese": "",`,
    `      "words": [`,
    `        { "word": "", "reading": "", "meaningTraditionalChinese": "", "visualAnchor": "", "roleInStory": "" }`,
    `      ],`,
    `      "imagePrompt": ""`,
    `    }`,
    `  ]`,
    `}`,
  ].join("\n");
}

export function buildVocabularyMemoryPlanningRepairPrompt(opts: {
  expectedWords: string[];
  previousJson: unknown;
  validationErrors: string[];
}) {
  return [
    `You previously returned JSON for a Japanese vocabulary memory planning task, but it failed validation.`,
    ``,
    `FIX the JSON so ALL rules are satisfied. Output ONLY valid JSON with the same schema as before (vocabulary + storylineGroups).`,
    ``,
    `REQUIRED Japanese surface forms (each must appear in EXACTLY ONE group's words[].word, no duplicates, no omissions):`,
    JSON.stringify(opts.expectedWords),
    ``,
    `VALIDATION ERRORS:`,
    ...opts.validationErrors.map((e) => `- ${e}`),
    ``,
    `INVALID PREVIOUS JSON (repair this):`,
    JSON.stringify(opts.previousJson),
  ].join("\n");
}
