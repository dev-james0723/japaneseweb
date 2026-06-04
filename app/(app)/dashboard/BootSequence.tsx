"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, Clock3 } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { startBootSequenceAction, markLayerDoneAction } from "@/lib/actions/os";
import { MODE_INFO, type BootLayer, type DailyMode } from "@/lib/os/types";

const STEPS: Record<DailyMode, { layer: BootLayer; minutes: number; title: string; description: string; cta?: { href: string; label: string } }[]> = {
  min: [
    { layer: "boot", minutes: 2, title: "開機暖身", description: "用日文錄一句：今日係幾號、天氣、心情。", cta: { href: "/journal", label: "去日記錄一句" } },
    { layer: "review", minutes: 5, title: "到期卡取出", description: "先回想，再揭曉；忘記卡立即做讀音橋。", cta: { href: "/review", label: "開始複習" } },
    { layer: "input", minutes: 5, title: "Talk Me 5 分鐘", description: "聽一段真日文，抽一句可模仿的句子。", cta: { href: "/talk-me", label: "記錄 Talk Me 時段" } },
    { layer: "output", minutes: 3, title: "1 句輸出", description: "用今日最不穩的一個詞寫一句。", cta: { href: "/journal", label: "寫 1 句" } },
  ],
  standard: [
    { layer: "boot", minutes: 5, title: "開機暖身", description: "自言自語日記：今日行程 + 心情 + 1 個目標。", cta: { href: "/journal", label: "日記" } },
    { layer: "review", minutes: 10, title: "到期卡取出", description: "看字、聽音、看義產出交替；吃力卡做弱點救援。", cta: { href: "/review", label: "複習" } },
    { layer: "input", minutes: 15, title: "沉浸輸入", description: "NHK Easy / YouTube / podcast / Talk Me 任選。擷取一句去採礦。", cta: { href: "/mining", label: "句子採礦" } },
    { layer: "output", minutes: 10, title: "輸出", description: "日記 3–5 句 + 1 輪角色扮演，把新詞放進句子。", cta: { href: "/roleplay", label: "角色扮演" } },
    { layer: "debug", minutes: 5, title: "除錯", description: "整理學習缺口、難記卡、文法混淆；只修一個最痛點。", cta: { href: "/weekly-review", label: "回顧筆記" } },
  ],
  deep: [
    { layer: "boot", minutes: 5, title: "開機暖身", description: "詳細自言自語 + 1 個文法句型嘅例句。", cta: { href: "/journal", label: "日記" } },
    { layer: "review", minutes: 20, title: "到期卡 + 舊卡", description: "到期卡、弱點卡、上週採礦句交替做，不讓大腦猜模式。", cta: { href: "/review", label: "複習" } },
    { layer: "input", minutes: 30, title: "深度沉浸", description: "30 分鐘 podcast/劇集 + 句子採礦 5 句，每句標出核心詞。", cta: { href: "/mining", label: "採礦" } },
    { layer: "output", minutes: 25, title: "大量輸出", description: "日記 8–10 句 + 角色扮演完整對話，重用今日弱點詞。", cta: { href: "/roleplay", label: "角色扮演" } },
    { layer: "debug", minutes: 10, title: "除錯 + 反思", description: "為 1 張難記卡重做音、字、義連結，再寫一句自己的例句。", cta: { href: "/weekly-review", label: "筆記" } },
  ],
};

export function BootSequence({
  currentMode,
  layers,
}: {
  currentMode: DailyMode;
  layers: Record<string, boolean>;
}) {
  const [mode, setMode] = useState<DailyMode>(currentMode);
  const [pending, startTransition] = useTransition();
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const steps = STEPS[mode];

  function pickMode(m: DailyMode) {
    if (m === mode) return;
    setMode(m);
    startTransition(async () => {
      await startBootSequenceAction({ mode: m });
    });
  }

  function toggleLayer(layer: BootLayer, done: boolean) {
    startTransition(async () => {
      await markLayerDoneAction({ layer, done });
    });
  }

  return (
    <GlassPanel className="p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="section-eyebrow mb-1">Daily boot</p>
          <h2 className="text-lg font-semibold">開機流程</h2>
          <p className="body-pretty text-xs text-[var(--text-muted)] mt-1">{MODE_INFO[mode].description}</p>
        </div>
        <div className="flex rounded-full border border-white/10 bg-black/10 p-1">
          {(["min", "standard", "deep"] as DailyMode[]).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => pickMode(m)}
              disabled={pending}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 disabled:opacity-50 ${
                mode === m
                  ? "bg-[var(--accent-lime)] text-black shadow-[0_8px_20px_rgba(215,239,105,0.16)]"
                  : "text-[var(--text-secondary)] hover:bg-white/10 hover:text-white"
              }`}
            >
              {MODE_INFO[m].label}
            </button>
          ))}
        </div>
      </div>

      <ol className="space-y-2">
        {steps.map((step, i) => {
          const done = layers[step.layer];
          const isActive = activeStep === i;
          return (
            <li
              key={i}
              className={`rounded-xl border p-3 transition-all duration-300 md:p-4 ${
                done
                  ? "border-[var(--accent-lime)]/30 bg-[var(--accent-lime-bg)]/20"
                  : isActive
                    ? "border-white/18 bg-white/[0.055]"
                    : "border-white/10 bg-white/[0.025] hover:bg-white/[0.045]"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleLayer(step.layer, !done)}
                  disabled={pending}
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all duration-300 disabled:opacity-50 ${
                    done
                      ? "border-[var(--accent-lime)] bg-[var(--accent-lime)] text-black"
                      : "border-white/25 bg-black/10 text-[var(--text-muted)] hover:border-white/50 hover:text-white"
                  }`}
                  aria-label={done ? "標記為未完成" : "標記為完成"}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveStep(isActive ? null : i)}
                    aria-expanded={isActive}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[10px] text-[var(--text-muted)] tabular-nums">0{i + 1}</span>
                      <span className="font-medium">{step.title}</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        <Clock3 className="h-3 w-3" />
                        {step.minutes} 分
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{step.description}</p>
                  </button>
                  {isActive && step.cta && (
                    <Link
                      href={step.cta.href}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-lime-bg)] px-3 py-1.5 text-xs text-[var(--accent-lime)] transition-colors hover:bg-[var(--accent-lime-bg)]/70"
                    >
                      {step.cta.label}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </GlassPanel>
  );
}
