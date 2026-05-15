"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check, X, ArrowRight, RefreshCw } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { SpeakerButton } from "@/components/SpeakerButton";

type Item = {
  id: string;
  japanese: string;
  kana: string | null;
  romaji: string | null;
  meaning_zh: string | null;
  meaning_en: string | null;
  deck_id: string;
};

type Outcome = "correct" | "incorrect" | null;

export function ReviewSession({ items }: { items: Item[] }) {
  const [idx, setIdx] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>(() => items.map(() => null));
  const [submitting, setSubmitting] = useState(false);

  const current = items[idx];
  const done = idx >= items.length;
  const correctCount = outcomes.filter((o) => o === "correct").length;
  const incorrectCount = outcomes.filter((o) => o === "incorrect").length;

  async function record(isCorrect: boolean) {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/review/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vocabId: current.id,
          deckId: current.deck_id,
          isCorrect,
          quizType: "recognition",
          prompt: current.japanese,
          correctAnswer: current.meaning_zh ?? "",
        }),
      });
      setOutcomes((prev) => {
        const next = [...prev];
        next[idx] = isCorrect ? "correct" : "incorrect";
        return next;
      });
      setReveal(false);
      setIdx((i) => i + 1);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <GlassPanel className="p-8 text-center space-y-4">
        <h2 className="text-xl font-semibold">複習完成 🎉</h2>
        <div className="flex items-center justify-center gap-6">
          <Stat label="答對" value={correctCount} color="text-[var(--success)]" />
          <Stat label="答錯" value={incorrectCount} color="text-[var(--danger)]" />
          <Stat label="總數" value={items.length} color="text-[var(--accent-lime)]" />
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/dashboard" className="btn-ghost">回到總覽</Link>
          <button
            onClick={() => {
              setIdx(0);
              setOutcomes(items.map(() => null));
              setReveal(false);
            }}
            className="btn-primary"
          >
            <RefreshCw className="w-4 h-4" />
            再複習一次
          </button>
        </div>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-[var(--accent-lime)] transition-all"
            style={{ width: `${(idx / items.length) * 100}%` }}
          />
        </div>
        <div className="text-xs tabular-nums text-[var(--text-muted)]">
          {idx + 1} / {items.length}
        </div>
      </div>

      <GlassPanel className="p-8 md:p-10 min-h-[320px] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
          <div>
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="font-jp text-4xl md:text-5xl">{current.japanese}</span>
              <SpeakerButton text={current.japanese} size="lg" />
            </div>
            {current.kana && (
              <div className="text-sm text-[var(--text-muted)] font-jp">{current.kana}</div>
            )}
            {current.romaji && (
              <div className="text-xs text-[var(--text-romaji)] mt-1">{current.romaji}</div>
            )}
          </div>

          {reveal ? (
            <div className="space-y-2">
              <div className="text-lg text-[var(--zh-text)]">
                {current.meaning_zh ?? "（沒有中文解釋）"}
              </div>
              {current.meaning_en && (
                <div className="text-xs text-[var(--text-muted)]">{current.meaning_en}</div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setReveal(true)}
              className="btn-ghost"
            >
              顯示意思
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {reveal && (
          <div className="flex items-center justify-center gap-3 pt-6">
            <button
              onClick={() => record(false)}
              disabled={submitting}
              className={clsx(
                "flex items-center gap-2 px-6 py-3 rounded-xl border transition-all disabled:opacity-60",
                "bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-[var(--danger)]",
              )}
            >
              <X className="w-4 h-4" />
              不記得
            </button>
            <button
              onClick={() => record(true)}
              disabled={submitting}
              className={clsx(
                "flex items-center gap-2 px-6 py-3 rounded-xl border transition-all disabled:opacity-60",
                "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-[var(--success)]",
              )}
            >
              <Check className="w-4 h-4" />
              記得
            </button>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase mb-1">
        {label}
      </div>
      <div className={`text-3xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
