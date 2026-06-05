"use client";

import { useState, useTransition } from "react";
import { Gauge, ListChecks } from "lucide-react";
import { updateOsSettingsAction } from "@/lib/actions/os";
import type { DailyMode } from "@/lib/os/types";

type GoalSettings = {
  targetJlpt: "N5" | "N4" | "N3" | "N2" | "N1";
  targetDate: string;
  dailyMode: DailyMode;
  weeklyNewVocabQuota: number;
  weeklyNewGrammarQuota: number;
  secondaryGoal: string;
};

export function GoalSettingsForm({ initial }: { initial: GoalSettings }) {
  const [targetJlpt, setTargetJlpt] = useState(initial.targetJlpt);
  const [targetDate, setTargetDate] = useState(initial.targetDate);
  const [dailyMode, setDailyMode] = useState(initial.dailyMode);
  const [weeklyNewVocabQuota, setWeeklyNewVocabQuota] = useState(initial.weeklyNewVocabQuota);
  const [weeklyNewGrammarQuota, setWeeklyNewGrammarQuota] = useState(initial.weeklyNewGrammarQuota);
  const [secondaryGoal, setSecondaryGoal] = useState(initial.secondaryGoal);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save(event: React.FormEvent) {
    event.preventDefault();
    submitContract("save");
  }

  function submitContract(intent: "save" | "exam" | "plan", modeOverride = dailyMode) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updateOsSettingsAction({
        targetJlpt,
        targetDate: targetDate || null,
        dailyMode: modeOverride,
        weeklyNewVocabQuota,
        weeklyNewGrammarQuota,
        secondaryGoal: secondaryGoal || null,
        examMode: intent === "exam" || modeOverride === "deep",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(intent === "plan" ? "四週學習計劃已生成。" : intent === "exam" ? "考試模式已啟動。" : "目標已更新。");
    });
  }

  function switchToExamMode() {
    setDailyMode("deep");
    submitContract("exam", "deep");
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="JLPT 目標">
          <select value={targetJlpt} onChange={(event) => setTargetJlpt(event.target.value as GoalSettings["targetJlpt"])} className="glass-input w-full">
            {["N5", "N4", "N3", "N2", "N1"].map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </Field>

        <Field label="Deadline">
          <input
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className="glass-input w-full"
          />
        </Field>
      </div>

      <Field label="每日模式">
        <div className="grid gap-2 sm:grid-cols-3">
          {(["min", "standard", "deep"] as DailyMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDailyMode(mode)}
              className={[
                "rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                dailyMode === mode
                  ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
                  : "border-white/10 bg-white/[0.045] text-[var(--text-secondary)] hover:bg-white/[0.075]",
              ].join(" ")}
            >
              <span className="block font-semibold">{modeLabel(mode)}</span>
              <span className="mt-1 block text-xs text-[var(--text-muted)]">{modeMinutes(mode)} min</span>
            </button>
          ))}
        </div>
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={`每週新詞：${weeklyNewVocabQuota}`}>
          <input
            type="range"
            min={5}
            max={100}
            value={weeklyNewVocabQuota}
            onChange={(event) => setWeeklyNewVocabQuota(Number(event.target.value))}
            className="w-full accent-[var(--accent-lime)]"
          />
        </Field>
        <Field label={`每週文法：${weeklyNewGrammarQuota}`}>
          <input
            type="range"
            min={1}
            max={20}
            value={weeklyNewGrammarQuota}
            onChange={(event) => setWeeklyNewGrammarQuota(Number(event.target.value))}
            className="w-full accent-[var(--accent-lime)]"
          />
        </Field>
      </div>

      <Field label="次要目標">
        <input
          value={secondaryGoal}
          onChange={(event) => setSecondaryGoal(event.target.value)}
          className="glass-input w-full"
          maxLength={80}
          placeholder="例：商務電郵／動畫聽力／旅行口說"
        />
      </Field>

      {error ? <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      {message ? <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-[var(--success)]">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn-primary text-sm disabled:opacity-60">
          {pending ? "更新中..." : "更新學習合約"}
        </button>
        <button type="button" onClick={switchToExamMode} disabled={pending} className="btn-ghost text-sm disabled:opacity-60">
          <Gauge className="h-4 w-4" aria-hidden="true" />
          切換考試模式
        </button>
        <button type="button" onClick={() => submitContract("plan")} disabled={pending} className="btn-ghost text-sm disabled:opacity-60">
          <ListChecks className="h-4 w-4" aria-hidden="true" />
          生成學習計劃
        </button>
      </div>
    </form>
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

function modeLabel(mode: DailyMode) {
  if (mode === "min") return "精簡";
  if (mode === "deep") return "深度";
  return "標準";
}

function modeMinutes(mode: DailyMode) {
  if (mode === "min") return 15;
  if (mode === "deep") return 90;
  return 45;
}
