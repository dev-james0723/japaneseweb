/** Substrings that must not appear in Stage-1 per-group `imagePrompt` (case-insensitive). */
export const BANNED_IMAGE_PROMPT_SUBSTRINGS = [
  "storyboard",
  "分鏡圖",
  "分鏡",
  "collage",
  "拼貼",
  "mosaic",
  "comic strip",
  "multi-panel",
  "multipanel",
  "mini-panel",
  "mini panel",
  "multiple panels",
  "separate panels",
  "side panels",
  "panel layout",
  "bottom strip",
  "bottom row",
  "bottom tiles",
  "word tiles",
  "tile strip",
  "grid of words",
  "split screen",
  "split-screen",
  "all scenes",
  "all storyline groups",
  "every word from the full",
  "every word from the whole",
  "all vocabulary words in one",
  "all words in one image",
  "include every word from",
  "single image containing all",
  "one image containing all",
];

/** Heuristic: mechanical four-seasons glue for unrelated items. */
export function looksLikeLazyFourSeasonsGlue(storylineJapanese: string): boolean {
  const t = storylineJapanese.replace(/\s/g, "");
  if (/春夏秋冬/.test(t)) return true;
  const hasAllSeasonKanji = /春/.test(t) && /夏/.test(t) && /秋/.test(t) && /冬/.test(t);
  if (!hasAllSeasonKanji) return false;
  return /四季|季節の変わり|季節が|季節で|春夏秋冬/.test(t);
}

export function errorsIndicateAggressiveRegroup(errors: string[]): boolean {
  const joined = errors.join(" ").toLowerCase();
  return (
    joined.includes("split into") ||
    joined.includes("multiple coherent") ||
    joined.includes("only one storyline") ||
    joined.includes("too many vocabulary") ||
    joined.includes("too many words in one group") ||
    (joined.includes("at least ") && joined.includes("storyline groups")) ||
    joined.includes("lazy four-seasons") ||
    joined.includes("banned storyboard") ||
    joined.includes("banned collage") ||
    joined.includes("out-of-group vocabulary")
  );
}
