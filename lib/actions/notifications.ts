"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  buildNotificationPlanner,
  isMissingNotificationSchemaError,
  persistPlannedNotifications,
} from "@/lib/notifications/planner";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const TimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "時間格式必須是 HH:MM。");

const NotificationPreferencesSchema = z.object({
  enabled: z.boolean(),
  browserNotificationsEnabled: z.boolean(),
  adaptiveTimingEnabled: z.boolean(),
  timeZone: z.string().trim().min(1).max(80),
  morningTime: TimeSchema,
  quietStart: TimeSchema,
  quietEnd: TimeSchema,
  maxPerDay: z.number().int().min(1).max(8),
  reviewDueEnabled: z.boolean(),
  curiosityEnabled: z.boolean(),
  goalPressureEnabled: z.boolean(),
  streakRescueEnabled: z.boolean(),
  weeklyReviewEnabled: z.boolean(),
  examModeEnabled: z.boolean(),
  dailyPlanEnabled: z.boolean(),
  outputNudgeEnabled: z.boolean(),
});

const OutcomeSchema = z.object({
  eventId: z.string().uuid().nullable().optional(),
  outcomeType: z.enum([
    "opened",
    "completed_after_open",
    "dismissed",
    "snoozed",
    "permission_granted",
    "permission_denied",
    "test_sent",
  ]),
  deepLink: z.string().max(240).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

async function getUserClient() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function saveNotificationPreferencesAction(input: z.infer<typeof NotificationPreferencesSchema>) {
  const parsed = NotificationPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "格式錯誤：" + parsed.error.issues[0]?.message };
  }

  const timeZone = normalizeTimeZone(parsed.data.timeZone);
  if (!timeZone) return { ok: false as const, error: "Time zone 無效。" };

  const { supabase, user } = await getUserClient();
  if (!user) return { ok: false as const, error: "未登入。" };

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        enabled: parsed.data.enabled,
        browser_notifications_enabled: parsed.data.browserNotificationsEnabled,
        adaptive_timing_enabled: parsed.data.adaptiveTimingEnabled,
        time_zone: timeZone,
        morning_time: parsed.data.morningTime,
        quiet_start: parsed.data.quietStart,
        quiet_end: parsed.data.quietEnd,
        max_per_day: parsed.data.maxPerDay,
        review_due_enabled: parsed.data.reviewDueEnabled,
        curiosity_enabled: parsed.data.curiosityEnabled,
        goal_pressure_enabled: parsed.data.goalPressureEnabled,
        streak_rescue_enabled: parsed.data.streakRescueEnabled,
        weekly_review_enabled: parsed.data.weeklyReviewEnabled,
        exam_mode_enabled: parsed.data.examModeEnabled,
        daily_plan_enabled: parsed.data.dailyPlanEnabled,
        output_nudge_enabled: parsed.data.outputNudgeEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return {
      ok: false as const,
      error: isMissingNotificationSchemaError(error)
        ? "notification tables 尚未建立，請先執行 notification_planner migration。"
        : "儲存失敗：" + error.message,
    };
  }

  revalidatePath("/notifications");
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function recordNotificationOutcomeAction(input: z.infer<typeof OutcomeSchema>) {
  const parsed = OutcomeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "格式錯誤：" + parsed.error.issues[0]?.message };
  }

  const { supabase, user } = await getUserClient();
  if (!user) return { ok: false as const, error: "未登入。" };

  const now = new Date().toISOString();
  const { error } = await supabase.from("notification_outcomes").insert({
    user_id: user.id,
    event_id: parsed.data.eventId ?? null,
    outcome_type: parsed.data.outcomeType,
    deep_link: parsed.data.deepLink ?? null,
    metadata: parsed.data.metadata ?? {},
    occurred_at: now,
  });

  if (error) {
    return {
      ok: false as const,
      error: isMissingNotificationSchemaError(error)
        ? "notification tables 尚未建立，暫時未能記錄 outcome。"
        : "記錄失敗：" + error.message,
    };
  }

  if (parsed.data.eventId) {
    const patch = eventPatchForOutcome(parsed.data.outcomeType, now);
    if (patch) {
      await supabase
        .from("notification_events")
        .update(patch)
        .eq("id", parsed.data.eventId)
        .eq("user_id", user.id);
    }
  }

  if (parsed.data.outcomeType === "permission_granted" || parsed.data.outcomeType === "permission_denied") {
    await supabase
      .from("notification_preferences")
      .update({
        browser_notifications_enabled: parsed.data.outcomeType === "permission_granted",
        updated_at: now,
      })
      .eq("user_id", user.id);
  }

  revalidatePath("/notifications");
  return { ok: true as const };
}

export async function planNotificationsNowAction() {
  const { supabase, user } = await getUserClient();
  if (!user) return { ok: false as const, error: "未登入。" };

  const planner = await buildNotificationPlanner(supabase, user.id);
  if (!planner.schemaReady) {
    return {
      ok: false as const,
      error: planner.errors[0] ?? "notification tables 尚未建立。",
    };
  }

  try {
    const result = await persistPlannedNotifications(supabase, user.id, planner.planned);
    revalidatePath("/notifications");
    return { ok: true as const, count: result.count };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false as const, error: "建立提醒失敗：" + message };
  }
}

function eventPatchForOutcome(outcomeType: z.infer<typeof OutcomeSchema>["outcomeType"], now: string) {
  if (outcomeType === "opened") {
    return { opened: true, opened_at: now, status: "opened" };
  }
  if (outcomeType === "completed_after_open") {
    return { completed_after_open: true, completed_at: now, status: "completed" };
  }
  if (outcomeType === "dismissed") {
    return { dismissed_at: now, status: "dismissed" };
  }
  return null;
}

function normalizeTimeZone(value: string) {
  const trimmed = value.trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format(new Date(0));
    return trimmed;
  } catch {
    return null;
  }
}
