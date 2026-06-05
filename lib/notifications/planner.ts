import type { SupabaseClient } from "@supabase/supabase-js";
import { getTodayDailyPick, type CulturalContentSummary } from "@/lib/cultural/queries";
import {
  fetchDueReviewBreakdown,
  fetchOsSettings,
  fetchStreak,
  fetchTodayBootLog,
  fetchWeeklyStats,
  type DueReviewBreakdown,
} from "@/lib/os/queries";
import {
  MODE_INFO,
  dateStringInTimeZone,
  weekStartDate,
  type DailyMode,
  type OsBootLog,
  type UserOsSettings,
} from "@/lib/os/types";

export type NotificationType =
  | "due_review"
  | "curiosity"
  | "goal"
  | "streak"
  | "weekly"
  | "exam_mode"
  | "daily_plan"
  | "output_nudge";

export type NotificationPreference = {
  user_id: string;
  enabled: boolean;
  browser_notifications_enabled: boolean;
  adaptive_timing_enabled: boolean;
  time_zone: string;
  morning_time: string;
  quiet_start: string;
  quiet_end: string;
  max_per_day: number;
  review_due_enabled: boolean;
  curiosity_enabled: boolean;
  goal_pressure_enabled: boolean;
  streak_rescue_enabled: boolean;
  weekly_review_enabled: boolean;
  exam_mode_enabled: boolean;
  daily_plan_enabled: boolean;
  output_nudge_enabled: boolean;
  last_planned_at: string | null;
};

export type PlannedNotification = {
  type: NotificationType;
  eventId?: string | null;
  eventDate: string;
  scheduledAt: string;
  userLocalTime: string;
  deepLink: string;
  title: string;
  body: string;
  reason: string;
  priority: number;
  metadata: Record<string, unknown>;
};

export type NotificationEventSummary = {
  id: string;
  type: NotificationType;
  event_date: string;
  scheduled_at: string;
  user_local_time: string;
  deep_link: string;
  title: string;
  body: string;
  reason: string;
  status: string;
  opened: boolean;
  completed_after_open: boolean;
  created_at: string;
};

export type NotificationTimingProfile = {
  suggestedTime: string | null;
  confidence: "none" | "low" | "medium" | "high";
  source: "notification_outcomes" | "study_activity" | "default";
  sampleSize: number;
  completionRate: number | null;
  openedRate: number | null;
};

export type NotificationPlannerResult = {
  preferences: NotificationPreference;
  planned: PlannedNotification[];
  recentEvents: NotificationEventSummary[];
  schemaReady: boolean;
  errors: string[];
  signals: {
    today: string;
    due: DueReviewBreakdown;
    targetJlpt: string;
    targetDate: string | null;
    targetDaysRemaining: number | null;
    dailyMode: DailyMode;
    modeMinutes: number;
    streak: number;
    completionPercent: number;
    weeklyBootDays: number;
    dailyPick: CulturalContentSummary | null;
    adaptiveStudyTime: string | null;
    timingProfile: NotificationTimingProfile;
    weaknessHint: string | null;
  };
};

const DEFAULT_TIME_ZONE = "Asia/Hong_Kong";
const DEFAULT_TIME = "08:30";
const DEFAULT_QUIET_START = "23:00";
const DEFAULT_QUIET_END = "07:30";

const TYPE_LABELS: Record<NotificationType, string> = {
  due_review: "到期複習",
  curiosity: "好奇輸入",
  goal: "目標壓力",
  streak: "連續天數救援",
  weekly: "每週回顧",
  exam_mode: "考試模式",
  daily_plan: "每日計劃",
  output_nudge: "輸出提醒",
};

export function isMissingNotificationSchemaError(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message ?? "";
  return /notification_(preferences|events|outcomes)|schema cache|does not exist/i.test(message);
}

