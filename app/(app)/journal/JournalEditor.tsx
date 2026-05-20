"use client";

import { useState, useTransition } from "react";
import { saveJournalEntryAction, noticeGapToNotebookAction } from "@/lib/actions/journal";
import { useRouter } from "next/navigation";

export function JournalEditor() {
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    naturalVersion: string | null;
    noticeGaps: string[];
    corrections: any;
    error?: string;
  } | null>(null);
  const router = useRouter();

  function onSubmit(runAi: boolean) {
    if (!content.trim()) return;
    startTransition(async () => {
      const res = await saveJournalEntryAction({ content, runAi });
      if (!res.ok) {
        setFeedback({ naturalVersion: null, noticeGaps: [], corrections: null, error: res.error });
        return;
      }
      setFeedback({
        naturalVersion: res.naturalVersion ?? null,
        noticeGaps: res.noticeGaps ?? [],
        corrections: res.corrections,
      });
      setContent("");
      router.refresh();
    });
  }

  function addGapToNotebook(gap: string) {
    startTransition(async () => {
      await noticeGapToNotebookAction({ noticeGap: gap });
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="用日文寫今日想記低嘅嘢…"
        rows={6}
        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-jp leading-relaxed focus:border-[var(--accent-lime)] focus:outline-none transition-colors resize-y"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onSubmit(true)}
          disabled={pending || !content.trim()}
          className="btn-primary text-sm"
        >
          {pending ? "處理中…" : "AI Check + 儲存"}
        </button>
        <button
          type="button"
          onClick={() => onSubmit(false)}
          disabled={pending || !content.trim()}
          className="btn-ghost text-sm"
        >
          只儲存
        </button>
        {feedback?.error && (
          <span className="text-xs text-red-400">{feedback.error}</span>
        )}
      </div>
      {feedback?.noticeGaps && feedback.noticeGaps.length > 0 && (
        <div className="p-3 rounded-lg bg-white/[0.04] border border-white/10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">
            📌 Add Notice Gaps to Notebook
          </div>
          <div className="flex flex-wrap gap-1.5">
            {feedback.noticeGaps.map((g, i) => (
              <button
                key={i}
                onClick={() => addGapToNotebook(g)}
                className="text-xs px-2.5 py-1 rounded-full bg-[var(--accent-sakura)]/10 text-[var(--accent-sakura)] hover:bg-[var(--accent-sakura)]/20 transition-colors"
              >
                + {g}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
