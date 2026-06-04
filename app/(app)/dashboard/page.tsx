import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Brain,
  BookMarked,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Circle,
  GaugeCircle,
  Moon,
  NotebookPen,
  PhoneCall,
  Pickaxe,
  Theater,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { fetchOsSettings, fetchTodayBootLog, fetchWeeklyStats, fetchStreak } from "@/lib/os/queries";
import { LAYER_INFO, LAYER_ORDER, MODE_INFO, PHASE_INFO, layerCompletion } from "@/lib/os/types";
import {
  getCommunicationPhase,
  pickCanDoGoal,
  type CanDoGoal,
} from "@/lib/learning/communicationGoals";
import { BootSequence } from "./BootSequence";

export const dynamic = "force-dynamic";

const quickLinks: { href: string; icon: LucideIcon; label: string; hint: string }[] = [
  { href: "/journal", icon: NotebookPen, label: "日記", hint: "輸出一句" },
  { href: "/mining", icon: Pickaxe, label: "句子採礦", hint: "收集例句" },
  { href: "/talk-me", icon: PhoneCall, label: "Talk Me", hint: "記錄時段" },
  { href: "/roleplay", icon: Theater, label: "角色扮演", hint: "即時對話" },
  { href: "/grammar", icon: BookMarked, label: "文法", hint: "補齊句型" },
  { href: "/weekly-review", icon: CalendarClock, label: "每週回顧", hint: "找出缺口" },
  { href: "/monthly-audit", icon: Moon, label: "每月檢討", hint: "調整階段" },
  { href: "/decks", icon: BookOpen, label: "詞庫", hint: "整理單字" },
];

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const [osSettings, todayLog, weekly, streak] = await Promise.all([
    fetchOsSettings(supabase, user.id),
    fetchTodayBootLog(supabase, user.id),
    fetchWeeklyStats(supabase, user.id),
    fetchStreak(supabase, user.id),
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

  const layers: Record<string, boolean> = {
    boot: todayLog?.boot_layer_done ?? false,
    input: todayLog?.input_layer_done ?? false,
    review: todayLog?.review_layer_done ?? false,
    output: todayLog?.output_layer_done ?? false,
    debug: todayLog?.debug_layer_done ?? false,
  };

  return (
    <div className="space-y-6">
      <GlassPanel className="p-0">
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_240px] md:p-7 lg:p-8">
          <div className="min-w-0">
            <p className="section-eyebrow mb-3">
              Japanese Communication OS · {now.toLocaleDateString("zh-Hant-TW", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="heading-balance mb-2 text-2xl font-semibold leading-tight md:text-4xl">
              階段 {phase}：{communicationPhase.name}
            </h1>
            <p className="body-pretty max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {communicationPhase.focus}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip">第 {daysIntoPhase} 日</span>
              <span className="chip">{phaseInfo.months}</span>
              <span className="chip">目標 {osSettings?.target_jlpt ?? "N2"}</span>
              <span className="chip chip-active">{MODE_INFO[mode].label} · {MODE_INFO[mode].minutes} 分</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
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
              <div className="grid h-[104px] w-[104px] place-items-center rounded-full border border-white/10 bg-[#0b0907]">
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
              <div key={layer} className="grid grid-cols-[96px_1fr_40px] items-center gap-3">
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
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.055]">
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

      <CanDoMission goal={canDoGoal} dailyAssignment={communicationPhase.dailyAssignment[mode]} />

      <BootSequence currentMode={mode} layers={layers} />

      <SenseiPath
        dueCount={weekly.dueCount}
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
            value={weekly.ankiRate != null ? `${Math.round(weekly.ankiRate * 100)}%` : "—"}
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

function CanDoMission({ goal, dailyAssignment }: { goal: CanDoGoal; dailyAssignment: string }) {
  return (
    <GlassPanel className="p-5 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0">
          <p className="section-eyebrow mb-2">Today&apos;s Can-Do</p>
          <h2 className="text-xl font-semibold leading-snug md:text-2xl">{goal.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{goal.canDo}</p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-[var(--text-secondary)]">
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
        <div className="rounded-xl border border-white/10 bg-black/15 p-4">
          <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Proof of ability</div>
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
  modeLabel,
  phaseName,
  canDoGoal,
}: {
  dueCount: number;
  modeLabel: string;
  phaseName: string;
  canDoGoal: CanDoGoal;
}) {
  const steps: { href: string; icon: LucideIcon; title: string; detail: string }[] = [
    {
      href: "/review",
      icon: Brain,
      title: "主動回想",
      detail: `${dueCount} 張到期卡加句子提示，先用看字、聽音、填空、產出混合過一輪。`,
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
      detail: `${canDoGoal.roleplay.scenario} 完成後用 rubric 判斷是否真的能做。`,
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
          <p className="section-eyebrow mb-1">Professor route</p>
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
    "/review": "Review",
    "/roleplay": "Roleplay",
    "/mining": "Mining",
    "/journal": "Journal",
    "/talk-me": "Talk Me",
    "/notebook": "Notebook",
    "/self-talk": "Self-talk",
    "/cultural": "Cultural",
    "/weekly-review": "Weekly review",
    "/monthly-audit": "Monthly audit",
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
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, hint }: { href: string; icon: LucideIcon; label: string; hint: string }) {
  return (
    <Link href={href} className="glass-panel-subtle group flex h-full items-start gap-3 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.09]">
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
