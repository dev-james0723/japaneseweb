"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ArrowRight,
  BarChart3,
  BellRing,
  BookMarked,
  BookOpen,
  Brain,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clapperboard,
  Compass,
  Flower2,
  GaugeCircle,
  LayoutDashboard,
  Map as MapIcon,
  Maximize2,
  MessageCircle,
  Moon,
  Network,
  Newspaper,
  Notebook,
  NotebookPen,
  PenLine,
  PhoneCall,
  Pickaxe,
  PlusCircle,
  Puzzle,
  RefreshCw,
  Repeat2,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
  Theater,
  Volume2,
  X,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { GlassPanel } from "@/components/GlassPanel";

gsap.registerPlugin(useGSAP);

type DashboardHowToGuideProps = {
  modeLabel: string;
  phaseName: string;
  canDoTitle: string;
  hasDailyPick: boolean;
};

type LoopStep = {
  id: string;
  icon: LucideIcon;
  title: string;
  route: string;
  routeLabel: string;
  outcome: string;
  detail: string;
};

type PageLink = {
  href: string;
  label: string;
  detail: string;
  icon: LucideIcon;
};

const loopSteps: LoopStep[] = [
  {
    id: "boot",
    icon: LayoutDashboard,
    title: "今日開機",
    route: "/dashboard",
    routeLabel: "儀表板",
    outcome: "定模式、睇到期、排任務",
    detail: "儀表板讀取你今日模式、階段、連續日數、到期複習同 AI 精選，然後砌成今日任務順序。",
  },
  {
    id: "input",
    icon: Newspaper,
    title: "每日輸入",
    route: "/daily-feed",
    routeLabel: "每日輸入",
    outcome: "先接觸真日文",
    detail: "每日輸入、文化沉浸、AI 輸入源會提供閱讀、聽力或文章素材。你先理解內容，再揀一句有用日文。",
  },
  {
    id: "mine",
    icon: Pickaxe,
    title: "句子採礦",
    route: "/mining",
    routeLabel: "採礦",
    outcome: "變成詞卡、句型、筆記",
    detail: "把輸入入面值得重用的詞、句、文法送去詞庫、文法、筆記本或詞彙連結，令素材可以被之後回想。",
  },
  {
    id: "recall",
    icon: Brain,
    title: "主動回想",
    route: "/review",
    routeLabel: "複習",
    outcome: "到期就取出",
    detail: "複習、修復隊列、記憶遊戲負責把舊材料拎返出來。忘記或卡住的項目會進入修復，而不是被放過。",
  },
  {
    id: "output",
    icon: PenLine,
    title: "今日一句",
    route: "/quick-output",
    routeLabel: "輸出證據",
    outcome: "用到先算識",
    detail: "今日一句、日記、角色扮演、Talk Me、自言自語同跟讀，負責把材料變成可見輸出證據。",
  },
  {
    id: "review",
    icon: BarChart3,
    title: "節奏回流",
    route: "/stats",
    routeLabel: "統計",
    outcome: "數據返去調整系統",
    detail: "統計、日曆、目標、提醒、每週回顧、每月檢討同設定會調整下一輪任務，令系統愈用愈貼近你。",
  },
];

