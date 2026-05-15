"use client";

import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";

type Deck = { id: string; title: string; deck_date: string };

export function CalendarView({
  year,
  month,
  decksByDate,
  selectedDate,
}: {
  year: number;
  month: number; // 1-12
  decksByDate: Record<string, Deck[]>;
  selectedDate: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  const weeks: (string | null)[][] = [];
  const startWeekday = first.getUTCDay();

  let cur: (string | null)[] = Array(startWeekday).fill(null);
  for (let day = 1; day <= last.getUTCDate(); day++) {
    const iso = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
    cur.push(iso);
    if (cur.length === 7) {
      weeks.push(cur);
      cur = [];
    }
  }
  if (cur.length > 0) {
    while (cur.length < 7) cur.push(null);
    weeks.push(cur);
  }

  const prev = new Date(Date.UTC(year, month - 2, 1));
  const next = new Date(Date.UTC(year, month, 1));
  const prevHref = `/calendar?month=${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
  const nextHref = `/calendar?month=${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;

  const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center justify-between mb-4">
        <Link
          href={prevHref}
          aria-label="上個月"
          className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="text-base font-semibold tabular-nums">
          {year} 年 {String(month).padStart(2, "0")} 月
        </div>
        <Link
          href={nextHref}
          aria-label="下個月"
          className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[11px] text-[var(--text-muted)] mb-2 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((iso, i) => {
          if (!iso) return <div key={i} className="h-16" />;
          const decks = decksByDate[iso] ?? [];
          const isToday = iso === today;
          const isSelected = iso === selectedDate;
          return (
            <Link
              key={iso}
              href={`/calendar?month=${year}-${String(month).padStart(2, "0")}&date=${iso}`}
              className={clsx(
                "h-16 rounded-lg border text-xs flex flex-col items-start justify-between p-1.5 transition-all",
                isSelected
                  ? "bg-[var(--accent-lime-bg)] border-[rgba(200,229,58,0.4)]"
                  : "bg-white/[0.03] border-white/[0.08] hover:bg-white/10",
              )}
            >
              <span
                className={clsx(
                  "tabular-nums",
                  isToday && "text-[var(--accent-amber)] font-semibold",
                )}
              >
                {Number(iso.slice(-2))}
              </span>
              {decks.length > 0 && (
                <div className="flex items-center gap-1 self-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-lime)]" />
                  <span className="text-[10px] tabular-nums text-[var(--text-muted)]">
                    {decks.length}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </GlassPanel>
  );
}