export function defaultNotificationPreferences(userId: string): NotificationPreference {
  return {
    user_id: userId,
    enabled: true,
    browser_notifications_enabled: false,
    adaptive_timing_enabled: true,
    time_zone: DEFAULT_TIME_ZONE,
    morning_time: DEFAULT_TIME,
    quiet_start: DEFAULT_QUIET_START,
    quiet_end: DEFAULT_QUIET_END,
    max_per_day: 3,
    review_due_enabled: true,
    curiosity_enabled: true,
    goal_pressure_enabled: true,
    streak_rescue_enabled: true,
    weekly_review_enabled: true,
    exam_mode_enabled: true,
    daily_plan_enabled: true,
    output_nudge_enabled: true,
    last_planned_at: null,
  };
}

export async function fetchNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ preferences: NotificationPreference; schemaReady: boolean; error: string | null }> {
  const defaults = defaultNotificationPreferences(userId);
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      preferences: defaults,
      schemaReady: !isMissingNotificationSchemaError(error),
      error: error.message,
    };
  }

  if (data) {
    return {
      preferences: normalizePreferences(userId, data as Record<string, unknown>),
      schemaReady: true,
      error: null,
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();

  if (insertError) {
    return {
      preferences: defaults,
      schemaReady: !isMissingNotificationSchemaError(insertError),
      error: insertError.message,
    };
  }

  return {
    preferences: normalizePreferences(userId, (inserted ?? defaults) as Record<string, unknown>),
    schemaReady: true,
    error: null,
  };
}

export async function buildNotificationPlanner(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotificationPlannerResult> {
  const preferenceResult = await fetchNotificationPreferences(supabase, userId);
  const preferences = preferenceResult.preferences;
  const today = dateStringInTimeZone(new Date(), preferences.time_zone);

  const [
    due,
    settings,
    todayLog,
    streak,
    weekly,
    dailyPick,
    studyActivityTime,
    outcomeTimingProfile,
    weaknessHint,
    recentEventsResult,
  ] = await Promise.all([
    fetchDueReviewBreakdown(supabase, userId),
    fetchOsSettings(supabase, userId),
    fetchTodayBootLog(supabase, userId),
    fetchStreak(supabase, userId),
    fetchWeeklyStats(supabase, userId),
    getTodayDailyPick(supabase, userId, today).catch(() => null),
    fetchAdaptiveStudyTime(supabase, userId, preferences.time_zone),
    fetchNotificationTimingProfile(supabase, userId, preferences.time_zone),
    fetchWeaknessHint(supabase, userId),
    fetchRecentNotificationEvents(supabase, userId),
  ]);

  const mode = normalizeMode(todayLog?.mode ?? settings?.daily_mode);
  const targetDate = settings?.target_date ?? null;
  const targetDaysRemaining = targetDate ? daysUntil(today, targetDate) : null;
  const completionPercent = calculateCompletion(todayLog);
  const timingProfile = chooseTimingProfile(outcomeTimingProfile, studyActivityTime);
  const effectiveAdaptiveStudyTime = preferences.adaptive_timing_enabled ? timingProfile.suggestedTime : null;
  const errors = [
    preferenceResult.error && !preferenceResult.schemaReady
      ? "notification_preferences 尚未建立；請執行 notification_planner migration。"
      : null,
    ...due.errors.map((message) => `review queue: ${message}`),
    recentEventsResult.error && !recentEventsResult.schemaReady
      ? "notification_events 尚未建立；暫時只顯示即時計劃。"
      : null,
  ].filter((message): message is string => Boolean(message));

  const plannedBase = preferences.enabled
    ? capNotificationsPerDay(
        [
          buildDailyPlan({ preferences, today, due, mode, dailyPick, weaknessHint, adaptiveStudyTime: effectiveAdaptiveStudyTime }),
          buildDueReview({ preferences, today, due, weaknessHint, adaptiveStudyTime: effectiveAdaptiveStudyTime }),
          buildCuriosityHook({ preferences, today, dailyPick, adaptiveStudyTime: effectiveAdaptiveStudyTime }),
          buildGoalPressure({ preferences, today, settings, targetDaysRemaining, weekly, adaptiveStudyTime: effectiveAdaptiveStudyTime }),
          buildExamMode({ preferences, today, settings, targetDaysRemaining }),
          buildOutputNudge({ preferences, today, todayLog, adaptiveStudyTime: effectiveAdaptiveStudyTime }),
          buildStreakRescue({ preferences, today, todayLog, streak, adaptiveStudyTime: effectiveAdaptiveStudyTime }),
          buildWeeklyReview({ preferences, today, weaknessHint }),
        ].filter((item): item is PlannedNotification => Boolean(item)),
        preferences.max_per_day,
      )
    : [];
  const planned = attachEventIdsToPlanned(plannedBase, recentEventsResult.events);

  return {
    preferences,
    planned,
    recentEvents: recentEventsResult.events,
    schemaReady: preferenceResult.schemaReady && recentEventsResult.schemaReady,
    errors,
    signals: {
      today,
      due,
      targetJlpt: settings?.target_jlpt ?? "N2",
      targetDate,
      targetDaysRemaining,
      dailyMode: mode,
      modeMinutes: MODE_INFO[mode].minutes,
      streak,
      completionPercent,
      weeklyBootDays: weekly.bootDays,
      dailyPick,
      adaptiveStudyTime: effectiveAdaptiveStudyTime,
      timingProfile,
      weaknessHint,
    },
  };
}

export async function persistPlannedNotifications(
  supabase: SupabaseClient,
  userId: string,
  planned: PlannedNotification[],
) {
  if (!planned.length) {
    await supabase
      .from("notification_preferences")
      .update({ last_planned_at: new Date().toISOString() })
      .eq("user_id", userId);
    return { count: 0 };
  }

  const rows = planned.map((item) => ({
    user_id: userId,
    type: item.type,
    event_date: item.eventDate,
    scheduled_at: item.scheduledAt,
    user_local_time: item.userLocalTime,
    deep_link: item.deepLink,
    title: item.title,
    body: item.body,
    reason: item.reason,
    metadata: item.metadata,
  }));

  const { error } = await supabase
    .from("notification_events")
    .upsert(rows, { onConflict: "user_id,event_date,type,deep_link" });

  if (error) throw error;

  await supabase
    .from("notification_preferences")
    .update({ last_planned_at: new Date().toISOString() })
    .eq("user_id", userId);

  return { count: rows.length };
}

async function fetchRecentNotificationEvents(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ events: NotificationEventSummary[]; schemaReady: boolean; error: string | null }> {
  const { data, error } = await supabase
    .from("notification_events")
    .select(
      "id, type, event_date, scheduled_at, user_local_time, deep_link, title, body, reason, status, opened, completed_after_open, created_at",
    )
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: false })
    .limit(8);

  if (error) {
    return {
      events: [],
      schemaReady: !isMissingNotificationSchemaError(error),
      error: error.message,
    };
  }

  return {
    events: (data ?? []) as NotificationEventSummary[],
    schemaReady: true,
    error: null,
  };
}

