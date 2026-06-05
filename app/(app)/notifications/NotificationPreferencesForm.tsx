"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, CalendarClock, Send, ShieldCheck } from "lucide-react";
import {
  planNotificationsNowAction,
  recordNotificationOutcomeAction,
  saveNotificationPreferencesAction,
} from "@/lib/actions/notifications";
import type { NotificationPreference } from "@/lib/notifications/planner";

export function NotificationPreferencesForm({
  initial,
  schemaReady,
}: {
  initial: NotificationPreference;
  schemaReady: boolean;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(
    initial.browser_notifications_enabled,
  );
  const [adaptiveTimingEnabled, setAdaptiveTimingEnabled] = useState(initial.adaptive_timing_enabled);
  const [timeZone, setTimeZone] = useState(initial.time_zone);
  const [morningTime, setMorningTime] = useState(initial.morning_time.slice(0, 5));
  const [quietStart, setQuietStart] = useState(initial.quiet_start.slice(0, 5));
  const [quietEnd, setQuietEnd] = useState(initial.quiet_end.slice(0, 5));
  const [maxPerDay, setMaxPerDay] = useState(initial.max_per_day);
  const [reviewDueEnabled, setReviewDueEnabled] = useState(initial.review_due_enabled);
  const [curiosityEnabled, setCuriosityEnabled] = useState(initial.curiosity_enabled);
  const [goalPressureEnabled, setGoalPressureEnabled] = useState(initial.goal_pressure_enabled);
  const [streakRescueEnabled, setStreakRescueEnabled] = useState(initial.streak_rescue_enabled);
  const [weeklyReviewEnabled, setWeeklyReviewEnabled] = useState(initial.weekly_review_enabled);
  const [examModeEnabled, setExamModeEnabled] = useState(initial.exam_mode_enabled);
  const [dailyPlanEnabled, setDailyPlanEnabled] = useState(initial.daily_plan_enabled);
  const [outputNudgeEnabled, setOutputNudgeEnabled] = useState(initial.output_nudge_enabled);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | "unknown">("unknown");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!("Notification" in window)) {
        setPermission("unsupported");
        return;
      }
      setPermission(Notification.permission);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await saveNotificationPreferencesAction({
        enabled,
        browserNotificationsEnabled,
        adaptiveTimingEnabled,
        timeZone,
        morningTime,
        quietStart,
        quietEnd,
        maxPerDay,
        reviewDueEnabled,
        curiosityEnabled,
        goalPressureEnabled,
        streakRescueEnabled,
        weeklyReviewEnabled,
        examModeEnabled,
        dailyPlanEnabled,
        outputNudgeEnabled,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("提醒設定已更新。");
    });
  }

  function planNow() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await planNotificationsNowAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`已建立 ${result.count} 個已排程提醒。`);
    });
  }

  async function requestBrowserPermission() {
    setMessage(null);
    setError(null);
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      setError("此瀏覽器不支援桌面通知。");
      return;
    }

    const next = await Notification.requestPermission();
    setPermission(next);
    setBrowserNotificationsEnabled(next === "granted");
    if (schemaReady) {
      await recordNotificationOutcomeAction({
        outcomeType: next === "granted" ? "permission_granted" : "permission_denied",
        deepLink: "/notifications",
        metadata: { browser_permission: next },
      });
    }
    if (next === "granted") {
      new Notification("日本語提醒已開啟", {
        body: "之後可以用瀏覽器通知做本機提示。",
        silent: true,
      });
      setMessage("瀏覽器通知權限已開啟。");
    } else {
      setError("瀏覽器未授權通知。");
    }
  }

  async function sendTestNotification() {
    setMessage(null);
    setError(null);
    if (typeof window === "undefined" || !("Notification" in window)) {
      setError("此瀏覽器不支援桌面通知。");
      return;
    }
    if (Notification.permission !== "granted") {
      setError("請先允許瀏覽器通知。");
      return;
    }
    new Notification("今日 7 分鐘版已準備", {
      body: "4 張複習 + 1 句跟讀 + 1 句輸出。",
      silent: true,
    });
    if (schemaReady) {
      await recordNotificationOutcomeAction({
        outcomeType: "test_sent",
        deepLink: "/dashboard",
        metadata: { source: "notifications_page" },
      });
    }
    setMessage("測試通知已送出。");
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <SettingRow label="提醒總開關" hint="每日計劃、複習、目標、連續天數都受此控制。">
          <Toggle checked={enabled} onChange={setEnabled} />
        </SettingRow>
        <SettingRow label="自動調整時間" hint="最近常夜晚學，就會避開朝早推送。">
          <Toggle checked={adaptiveTimingEnabled} onChange={setAdaptiveTimingEnabled} />
        </SettingRow>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="時區">
          <input value={timeZone} onChange={(event) => setTimeZone(event.target.value)} className="glass-input w-full" />
        </Field>
        <Field label="早晨提醒">
          <input type="time" value={morningTime} onChange={(event) => setMorningTime(event.target.value)} className="glass-input w-full" />
        </Field>
        <Field label="安靜時段開始">
          <input type="time" value={quietStart} onChange={(event) => setQuietStart(event.target.value)} className="glass-input w-full" />
        </Field>
        <Field label="安靜時段結束">
          <input type="time" value={quietEnd} onChange={(event) => setQuietEnd(event.target.value)} className="glass-input w-full" />
        </Field>
      </div>

      <Field label={`每日最多提醒：${maxPerDay}`}>
        <input
          type="range"
          min={1}
          max={8}
          value={maxPerDay}
          onChange={(event) => setMaxPerDay(Number(event.target.value))}
          className="w-full accent-[var(--accent-lime)]"
        />
      </Field>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <PillToggle label="每日計劃" checked={dailyPlanEnabled} onChange={setDailyPlanEnabled} />
        <PillToggle label="到期複習" checked={reviewDueEnabled} onChange={setReviewDueEnabled} />
        <PillToggle label="好奇輸入" checked={curiosityEnabled} onChange={setCuriosityEnabled} />
        <PillToggle label="目標" checked={goalPressureEnabled} onChange={setGoalPressureEnabled} />
        <PillToggle label="連續天數救援" checked={streakRescueEnabled} onChange={setStreakRescueEnabled} />
        <PillToggle label="每週修復" checked={weeklyReviewEnabled} onChange={setWeeklyReviewEnabled} />
        <PillToggle label="考試模式" checked={examModeEnabled} onChange={setExamModeEnabled} />
        <PillToggle label="輸出提醒" checked={outputNudgeEnabled} onChange={setOutputNudgeEnabled} />
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            瀏覽器權限
          </div>
          <span className="chip">{permissionLabel(permission)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={requestBrowserPermission} className="btn-ghost text-sm">
            <Bell className="h-4 w-4" aria-hidden="true" />
            允許
          </button>
          <button type="button" onClick={sendTestNotification} className="btn-ghost text-sm">
            <Send className="h-4 w-4" aria-hidden="true" />
            測試
          </button>
          <label className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={browserNotificationsEnabled}
              onChange={(event) => setBrowserNotificationsEnabled(event.target.checked)}
              className="accent-[var(--accent-lime)]"
            />
            使用瀏覽器通知
          </label>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      {message ? <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-[var(--success)]">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending || !schemaReady} className="btn-primary text-sm disabled:opacity-60">
          {pending ? "儲存中..." : "儲存提醒設定"}
        </button>
        <button type="button" onClick={planNow} disabled={pending || !schemaReady} className="btn-ghost text-sm disabled:opacity-60">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          立即排程
        </button>
      </div>
    </form>
  );
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{hint}</div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase text-[var(--text-muted)]">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[var(--accent-lime)]" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

function PillToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
        checked
          ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
          : "border-white/10 bg-white/[0.035] text-[var(--text-secondary)] hover:bg-white/[0.07]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function permissionLabel(permission: NotificationPermission | "unsupported" | "unknown") {
  if (permission === "granted") return "已允許";
  if (permission === "denied") return "已拒絕";
  if (permission === "default") return "尚未詢問";
  if (permission === "unsupported") return "不支援";
  return "檢查中";
}
