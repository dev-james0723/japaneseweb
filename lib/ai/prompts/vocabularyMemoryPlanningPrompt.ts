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
  const n = items.length;

  return [
    `You are a Japanese vocabulary visual-memory designer, Japanese learning assistant, and prompt engineer.`,
    ``,
    `I will provide a Japanese vocabulary list, possibly extracted from text or image.`,
    `This batch contains ${n} vocabulary items.`,
    ``,
    `Your job is to transform the vocabulary list into one or more vivid visual memory storyline groups.`,
    `Each storyline group will later become its own independent memory scene and its own single generated image.`,
    ``,
    `The goal is to help learners remember vocabulary through picture memory, scene-building, connection-making, and short natural storylines.`,
    ``,
    `INPUT VOCABULARY:`,
    vocabularyList,
    ``,
    `OPTIONAL TOPIC HINT:`,
    hint,
    ``,
    `CRITICAL ARCHITECTURE (do not violate):`,
    `- One vocabulary batch may produce MULTIPLE storyline groups when needed.`,
    `- Each storyline group must map to ONE separate image later. Never plan one giant collage/storyboard that squeezes the whole batch into a single frame.`,
    `- "分鏡" here means multiple independent scene plans across groups — NOT "draw every word as mini-panels inside one image".`,
    `- If some words do not naturally fit the same setting + action flow, put them in a different storyline group.`,
    ``,
    `TASK:`,
    `1. Analyze all vocabulary words.`,
    `2. Cluster them into 1 to N storyline groups by strong scene + action + visual-memory connections.`,
    `3. Decide N dynamically (do not hardcode N). Prefer more groups when the list is large or words are only weakly related.`,
    `4. Every vocabulary word must appear in exactly one group (words[].word MUST copy the exact Japanese surface form from the INPUT list — character-for-character, including kana vs kanji choices).`,
    `4b. Before you output JSON, mentally COUNT: the number of distinct words[] entries across all groups must equal ${n} and must match the input list with no omissions and no duplicates.`,
    `5. For each group, write a natural Japanese mini-scene in about 2 to 3 sentences.`,
    `6. The Japanese storyline may include connecting words not in the target list.`,
    `7. Provide a full Traditional Chinese translation of that Japanese storyline.`,
    `8. For each vocabulary word in the group, provide visualAnchor and roleInStory that are specific to THIS group's storyline (no generic filler).`,
    `9. For any Japanese word containing kanji, provide hiragana reading in the "reading" field.`,
    `10. For each group, write imagePrompt in English that describes ONLY that group's single coherent scene.`,
    ``,
    `GROUP SIZE GUIDANCE (soft, but important):`,
    `- Prefer about 4 to 8 target words per group when the batch is large enough to split.`,
    `- If one coherent scene cannot clearly show every word without overcrowding, split into additional groups BEFORE writing imagePrompt.`,
    `- 1 to 6 words: often 1 group (split only if clearly incoherent together).`,
    `- 7 to 12 words: often 2 groups.`,
    `- 13 to 20 words: often 3 groups.`,
    `- 21+ words: often 3 to 5 groups.`,
    `- If total words > 8: do NOT return a single storyline group unless every word truly shares one tight setting + one continuous action chain (rare).`,
    `- If total words >= 13: strongly prefer at least 3 storyline groups unless you can justify one continuous scene (still never a collage).`,
    ``,
    `GROUPING QUALITY (reject bad clusters):`,
    `- Good: one main setting, one main action flow, clear visual anchors, a natural mini-story, strong mutual memorability.`,
    `- Bad: unrelated words forced together, collage thinking, "four seasons" lists that only glue unrelated items, separate-object inventories.`,
    ``,
    `imagePrompt RULES (English, per group):`,
    `- Describe ONE high-quality Japanese vocabulary memory illustration for THIS group's storyline ONLY.`,
    `- Do NOT instruct the image model to include words from other groups.`,
    `- Do NOT ask for a storyboard, comic layout, collage, grids, split screens, multiple panels, bottom strips, mini-panels, or extra tiles to "fit leftover words".`,
    `- Do NOT ask for "one image containing all scenes" or "include every word from the full list".`,
    `- Do NOT mention other groups or the entire batch.`,
    `- Every visual and label requirement must stay within THIS group's words[] list.`,
    `- Ask for one connected story moment: bright, learner-friendly, cinematic, 16:9, readable Japanese labels with furigana above kanji.`,
    ``,
    `STORYLINE RULES:`,
    `- storylineJapanese must clearly reference EVERY target word from that group's words[].`,
    `- Prefer using the EXACT same surface string as words[].word inside storylineJapanese when possible (especially for kana-only OCR items).`,
    `- If you use a natural inflection (e.g. 寒い→寒かった, 高い→高かった) or a common kanji spelling for a kana lemma (e.g. おいしい→美味しい), that is allowed as long as the learner can still tie the sentence to that vocabulary item.`,
    `- storylineTraditionalChinese must be a faithful full translation of storylineJapanese.`,
    ``,
    `VISUAL GOAL:`,
    `The later image should be one coherent scene that can be remembered as a picture; not a crowded inventory.`,
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
    `CRITICAL: Put EVERY word from the required list into exactly one group's words[].word (exact spelling). If any word is missing from all groups, the plan is invalid.`,
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

export function buildVocabularyMemoryAggressiveRegroupPrompt(opts: {
  items: VocabPlanningInputItem[];
  topicHint?: string | null;
  expectedWords: string[];
  previousJson: unknown;
  validationErrors: string[];
}) {
  const vocabularyList = opts.items
    .map((x) => {
      const bits = [x.japanese];
      if (x.kana) bits.push(`読み: ${x.kana}`);
      if (x.romaji) bits.push(`Romaji: ${x.romaji}`);
      if (x.meaning_zh) bits.push(`繁中義: ${x.meaning_zh}`);
      return bits.join(" | ");
    })
    .join("\n");

  const hint = opts.topicHint?.trim() ? opts.topicHint.trim() : "(none)";

  return [
    `The previous grouping is too broad and would create one overcrowded collage image.`,
    `Please REGROUP the vocabulary into multiple independent storyline groups.`,
    ``,
    `Rules:`,
    `- Do not put all words into one group unless they truly form one coherent mini-story with one setting and one continuous action flow.`,
    `- Do not plan a storyboard/collage/multi-panel layout to include the whole list in one image.`,
    `- Split by scene connection, action flow, and visual memory usefulness.`,
    `- Each group becomes ONE separate image later — plan accordingly.`,
    `- Usually aim for about 4 to 8 words per group when the batch is large.`,
    `- Every word must appear in exactly one group (exact Japanese surface form).`,
    `- Each group's storylineJapanese must reference every word in that group (dictionary form, common inflections like …かった, or common kanji spellings for kana lemmas are OK).`,
    `- Each group needs a natural 2–3 sentence Japanese storyline and a full Traditional Chinese translation.`,
    `- Each group's imagePrompt must describe ONLY that group's single scene, with no collage/panel/strip instructions.`,
    `- Avoid lazy "four seasons" glue stories that only enumerate unrelated items across seasons.`,
    ``,
    `INPUT VOCABULARY (${opts.expectedWords.length} items):`,
    vocabularyList,
    ``,
    `OPTIONAL TOPIC HINT:`,
    hint,
    ``,
    `REQUIRED Japanese surface forms:`,
    JSON.stringify(opts.expectedWords),
    ``,
    `VALIDATION ERRORS TO FIX:`,
    ...opts.validationErrors.map((e) => `- ${e}`),
    ``,
    `INVALID PREVIOUS JSON:`,
    JSON.stringify(opts.previousJson),
    ``,
    `Return ONLY valid JSON using the required schema (vocabulary + storylineGroups).`,
  ].join("\n");
}
