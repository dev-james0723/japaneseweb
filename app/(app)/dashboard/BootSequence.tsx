"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { GlassPanel } from "@/components/GlassPanel";
import { startBootSequenceAction, markLayerDoneAction } from "@/lib/actions/os";
import { LAYER_INFO, MODE_INFO, type BootLayer, type DailyMode } from "@/lib/os/types";

const STEPS: Record<DailyMode, { layer: BootLayer; minutes: number; title: string; description: string; cta?: { href: string; label: string } }[]> = {
  min: [
    { layer: "boot", minutes: 2, title: "開機暖身", description: "用日文錄一句：今日係幾號、天氣、心情。", cta: { href: "/journal", label: "去日記錄一句" } },
    { layer: "review", minutes: 5, title: "Anki 到期卡", description: "做完今日到期嘅複習卡。", cta: { href: "/review", label: "開始複習" } },
    { layer: "input", minutes: 5, title: "Talk Me 5 分鐘", description: "開 Talk Me app 做 5 分鐘課程，記得返嚟記錄。", cta: { href: "/talk-me", label: "記錄 Talk Me 時段" } },
    { layer: "output", minutes: 3, title: "1 句輸出", description: "寫一句「今日要做 …」入日記。", cta: { href: "/journal", label: "寫 1 句" } },
  ],
  standard: [
    { layer: "boot", minutes: 5, title: "開機暖身", description: "自言自語日記：今日行程 + 心情 + 1 個目標。", cta: { href: "/journal", label: "日記" } },
    { layer: "review", minutes: 10, title: "Anki 到期卡", description: "做晒到期卡，記住主動回想唔係識讀就算。", cta: { href: "/review", label: "複習" } },
    { layer: "input", minutes: 15, title: "沉浸輸入", description: "NHK Easy / YouTube / podcast / Talk Me 任選。擷取一句去採礦。", cta: { href: "/mining", label: "句子採礦" } },
    { layer: "output", minutes: 10, title: "輸出", description: "日記 3–5 句 + 1 輪角色扮演。", cta: { href: "/roleplay", label: "角色扮演" } },
    { layer: "debug", minutes: 5, title: "除錯", description: "整理學習缺口、難記卡、文法混淆。", cta: { href: "/weekly-review", label: "回顧筆記" } },
  ],
  deep: [
    { layer: "boot", minutes: 5, title: "開機暖身", description: "詳細自言自語 + 1 個文法句型嘅例句。", cta: { href: "/journal", label: "日記" } },
    { layer: "review", minutes: 20, title: "Anki 到期 + 舊卡", description: "到期卡 + 重做上週嘅採礦填空卡。", cta: { href: "/review", label: "複習" } },
    { layer: "input", minutes: 30, title: "深度沉浸", description: "30 分鐘 podcast/劇集 + 句子採礦 5 句。", cta: { href: "/mining", label: "採礦" } },
    { layer: "output", minutes: 25, title: "大量輸出", description: "日記 8–10 句 + 角色扮演完整對話。", cta: { href: "/roleplay", label: "角色扮演" } },
    { layer: "debug", minutes: 10, title: "除錯 + 反思", description: "整理學習缺口、為 1 張難記卡做更強記憶法。", cta: { href: "/weekly-review", label: "筆記" } },
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
          <h2 className="text-base font-semibold">⚡ 開機流程</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">{MODE_INFO[mode].description}</p>
        </div>
        <div className="flex gap-1.5">
          {(["min", "standard", "deep"] as DailyMode[]).map((m) => (
            <button
              key={m}
              onClick={() => pickMode(m)}
              disabled={pending}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                mode === m
                  ? "bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
                  : "bg-white/5 text-[var(--text-secondary)] hover:bg-white/10"
              }`}
            >
              {MODE_INFO[m].label} · {MODE_INFO[m].minutes} 分
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
              className={`rounded-xl border ${done ? "border-[var(--accent-lime)]/30 bg-[var(--accent-lime-bg)]/30" : "border-white/10 bg-white/[0.02]"} p-3 md:p-4 transition-colors`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleLayer(step.layer, !done)}
                  disabled={pending}
                  className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                    done
                      ? "bg-[var(--accent-lime)] border-[var(--accent-lime)] text-black"
                      : "border-white/30 hover:border-white"
                  }`}
                  aria-label={done ? "標記為未完成" : "標記為完成"}
                >
                  {done && <span className="text-[10px]">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setActiveStep(isActive ? null : i)}
                    className="text-left w-full"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span>{LAYER_INFO[step.layer].emoji}</span>
                      <span className="font-medium">步驟 {i + 1}：{step.title}</span>
                      <span className="text-[10px] text-[var(--text-muted)] ml-auto">{step.minutes} 分</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{step.description}</p>
                  </button>
                  {isActive && step.cta && (
                    <Link
                      href={step.cta.href}
                      className="inline-flex mt-2 text-xs px-3 py-1.5 rounded-lg bg-[var(--accent-lime-bg)] text-[var(--accent-lime)] hover:bg-[var(--accent-lime-bg)]/70 transition-colors"
                    >
                      {step.cta.label} →
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