const pageGroups: { title: string; summary: string; links: PageLink[] }[] = [
  {
    title: "今日入口",
    summary: "每日先由這組頁面決定要做甚麼。",
    links: [
      { href: "/dashboard", label: "今日開機", detail: "總覽任務、進度、模式", icon: LayoutDashboard },
      { href: "/daily-feed", label: "每日輸入", detail: "今日 AI 輸入流", icon: Newspaper },
      { href: "/quick-output", label: "今日一句", detail: "提交每日輸出證據", icon: PenLine },
      { href: "/review", label: "複習", detail: "處理到期材料", icon: RefreshCw },
      { href: "/repair", label: "修復隊列", detail: "修弱項同高風險卡", icon: ShieldAlert },
    ],
  },
  {
    title: "素材同知識庫",
    summary: "輸入會在這裏變成可以重用的學習材料。",
    links: [
      { href: "/input", label: "AI 輸入源", detail: "管理輸入來源", icon: Newspaper },
      { href: "/cultural", label: "文化沉浸", detail: "生成文化文章", icon: Flower2 },
      { href: "/library", label: "素材庫", detail: "保存文章同資源", icon: Archive },
      { href: "/motion", label: "素材動畫", detail: "把素材變成回顧影片", icon: Clapperboard },
      { href: "/decks", label: "詞庫", detail: "查看詞卡集合", icon: BookOpen },
      { href: "/decks/new", label: "建立詞庫", detail: "手動、AI 或 OCR 建卡", icon: PlusCircle },
      { href: "/grammar", label: "文法", detail: "補句型同用法", icon: BookMarked },
      { href: "/grammar-map", label: "文法地圖", detail: "睇文法關係", icon: MapIcon },
      { href: "/notebook", label: "筆記本", detail: "沉澱觀察", icon: Notebook },
      { href: "/connections", label: "詞彙連結", detail: "建立語義網絡", icon: Network },
    ],
  },
  {
    title: "練習同輸出",
    summary: "把被動理解推到可說、可寫、可回應。",
    links: [
      { href: "/mining", label: "句子採礦", detail: "抽可用句子", icon: Pickaxe },
      { href: "/shadowing", label: "跟讀練習", detail: "練聲音同節奏", icon: Repeat2 },
      { href: "/talk-me", label: "Talk Me 紀錄", detail: "記錄聽說時段", icon: PhoneCall },
      { href: "/roleplay", label: "角色扮演", detail: "即時任務對話", icon: Theater },
      { href: "/journal", label: "日記", detail: "寫成日文紀錄", icon: NotebookPen },
      { href: "/self-talk", label: "自言自語", detail: "短句口頭輸出", icon: MessageCircle },
      { href: "/professor", label: "教授", detail: "問策略同卡點", icon: Sparkles },
    ],
  },
  {
    title: "節奏同系統",
    summary: "用數據、提醒同回顧保持學習節奏。",
    links: [
      { href: "/calendar", label: "日曆", detail: "睇每日紀錄", icon: CalendarDays },
      { href: "/goals", label: "目標", detail: "設定能力方向", icon: Target },
      { href: "/notifications", label: "提醒", detail: "安排提醒規則", icon: BellRing },
      { href: "/quizzes", label: "記憶遊戲", detail: "用遊戲測回想", icon: Puzzle },
      { href: "/stats", label: "統計", detail: "檢查學習訊號", icon: BarChart3 },
      { href: "/weekly-review", label: "每週回顧", detail: "找本週缺口", icon: CalendarClock },
      { href: "/monthly-audit", label: "每月檢討", detail: "調整階段", icon: Moon },
      { href: "/settings", label: "設定", detail: "調整偏好", icon: Settings },
    ],
  },
];

