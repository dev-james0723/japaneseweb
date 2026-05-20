"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMonthlyAuditAction, advancePhaseAction } from "@/lib/actions/weeklyReview";

export function MonthlyAuditForm({
  initial,
  monthStart,
  canAdvance,
}: {
  initial: {
    biggestProgress: string;
    biggestBottleneck: string;
    nextMonthFocus: string;
    planningRating: number | null;
    talkMeNaturalness: number | null;
  };
  monthStart: string;
  canAdvance: boolean;
}) {
  const [progress, setProgress] = useState(initial.biggestProgress);
  const [bottleneck, setBottleneck] = useState(initial.biggestBottleneck);
  const [nextFocus, setNextFocus] = useState(initial.nextMonthFocus);
  const [planRating, setPlanRating] = useState<number>(initial.planningRating ?? 5);
  const [talkMeRating, setTalkMeRating] = useState<number>(initial.talkMeNaturalness ?? 5);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  function save() {
    startTransition(async () => {
      const res = await saveMonthlyAuditAction({
        monthStart,
        biggestProgress: progress,
        biggestBottleneck: bottleneck,
        nextMonthFocus: nextFocus,
        planningRating: planRating,
        talkMeNaturalness: talkMeRating,
      });
      setMsg(res.ok ? "✓ 已儲存" : res.error);
      if (res.ok) {
        setTimeout(() => setMsg(null), 1500);
        router.refresh();
      }
    });
  }

  function advance() {
    if (!confirm("升級階段？此操作會重設階段開始日期。")) return;
    startTransition(async () => {
      const res = await advancePhaseAction();
      setMsg(res.ok ? "✓ 已升級至下一階段" : res.error);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Textarea label="最大進步" value={progress} setValue={setProgress} />
        <Textarea label="最大瓶頸" value={bottleneck} setValue={setBottleneck} />
        <Textarea label="下月重點" value={nextFocus} setValue={setNextFocus} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Slider label={`規劃能力：${planRating}/10`} value={planRating} onChange={setPlanRating} />
        <Slider label={`Talk Me 自然度：${talkMeRating}/10`} value={talkMeRating} onChange={setTalkMeRating} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={save} disabled={pending} className="btn-primary text-sm">{pending ? "儲存中…" : "儲存檢討"}</button>
        {canAdvance && (
          <button onClick={advance} disabled={pending} className="btn-ghost text-sm border border-[var(--accent-lime)]/40 text-[var(--accent-lime)]">
            🎉 升級階段
          </button>
        )}
        {msg && <span className="text-xs text-[var(--accent-lime)]">{msg}</span>}
      </div>
    </div>
  );
}

function Textarea({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  return (
    <label className="block space-y-1">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs resize-y focus:border-[var(--accent-lime)] focus:outline-none"
      />
    </label>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block space-y-1">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}
