"use client";

import { useEffect, useState } from "react";

export function FocusTapOverlay({ onClose, onComplete }: { onClose: () => void; onComplete: (score: number) => void }) {
  const [round, setRound] = useState(1);
  const [cue, setCue] = useState(false);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("等提示出現先點擊。");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === " " || event.key === "Enter") handleTap();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (round > 8) {
      onComplete(score);
      return;
    }
    const reset = window.setTimeout(() => {
      setCue(false);
      setMessage("等提示出現先點擊。");
    }, 0);
    const timer = window.setTimeout(() => {
      setCue(true);
      setMessage("而家！");
    }, 700 + Math.random() * 1500);
    return () => {
      window.clearTimeout(reset);
      window.clearTimeout(timer);
    };
  }, [onComplete, round, score]);

  function handleTap() {
    if (round > 8) return;
    if (cue) {
      setScore((value) => value + 1);
      setMessage("好，主動回想前嘅注意力在線。");
      setRound((value) => value + 1);
    } else {
      setMessage("太早。等提示再出手。");
      setRound((value) => value + 1);
    }
  }

  return (
    <div className="grid h-full min-h-[520px] place-items-center px-4">
      <div className="w-full max-w-xl text-center">
        <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
          只在提示出現時點擊。練主動回想前嘅注意力。
        </p>
        <div className={`mx-auto mb-6 grid h-44 w-44 place-items-center rounded-full border text-2xl font-semibold transition-all ${
          cue ? "border-[var(--accent-lime)] bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]" : "border-white/10 bg-white/[0.035] text-[var(--text-muted)]"
        }`}>
          {message}
        </div>
        <button type="button" className="btn-primary mx-auto" onClick={handleTap}>
          點擊
        </button>
        <div className="mt-6 flex justify-center gap-2 text-xs">
          <span className="chip">Round {Math.min(round, 8)} / 8</span>
          <span className="chip">Score {score} / 8</span>
        </div>
      </div>
    </div>
  );
}
