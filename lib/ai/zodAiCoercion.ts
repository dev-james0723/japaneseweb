import { z } from "zod";

function toAiString(v: string | number | bigint | boolean): string {
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return v;
  return String(v);
}

/**
 * OpenAI JSON mode sometimes returns numbers (e.g. jlpt_level: 5) or booleans
 * where we expect strings. Coerce so validation matches real model output.
 */
export function aiOptionalNullableString() {
  return z
    .union([z.string(), z.number(), z.bigint(), z.boolean(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      return toAiString(v);
    });
}

export function aiRequiredStringMin1() {
  return z
    .union([z.string(), z.number(), z.bigint(), z.boolean()])
    .transform((v) => toAiString(v).trim())
    .pipe(z.string().min(1));
}

export function aiOptionalNullablePriorityTier() {
  return z.preprocess(
    (val: unknown) => {
      if (val === null || val === undefined) return val;
      if (typeof val === "number" && Number.isFinite(val)) return Math.trunc(val);
      if (typeof val === "string") {
        const t = val.trim();
        const tierMatch = /^tier\s*(\d)/i.exec(t);
        if (tierMatch) return parseInt(tierMatch[1], 10);
        const n = parseInt(t, 10);
        if (!Number.isNaN(n)) return n;
      }
      return val;
    },
    z.number().int().min(1).max(3).nullable().optional(),
  );
}