async function fetchNotificationTimingProfile(
  supabase: SupabaseClient,
  userId: string,
  timeZone: string,
): Promise<NotificationTimingProfile> {
  const fallback = defaultTimingProfile();
  const { data, error } = await supabase
    .from("notification_events")
    .select("scheduled_at, user_local_time, opened, opened_at, completed_after_open, completed_at, dismissed_at, status")
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: false })
    .limit(40);

  if (error || !data?.length) return fallback;

  const rows = data as Array<{
    scheduled_at?: string | null;
    user_local_time?: string | null;
    opened?: boolean | null;
    opened_at?: string | null;
    completed_after_open?: boolean | null;
    completed_at?: string | null;
    dismissed_at?: string | null;
    status?: string | null;
  }>;

  const completedMinutes = rows
    .map((row) => localMinutesFromIso(row.completed_at ?? "", timeZone))
    .filter((value): value is number => value != null);
  const openedMinutes = rows
    .map((row) => localMinutesFromIso(row.opened_at ?? "", timeZone))
    .filter((value): value is number => value != null);

  const positiveMinutes = completedMinutes.length >= 2 ? completedMinutes : openedMinutes.length >= 3 ? openedMinutes : [];
  const completed = rows.filter((row) => row.completed_after_open || row.status === "completed").length;
  const opened = rows.filter((row) => row.opened || row.status === "opened" || row.status === "completed").length;
  const sampleSize = rows.length;

  if (!positiveMinutes.length) {
    return {
      ...fallback,
      sampleSize,
      completionRate: rate(completed, sampleSize),
      openedRate: rate(opened, sampleSize),
    };
  }

  return {
    suggestedTime: minutesToTime(roundToNearest(averageClockMinutes(positiveMinutes), 15)),
    confidence: confidenceForSample(positiveMinutes.length),
    source: "notification_outcomes",
    sampleSize: positiveMinutes.length,
    completionRate: rate(completed, sampleSize),
    openedRate: rate(opened, sampleSize),
  };
}

