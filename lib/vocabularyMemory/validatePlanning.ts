import type { VocabularyMemoryPlanning } from "@/lib/ai/schemas/vocabularyMemoryPlanning";

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

  const assigned = new Map<string, number>();
  for (let gi = 0; gi < data.storylineGroups.length; gi++) {
    const g = data.storylineGroups[gi];
    const prefix = `Group ${gi + 1}`;
    if (!g.titleTraditionalChinese?.trim()) errors.push(`${prefix}: missing titleTraditionalChinese.`);
    if (!g.storylineJapanese?.trim()) errors.push(`${prefix}: missing storylineJapanese.`);
    if (!g.storylineTraditionalChinese?.trim()) errors.push(`${prefix}: missing storylineTraditionalChinese.`);
    if (!g.imagePrompt?.trim()) errors.push(`${prefix}: missing imagePrompt.`);
    if (!g.words?.length) errors.push(`${prefix}: words must be non-empty.`);

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

    for (const w of g.words) {
      const word = w.word.trim();
      if (!word) {
        errors.push(`${prefix}: empty word entry.`);
        continue;
      }
      if (!expectedSet.has(word)) {
        errors.push(`${prefix}: unknown or duplicate-surface word not in input list: "${word}".`);
      }
      if (hasKanji(word)) {
        const r = (w.reading ?? "").trim();
        if (!r) errors.push(`${prefix}: kanji word "${word}" needs hiragana reading.`);
      }
      assigned.set(word, (assigned.get(word) ?? 0) + 1);
    }
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
