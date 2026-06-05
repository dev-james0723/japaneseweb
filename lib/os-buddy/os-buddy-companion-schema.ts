import { z } from "zod";

export const OSBuddyMiniGameSchema = z.enum(["kana-catch", "focus-tap", "study-desk-reset", "play-ball"]);

export const OSBuddyCompanionKindSchema = z.enum([
  "boot",
  "review",
  "deck",
  "grammar",
  "mining",
  "journal",
  "roleplay",
  "tts",
  "streak",
  "settings",
  "game",
  "fallback",
]);

export const OSBuddyCompanionResponseSchema = z.object({
  message: z.string().min(1).max(220),
  kind: OSBuddyCompanionKindSchema,
  source: z.enum(["ai", "local", "fallback"]),
  cta: z
    .object({
      label: z.string().min(1).max(32),
      game: OSBuddyMiniGameSchema,
    })
    .nullable()
    .optional(),
});

export const OSBuddyCompanionRequestSchema = z.object({
  pathname: z.string().optional(),
  kind: OSBuddyCompanionKindSchema.optional(),
  context: z.unknown().optional(),
});

