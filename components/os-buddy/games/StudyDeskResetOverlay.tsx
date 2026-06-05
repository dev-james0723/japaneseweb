"use client";

import { useEffect, useState } from "react";
import { OS_BUDDY_CLEAN_DESK_ASSETS } from "@/lib/os-buddy/os-buddy-assets";

export function StudyDeskResetOverlay({ onClose, onComplete }: { onClose: () => void; onComplete: (score: number) => void }) {
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const clock = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          onComplete(progress);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearInterval(clock);
    };
  }, [onClose, onComplete, progress]);

  useEffect(() => {
    if (progress >= 100) onComplete(100);
  }, [onComplete, progress]);

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--text-secondary)]">拖動學習夥伴清出學習桌。</p>
        <div className="flex gap-2 text-xs">
          <span className="chip">{Math.round(progress)}%</span>
          <span className="chip">{seconds}s</span>
        </div>
      </div>
      <div
        className="relative h-[calc(100%-48px)] min-h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-cover bg-center"
        style={{ backgroundImage: `url(${OS_BUDDY_CLEAN_DESK_ASSETS.messy})` }}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onPointerMove={() => {
          if (dragging) setProgress((value) => Math.min(100, value + 1.7));
        }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity"
          style={{ backgroundImage: `url(${OS_BUDDY_CLEAN_DESK_ASSETS.clean})`, opacity: progress / 100 }}
        />
        <div className="absolute inset-x-4 bottom-4 h-3 overflow-hidden rounded-full bg-black/35">
          <div className="h-full rounded-full bg-[var(--accent-lime)]" style={{ width: `${progress}%` }} />
        </div>
        <div
          className="absolute grid h-16 w-16 place-items-center rounded-2xl border border-[var(--accent-lime)]/40 bg-[#171612]/75 text-xl shadow-lg"
          style={{ left: `${14 + (progress % 70)}%`, top: `${30 + Math.sin(progress / 9) * 18}%` }}
        >
          日
        </div>
      </div>
    </div>
  );
}
