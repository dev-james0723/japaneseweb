"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { GlassPanel } from "@/components/GlassPanel";
import { startBootSequenceAction, markLayerDoneAction } from "@/lib/actions/os";
import { LAYER_INFO, MODE_INFO, type BootLayer, type DailyMode } from "@/lib/os/types";

const STEPS: Record<DailyMode, { layer: BootLayer; minutes: number; title: string; description: string; cta?: { href: string; label: string } }[]> = {
  min: [
    { layer: "boot", minutes: 2, title: "Boot-up", description: "用日文錄一句：今日係幾號、天氣、心情。", cta: { href: "/journal", label: "去 Journal 錄一句" } },
    { layer: "review", minutes: 5, title: "Anki Due", description: "做完今日到期嘅 review 卡。", cta: { href: "/review", label: "開始複習" } },
    { layer: "input", minutes: 5, title: "Talk Me 5 分鐘", description: "出 Talk Me app 做 5 分鐘 lesson，記得返嚟記錄。", cta: { href: "/talk-me", label: "Log Talk Me Session" } },
    { layer: "output", minutes: 3, title: "1 句 Output", description: "寫一句 「今日要做 ...」 入 journal。", cta: { href: "/journal", label: "寫 1 句" } },
  ],
  standard: [
    { layer: "boot", minutes: 5, title: "Boot-up", description: "Self-talk 日記：今日 schedule + 心情 + 1 個目標。", cta: { href: "/journal", label: "Journal" } },
    { layer: "review", minutes: 10, title: "Anki Due", description: "做晒 due cards，記住 active recall 唔係識讀就算。", cta: { href: "/review", label: "Review" } },
    { layer: "input", minutes: 15, title: "Immersion", description: "NHK Easy / YouTube / podcast / Talk Me 任選。Capture 一句去 mining。", cta: { href: "/mining", label: "Sentence Mining" } },
    { layer: "output", minutes: 10, title: "Output", description: "Journal 3-5 句 + 1 個 roleplay turn。", cta: { href: "/roleplay", label: "Roleplay" } },
    { layer: "debug", minutes: 5, title: "Debug", description: "Notice gaps、leech cards、文法 confusion 整理。", cta: { href: "/weekly-review", label: "Review Notes" } },
  ],
  deep: [
    { layer: "boot", minutes: 5, title: "Boot-up", description: "詳細 self-talk + 1 個 grammar pattern 嘅例句。", cta: { href: "/journal", label: "Journal" } },
    { layer: "review", minutes: 20, title: "Anki Due + Old Sets", description: "Due cards + 重做上週嘅 mining cloze。", cta: { href: "/review", label: "Review" } },
    { layer: "input", minutes: 30, title: "Deep Immersion", description: "30 分鐘 podcast/drama + sentence mining 5 句。", cta: { href: "/mining", label: "Mining" } },
    { layer: "output", minutes: 25, title: "Output Heavy", description: "Journal 8-10 句 + roleplay 完整 conversation。", cta: { href: "/roleplay", label: "Roleplay" } },
    { layer: "debug", minutes: 10, title: "Debug + Reflection", description: "整理 notice gaps、做 1 個 leech card 嘅 stronger mnemonic。", cta: { href: "/weekly-review", label: "Notes" } },
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
          <h2 className="text-base font-semibold">⚡ Boot Sequence</h2>
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
              {MODE_INFO[m].label} · {MODE_INFO[m].minutes}m
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
                  aria-label={done ? "Mark layer undone" : "Mark layer done"}
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
                      <span className="font-medium">Step {i + 1}: {step.title}</span>
                      <span className="text-[10px] text-[var(--text-muted)] ml-auto">{step.minutes} min</span>
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