async function fetchAdaptiveStudyTime(
  supabase: SupabaseClient,
  userId: string,
  timeZone: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("os_boot_logs")
    .select("updated_at, created_at")
    .eq("user_id", userId)
    .order("boot_date", { ascending: false })
    .limit(14);
  if (error || !data?.length) return null;

  const minutes = data
    .map((row) => localMinutesFromIso(String(row.updated_at ?? row.created_at), timeZone))
    .filter((value): value is number => value != null);
  if (!minutes.length) return null;

  const average = minutes.reduce((sum, value) => sum + value, 0) / minutes.length;
  if (average < 17 * 60) return null;

  const rounded = Math.round(average / 15) * 15;
  const capped = Math.min(22 * 60 + 15, Math.max(18 * 60 + 30, rounded));
  return minutesToTime(capped);
}

function chooseTimingProfile(
  outcomeProfile: NotificationTimingProfile,
  studyActivityTime: string | null,
): NotificationTimingProfile {
  if (outcomeProfile.suggestedTime) return outcomeProfile;
  if (!studyActivityTime) return outcomeProfile;
  return {
    suggestedTime: studyActivityTime,
    confidence: "low",
    source: "study_activity",
    sampleSize: outcomeProfile.sampleSize,
    completionRate: outcomeProfile.completionRate,
    openedRate: outcomeProfile.openedRate,
  };
}

function defaultTimingProfile(): NotificationTimingProfile {
  return {
    suggestedTime: null,
    confidence: "none",
    source: "default",
    sampleSize: 0,
    completionRate: null,
    openedRate: null,
  };
}

async function fetchWeaknessHint(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("weakness_events")
    .select("skill_area, metadata")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);
  if (error || !data?.length) return null;

  const counts = new Map<string, number>();
  for (const row of data as Array<{ skill_area?: string | null; metadata?: Record<string, unknown> | null }>) {
    const raw = row.metadata?.grammar_point;
    const key = typeof raw === "string" && raw.trim() ? raw.trim() : row.skill_area ?? "output";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return top?.[0] ?? null;
}

