import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Brain,
  BookMarked,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock3,
  GaugeCircle,
  ListChecks,
  Moon,
  NotebookPen,
  PenLine,
  PhoneCall,
  Pickaxe,
  Puzzle,
  Radio,
  ShieldAlert,
  Target,
  Theater,
  Volume2,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { DailyFeedPulse } from "@/components/DailyFeedPulse";
import { getTodayDailyPick, type CulturalContentSummary } from "@/lib/cultural/queries";
import { fetchOsSettings, fetchTodayBootLog, fetchWeeklyStats, fetchStreak } from "@/lib/os/queries";
import {
  LAYER_INFO,
  LAYER_ORDER,
  MODE_INFO,
  PHASE_INFO,
  layerCompletion,
  todayDateString,
} from "@/lib/os/types";
import {
  buildDailyMissionPlan,
  fetchDailyMissionSignals,
  type DailyMissionPlan,
  type DailyMissionStep,
  type DailyMissionStepId,
} from "@/lib/os/dailyMission";
import {
  getCommunicationPhase,
  pickCanDoGoal,
  type CanDoGoal,
} from "@/lib/learning/communicationGoals";
import { BootSequence } from "./BootSequence";
import { DashboardHowToGuide } from "./DashboardHowToGuide";

export const dynamic = "force-dynamic";

const quickLinks: { href: string; icon: LucideIcon; label: string; hint: string }[] = [
  { href: "/quick-output", icon: PenLine, label: "今日一句", hint: "輸出證據" },
  { href: "/journal", icon: NotebookPen, label: "日記", hint: "寫成紀錄" },
  { href: "/mining", icon: Pickaxe, label: "句子採礦", hint: "收集例句" },
  { href: "/talk-me", icon: PhoneCall, label: "Talk Me", hint: "記錄時段" },
  { href: "/roleplay", icon: Theater, label: "角色扮演", hint: "即時對話" },
  { href: "/grammar", icon: BookMarked, label: "文法", hint: "補齊句型" },
  { href: "/repair", icon: ShieldAlert, label: "修復隊列", hint: "處理弱項" },
  { href: "/quizzes", icon: Puzzle, label: "記憶遊戲", hint: "重組句子" },
  { href: "/weekly-review", icon: CalendarClock, label: "每週回顧", hint: "找出缺口" },
  { href: "/monthly-audit", icon: Moon, label: "每月檢討", hint: "調整階段" },
];

