import { NextResponse } from "next/server";

/**
 * Phase 1 stub for the TTS endpoint.
 *
 * The full pipeline (Amazon Polly + Supabase Storage audio cache keyed by
 * sha-256(text + voiceId + languageCode + provider)) is scheduled for Phase 6.
 *
 * For now this returns a deterministic 501 so the SpeakerButton renders an
 * error state instead of silently appearing functional.
 */
export async function POST() {
  return NextResponse.json(
    { error: "TTS not yet wired up (Phase 6: Amazon Polly + cache)" },
    { status: 501 },
  );
}