function buildDailyPlan({
  preferences,
  today,
  due,
  mode,
  dailyPick,
  weaknessHint,
}: {
  preferences: NotificationPreference;
  today: string;
  due: DueReviewBreakdown;
  mode: DailyMode;
  dailyPick: CulturalContentSummary | null;
  weaknessHint: string | null;
  adaptiveStudyTime: string | null;
}): PlannedNotification | null {
  if (!preferences.daily_plan_enabled) return null;
  const schedule = scheduleLocal(preferences, today, preferences.morning_time);
  const minutes = MODE_INFO[mode].minutes;
  const reviewBit = due.total > 0 ? `${due.total} 張 review` : "1 句 output";
  const inputBit = dailyPick ? trimTitle(dailyPick.title_zh || dailyPick.title_ja, 22) : "今日輸入";
  const weaknessBit = weaknessHint ? `，順手補 ${weaknessHint}` : "";

  return {
    type: "daily_plan",
    ...schedule,
    deepLink: "/dashboard",
    title: "今日學習路線",
    body: `${minutes} 分鐘版：${reviewBit} + ${inputBit}${weaknessBit}。`,
    reason: "daily_decision_engine",
    priority: 100,
    metadata: {
      mode,
      minutes,
      due_total: due.total,
      daily_pick_id: dailyPick?.id ?? null,
      weakness_hint: weaknessHint,
    },
  };
}

function buildDueReview({
  preferences,
  today,
  due,
  weaknessHint,
  adaptiveStudyTime,
}: {
  preferences: NotificationPreference;
  today: string;
  due: DueReviewBreakdown;
  weaknessHint: string | null;
  adaptiveStudyTime: string | null;
}): PlannedNotification | null {
  if (!preferences.review_due_enabled || due.total <= 0) return null;
  const schedule = scheduleLocal(preferences, today, adaptiveStudyTime ?? addMinutesToTime(preferences.morning_time, 90));
  const grammarBit = weaknessHint ? `，最近常錯 ${weaknessHint}` : "";

  return {
    type: "due_review",
    ...schedule,
    deepLink: "/review",
    title: "Review due",
    body: `你有 ${due.total} 張 due card：${due.vocab} 詞卡 + ${due.sentence} 句子${grammarBit}。`,
    reason: "due_review_queue",
    priority: 92,
    metadata: {
      due_total: due.total,
      due_vocab: due.vocab,
      due_sentence: due.sentence,
      weakness_hint: weaknessHint,
    },
  };
}

function buildCuriosityHook({
  preferences,
  today,
  dailyPick,
  adaptiveStudyTime,
}: {
  preferences: NotificationPreference;
  today: string;
  dailyPick: CulturalContentSummary | null;
  adaptiveStudyTime: string | null;
}): PlannedNotification | null {
  if (!preferences.curiosity_enabled || !dailyPick) return null;
  const schedule = scheduleLocal(
    preferences,
    today,
    adaptiveStudyTime ? addMinutesToTime(adaptiveStudyTime, -45) : addMinutesToTime(preferences.morning_time, 35),
  );

  return {
    type: "curiosity",
    ...schedule,
    deepLink: `/cultural/article/${dailyPick.id}`,
    title: "今日 input hook",
    body: `${trimTitle(dailyPick.title_zh || dailyPick.title_ja, 30)} · ${dailyPick.difficulty_jlpt ?? "bridge"}。`,
    reason: "daily_pick_available",
    priority: 84,
    metadata: {
      content_id: dailyPick.id,
      category: dailyPick.category,
      difficulty_jlpt: dailyPick.difficulty_jlpt,
    },
  };
}

