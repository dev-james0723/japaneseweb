import clsx from "clsx";
import { cookies } from "next/headers";

/**
 * Renders Japanese text with optional Romaji annotation above kanji-bearing tokens.
 * Honors the `show_romaji` user preference (mirrored to a cookie for fast SSR).
 *
 * For Phase 1 the splitting strategy is coarse: when a Romaji string is provided,
 * the entire word is annotated as one ruby. Future phases can extend with token
 * segmentation (kuromoji / kanji-only ruby).
 */

const KANJI_RE = /[一-龯㐀-䶿]/;

function hasKanji(text: string) {
  return KANJI_RE.test(text);
}

type Size = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
  xl: "text-3xl md:text-4xl",
};

export async function JapaneseText({
  text,
  romaji,
  size = "md",
  className,
  asBlock = false,
}: {
  text: string;
  romaji?: string | null;
  size?: Size;
  className?: string;
  asBlock?: boolean;
}) {
  const showRomaji = await getShowRomajiPreference();
  const showAnnotation = showRomaji && romaji && hasKanji(text);

  const Tag = asBlock ? "div" : "span";

  if (!showAnnotation) {
    return (
      <Tag className={clsx("font-jp", sizeClass[size], className)}>{text}</Tag>
    );
  }

  return (
    <Tag className={clsx("font-jp japanese-ruby", sizeClass[size], className)}>
      <ruby>
        {text}
        <rt>{romaji}</rt>
      </ruby>
    </Tag>
  );
}

async function getShowRomajiPreference(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const v = cookieStore.get("show_romaji")?.value;
    if (v === "false") return false;
    return true;
  } catch {
    return true;
  }
}
