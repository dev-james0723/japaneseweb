"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logSelfTalkAction } from "@/lib/actions/selfTalk";

const CONTEXT_LABELS: Record<"morning" | "commute" | "work" | "night" | "other", string> = {
  morning: "早晨",
  commute: "通勤",
  work: "工作",
  night: "夜晚",
  other: "其他",
};

export function SelfTalkQuickLog() {
  const [stage, setStage] = useState(1);
  const [phrase, setPhrase] = useState("");
  const [ctx, setCtx] = useState<"morning" | "commute" | "work" | "night" | "other">("other");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      const res = await logSelfTalkAction({ stageLevel: stage, samplePhrase: phrase || null, context: ctx });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg("✓ 已記錄");
      setPhrase("");
      setTimeout(() => setMsg(null), 1500);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
              stage === s ? "bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]" : "bg-white/5 text-[var(--text-secondary)] hover:bg-white/10"
            }`}
          >
            第 {s} 級
          </button>
        ))}
      </div>
      <input
        type="text"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        placeholder="（可選）你腦中嘅日文…"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-jp focus:border-[var(--accent-lime)] focus:outline-none"
      />
      <div className="flex flex-wrap gap-1.5">
        {(["morning", "commute", "work", "night", "other"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCtx(c)}
            className={`text-xs px-2.5 py-1 rounded-full ${ctx === c ? "bg-[var(--accent-sakura)]/20 text-[var(--accent-sakura)]" : "bg-white/5 text-[var(--text-muted)] hover:bg-white/10"}`}
          >
            {CONTEXT_LABELS[c]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="btn-primary text-sm"
        >
          {pending ? "記錄中…" : "記錄"}
        </button>
        {msg && <span className="text-xs text-[var(--accent-lime)]">{msg}</span>}
      </div>
    </div>
  );
}
