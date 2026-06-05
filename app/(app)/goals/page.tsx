import { redirect } from "next/navigation";
import { Activity, BarChart3, CalendarClock, Gauge, History, ListChecks, Target, type LucideIcon } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { fetchDueReviewBreakdown, fetchOsSettings, fetchWeeklyStats } from "@/lib/os/queries";
import { MODE_INFO, PHASE_INFO, todayDateString, type DailyMode } from "@/lib/os/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GoalSettingsForm } from "./GoalSettingsForm";

export const dynamic = "force-dynamic";

type ActiveGoalRow = {
  id: string;
  goal_type: string;
  target_level: string | null;
  deadline: string | null;
  daily_minutes: number;
  weekly_days: number;
  priority_skill: string;
  intensity: string;
  topics: string[];
  updated_at: string;
};

type LearningPlanWeekRow = {
  week_start_date: string;
  target_vocab: number;
  target_grammar: number;
  target_sentences: number;
  target_output_tasks: number;
  focus: string | null;
};

type LearningContract = {
  goal: ActiveGoalRow | null;
  planWeek: LearningPlanWeekRow | null;
  errors: string[];
};

type JlptReadinessRow = {
  snapshot_date: string;
  target_level: string;
  readiness_score: number;
  vocabulary_score: number;
  grammar_score: number;
  reading_score: number;
  listening_score: number;
  output_score: number;
  consistency_score: number;
  projected_ready_date: string | null;
  days_until_deadline: number | null;
  pace_status: string;
  source: string;
};

type GoalEventRow = {
  id: string;
  event_type: string;
  title: string;
  detail: string | null;
  created_at: string;
};

type ProgressEvidence = {
  readiness: JlptReadinessRow | null;
  events: GoalEventRow[];
  errors: string[];
};

export default async function GoalsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) console.error("[goals] auth:", authError.message);
  if (!user?.id) redirect("/login");

  const [settings, weekly, due, progress] = await Promise.all([
    fetchOsSettings(supabase, user.id),
    fetchWeeklyStats(supabase, user.id),
    fetchDueReviewBreakdown(supabase, user.id),
    fetchProgressEvidence(supabase, user.id),
  ]);
  const contract = await fetchActiveLearningContract(supabase, user.id);
  if (contract.errors.length) {
    console.error("[goals] learning contract:", contract.errors.join(" / "));
  }
  if (progress.errors.length) {
    console.error("[goals] progress evidence:", progress.errors.join(" / "));
  }

  const target = normalizeJlpt(settings?.target_jlpt);
  const mode = normalizeMode(settings?.daily_mode);
  const deadlineLabel = settings?.target_date ? daysUntil(settings.target_date) : "未設定";
  const phase = PHASE_INFO[settings?.current_phase ?? 1] ?? PHASE_INFO[1];

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[var(--accent-lime)]">
          <Target className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="section-eyebrow mb-1">學習合約</p>
          <h1 className="text-2xl font-semibold md:text-3xl">目標</h1>
          <p className="body-pretty mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            把學習設定從個人資料分開：目標、期限、每日時間和每週節奏會直接影響儀表板的任務安排。
          </p>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <GoalStat icon={Target} label="目標等級" value={target} detail={phase.name} />
        <GoalStat icon={CalendarClock} label="期限" value={deadlineLabel} detail={settings?.target_date ?? todayDateString()} />
        <GoalStat icon={Gauge} label="每日模式" value={MODE_INFO[mode].label} detail={`${MODE_INFO[mode].minutes} 分`} />
        <GoalStat icon={BarChart3} label="待複習" value={String(due.total)} detail={`${due.vocab} 詞卡 + ${due.sentence} 句子`} />
      </section>

      <LearningContractPanel contract={contract} fallbackTarget={target} fallbackMode={mode} />

      <ProgressEnginePanel progress={progress} fallbackTarget={target} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <GlassPanel className="p-5 md:p-6">
          <h2 className="mb-1 text-base font-semibold">今週目標節奏</h2>
          <p className="mb-5 text-sm text-[var(--text-secondary)]">自 {weekly.weekStart}</p>
          <div className="space-y-4">
            <ProgressRow label="新詞" current={weekly.newVocab} target={settings?.weekly_new_vocab_quota ?? 20} />
            <ProgressRow label="開機天數" current={weekly.bootDays} target={7} />
            <ProgressRow label="複習完成率" current={weekly.ankiRate == null ? 0 : Math.round(weekly.ankiRate * 100)} target={100} suffix="%" />
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 md:p-6">
          <h2 className="mb-5 text-base font-semibold">調整學習合約</h2>
          <GoalSettingsForm
            initial={{
              targetJlpt: target,
              targetDate: settings?.target_date ?? "",
              dailyMode: mode,
              weeklyNewVocabQuota: settings?.weekly_new_vocab_quota ?? 20,
              weeklyNewGrammarQuota: settings?.weekly_new_grammar_quota ?? 2,
              secondaryGoal: contract.goal?.topics?.[0] ?? "",
            }}
          />
        </GlassPanel>
      </section>
    </div>
  );
}

