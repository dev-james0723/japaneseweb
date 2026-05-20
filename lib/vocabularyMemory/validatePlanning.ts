import type { VocabularyMemoryPlanning } from "@/lib/ai/schemas/vocabularyMemoryPlanning";
import {
  BANNED_IMAGE_PROMPT_SUBSTRINGS,
  looksLikeLazyFourSeasonsGlue,
} from "@/lib/vocabularyMemory/planningValidationPolicy";
import { wordAppearsInJapaneseStoryline } from "@/lib/vocabularyMemory/storylineWordMatch";

const KANJI_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

function countJapaneseSentences(text: string): number {
  const parts = text
    .split(/[。！？.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return Math.max(parts.length, text.trim() ? 1 : 0);
}

function hasKanji(s: string) {
  return KANJI_RE.test(s);
}

function validateBannedImagePromptPhrases(imagePrompt: string, prefix: string, errors: string[]) {
  const lower = imagePrompt.toLowerCase();
  for (const bad of BANNED_IMAGE_PROMPT_SUBSTRINGS) {
    if (lower.includes(bad.toLowerCase())) {
      errors.push(
        `${prefix}: imagePrompt contains banned collage/storyboard wording ("${bad}"). Rewrite imagePrompt as ONE single-scene description for this group's words only.`,
      );
    }
  }
}

function validateImagePromptDoesNotReferenceOtherGroupWords(
  imagePrompt: string,
  groupWordSet: Set<string>,
  expectedWords: string[],
  prefix: string,
  errors: string[],
) {
  for (const w of expectedWords) {
    if (groupWordSet.has(w)) continue;
    if (w.length < 2) continue;
    if (imagePrompt.includes(w)) {
      errors.push(
        `${prefix}: imagePrompt must not reference out-of-group vocabulary "${w}". Keep the English prompt scoped to this group's words only.`,
      );
    }
  }
}

function validateWordsAppearInStoryline(
  storylineJapanese: string,
  words: { word: string; reading?: string | null }[],
  prefix: string,
  errors: string[],
) {
  for (const entry of words) {
    const w = entry.word.trim();
    if (w.length === 0) continue;
    if (w.length === 1) {
      if (hasKanji(w) && !wordAppearsInJapaneseStoryline(storylineJapanese, w, entry.reading)) {
        errors.push(
          `${prefix}: storylineJapanese must include the target word "${w}" (or its reading / natural inflection).`,
        );
      }
      continue;
    }
    if (!wordAppearsInJapaneseStoryline(storylineJapanese, w, entry.reading)) {
      errors.push(
        `${prefix}: storylineJapanese must include the target word "${w}" (or its reading, common kanji spelling, or natural い-adjective inflection such as …かった).`,
      );
    }
  }
}

function validateMinStorylineGroups(total: number, groupCount: number, errors: string[]) {
  if (total > 8 && groupCount < 2) {
    errors.push(
      `Too many vocabulary items (${total}) for only one storyline group. Split into multiple coherent storyline groups (each becomes its own image).`,
    );
  }
  if (total >= 13 && groupCount < 3) {
    errors.push(
      `With ${total} vocabulary items, use at least 3 storyline groups unless the entire list is one extremely tight continuous scene (still never a collage).`,
    );
  }
}

export type PlanningValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

/** Validate semantic rules after Zod parse. `expectedWords` = distinct japanese forms from user deck. */
export function validateVocabularyMemoryPlanning(
  data: VocabularyMemoryPlanning,
  expectedWords: string[],
): PlanningValidationResult {
  const errors: string[] = [];
  const expectedSet = new Set(expectedWords);
  if (expectedSet.size === 0) {
    errors.push("No input vocabulary.");
  }

  const total = expectedWords.length;
  const groupCount = data.storylineGroups.length;
  validateMinStorylineGroups(total, groupCount, errors);

  const assigned = new Map<string, number>();
  for (let gi = 0; gi < data.storylineGroups.length; gi++) {
    const g = data.storylineGroups[gi];
    const prefix = `Group ${gi + 1}`;
    if (!g.titleTraditionalChinese?.trim()) errors.push(`${prefix}: missing titleTraditionalChinese.`);
    if (!g.storylineJapanese?.trim()) errors.push(`${prefix}: missing storylineJapanese.`);
    if (!g.storylineTraditionalChinese?.trim()) errors.push(`${prefix}: missing storylineTraditionalChinese.`);
    if (!g.imagePrompt?.trim()) errors.push(`${prefix}: missing imagePrompt.`);
    if (!g.words?.length) errors.push(`${prefix}: words must be non-empty.`);

    if (g.words.length > 8) {
      errors.push(
        `${prefix}: too many words in one group (${g.words.length}). Split into smaller groups (prefer about 4–8 words per image) so each scene stays clear.`,
      );
    }

    const sj = g.storylineJapanese.trim();
    const sc = countJapaneseSentences(sj);
    const hasBoundary = /[。！？]/.test(sj);
    if (hasBoundary && (sc < 2 || sc > 5)) {
      errors.push(
        `${prefix}: storylineJapanese should be about 2–3 sentences (found ~${sc} segment(s)); adjust length.`,
      );
    }
    if (!hasBoundary && sj.length < 45) {
      errors.push(
        `${prefix}: storylineJapanese should read as a short mini-scene (about 2–3 sentences); add natural sentence boundaries (。/！/？).`,
      );
    }

    const groupWordSet = new Set<string>();
    for (const w of g.words) {
      const word = w.word.trim();
      if (!word) {
        errors.push(`${prefix}: empty word entry.`);
        continue;
      }
      groupWordSet.add(word);
      if (!expectedSet.has(word)) {
        errors.push(`${prefix}: unknown or duplicate-surface word not in input list: "${word}".`);
      }
      if (hasKanji(word)) {
        const r = (w.reading ?? "").trim();
        if (!r) errors.push(`${prefix}: kanji word "${word}" needs hiragana reading.`);
      }
      assigned.set(word, (assigned.get(word) ?? 0) + 1);
    }

    if (g.imagePrompt?.trim()) {
      validateBannedImagePromptPhrases(g.imagePrompt, prefix, errors);
      validateImagePromptDoesNotReferenceOtherGroupWords(
        g.imagePrompt,
        groupWordSet,
        expectedWords,
        prefix,
        errors,
      );
    }

    if (g.words.length >= 6 && looksLikeLazyFourSeasonsGlue(g.storylineJapanese)) {
      errors.push(
        `${prefix}: storyline looks like lazy four-seasons glue; regroup using stronger visual/action connections instead of seasonal enumeration.`,
      );
    }

    validateWordsAppearInStoryline(g.storylineJapanese, g.words, prefix, errors);
  }

  for (const w of expectedWords) {
    const c = assigned.get(w) ?? 0;
    if (c === 0) errors.push(`Missing vocabulary assignment for: "${w}".`);
    if (c > 1) errors.push(`Duplicate vocabulary assignment across groups for: "${w}".`);
  }

  for (const [w, c] of assigned) {
    if (!expectedSet.has(w) && c > 0) {
      /* already reported */
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}
