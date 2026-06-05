import { redirect } from "next/navigation";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Gauge,
  History,
  ListChecks,
  Moon,
  Sparkles,
  Target,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import {
  buildNotificationPlanner,
  notificationTypeLabel,
  type NotificationEventSummary,
  type PlannedNotification,
} from "@/lib/notifications/planner";
import { NotificationEventControls } from "./NotificationEventControls";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NotificationPreferencesForm } from "./NotificationPreferencesForm";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) console.error("[notifications] auth:", authError.message);
  if (!user) redirect("/login");

  const planner = await buildNotificationPlanner(supabase, user.id);
  const next = planner.planned[0] ?? null;

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[var(--accent-lime)]">
          <BellRing className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="section-eyebrow mb-1">智能提醒</p>
          <h1 className="text-2xl font-semibold md:text-3xl">提醒</h1>
          <p className="body-pretty mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            今日提醒由到期複習、每日輸入、目標期限、連續天數同輸出層一齊決定。
          </p>
        </div>
      </header>

      {!planner.schemaReady ? <SchemaNotice errors={planner.errors} /> : null}

      <GlassPanel className="overflow-hidden p-0">
        <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_260px] md:p-7">
          <div className="min-w-0">
            <p className="section-eyebrow mb-2">下一個提醒 · {planner.signals.today}</p>
            <h2 className="text-xl font-semibold leading-snug md:text-3xl">
              {next ? next.title : planner.preferences.enabled ? "今日暫時唔需要提醒" : "提醒已暫停"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {next ? next.body : "學習隊列暫時安靜。繼續用儀表板做今日指揮台。"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip chip-active">{planner.signals.modeMinutes} 分鐘模式</span>
              <span className="chip">{planner.signals.due.total} 張到期</span>
              <span className="chip">今日 {planner.signals.completionPercent}%</span>
              {planner.signals.adaptiveStudyTime ? (
                <span className="chip">自動調整 {planner.signals.adaptiveStudyTime}</span>
              ) : null}
              <span className="chip">
                {planner.preferences.adaptive_timing_enabled
                  ? timingProfileLabel(planner.signals.timingProfile)
                  : "固定時間"}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <div className="mb-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5 text-[var(--accent-lime)]" aria-hidden="true" />
                本地時間
              </span>
              <span>{planner.preferences.time_zone}</span>
            </div>
            <div className="text-4xl font-semibold tabular-nums text-[var(--accent-lime)]">
              {next?.userLocalTime ?? "--:--"}
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
              安靜時段 {planner.preferences.quiet_start.slice(0, 5)}-{planner.preferences.quiet_end.slice(0, 5)}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              {planner.preferences.adaptive_timing_enabled
                ? timingProfileDetail(planner.signals.timingProfile)
                : "自動調整時間已關閉；提醒會跟隨已儲存時間。"}
            </p>
          </div>
        </div>
        <div className="grid border-t border-white/10 md:grid-cols-4">
          <SignalStat icon={ListChecks} label="複習" value={String(planner.signals.due.total)} detail={`${planner.signals.due.vocab} 詞 + ${planner.signals.due.sentence} 句`} />
          <SignalStat icon={Target} label="目標" value={planner.signals.targetJlpt} detail={deadlineLabel(planner.signals.targetDaysRemaining)} />
          <SignalStat icon={Gauge} label="今日" value={`${planner.signals.completionPercent}%`} detail={`${planner.signals.weeklyBootDays}/7 開機日`} />
          <SignalStat icon={Sparkles} label="輸入" value={planner.signals.dailyPick ? "已準備" : "等待"} detail={planner.signals.weaknessHint ?? "未有弱點信號"} />
        </div>
      </GlassPanel>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <GlassPanel className="p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="section-eyebrow mb-1">已排程隊列</p>
              <h2 className="text-base font-semibold">今日 / 今週提醒</h2>
            </div>
            <span className="chip chip-active">{planner.planned.length} 個已排程</span>
          </div>
          {planner.planned.length ? (
            <div className="space-y-3">
              {planner.planned.map((item) => (
                <PlannedReminder key={`${item.type}-${item.eventDate}-${item.deepLink}`} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-sm text-[var(--text-secondary)]">
              暫時未有已排程提醒。
            </div>
          )}
        </GlassPanel>

        <GlassPanel className="p-5 md:p-6">
          <div className="mb-5">
            <p className="section-eyebrow mb-1">偏好設定</p>
            <h2 className="text-base font-semibold">提醒節奏</h2>
          </div>
          <NotificationPreferencesForm initial={planner.preferences} schemaReady={planner.schemaReady} />
        </GlassPanel>
      </section>

      <GlassPanel className="p-5 md:p-6">
        <div className="mb-5 flex items-center gap-2">
          <History className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
          <h2 className="text-base font-semibold">近期事件</h2>
        </div>
        {planner.recentEvents.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {planner.recentEvents.map((event) => (
              <RecentEvent key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-sm text-[var(--text-secondary)]">
            暫時未有事件紀錄。
          </div>
        )}
      </GlassPanel>
    </div>
  );
}

function SchemaNotice({ errors }: { errors: string[] }) {
  return (
    <GlassPanel className="border-amber-400/25 bg-amber-400/[0.055] p-4">
      <div className="flex items-start gap-3">
        <Moon className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" aria-hidden="true" />
        <div className="text-sm leading-6 text-amber-100">
          <div className="font-semibold">提醒資料表尚未套用</div>
          <div className="text-amber-100/80">
            {errors[0] ?? "請套用 supabase/migrations/20260604114533_notification_planner.sql，以儲存偏好設定和提醒結果。"}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

function SignalStat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof ListChecks;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border-white/10 px-5 py-4 md:border-l md:first:border-l-0">
      <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Icon className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
        {label}
      </div>
      <div className="text-xl font-semibold">{value}</div>
      <div className="mt-1 truncate text-xs text-[var(--text-muted)]">{detail}</div>
    </div>
  );
}

function PlannedReminder({ item }: { item: PlannedNotification }) {
  return (
    <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-[88px_1fr_auto] sm:items-center">
      <div>
        <div className="text-lg font-semibold tabular-nums text-[var(--accent-lime)]">{item.userLocalTime}</div>
        <div className="mt-1 text-[10px] uppercase text-[var(--text-muted)]">{item.eventDate}</div>
      </div>
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="chip text-[10px]">{notificationTypeLabel(item.type)}</span>
          <span className="text-[10px] uppercase text-[var(--text-muted)]">{item.reason}</span>
        </div>
        <div className="text-sm font-semibold">{item.title}</div>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
      </div>
      <NotificationEventControls eventId={item.eventId} deepLink={item.deepLink} />
    </div>
  );
}

function RecentEvent({ event }: { event: NotificationEventSummary }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="chip text-[10px]">{notificationTypeLabel(event.type)}</span>
        <span className="text-xs tabular-nums text-[var(--text-muted)]">{event.user_local_time.slice(0, 5)}</span>
      </div>
      <div className="text-sm font-semibold">{event.title}</div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{event.body}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3 w-3" aria-hidden="true" />
          {event.event_date}
        </span>
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          {event.completed_after_open ? "已完成" : event.opened ? "已打開" : eventStatusLabel(event.status)}
        </span>
      </div>
      <div className="mt-3">
        <NotificationEventControls
          eventId={event.id}
          deepLink={event.deep_link}
          opened={event.opened}
          completedAfterOpen={event.completed_after_open}
          compact
        />
      </div>
    </div>
  );
}

function deadlineLabel(days: number | null) {
  if (days == null) return "未設期限";
  if (days < 0) return `已過 ${Math.abs(days)} 日`;
  if (days === 0) return "今日";
  return `${days} 日`;
}

function timingProfileLabel(profile: { source: string; confidence: string; suggestedTime: string | null }) {
  if (!profile.suggestedTime) return "預設時間";
  if (profile.source === "notification_outcomes") return `已學習：${confidenceLabel(profile.confidence)}`;
  if (profile.source === "study_activity") return "按學習時間";
  return "預設時間";
}

function timingProfileDetail(profile: {
  source: string;
  sampleSize: number;
  completionRate: number | null;
  openedRate: number | null;
}) {
  if (profile.source === "notification_outcomes") {
    const completion = profile.completionRate == null ? "未有完成率" : `${profile.completionRate}% 完成`;
    const opened = profile.openedRate == null ? "打開率待定" : `${profile.openedRate}% 打開`;
    return `${profile.sampleSize} 個結果信號 · ${opened} · ${completion}`;
  }
  if (profile.source === "study_activity") return "未有足夠提醒結果前，時間會跟隨近期學習活動。";
  return "未有足夠行為信號前，時間會使用你的早晨提醒設定。";
}

function confidenceLabel(confidence: string) {
  if (confidence === "high") return "高信心";
  if (confidence === "medium") return "中信心";
  if (confidence === "low") return "低信心";
  return confidence;
}

function eventStatusLabel(status: string) {
  if (status === "planned") return "已排程";
  if (status === "sent") return "已送出";
  if (status === "opened") return "已打開";
  if (status === "completed") return "已完成";
  if (status === "dismissed") return "已略過";
  return status.replace(/_/g, " ");
}
