import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cultural/cronAuth";
import {
  buildNotificationPlanner,
  isMissingNotificationSchemaError,
  persistPlannedNotifications,
} from "@/lib/notifications/planner";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

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

  const { data: prefsRows, error: prefsError } = await service
    .from("notification_preferences")
    .select("user_id")
    .eq("enabled", true);

  if (prefsError) {
    return NextResponse.json(
      {
        error: isMissingNotificationSchemaError(prefsError)
          ? "notification_preferences 尚未建立，請先執行 notification_planner migration。"
          : prefsError.message,
      },
      { status: isMissingNotificationSchemaError(prefsError) ? 503 : 500 },
    );
  }

  const results: Array<{ user_id: string; status: string; planned?: number; reason?: string }> = [];
  for (const row of prefsRows ?? []) {
    const userId = row.user_id as string;
    try {
      const planner = await buildNotificationPlanner(service, userId);
      if (!planner.schemaReady) {
        results.push({
          user_id: userId,
          status: "skipped",
          reason: planner.errors[0] ?? "schema_not_ready",
        });
        continue;
      }

      const persisted = await persistPlannedNotifications(service, userId, planner.planned);
      results.push({ user_id: userId, status: "planned", planned: persisted.count });
    } catch (error: unknown) {
      results.push({
        user_id: userId,
        status: "error",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    planned: results.reduce((sum, item) => sum + (item.planned ?? 0), 0),
    results,
  });
}