function buildGoalPressure({
  preferences,
  today,
  settings,
  targetDaysRemaining,
  weekly,
  adaptiveStudyTime,
}: {
  preferences: NotificationPreference;
  today: string;
  settings: UserOsSettings | null;
  targetDaysRemaining: number | null;
  weekly: Awaited<ReturnType<typeof fetchWeeklyStats>>;
  adaptiveStudyTime: string | null;
}): PlannedNotification | null {
  if (!preferences.goal_pressure_enabled || targetDaysRemaining == null || targetDaysRemaining < 0) return null;
  if (targetDaysRemaining > 180) return null;
  const schedule = scheduleLocal(
    preferences,
    today,
    adaptiveStudyTime ?? addMinutesToTime(preferences.morning_time, 180),
  );
  const target = settings?.target_jlpt ?? "N2";
  const vocabGap = Math.max(0, (settings?.weekly_new_vocab_quota ?? 20) - weekly.newVocab);

  return {
    type: "goal",
    ...schedule,
    deepLink: "/goals",
    title: `${target} countdown`,
    body: `距離 ${target} 仲有 ${targetDaysRemaining} 日。今週新詞仲差 ${vocabGap}，今日補 1 個小任務。`,
    reason: "target_deadline_pressure",
    priority: 72,
    metadata: {
      target_jlpt: target,
      target_date: settings?.target_date ?? null,
      target_days_remaining: targetDaysRemaining,
      weekly_vocab_gap: vocabGap,
    },
  };
}

function buildExamMode({
  preferences,
  today,
  settings,
  targetDaysRemaining,
}: {
  preferences: NotificationPreference;
  today: string;
  settings: UserOsSettings | null;
  targetDaysRemaining: number | null;
}): PlannedNotification | null {
  if (!preferences.exam_mode_enabled || targetDaysRemaining == null) return null;
  if (targetDaysRemaining < 0 || targetDaysRemaining > 60) return null;
  const schedule = scheduleLocal(preferences, today, addMinutesToTime(preferences.morning_time, 20));
  const target = settings?.target_jlpt ?? "N2";

  return {
    type: "exam_mode",
    ...schedule,
    deepLink: "/daily-feed",
    title: `${target} exam mode`,
    body: `考前 ${targetDaysRemaining} 日：今日做 listening / reading / grammar 其中一格。`,
    reason: "exam_window_60_days",
    priority: 96,
    metadata: {
      target_jlpt: target,
      target_date: settings?.target_date ?? null,
      target_days_remaining: targetDaysRemaining,
    },
  };
}

function buildOutputNudge({
  preferences,
  today,
  todayLog,
  adaptiveStudyTime,
}: {
  preferences: NotificationPreference;
  today: string;
  todayLog: OsBootLog | null;
  adaptiveStudyTime: string | null;
}): PlannedNotification | null {
  if (!preferences.output_nudge_enabled || !todayLog) return null;
  if (todayLog.output_layer_done) return null;
  const hasStudySignal = todayLog.boot_layer_done || todayLog.input_layer_done || todayLog.review_layer_done;
  if (!hasStudySignal) return null;
  const schedule = scheduleLocal(preferences, today, adaptiveStudyTime ?? "21:15");

  return {
    type: "output_nudge",
    ...schedule,
    deepLink: "/journal",
    title: "Output habit",
    body: "今日差一個 output。寫一句「今日は疲れました」都算 keep plan。",
    reason: "input_or_review_done_output_missing",
    priority: 90,
    metadata: {
      boot_done: todayLog.boot_layer_done,
      input_done: todayLog.input_layer_done,
      review_done: todayLog.review_layer_done,
    },
  };
}

function buildStreakRescue({
  preferences,
  today,
  todayLog,
  streak,
  adaptiveStudyTime,
}: {
  preferences: NotificationPreference;
  today: string;
  todayLog: OsBootLog | null;
  streak: number;
  adaptiveStudyTime: string | null;
}): PlannedNotification | null {
  if (!preferences.streak_rescue_enabled || streak <= 0 || calculateCompletion(todayLog) > 0) return null;
  const schedule = scheduleLocal(preferences, today, adaptiveStudyTime ?? "21:45");

  return {
    type: "streak",
    ...schedule,
    deepLink: "/self-talk",
    title: "精簡保底",
    body: "今日唔使完整學。講一句日文，都可以 keep output habit。",
    reason: "streak_active_no_today_signal",
    priority: 88,
    metadata: {
      current_streak: streak,
    },
  };
}

