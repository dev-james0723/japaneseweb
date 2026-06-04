import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

let initPromise: Promise<Kuroshiro> | null = null;

const KANA_READING_PARENS =
  /([\u3400-\u9fff\uf900-\ufaff々〆ぁ-んァ-ンー]+)[（(]([ぁ-んァ-ンー・\s]+)[）)]/g;

function getKuroshiro(): Promise<Kuroshiro> {
  if (!initPromise) {
    initPromise = (async () => {
      const kuroshiro = new Kuroshiro();
      await kuroshiro.init(new KuromojiAnalyzer());
      return kuroshiro;
    })();
  }
  return initPromise;
}

export function stripInlineKanaReadings(text: string): string {
  return text
    .replace(KANA_READING_PARENS, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Convert Japanese plain text to HTML with <ruby> furigana annotations. */
export async function toFuriganaHtml(text: string): Promise<string> {
  const trimmed = stripInlineKanaReadings(text);
  if (!trimmed) return "";

  const kuroshiro = await getKuroshiro();
  return kuroshiro.convert(trimmed, { to: "hiragana", mode: "furigana" });
}
