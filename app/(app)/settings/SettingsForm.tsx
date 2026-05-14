"use client";

import { useState, useTransition } from "react";
import { saveSettingsAction } from "@/lib/actions/settings";

type Initial = {
  displayName: string;
  showRomaji: boolean;
  preferredVoice: string;
  defaultJlptLevel: string;
  dailyWordCount: number;
};

export function SettingsForm({ initial }: { initial: Initial }) {
  const [showRomaji, setShowRomaji] = useState(initial.showRomaji);
  const [voice, setVoice] = useState(initial.preferredVoice);
  const [level, setLevel] = useState<"N5" | "N4" | "N3" | "N2" | "N1">(
    (initial.defaultJlptLevel as "N5" | "N4" | "N3" | "N2" | "N1") ?? "N5",
  );
  const [count, setCount] = useState(initial.dailyWordCount);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [pending, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInfo(null);
    setError(null);
    startTransition(async () => {
      const res = await saveSettingsAction({
        displayName,
        showRomaji,
        preferredVoice: voice,
        defaultJlptLevel: level,
        dailyWordCount: count,
      });
      if (!res.ok) setError(res.error);
      else {
        setInfo("已儲存。");
        // Reload so the show_romaji cookie + UI annotations refresh.
        setTimeout(() => window.location.reload(), 400);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
      <Row label="顯示名稱">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="glass-input w-full"
          placeholder="你的暱稱"
        />
      </Row>

      <Row
        label="顯示 Romaji"
        hint="預設開啟。關閉後，全站日文漢字上方不再顯示 Romaji。"
      >
        <Toggle checked={showRomaji} onChange={setShowRomaji} />
      </Row>

      <Row label="TTS 日文聲音">
        <select
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          className="glass-input w-full"
        >
          <option value="Takumi">Takumi（男聲）</option>
          <option value="Kazuha">Kazuha（女聲，Neural）</option>
          <option value="Tomoko">Tomoko（女聲，Neural）</option>
          <option value="Mizuki">Mizuki（女聲）</option>
        </select>
      </Row>

      <Row label="預設學習難度">
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as typeof level)}
          className="glass-input w-full"
        >
          {["N5", "N4", "N3", "N2", "N1"].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </Row>

      <Row label={`每日生成單字數：${count}`}>
        <input
          type="range"
          min={5}
          max={20}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full accent-[var(--accent-lime)]"
        />
      </Row>

      {error && (
        <p className="text-sm text-[var(--danger)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {info && (
        <p className="text-sm text-[var(--success)] bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          {info}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
        {pending ? "儲存中..." : "儲存設定"}
      </button>
    </form>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 py-4 border-b border-white/5 last:border-0">
      <div className="md:max-w-[260px]">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{hint}</div>}
      </div>
      <div className="md:flex-1 md:max-w-sm">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative ${
        checked ? "bg-[var(--accent-lime)]" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}
