"use client";

import { useState } from "react";
import { Check, Loader2, Pickaxe, X } from "lucide-react";

type MineState = "idle" | "mining" | "mined" | "error";

export function QuickMineButton({
  text,
  reading,
  meaningZh,
  context,
  sourceTitle,
  sourceSurface,
  dailyLessonId,
  contentItemId,
  culturalContentId,
  className = "",
}: {
  text: string;
  reading?: string | null;
  meaningZh?: string | null;
  context?: string | null;
  sourceTitle?: string | null;
  sourceSurface?: string | null;
  dailyLessonId?: string | null;
  contentItemId?: string | null;
  culturalContentId?: string | null;
  className?: string;
}) {
  const [state, setState] = useState<MineState>("idle");
  const [promptCount, setPromptCount] = useState<number | null>(null);

  async function mine() {
    if (state === "mining") return;
    setState("mining");
    setPromptCount(null);
    try {
      const res = await fetch("/api/learning/mine-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          reading: reading ?? "",
          meaning_zh: meaningZh ?? "",
          context: context ?? "",
          source_title: sourceTitle ?? context ?? "",
          source_path: window.location.pathname,
          source_surface: sourceSurface ?? "",
          daily_lesson_id: dailyLessonId ?? null,
          content_item_id: contentItemId ?? null,
          cultural_content_id: culturalContentId ?? null,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { review_prompts?: number } | null;
      if (!res.ok) throw new Error("採礦失敗");
      setPromptCount(typeof payload?.review_prompts === "number" ? payload.review_prompts : null);
      setState("mined");
      window.setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 1800);
    }
  }

  const label =
    state === "mined"
      ? promptCount !== null
        ? `${promptCount} 個提示`
        : "已採礦"
      : state === "error"
        ? "失敗"
        : "採礦";

  return (
    <button
      type="button"
      onClick={mine}
      disabled={state === "mining"}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        state === "mined"
          ? "border-[var(--accent-lime)]/35 bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
          : state === "error"
            ? "border-red-300/30 bg-red-500/10 text-red-200"
            : "border-white/10 bg-white/[0.055] text-[var(--text-secondary)] hover:border-[var(--accent-lime)]/35 hover:text-white",
        className,
      ].join(" ")}
      aria-label="把這句加入複習提示"
    >
      {state === "mining" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : state === "mined" ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : state === "error" ? (
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Pickaxe className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {label}
    </button>
  );
}
