/**
 * Normalizes Gemini / Google AI Studio API keys from env.
 * Fixes common copy-paste issues: BOM, line breaks, wrapping quotes, accidental "Bearer ".
 */

export function normalizeGeminiApiKey(raw: string | undefined): string {
  let s = (raw ?? "").replace(/^\uFEFF/, "").trim();
  s = s.replace(/[\r\n\t]+/g, "").trim();
  if (/^bearer\s+/i.test(s)) {
    s = s.replace(/^bearer\s+/i, "").trim();
  }
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * Reads the first non-empty key from common env names (Google samples use different names).
 */
export function resolveGeminiApiKey(): string {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    process.env.GOOGLE_API_KEY,
  ];
  for (const c of candidates) {
    const n = normalizeGeminiApiKey(c);
    if (n) return n;
  }
  return "";
}

/** Default vision-capable model for OCR; override with GEMINI_OCR_MODEL. */
export const DEFAULT_GEMINI_OCR_MODEL = "gemini-2.5-flash";

export function resolveGeminiOcrModel(): string {
  const raw = (process.env.GEMINI_OCR_MODEL ?? "").trim().replace(/[\r\n\t]+/g, "").trim();
  return raw || DEFAULT_GEMINI_OCR_MODEL;
}
