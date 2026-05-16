"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Trash2 } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { deleteDeckAction, updateDeckTitleAction } from "@/lib/actions/decks";

type Props = {
  deckId: string;
  initialTitle: string;
  deckDate: string;
  sourceType: string;
  topic: string | null;
  itemCount: number;
};

function sourceLabel(s: string) {
  if (s === "manual") return "手動輸入";
  if (s === "ocr") return "圖片 OCR";
  if (s === "ai_generated") return "AI 生成";
  return s;
}

export function DeckDetailTitleCard({
  deckId,
  initialTitle,
  deckDate,
  sourceType,
  topic,
  itemCount,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastSaved = useRef(initialTitle);

  useEffect(() => {
    setTitle(initialTitle);
    lastSaved.current = initialTitle;
  }, [initialTitle]);

  function commitTitleIfChanged() {
    const next = title.trim();
    if (!next) {
      setTitle(lastSaved.current);
      return;
    }
    if (next === lastSaved.current) return;

    startTransition(async () => {
      const res = await updateDeckTitleAction({ deckId, title: next });
      if (!res.ok) {
        setError(res.error);
        setTitle(lastSaved.current);
        return;
      }
      setError(null);
      lastSaved.current = next;
      setTitle(next);
      router.refresh();
    });
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "確定要刪除此詞庫？詞庫內所有單字與相關資料都會一併刪除，且無法還原。",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deleteDeckAction(deckId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <GlassPanel className="p-6 md:p-8 relative pr-14 md:pr-16">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="absolute bottom-5 right-5 md:bottom-8 md:right-8 p-1.5 rounded-md text-red-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        aria-label="刪除此詞庫"
      >
        <Trash2 className="w-4 h-4" strokeWidth={2} />
      </button>

      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2">
        <Calendar className="w-3.5 h-3.5 shrink-0" />
        {deckDate}
        <span>·</span>
        <span>{sourceLabel(sourceType)}</span>
        {topic && (
          <>
            <span>·</span>
            <span className="truncate">{topic}</span>
          </>
        )}
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setError(null);
        }}
        onBlur={commitTitleIfChanged}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        maxLength={120}
        spellCheck={false}
        className="w-full max-w-[calc(100%-2rem)] bg-transparent text-2xl md:text-3xl font-semibold text-white border-b border-transparent hover:border-white/15 focus:border-white/35 focus:outline-none pb-1 transition-colors"
        aria-label="詞庫標題"
      />

      {error && (
        <p className="text-sm text-red-400 mt-2" role="alert">
          {error}
        </p>
      )}

      <p className="text-sm text-[var(--text-secondary)] mt-1">
        共 {itemCount} 個單字
      </p>
    </GlassPanel>
  );
}
