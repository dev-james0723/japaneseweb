import { createHash } from "crypto";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Build a stable cache key for TTS audio. */
export function ttsCacheKey(opts: {
  text: string;
  provider: string;
  voiceId: string;
  languageCode: string;
}): { normalized: string; hash: string } {
  const normalized = opts.text.normalize("NFC").trim();
  const composite = [
    normalized,
    opts.provider.toLowerCase(),
    opts.voiceId,
    opts.languageCode,
  ].join("|");
  return { normalized, hash: sha256Hex(composite) };
}
