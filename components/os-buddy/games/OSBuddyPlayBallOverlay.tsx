"use client";

import { useEffect, useState } from "react";

export function OSBuddyPlayBallOverlay({ onClose, onComplete }: { onClose: () => void; onComplete: (score: number) => void }) {
  const [ball, setBall] = useState({ x: 50, y: 62 });
  const [throws, setThrows] = useState(0);
  const [caught, setCaught] = useState(0);
  const [message, setMessage] = useState("拖動球再放手。");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function finishThrow() {
    const didCatch = Math.random() > 0.5;
    setThrows((value) => value + 1);
    if (didCatch) setCaught((value) => value + 1);
    setMessage(didCatch ? "接住咗。好，返去複習。" : "差少少。再拋一次。");
    setBall({ x: 50, y: 62 });
    if (throws >= 2) onComplete(caught + (didCatch ? 1 : 0));
  }

  return (
    <div
      className="relative h-full min-h-[520px] overflow-hidden bg-[radial-gradient(circle_at_50%_100%,rgba(246,168,203,0.16),transparent_34%),rgba(255,255,255,0.025)]"
      onPointerMove={(event) => {
        if (event.buttons !== 1) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setBall({
          x: Math.min(94, Math.max(6, ((event.clientX - rect.left) / rect.width) * 100)),
          y: Math.min(88, Math.max(14, ((event.clientY - rect.top) / rect.height) * 100)),
        });
      }}
      onPointerUp={finishThrow}
    >
      <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs">{message}</div>
      <div className="absolute right-4 top-4 flex gap-2 text-xs">
        <span className="chip">Throws {throws} / 3</span>
        <span className="chip">Caught {caught}</span>
      </div>
      <div className="absolute bottom-12 left-1/2 h-20 w-20 -translate-x-1/2 rounded-2xl border border-[var(--accent-lime)]/35 bg-[var(--accent-lime-bg)]" />
      <div
        className="absolute h-12 w-12 rounded-full border border-[var(--accent-sakura)]/45 bg-[var(--accent-sakura)] shadow-[0_14px_34px_rgba(246,168,203,0.22)]"
        style={{ left: `${ball.x}%`, top: `${ball.y}%`, transform: "translate(-50%, -50%)" }}
      />
    </div>
  );
}

