import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cultural/cronAuth";
import { ingestDailyFeedSources } from "@/lib/cultural/feedIngest";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!authorizeCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let service;
  try {
    service = createSupabaseServiceClient();
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase service client unavailable" },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const limitSources = positiveInt(url.searchParams.get("sources"), 20);
  const limitItemsPerSource = positiveInt(url.searchParams.get("items"), 8);

  try {
    const result = await ingestDailyFeedSources(service, {
      limitSources,
      limitItemsPerSource,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = errorMessage(error);
    const missing = isMissingDailyFeedTable(error, message);
    return NextResponse.json(
      {
        error: missing
          ? "Daily Feed 資料表尚未建立。請先執行 migration 20260604095242_daily_feed_pipeline.sql。"
          : message,
      },
      { status: missing ? 503 : 500 },
    );
  }
}

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 50);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  const record = asRecord(error);
  if (record) {
    const fields = ["message", "details", "hint", "code"]
      .map((key) => record[key])
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    if (fields.length) return fields.join(" ");
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isMissingDailyFeedTable(error: unknown, message: string) {
  const record = asRecord(error);
  const code = typeof record?.code === "string" ? record.code : "";
  return /does not exist|schema cache|PGRST205|42P01|content_sources|content_items/i.test(
    `${code} ${message}`,
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