export function DashboardHowToGuide({
  modeLabel,
  phaseName,
  canDoTitle,
  hasDailyPick,
}: DashboardHowToGuideProps) {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const activeLoop = loopSteps[activeStep] ?? loopSteps[0];
  const ActiveIcon = activeLoop.icon;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const opener = openButtonRef.current;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [open]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { reduceMotion: "(prefers-reduced-motion: reduce)" },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion);

          gsap.set(".howto-shell, .howto-step, .howto-thread, .howto-stat", {
            autoAlpha: 1,
          });
          gsap.set(".howto-thread", { scaleX: 1, transformOrigin: "left center" });

          if (reduceMotion) return;

          const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
          tl.from(".howto-shell", { autoAlpha: 0, y: 18, duration: 0.44 }, 0)
            .from(".howto-stat", { autoAlpha: 0, y: 10, duration: 0.34, stagger: 0.06 }, 0.08)
            .fromTo(
              ".howto-thread",
              { scaleX: 0, transformOrigin: "left center" },
              { scaleX: 1, duration: 0.72 },
              0.14,
            )
            .from(
              ".howto-step",
              {
                autoAlpha: 0,
                y: 16,
                scale: 0.98,
                duration: 0.44,
                stagger: { each: 0.07, from: "start" },
              },
              0.18,
            );

          return () => tl.kill();
        },
      );

      return () => mm.revert();
    },
    { scope: scopeRef },
  );

  useGSAP(
    () => {
      if (!open) return;

      const mm = gsap.matchMedia();
      mm.add(
        { reduceMotion: "(prefers-reduced-motion: reduce)" },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion);

          gsap.set(".howto-lightbox-backdrop, .howto-lightbox-panel, .howto-map-card, .howto-map-link", {
            autoAlpha: 1,
          });

          if (reduceMotion) return;

          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
          tl.from(".howto-lightbox-backdrop", { autoAlpha: 0, duration: 0.22 }, 0)
            .from(
              ".howto-lightbox-panel",
              {
                autoAlpha: 0,
                y: 22,
                scale: 0.985,
                duration: 0.42,
              },
              0.04,
            )
            .from(
              ".howto-map-card",
              {
                autoAlpha: 0,
                y: 18,
                duration: 0.34,
                stagger: { each: 0.06, from: "start" },
              },
              0.18,
            )
            .from(
              ".howto-map-link",
              {
                autoAlpha: 0,
                x: -8,
                duration: 0.22,
                stagger: { each: 0.015, from: "start" },
              },
              0.28,
            );

          return () => tl.kill();
        },
      );

      return () => mm.revert();
    },
    { dependencies: [open], scope: scopeRef, revertOnUpdate: true },
  );

  return (
    <div ref={scopeRef}>
      <GlassPanel className="howto-shell overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_312px]">
          <div className="min-w-0 p-5 md:p-6 lg:p-7">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="section-eyebrow mb-2">如何使用</p>
                <h2 className="heading-balance text-2xl font-semibold leading-tight md:text-3xl">
            由每日輸入去到今日一句，整個應用跟住一條學習回路行。
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                  這個面板把頁面聯動攤開：先輸入，採一句，回想，再輸出。完成後，統計同回顧會把訊號帶返下一次開機。
                </p>
              </div>
              <button
                ref={openButtonRef}
                type="button"
                onClick={() => setOpen(true)}
                className="btn-primary shrink-0 justify-center text-sm"
                aria-haspopup="dialog"
                aria-controls={dialogId}
              >
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
                打開總覽
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <MiniStat icon={GaugeCircle} label="今日模式" value={modeLabel} />
              <MiniStat icon={Compass} label="目前階段" value={phaseName} />
              <MiniStat icon={Target} label="任務能力" value={canDoTitle} />
            </div>

            <div className="relative mt-6">
              <div className="absolute left-6 right-6 top-[25px] hidden h-px overflow-hidden bg-white/10 md:block" aria-hidden="true">
                <div className="howto-thread h-full bg-gradient-to-r from-[var(--accent-lime)] via-[var(--accent-sky)] to-[var(--accent-sakura)]" />
              </div>
              <div className="grid gap-3 md:grid-cols-6">
                {loopSteps.map((step, index) => (
                  <LoopNode
                    key={step.id}
                    step={step}
                    index={index}
                    active={activeStep === index}
                    onSelect={() => setActiveStep(index)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 p-5 md:p-6 lg:border-l lg:border-t-0">
            <div className="kanji-window flex h-full min-h-[250px] flex-col p-4">
              <div className="relative z-10 flex items-center justify-between gap-3">
                <span className="chip chip-active">{activeLoop.routeLabel}</span>
                <ActiveIcon className="h-5 w-5 text-[var(--accent-lime)]" aria-hidden="true" />
              </div>
              <div className="relative z-10 mt-5">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Step {String(activeStep + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{activeLoop.title}</h3>
                <p className="mt-2 text-sm font-medium text-[var(--accent-lime)]">{activeLoop.outcome}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{activeLoop.detail}</p>
              </div>
              <div className="relative z-10 mt-auto pt-5">
                <Link href={activeLoop.route} className="btn-ghost w-full justify-center text-sm">
                  前往{activeLoop.title}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-4 md:px-6 lg:px-7">
          <div className="grid gap-3 text-xs leading-5 text-[var(--text-secondary)] md:grid-cols-3">
            <GuideNote icon={CircleHelp} label="今日點開始" text={hasDailyPick ? "已有今日 AI 輸入，可以直接由輸入層開始。" : "未有今日 AI 輸入時，先去每日輸入或文化沉浸生成素材。"} />
            <GuideNote icon={Volume2} label="點樣算完成" text="至少完成一個可見輸出：今日一句、日記句子、角色扮演回合或 Talk Me 紀錄。" />
            <GuideNote icon={CheckCircle2} label="點樣返流" text="複習結果、修復項目同回顧會回到儀表板，影響下一次開機任務。" />
          </div>
        </div>
      </GlassPanel>

      {open ? (
        <div
          className="howto-lightbox-backdrop fixed inset-0 z-50 overflow-y-auto bg-black/72 px-4 py-5 backdrop-blur-md md:py-8"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="howto-lightbox-panel mx-auto w-full max-w-6xl overflow-hidden rounded-[18px] border border-white/15 bg-[rgba(9,17,20,0.96)] shadow-[0_28px_110px_rgba(0,0,0,0.6)]"
          >
            <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-start md:justify-between md:p-6">
              <div className="min-w-0">
                <p className="section-eyebrow mb-2">應用地圖</p>
                <h2 id={titleId} className="heading-balance text-2xl font-semibold leading-tight md:text-4xl">
                  這個應用的頁面聯動
                </h2>
                <p id={descriptionId} className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                  每一頁都服務同一條回路：輸入建立材料，採礦保存材料，回想鞏固材料，輸出證明你真的用到，最後用數據調整下一日。
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-[var(--text-secondary)] transition hover:bg-white/[0.1] hover:text-white"
                aria-label="關閉如何使用總覽"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6 xl:grid-cols-4">
              {pageGroups.map((group) => (
                <div key={group.title} className="howto-map-card rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(247,251,246,0.06)]">
                  <h3 className="text-sm font-semibold">{group.title}</h3>
                  <p className="mt-1 min-h-[40px] text-xs leading-5 text-[var(--text-muted)]">{group.summary}</p>
                  <div className="mt-4 space-y-1.5">
                    {group.links.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="howto-map-link group flex min-h-[54px] items-center gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 transition hover:border-[var(--accent-lime)]/35 hover:bg-white/[0.07]"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-[var(--accent-lime)] transition-transform group-hover:scale-105">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{item.label}</span>
                            <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">{item.detail}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 p-5 md:p-6">
              <div className="grid gap-3 md:grid-cols-6">
                {loopSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveStep(index)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        activeStep === index
                          ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)] text-white"
                          : "border-white/10 bg-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.07]"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <Icon className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
                      </div>
                      <div className="text-sm font-semibold">{step.title}</div>
                      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{step.outcome}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="howto-stat rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(247,251,246,0.05)]">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
        <Icon className="h-3.5 w-3.5 text-[var(--accent-lime)]" aria-hidden="true" />
        {label}
      </div>
      <div className="truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function LoopNode({
  step,
  index,
  active,
  onSelect,
}: {
  step: LoopStep;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = step.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`howto-step relative z-10 min-h-[150px] rounded-2xl border p-3 text-left transition-all duration-300 md:min-h-[178px] ${
        active
          ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)] shadow-[0_18px_38px_rgba(217,246,111,0.1)]"
          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.065]"
      }`}
      aria-pressed={active}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="tabular-nums text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className={`grid h-10 w-10 place-items-center rounded-xl border ${active ? "border-[var(--accent-lime)]/35 bg-black/20" : "border-white/10 bg-black/10"}`}>
          <Icon className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
        </span>
      </div>
      <div className="text-sm font-semibold leading-snug">{step.title}</div>
      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{step.outcome}</p>
    </button>
  );
}

function GuideNote({ icon: Icon, label, text }: { icon: LucideIcon; label: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(247,251,246,0.04)]">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/10 text-[var(--accent-lime)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{text}</span>
      </span>
    </div>
  );
}
