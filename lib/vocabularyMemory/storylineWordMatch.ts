/**
 * Decide whether a vocabulary "word" from the planner is reflected in storylineJapanese.
 * The model often uses kanji spellings, inflected forms, or variant characters vs OCR/kana input.
 */

const ORTH_ALIASES: [string, string][] = [
  ["狭い", "狹い"],
  ["狹い", "狭い"],
  ["辛い", "からい"],
  ["からい", "辛い"],
];

/** Hiragana-only headwords → common kanji spellings that often appear in stories instead. */
const HIRAGANA_TO_KANJI_SPELLINGS: Record<string, string[]> = {
  おいしい: ["美味しい", "美味し"],
  あつい: ["暑い", "熱い"],
  つめたい: ["冷たい"],
  たかい: ["高い"],
  ひろい: ["広い", "廣い"],
  せまい: ["狭い", "狹い"],
  あかるい: ["明るい"],
  くらい: ["暗い"],
  さむい: ["寒い"],
  あたたかい: ["暖かい", "温かい"],
  からい: ["辛い"],
};

function collectVariants(word: string, reading?: string | null): Set<string> {
  const out = new Set<string>();
  const w = word.trim();
  if (!w) return out;
  out.add(w);
  try {
    out.add(w.normalize("NFKC"));
  } catch {
    /* ignore */
  }
  const r = reading?.trim();
  if (r) {
    out.add(r);
    try {
      out.add(r.normalize("NFKC"));
    } catch {
      /* ignore */
    }
  }
  for (const alt of HIRAGANA_TO_KANJI_SPELLINGS[w] ?? []) {
    out.add(alt);
    try {
      out.add(alt.normalize("NFKC"));
    } catch {
      /* ignore */
    }
  }
  return out;
}

function storyContainsAnyVariant(storyline: string, variants: Set<string>): boolean {
  let s = storyline;
  try {
    s = storyline.normalize("NFKC");
  } catch {
    /* keep raw */
  }
  for (const v of variants) {
    if (!v) continue;
    if (storyline.includes(v)) return true;
    try {
      if (s.includes(v.normalize("NFKC"))) return true;
    } catch {
      if (s.includes(v)) return true;
    }
  }
  return false;
}

/** い-adjective style: allow common inflections when dictionary form is not substring of the story. */
function matchesIAdjectiveInflections(storyline: string, word: string): boolean {
  if (word.length < 2 || !word.endsWith("い")) return false;
  if (word === "いい") return false;
  const stem = word.slice(0, -1);
  if (stem.length < 1) return false;
  const tails = [
    "かった",
    "くて",
    "くない",
    "ければ",
    "かったら",
    "すぎる",
    "すぎた",
    "さ",
    "く",
    "けれ",
  ];
  for (const t of tails) {
    if (storyline.includes(stem + t)) return true;
  }
  return false;
}

function matchesIiYoiiVariants(storyline: string, word: string): boolean {
  if (word === "いい") {
    return (
      storyline.includes("よい") ||
      storyline.includes("良い") ||
      storyline.includes("よかった") ||
      storyline.includes("良かった")
    );
  }
  if (word === "よい") {
    return storyline.includes("いい") || storyline.includes("良い");
  }
  if (word === "良い") {
    return storyline.includes("いい") || storyline.includes("よい");
  }
  return false;
}

function matchesOrthographicAliases(storyline: string, word: string): boolean {
  for (const [a, b] of ORTH_ALIASES) {
    if (word === a && storyline.includes(b)) return true;
    if (word === b && storyline.includes(a)) return true;
  }
  return false;
}

/**
 * Returns true if the storyline clearly references the lemma (surface, reading,
 * common spelling swap, い-adjective inflection, or いい/よい/良い).
 */
export function wordAppearsInJapaneseStoryline(
  storylineJapanese: string,
  word: string,
  reading?: string | null,
): boolean {
  const variants = collectVariants(word, reading);
  if (storyContainsAnyVariant(storylineJapanese, variants)) return true;
  if (matchesOrthographicAliases(storylineJapanese, word.trim())) return true;
  if (matchesIAdjectiveInflections(storylineJapanese, word.trim())) return true;
  if (matchesIiYoiiVariants(storylineJapanese, word.trim())) return true;
  return false;
}