async function fetchProgressEvidence(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<ProgressEvidence> {
  const [readinessResult, eventsResult] = await Promise.all([
    supabase
      .from("jlpt_readiness_snapshots")
      .select("snapshot_date, target_level, readiness_score, vocabulary_score, grammar_score, reading_score, listening_score, output_score, consistency_score, projected_ready_date, days_until_deadline, pace_status, source")
      .eq("user_id", userId)
      .order("snapshot_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("goal_events")
      .select("id, event_type, title, detail, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return {
    readiness: (readinessResult.data ?? null) as JlptReadinessRow | null,
    events: (eventsResult.data ?? []) as GoalEventRow[],
    errors: [
      readinessResult.error?.message,
      eventsResult.error?.message,
    ].filter((message): message is string => Boolean(message)),
  };
}

async function fetchActiveLearningContract(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<LearningContract> {
  const goalResult = await supabase
    .from("user_goals")
    .select("id, goal_type, target_level, deadline, daily_minutes, weekly_days, priority_skill, intensity, topics, updated_at")
    .eq("user_id", userId)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (goalResult.error) {
    return { goal: null, planWeek: null, errors: [goalResult.error.message] };
  }

  const goal = (goalResult.data ?? null) as ActiveGoalRow | null;
  if (!goal) return { goal: null, planWeek: null, errors: [] };

  const planResult = await supabase
    .from("learning_plan_weeks")
    .select("week_start_date, target_vocab, target_grammar, target_sentences, target_output_tasks, focus")
    .eq("user_id", userId)
    .eq("user_goal_id", goal.id)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    goal,
    planWeek: (planResult.data ?? null) as LearningPlanWeekRow | null,
    errors: [planResult.error?.message].filter((message): message is string => Boolean(message)),
  };
}

function ProgressEnginePanel({
  progress,
  fallbackTarget,
}: {
  progress: ProgressEvidence;
  fallbackTarget: string;
}) {
  const readiness = progress.readiness;
  const bars = readiness ? [
    ["詞彙", readiness.vocabulary_score],
    ["文法", readiness.grammar_score],
    ["閱讀", readiness.reading_score],
    ["聽力", readiness.listening_score],
    ["輸出", readiness.output_score],
    ["穩定度", readiness.consistency_score],
  ] as const : [];

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
      <GlassPanel className="p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="section-eyebrow mb-1">JLPT 準備度</p>
            <h2 className="text-lg font-semibold">
              {readiness ? `${readiness.target_level} 準備度` : `${fallbackTarget} 準備度`}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {readiness
                ? `${sourceLabel(readiness.source)}快照 · ${readiness.snapshot_date}`
                : "做完複習、輸出或每週回顧後，這裡會生成有證據支持的推算。"}
            </p>
          </div>
          <PaceBadge status={readiness?.pace_status ?? "no_deadline"} />
        </div>

        <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">準備度</div>
            <div className="text-4xl font-semibold tabular-nums text-[var(--accent-lime)]">
              {readiness ? `${readiness.readiness_score}%` : "—"}
            </div>
            <div className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
              預計：{readiness?.projected_ready_date ?? "證據不足"}
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              期限：{readiness?.days_until_deadline == null ? "未設定" : `${readiness.days_until_deadline} 日`}
            </div>
          </div>
          <div className="space-y-3">
            {bars.length ? bars.map(([label, score]) => (
              <ReadinessBar key={label} label={label} score={score} />
            )) : (
              <div className="rounded-xl border border-dashed border-white/15 p-5 text-sm leading-6 text-[var(--text-secondary)]">
                目前未有準備度快照。下一次更新學習合約、完成複習雷達刷新，或儲存每週回顧時會自動建立。
              </div>
            )}
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-5 md:p-6">
        <div className="mb-5 flex items-center gap-2">
          <History className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
          <h2 className="text-base font-semibold">目標時間線</h2>
        </div>
        <div className="space-y-3">
          {progress.events.length ? progress.events.map((event) => (
            <div key={event.id} className="border-l border-white/10 pl-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="chip px-2 py-0.5 text-[10px]">{eventTypeLabel(event.event_type)}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{formatDate(event.created_at)}</span>
              </div>
              <div className="text-sm font-medium">{event.title}</div>
              {event.detail ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{event.detail}</p> : null}
            </div>
          )) : (
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              目標更新、每週反思、準備度快照會自動留下時間線。
            </p>
          )}
        </div>
      </GlassPanel>
    </section>
  );
}

function PaceBadge({ status }: { status: string }) {
  const label = status === "ahead"
    ? "超前"
    : status === "on_track"
      ? "正常"
      : status === "behind"
        ? "落後"
        : "未設期限";
  const className = status === "behind"
    ? "border-red-400/25 bg-red-500/10 text-red-300"
    : status === "ahead" || status === "on_track"
      ? "border-emerald-400/25 bg-emerald-500/10 text-[var(--success)]"
      : "border-white/10 bg-white/[0.045] text-[var(--text-muted)]";
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${className}`}>
      <Activity className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function ReadinessBar({ label, score }: { label: string; score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span>{label}</span>
        <span className="tabular-nums text-[var(--text-muted)]">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-[var(--accent-lime)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LearningContractPanel({
  contract,
  fallbackTarget,
  fallbackMode,
}: {
  contract: LearningContract;
  fallbackTarget: string;
  fallbackMode: DailyMode;
}) {
  const goal = contract.goal;
  const planWeek = contract.planWeek;
  const minutes = goal?.daily_minutes ?? MODE_INFO[fallbackMode].minutes;
  return (
    <GlassPanel className="p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="section-eyebrow mb-1">正式學習合約</p>
          <h2 className="text-lg font-semibold">
            {goal ? `${goal.goal_type} ${goal.target_level ?? fallbackTarget}` : `JLPT ${fallbackTarget}`}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {goal
              ? `更新於 ${formatDate(goal.updated_at)}`
              : "更新一次學習合約後，系統會建立啟用中的目標資料和本週學習計劃資料。"}
          </p>
        </div>
        <span className="chip chip-active w-fit">{minutes} 分 / 日</span>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <ContractMetric label="每週天數" value={`${goal?.weekly_days ?? 5}/7`} />
        <ContractMetric label="優先技能" value={goal?.priority_skill ?? "平衡"} />
        <ContractMetric label="強度" value={goal?.intensity ?? modeIntensity(fallbackMode)} />
        <ContractMetric label="期限" value={goal?.deadline ?? "未設定"} />
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <ListChecks className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
          本週生成計劃
        </div>
        {planWeek ? (
          <div className="grid gap-2 md:grid-cols-5">
            <ContractMetric label="週次" value={planWeek.week_start_date} compact />
            <ContractMetric label="單字" value={String(planWeek.target_vocab)} compact />
            <ContractMetric label="文法" value={String(planWeek.target_grammar)} compact />
            <ContractMetric label="句子" value={String(planWeek.target_sentences)} compact />
            <ContractMetric label="輸出" value={String(planWeek.target_output_tasks)} compact />
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            未有本週生成計劃；下一次儲存目標會同步建立。
          </p>
        )}
        {planWeek?.focus ? <p className="mt-3 text-xs text-[var(--text-muted)]">{planWeek.focus}</p> : null}
      </div>
    </GlassPanel>
  );
}

function ContractMetric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.035] ${compact ? "p-2" : "p-3"}`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function GoalStat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <GlassPanel className="p-4">
      <div className="mb-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Icon className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
        {label}
      </div>
      <div className="text-xl font-semibold">{value}</div>
      <div className="mt-1 truncate text-xs text-[var(--text-muted)]">{detail}</div>
    </GlassPanel>
  );
}

function ProgressRow({
  label,
  current,
  target,
  suffix = "",
}: {
  label: string;
  current: number;
  target: number;
  suffix?: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-[var(--text-muted)]">{current}{suffix} / {target}{suffix}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-[var(--accent-lime)] transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function modeIntensity(mode: DailyMode) {
  if (mode === "min") return "輕量";
  if (mode === "deep") return "考試衝刺";
  return "平衡";
}

function sourceLabel(source: string) {
  if (source === "review") return "複習";
  if (source === "weekly_review") return "每週回顧";
  if (source === "goals") return "目標";
  if (source === "radar") return "雷達";
  return source ? `${source} ` : "";
}

function eventTypeLabel(type: string) {
  if (type === "contract_updated") return "合約更新";
  if (type === "study_plan_generated") return "計劃生成";
  if (type === "readiness_snapshot") return "準備度快照";
  if (type === "exam_mode") return "考試模式";
  return type.replace(/_/g, " ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("zh-Hant-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeJlpt(value: string | null | undefined): "N5" | "N4" | "N3" | "N2" | "N1" {
  if (value === "N5" || value === "N4" || value === "N3" || value === "N2" || value === "N1") return value;
  return "N2";
}

function normalizeMode(value: string | null | undefined): DailyMode {
  if (value === "min" || value === "standard" || value === "deep") return value;
  return "standard";
}

function daysUntil(dateString: string) {
  const today = new Date(`${todayDateString()}T00:00:00Z`).getTime();
  const target = new Date(`${dateString}T00:00:00Z`).getTime();
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  if (Number.isNaN(diff)) return "未設定";
  if (diff < 0) return `已過 ${Math.abs(diff)} 日`;
  if (diff === 0) return "今日";
  return `${diff} 日`;
}
