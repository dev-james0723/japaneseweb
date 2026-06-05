"use client";

import { useEffect, useMemo, useState } from "react";

type FallingItem = { id: number; label: string; x: number; y: number };

const FALLBACK_LABELS = ["あ", "か", "さ", "今日", "勉強", "復習", "話す", "聞く"];

export function KanaCatchOverlay({ onClose, onComplete }: { onClose: () => void; onComplete: (score: number) => void }) {
  const labels = useMemo(() => FALLBACK_LABELS, []);
  const [player, setPlayer] = useState(50);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setPlayer((value) => Math.max(5, value - 6));
      if (event.key === "ArrowRight") setPlayer((value) => Math.min(95, value + 6));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const spawn = window.setInterval(() => {
      setItems((prev) => [
        ...prev,
        { id: Date.now(), label: labels[Math.floor(Math.random() * labels.length)], x: 8 + Math.random() * 84, y: -5 },
      ]);
    }, 900);
    const tick = window.setInterval(() => {
      setItems((prev) => {
        let nextScore = 0;
        let missed = false;
        const next = prev
          .map((item) => ({ ...item, y: item.y + 3.4 }))
          .filter((item) => {
            if (item.y > 82 && item.y < 92 && Math.abs(item.x - player) < 9) {
              nextScore += 1;
              return false;
            }
            if (item.y > 104) {
              missed = true;
              return false;
            }
            return true;
          });
        if (nextScore) {
          setScore((value) => value + nextScore);
          setCombo((value) => value + nextScore);
        } else if (missed) {
          setCombo(0);
        }
        return next;
      });
    }, 110);
    const clock = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(spawn);
          window.clearInterval(tick);
          window.clearInterval(clock);
          onComplete(score);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => {
      window.clearInterval(spawn);
      window.clearInterval(tick);
      window.clearInterval(clock);
    };
  }, [labels, onComplete, player, score]);

  return (
    <div
      className="relative h-full min-h-[520px] overflow-hidden bg-[radial-gradient(circle_at_50%_110%,rgba(217,246,111,0.18),transparent_32%),rgba(255,255,255,0.025)]"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPlayer(Math.min(95, Math.max(5, ((event.clientX - rect.left) / rect.width) * 100)));
      }}
    >
      <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs">
        移動學習夥伴接住假名 / 單字卡。
      </div>
      <div className="absolute right-4 top-4 flex gap-2 text-xs">
        <span className="chip">分數 {score}</span>
        <span className="chip">連擊 {combo}</span>
        <span className="chip">{timeLeft}s</span>
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute rounded-xl border border-[var(--accent-sky)]/25 bg-[var(--accent-sky)]/12 px-3 py-2 font-jp text-xl shadow-lg"
          style={{ left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%, -50%)" }}
        >
          {item.label}
        </div>
      ))}
      <div
        className="absolute bottom-8 h-16 w-16 rounded-2xl border border-[var(--accent-lime)]/35 bg-[var(--accent-lime-bg)] shadow-[0_18px_40px_rgba(217,246,111,0.18)]"
        style={{ left: `${player}%`, transform: "translateX(-50%)" }}
      />
    </div>
  );
}
