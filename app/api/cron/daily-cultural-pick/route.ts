import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cultural/cronAuth";
import { runDailyCulturalPickForUser } from "@/lib/cultural/generateArticle";
import { resolveGeminiApiKey } from "@/lib/ai/geminiEnv";
import { todayDateString } from "@/lib/os/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!authorizeCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!resolveGeminiApiKey()) {
    return NextResponse.json({ error: "GEMINI_API_KEY 未設定" }, { status: 503 });
  }

  let service;
  try {
    service = createSupabaseServiceClient();
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Supabase service client unavailable" },
      { status: 503 },
    );
  }

  const { data: prefsRows, error: prefsErr } = await service
    .from("cultural_preferences")
    .select("user_id")
    .eq("daily_push_enabled", true);

  if (prefsErr) {
    const missing = /does not exist|schema cache/i.test(prefsErr.message);
    return NextResponse.json(
      {
        error: missing
          ? "cultural_preferences 尚未建立，請先執行 migration 0007。"
          : prefsErr.message,
      },
      { status: missing ? 503 : 500 },
    );
  }

  const today = todayDateString();
  const results: Array<{
    user_id: string;
    status: string;
    content_id?: string;
    topic?: string;
  }> = [];

  for (const row of prefsRows ?? []) {
    const userId = row.user_id as string;
    try {
      const outcome = await runDailyCulturalPickForUser(service, userId, today);
      if (outcome.ok) {
        results.push({
          user_id: userId,
          status: "created",
          content_id: outcome.contentId,
          topic: outcome.topic,
        });
      } else {
        results.push({ user_id: userId, status: outcome.reason });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "GEMINI_API_KEY_NOT_SET") {
        return NextResponse.json(
          { error: "GEMINI_API_KEY 未設定", processed: results },
          { status: 503 },
        );
      }
      results.push({ user_id: userId, status: "error:" + msg });
    }
  }

  return NextResponse.json({
    date: today,
    processed: results.length,
    results,
  });
}