const MISSION_STEP_ICONS: Record<DailyMissionStepId, LucideIcon> = {
  review: Brain,
  input: Radio,
  mine: Pickaxe,
  practice: Volume2,
  output: PenLine,
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("[dashboard] auth:", authError.message);
  }
  if (!user) redirect("/login");

  const today = todayDateString();
  const [osSettings, todayLog, weekly, streak, dailyPick, missionSignals] = await Promise.all([
    fetchOsSettings(supabase, user.id),
    fetchTodayBootLog(supabase, user.id),
    fetchWeeklyStats(supabase, user.id),
    fetchStreak(supabase, user.id),
    getTodayDailyPick(supabase, user.id, today).catch((error: unknown) => {
      console.error("[dashboard] daily pick:", error instanceof Error ? error.message : String(error));
      return null;
    }),
    fetchDailyMissionSignals(supabase, user.id, today),
  ]);

  const phase = osSettings?.current_phase ?? 1;
  const phaseInfo = PHASE_INFO[phase];
  const communicationPhase = getCommunicationPhase(phase);
  const mode = todayLog?.mode ?? osSettings?.daily_mode ?? "standard";
  const completion = layerCompletion(todayLog);
  const now = new Date();
  const daysIntoPhase = osSettings?.phase_started_at
    ? Math.max(
        1,
        Math.floor(
          (now.getTime() - new Date(osSettings.phase_started_at).getTime()) / (1000 * 60 * 60 * 24),
        ) + 1,
      )
    : 1;
  const canDoGoal = pickCanDoGoal(phase, daysIntoPhase);
  const dueBreakdown = {
    vocab: weekly.dueVocabCount,
    sentence: weekly.dueSentencePromptCount,
    total: weekly.dueCount,
    errors: [] as string[],
  };
  const dailyMission = buildDailyMissionPlan({
    mode,
    due: dueBreakdown,
    dailyPick,
    todayLog,
    canDoGoal,
    signals: missionSignals,
    targetJlpt: osSettings?.target_jlpt ?? "N2",
  });

  const layers: Record<string, boolean> = {
    boot: todayLog?.boot_layer_done ?? false,
    input: todayLog?.input_layer_done ?? false,
    review: todayLog?.review_layer_done ?? false,
    output: todayLog?.output_layer_done ?? false,
    debug: todayLog?.debug_layer_done ?? false,
  };

  return (
    <div className="space-y-6">
      <GlassPanel className="dashboard-hero p-0">
        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_300px] md:p-7 lg:p-8">
          <div className="min-w-0">
            <p className="section-eyebrow mb-3">
              日文溝通系統 · {now.toLocaleDateString("zh-Hant-TW", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="heading-balance mb-3 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
              階段 {phase}：{communicationPhase.name}
            </h1>
            <p className="body-pretty max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {communicationPhase.focus}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="chip">第 {daysIntoPhase} 日</span>
              <span className="chip">{phaseInfo.months}</span>
              <span className="chip">目標 {osSettings?.target_jlpt ?? "N2"}</span>
              <span className="chip chip-active">{MODE_INFO[mode].label} · {MODE_INFO[mode].minutes} 分</span>
            </div>
          </div>

          <div className="kanji-window p-4">
            <div className="mb-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <GaugeCircle className="h-3.5 w-3.5 text-[var(--accent-lime)]" />
                今日開機
              </span>
              <span>連續 {streak} 日</span>
            </div>
            <div
              className="mx-auto grid h-32 w-32 place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--accent-lime) ${completion * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
              }}
            >
              <div className="grid h-[104px] w-[104px] place-items-center rounded-full border border-white/10 bg-[rgba(8,17,20,0.9)]">
                <span className="text-3xl font-semibold tabular-nums text-[var(--accent-lime)]">{completion}%</span>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
              完成所有層級就收工
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-4 md:px-7 lg:px-8">
          <div className="mb-3 text-xs font-medium text-[var(--text-muted)]">今日層級</div>
          <div className="space-y-2">
          {LAYER_ORDER.map((layer) => {
            const done = layers[layer];
            const info = LAYER_INFO[layer];
            return (
              <div key={layer} className="layer-row grid grid-cols-[96px_1fr_40px] items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent-lime)]" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  )}
                  <span className={done ? "text-[var(--accent-lime)]" : "text-[var(--text-secondary)]"}>
                    {info.label}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${done ? "w-full bg-[var(--accent-lime)]" : "w-0 bg-white/10"}`} />
                </div>
                <div className="text-right text-[10px] tabular-nums text-[var(--text-muted)]">
                  {done ? "100%" : "0%"}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </GlassPanel>

      <TodayMissionPanel mission={dailyMission} />

      <CanDoMission goal={canDoGoal} dailyAssignment={communicationPhase.dailyAssignment[mode]} />

      <DashboardHowToGuide
        modeLabel={MODE_INFO[mode].label}
        phaseName={communicationPhase.name}
        canDoTitle={canDoGoal.title}
        hasDailyPick={Boolean(dailyPick)}
      />

      <DailyInputMission pick={dailyPick} modeLabel={MODE_INFO[mode].label} />

      <BootSequence currentMode={mode} layers={layers} />

      <SenseiPath
        dueCount={weekly.dueCount}
        dueVocabCount={weekly.dueVocabCount}
        dueSentencePromptCount={weekly.dueSentencePromptCount}
        modeLabel={MODE_INFO[mode].label}
        phaseName={communicationPhase.name}
        canDoGoal={canDoGoal}
      />

      <GlassPanel className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold">本週節奏</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">自 {weekly.weekStart}</p>
          </div>
          <Link href="/stats" className="text-xs text-[var(--text-muted)] hover:text-white">查看詳細</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <WeekStat label="開機天數" value={`${weekly.bootDays}/7`} accent="lime" />
          <WeekStat
            label="新詞彙"
            value={`${weekly.newVocab}/${osSettings?.weekly_new_vocab_quota ?? 20}`}
            accent={weekly.newVocab > (osSettings?.weekly_new_vocab_quota ?? 20) ? "amber" : "sky"}
          />
          <WeekStat
            label="Anki 完成率"
            value={weekly.ankiRate != null ? `${Math.round(weekly.ankiRate * 100)}%` : "-"}
            accent="sakura"
          />
          <WeekStat label="待複習" value={String(weekly.dueCount)} accent="amber" />
        </div>
      </GlassPanel>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickLinks.map((item) => (
          <QuickLink key={item.href} {...item} />
        ))}
      </div>
    </div>
  );
}

function TodayMissionPanel({ mission }: { mission: DailyMissionPlan }) {
  const progress = mission.totalSteps > 0
    ? Math.round((mission.completedSteps / mission.totalSteps) * 100)
    : 0;

  return (
    <GlassPanel className="overflow-hidden p-0">
      <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_260px] md:p-6 lg:p-7">
        <div className="min-w-0">
          <p className="section-eyebrow mb-2">今日任務</p>
          <h2 className="heading-balance text-2xl font-semibold leading-tight md:text-3xl">
            {mission.title}
          </h2>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <MissionMeta icon={Target} label="目標" value={mission.target} />
            <MissionMeta icon={Clock3} label="時間" value={`${mission.totalMinutes} 分`} />
            <MissionMeta icon={ListChecks} label="狀態" value={mission.statusLabel} />
          </div>
          <div className="mt-4 rounded-xl border border-[var(--accent-lime)]/20 bg-[var(--accent-lime-bg)] px-4 py-3 text-sm leading-6 text-[var(--accent-lime)] shadow-[inset_0_1px_0_rgba(247,251,246,0.07)]">
            {mission.coachLine}
          </div>
        </div>

        <div className="kanji-window p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>任務進度</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.065]">
            <div
              className="h-full rounded-full bg-[var(--accent-lime)] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
            <MiniEvidence label="到期" value={String(mission.evidence.dueTotal)} />
            <MiniEvidence label="跟讀" value={String(mission.evidence.shadowingDueCount)} />
            <MiniEvidence label="輸出" value={String(mission.evidence.outputProof)} />
            <MiniEvidence label="已採礦" value={String(mission.evidence.newCardsAdded)} />
          </div>
          <Link href={mission.startHref} className="btn-primary mt-4 w-full justify-center text-sm">
            開始
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10 p-5 md:p-6">
        <div className="mb-3 grid grid-cols-[42px_74px_minmax(0,1fr)_72px] gap-3 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] max-sm:hidden">
          <span>步驟</span>
          <span>時間</span>
          <span>動作</span>
          <span>狀態</span>
        </div>
        <div className="space-y-2">
          {mission.steps.map((step, index) => (
            <MissionStepRow key={step.id} step={step} index={index} />
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}

function MissionMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 shadow-[inset_0_1px_0_rgba(247,251,246,0.05)]">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
        <Icon className="h-3.5 w-3.5 text-[var(--accent-lime)]" aria-hidden="true" />
        {label}
      </div>
      <div className="truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function MissionStepRow({
  step,
  index,
}: {
  step: DailyMissionStep;
  index: number;
}) {
  const Icon = MISSION_STEP_ICONS[step.id];
  const done = step.status === "done";

  return (
    <Link
      href={step.href}
      className="mission-row grid gap-3 rounded-xl border border-white/10 p-3 transition hover:border-[var(--accent-lime)]/35 hover:bg-white/[0.055] sm:grid-cols-[42px_74px_minmax(0,1fr)_72px] sm:items-center"
    >
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <span className="tabular-nums">{index + 1}</span>
        <Icon className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold tabular-nums">{step.minutes}</span>
        <span className="text-xs text-[var(--text-muted)]">分</span>
      </div>
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{step.label}</span>
          <span className="chip px-2 py-0.5 text-[10px]">{step.action}</span>
        </div>
        <p className="text-xs leading-5 text-[var(--text-secondary)]">{step.detail}</p>
      </div>
      <div className={done ? "text-[var(--accent-lime)]" : step.status === "ready" ? "text-[var(--accent-amber)]" : "text-[var(--text-muted)]"}>
        <span className="inline-flex items-center gap-1.5 text-xs capitalize">
          {done ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}
          {missionStatusLabel(step.status)}
        </span>
      </div>
    </Link>
  );
}

function MiniEvidence({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2 shadow-[inset_0_1px_0_rgba(247,251,246,0.05)]">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-[var(--accent-lime)]">{value}</div>
    </div>
  );
}

function missionStatusLabel(status: DailyMissionStep["status"]) {
  if (status === "done") return "已完成";
  if (status === "ready") return "可開始";
  return "待開始";
}

function DailyInputMission({
  pick,
  modeLabel,
}: {
  pick: CulturalContentSummary | null;
  modeLabel: string;
}) {
  return (
    <GlassPanel className="p-5 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <p className="section-eyebrow mb-2">AI 輸入流</p>
          <h2 className="text-xl font-semibold leading-snug md:text-2xl">
            {pick ? pick.title_ja : "今日還未有 AI 精選輸入"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {pick?.ai_summary_zh
              ?? (pick?.title_zh || "先由文化沉浸頁生成今日一課，再把可用句子採入複習。")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {pick ? (
              <>
                <span className="chip">{pick.difficulty_jlpt ?? "難度待定"}</span>
                <span className="chip">{pick.estimated_minutes ?? "?"} 分鐘</span>
                <span className="chip chip-active">輸入層 · {modeLabel}</span>
              </>
            ) : (
              <span className="chip chip-active">輸入層待命</span>
            )}
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4">
          <DailyFeedPulse active={Boolean(pick)} modeLabel={modeLabel} />
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={pick ? `/cultural/article/${pick.id}` : "/cultural"} className="btn-primary text-sm">
              {pick ? "開始今日輸入" : "生成今日輸入"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/daily-feed" className="btn-ghost text-sm">
              每日輸入
            </Link>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

function CanDoMission({ goal, dailyAssignment }: { goal: CanDoGoal; dailyAssignment: string }) {
  return (
    <GlassPanel className="p-5 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0">
          <p className="section-eyebrow mb-2">今日任務能力</p>
          <h2 className="text-xl font-semibold leading-snug md:text-2xl">{goal.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{goal.canDo}</p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-[var(--text-secondary)] shadow-[inset_0_1px_0_rgba(247,251,246,0.05)]">
            <span className="font-medium text-white">今日任務：</span>{dailyAssignment}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={goal.primaryRoute} className="btn-primary">
              開始任務
              <ArrowRight className="h-4 w-4" />
            </Link>
            {goal.supportRoutes.slice(0, 3).map((route) => (
              <Link key={route} href={route} className="btn-ghost">
                {routeLabel(route)}
              </Link>
            ))}
          </div>
        </div>
        <div className="kanji-window p-4">
          <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">能力證據</div>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{goal.proof}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {goal.roleplay.requiredPhrases.map((phrase) => (
              <span key={phrase} className="chip font-jp text-[10px]">{phrase}</span>
            ))}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

function SenseiPath({
  dueCount,
  dueVocabCount,
  dueSentencePromptCount,
  modeLabel,
  phaseName,
  canDoGoal,
}: {
  dueCount: number;
  dueVocabCount: number;
  dueSentencePromptCount: number;
  modeLabel: string;
  phaseName: string;
  canDoGoal: CanDoGoal;
}) {
  const reviewDetail = dueCount > 0
    ? `${dueVocabCount} 張詞卡 + ${dueSentencePromptCount} 張句子提示，先用看字、聽音、填空、產出混合過一輪。`
    : "今日沒有到期卡，採一句真日文做明日的主動回想材料。";
  const steps: { href: string; icon: LucideIcon; title: string; detail: string }[] = [
    {
      href: "/review",
      icon: Brain,
      title: "主動回想",
      detail: reviewDetail,
    },
    {
      href: "/mining",
      icon: Pickaxe,
      title: "採一句可用日文",
      detail: canDoGoal.miningPrompt,
    },
    {
      href: "/roleplay",
      icon: Theater,
      title: "任務對話",
      detail: `${canDoGoal.roleplay.scenario} 完成後用評分準則判斷是否真的能做。`,
    },
    {
      href: "/journal",
      icon: NotebookPen,
      title: "輸出證據",
      detail: canDoGoal.journalPrompt,
    },
  ];

  return (
    <GlassPanel className="p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-eyebrow mb-1">教授路線</p>
          <h2 className="text-lg font-semibold">今日教授路線</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {modeLabel} · {phaseName} · {canDoGoal.title}：先把記憶取出來，再放入任務。
          </p>
        </div>
        <Link href="/review" className="btn-primary w-fit">
          開始第一步
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.title}
              href={step.href}
              className="group border-t border-white/10 pt-3 transition-colors hover:border-[var(--accent-lime)]/40"
            >
              <div className="mb-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="tabular-nums">0{index + 1}</span>
                <Icon className="h-4 w-4 text-[var(--accent-lime)]" />
              </div>
              <div className="text-sm font-medium transition-colors group-hover:text-[var(--accent-lime)]">
                {step.title}
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{step.detail}</p>
            </Link>
          );
        })}
      </div>
    </GlassPanel>
  );
}

function routeLabel(route: string) {
  const labels: Record<string, string> = {
    "/review": "複習",
    "/roleplay": "角色扮演",
    "/mining": "句子採礦",
    "/journal": "日記",
    "/talk-me": "Talk Me",
    "/notebook": "筆記本",
    "/self-talk": "自言自語",
    "/cultural": "文化沉浸",
    "/weekly-review": "每週回顧",
    "/monthly-audit": "每月檢討",
  };
  return labels[route] ?? route.replace("/", "");
}

function WeekStat({ label, value, accent }: { label: string; value: string; accent: "lime" | "sky" | "amber" | "sakura" }) {
  const color = {
    lime: "text-[var(--accent-lime)]",
    sky: "text-[var(--accent-sky)]",
    amber: "text-[var(--accent-amber)]",
    sakura: "text-[var(--accent-sakura)]",
  }[accent];
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(247,251,246,0.05)]">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, hint }: { href: string; icon: LucideIcon; label: string; hint: string }) {
  return (
    <Link href={href} className="glass-panel-subtle quick-action-card group flex h-full items-start gap-3 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.09]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/10 text-[var(--accent-lime)] transition-transform duration-300 group-hover:scale-105">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-xs text-[var(--text-muted)]">{hint}</span>
      </span>
    </Link>
  );
}