function buildWeeklyReview({
  preferences,
  today,
  weaknessHint,
}: {
  preferences: NotificationPreference;
  today: string;
  weaknessHint: string | null;
}): PlannedNotification | null {
  if (!preferences.weekly_review_enabled) return null;
  const sunday = upcomingSunday(today);
  const schedule = scheduleLocal(preferences, sunday, "10:00");

  return {
    type: "weekly",
    ...schedule,
    deepLink: "/weekly-review",
    title: "Weekly repair",
    body: weaknessHint
      ? `今週最多錯 ${weaknessHint}。星期日做 6 題 repair quiz。`
      : "星期日整理今週錯題，再生成 repair quiz。",
    reason: "weekly_repair_loop",
    priority: 58,
    metadata: {
      weakness_hint: weaknessHint,
      week_start: weekStartDate(new Date(`${today}T00:00:00Z`), preferences.time_zone),
    },
  };
}

function capNotificationsPerDay(planned: PlannedNotification[], maxPerDay: number) {
  const grouped = new Map<string, PlannedNotification[]>();
  for (const item of planned) {
    const items = grouped.get(item.eventDate) ?? [];
    items.push(item);
    grouped.set(item.eventDate, items);
  }

  return [...grouped.values()]
    .flatMap((items) => items.sort((a, b) => b.priority - a.priority).slice(0, maxPerDay))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

function attachEventIdsToPlanned(
  planned: PlannedNotification[],
  recentEvents: NotificationEventSummary[],
): PlannedNotification[] {
  if (!recentEvents.length) return planned;
  const eventsByKey = new Map(
    recentEvents.map((event) => [notificationIdentity(event.event_date, event.type, event.deep_link), event.id]),
  );
  return planned.map((item) => ({
    ...item,
    eventId: eventsByKey.get(notificationIdentity(item.eventDate, item.type, item.deepLink)) ?? null,
  }));
}

function notificationIdentity(date: string, type: NotificationType, deepLink: string) {
  return `${date}:${type}:${deepLink}`;
}

function normalizePreferences(userId: string, row: Record<string, unknown>): NotificationPreference {
  const defaults = defaultNotificationPreferences(userId);
  return {
    user_id: userId,
    enabled: booleanValue(row.enabled, defaults.enabled),
    browser_notifications_enabled: booleanValue(
      row.browser_notifications_enabled,
      defaults.browser_notifications_enabled,
    ),
    adaptive_timing_enabled: booleanValue(row.adaptive_timing_enabled, defaults.adaptive_timing_enabled),
    time_zone: normalizeTimeZone(stringValue(row.time_zone, defaults.time_zone), defaults.time_zone),
    morning_time: normalizeTime(stringValue(row.morning_time, defaults.morning_time), defaults.morning_time),
    quiet_start: normalizeTime(stringValue(row.quiet_start, defaults.quiet_start), defaults.quiet_start),
    quiet_end: normalizeTime(stringValue(row.quiet_end, defaults.quiet_end), defaults.quiet_end),
    max_per_day: numberValue(row.max_per_day, defaults.max_per_day, 1, 8),
    review_due_enabled: booleanValue(row.review_due_enabled, defaults.review_due_enabled),
    curiosity_enabled: booleanValue(row.curiosity_enabled, defaults.curiosity_enabled),
    goal_pressure_enabled: booleanValue(row.goal_pressure_enabled, defaults.goal_pressure_enabled),
    streak_rescue_enabled: booleanValue(row.streak_rescue_enabled, defaults.streak_rescue_enabled),
    weekly_review_enabled: booleanValue(row.weekly_review_enabled, defaults.weekly_review_enabled),
    exam_mode_enabled: booleanValue(row.exam_mode_enabled, defaults.exam_mode_enabled),
    daily_plan_enabled: booleanValue(row.daily_plan_enabled, defaults.daily_plan_enabled),
    output_nudge_enabled: booleanValue(row.output_nudge_enabled, defaults.output_nudge_enabled),
    last_planned_at: typeof row.last_planned_at === "string" ? row.last_planned_at : null,
  };
}

function buildScheduledParts(preferences: NotificationPreference, date: string, requestedTime: string) {
  const normalized = normalizeTime(requestedTime, preferences.morning_time);
  const localTime = isQuietTime(normalized, preferences.quiet_start, preferences.quiet_end)
    ? normalizeTime(preferences.quiet_end, DEFAULT_QUIET_END)
    : normalized;
  return {
    eventDate: date,
    userLocalTime: localTime,
    scheduledAt: zonedDateTimeToUtc(date, localTime, preferences.time_zone).toISOString(),
  };
}

function scheduleLocal(preferences: NotificationPreference, date: string, requestedTime: string) {
  return buildScheduledParts(preferences, date, requestedTime);
}

function zonedDateTimeToUtc(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = normalizeTime(time, DEFAULT_TIME).split(":").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = getTimeZoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offset);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - date.getTime();
}

