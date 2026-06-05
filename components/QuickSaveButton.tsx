"use client";

import { useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";

export function QuickSaveButton({
  text,
  reading,
  meaningZh,
  context,
  tags = [],
  savedFrom = "quick_save",
  className = "",
}: {
  text: string;
  reading?: string | null;
  meaningZh?: string | null;
  context?: string | null;
  tags?: string[];
  savedFrom?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    if (state === "saving") return;
    setState("saving");
    emitOSBuddyEvent({ type: "vocab:save:start", text });
    try {
      const res = await fetch("/api/learning/save-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          reading: reading ?? "",
          meaning_zh: meaningZh ?? "",
          context: context ?? "",
          source_path: window.location.pathname,
          saved_from: savedFrom,
          tags,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setState("saved");
      emitOSBuddyEvent({ type: "vocab:save:success", text });
      window.setTimeout(() => setState("idle"), 1800);
    } catch (error) {
      setState("error");
      emitOSBuddyEvent({ type: "vocab:save:error", error: error instanceof Error ? error.message : "save_failed" });
      window.setTimeout(() => setState("idle"), 1800);
    }
  }

  return (
    <button
      type="button"
      onClick={save}
      disabled={state === "saving"}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        state === "saved"
          ? "border-[var(--accent-lime)]/35 bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
          : state === "error"
            ? "border-red-300/30 bg-red-500/10 text-red-200"
            : "border-white/10 bg-white/[0.055] text-[var(--text-secondary)] hover:border-[var(--accent-lime)]/35 hover:text-white",
        className,
      ].join(" ")}
    >
      {state === "saving" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : state === "saved" ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {state === "saved" ? "已儲存" : state === "error" ? "失敗" : "儲存"}
    </button>
  );
}
