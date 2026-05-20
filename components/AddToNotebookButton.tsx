"use client";

import { useState, useTransition } from "react";
import { NotebookPen, Loader2, Check } from "lucide-react";
import { addVocabToNotebookAction } from "@/lib/actions/notebook";

export function AddToNotebookButton({
  vocabId,
  className,
}: {
  vocabId: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      setError(null);
      const result = await addVocabToNotebookAction({ vocabId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  return (
    <div className={className}>
      <button
        type="button"
        className="btn-ghost text-xs py-1.5 px-2.5 gap-1.5"
        onClick={handleClick}
        disabled={pending || done}
        title={error ?? undefined}
      >
        {pending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : done ? (
          <Check className="w-3.5 h-3.5 text-[var(--success)]" />
        ) : (
          <NotebookPen className="w-3.5 h-3.5" />
        )}
        {done ? "已加入筆記本" : "加入筆記本"}
      </button>
      {error && (
        <p className="text-[10px] text-[var(--danger)] mt-1">{error}</p>
      )}
    </div>
  );
}