function localMinutesFromIso(iso: string, timeZone: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function isQuietTime(time: string, quietStart: string, quietEnd: string) {
  const current = parseTime(time);
  const start = parseTime(quietStart);
  const end = parseTime(quietEnd);
  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

function parseTime(value: string) {
  const [hour = "0", minute = "0"] = normalizeTime(value, DEFAULT_TIME).split(":");
  return Number(hour) * 60 + Number(minute);
}

function minutesToTime(totalMinutes: number) {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function averageClockMinutes(values: number[]) {
  let x = 0;
  let y = 0;
  for (const value of values) {
    const angle = (value / 1440) * Math.PI * 2;
    x += Math.cos(angle);
    y += Math.sin(angle);
  }
  if (x === 0 && y === 0) return values[0] ?? parseTime(DEFAULT_TIME);
  const angle = Math.atan2(y / values.length, x / values.length);
  const normalized = angle < 0 ? angle + Math.PI * 2 : angle;
  return (normalized / (Math.PI * 2)) * 1440;
}

function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}

function confidenceForSample(sampleSize: number): NotificationTimingProfile["confidence"] {
  if (sampleSize >= 8) return "high";
  if (sampleSize >= 4) return "medium";
  if (sampleSize > 0) return "low";
  return "none";
}

function rate(count: number, total: number) {
  if (total <= 0) return null;
  return Math.round((count / total) * 100);
}

function addMinutesToTime(value: string, delta: number) {
  return minutesToTime(parseTime(value) + delta);
}

function normalizeTime(value: string, fallback: string) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeTimeZone(value: string, fallback: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0));
    return value;
  } catch {
    return fallback;
  }
}

function calculateCompletion(log: OsBootLog | null) {
  if (!log) return 0;
  const complete = [
    log.boot_layer_done,
    log.input_layer_done,
    log.review_layer_done,
    log.output_layer_done,
    log.debug_layer_done,
  ].filter(Boolean).length;
  return Math.round((complete / 5) * 100);
}

function normalizeMode(value: string | null | undefined): DailyMode {
  if (value === "min" || value === "standard" || value === "deep") return value;
  return "standard";
}

function daysUntil(today: string, target: string) {
  const start = new Date(`${today}T00:00:00Z`).getTime();
  const end = new Date(`${target}T00:00:00Z`).getTime();
  const diff = Math.ceil((end - start) / 86_400_000);
  return Number.isFinite(diff) ? diff : null;
}

function upcomingSunday(date: string) {
  const current = new Date(`${date}T00:00:00Z`);
  const day = current.getUTCDay();
  const delta = day === 0 ? 0 : 7 - day;
  current.setUTCDate(current.getUTCDate() + delta);
  return current.toISOString().slice(0, 10);
}

function trimTitle(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function notificationTypeLabel(type: NotificationType) {
  return TYPE_LABELS[type] ?? type;
}
