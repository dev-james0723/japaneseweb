"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Check, Copy, ExternalLink, Loader2, Save, Sparkles, X } from "lucide-react";
import { SpeakerButton } from "@/components/SpeakerButton";

type Usage = {
  expression: string;
  reading: string;
  meaning_zh: string;
  example_ja: string;
  example_zh: string;
};

type InspectResult = {
  text: string;
  reading: string;
  meaning_zh: string;
  nuance_zh: string;
  common_usages: Usage[];
};

type PopoverState = {
  text: string;
  context: string;
  x: number;
  y: number;
};

export function SelectionInspector() {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [inspect, setInspect] = useState<InspectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const selectionTimerRef = useRef<number | null>(null);

  const close = useCallback(() => {
    setPopover(null);
    setInspect(null);
    setLoading(false);
    setSaved(false);
    setCopied(false);
  }, []);

  useEffect(() => {
    function readSelection() {
      const selection = window.getSelection();
      const text = selection?.toString().replace(/\s+/g, " ").trim() ?? "";
      if (!selection || text.length === 0) return close();
      if (text.length > 240) return close();

      const anchor = selection.anchorNode?.parentElement;
      if (
        anchor?.closest("input, textarea, select, [contenteditable='true'], [data-selection-inspector-disabled='true']")
      ) {
        return close();
      }

      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      const rect = range?.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) return;

      const containerText =
        anchor?.closest("article, main, section")?.textContent?.replace(/\s+/g, " ").trim().slice(0, 900) ?? "";
      const x = Math.min(Math.max(rect.left + rect.width / 2, 170), window.innerWidth - 190);
      const y = Math.min(rect.bottom + 12, window.innerHeight - 220);
      setPopover({ text, context: containerText, x, y });
      setInspect(null);
      setLoading(true);
      setSaved(false);
      setCopied(false);
    }

    function onSelectionEvent() {
      if (selectionTimerRef.current) {
        window.clearTimeout(selectionTimerRef.current);
      }
      selectionTimerRef.current = window.setTimeout(readSelection, 80);
    }

    document.addEventListener("mouseup", onSelectionEvent);
    document.addEventListener("keyup", onSelectionEvent);
    document.addEventListener("selectionchange", onSelectionEvent);
    return () => {
      document.removeEventListener("mouseup", onSelectionEvent);
      document.removeEventListener("keyup", onSelectionEvent);
      document.removeEventListener("selectionchange", onSelectionEvent);
      if (selectionTimerRef.current) {
        window.clearTimeout(selectionTimerRef.current);
      }
    };
  }, [close]);

  useEffect(() => {
    if (!popover?.text) return;
    const controller = new AbortController();
    fetch("/api/learning/inspect-selection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: popover.text, context: popover.context }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<InspectResult>;
      })
      .then((data) => setInspect(data))
      .catch(() =>
        setInspect({
          text: popover.text,
          reading: "",
          meaning_zh: "暫時未能取得 AI 解釋，但你仍然可以儲存、複製或播放。",
          nuance_zh: "",
          common_usages: [],
        }),
      )
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [popover?.text, popover?.context]);

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function saveText() {
    if (!popover) return;
    const res = await fetch("/api/learning/save-selection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: popover.text,
        reading: inspect?.reading ?? "",
        meaning_zh: inspect?.meaning_zh ?? "",
        context: popover.context,
        source_path: window.location.pathname,
      }),
    });
    if (res.ok) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    }
  }

  if (!popover) return null;

  return (
    <div
      ref={popoverRef}
      data-selection-inspector-disabled="true"
      className="fixed z-[80] w-[min(420px,calc(100vw-24px))] rounded-2xl border border-white/15 bg-[#171612]/95 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.48)] backdrop-blur-xl"
      style={{
        left: popover.x,
        top: popover.y,
        transform: "translateX(-50%)",
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent-lime)]" aria-hidden="true" />
            Inspect
          </div>
          <p className="break-words font-jp text-lg font-semibold leading-relaxed">{popover.text}</p>
          {inspect?.reading ? (
            <p className="mt-1 font-jp text-xs text-[var(--text-romaji)]">{inspect.reading}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={close}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-[var(--text-secondary)] hover:text-white"
          aria-label="關閉"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <SpeakerButton text={popover.text} size="sm" />
        <button type="button" onClick={() => copyText(popover.text)} className="btn-ghost px-3 py-1.5 text-xs">
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" onClick={saveText} className="btn-primary px-3 py-1.5 text-xs">
          {saved ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] p-3 text-sm text-[var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-lime)]" aria-hidden="true" />
          教授分析緊...
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{inspect?.meaning_zh}</p>
          {inspect?.nuance_zh ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.045] p-3 text-xs leading-6 text-[var(--text-secondary)]">
              {inspect.nuance_zh}
            </p>
          ) : null}
          {inspect?.common_usages?.length ? (
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <BookOpen className="h-3.5 w-3.5 text-[var(--accent-lime)]" aria-hidden="true" />
                常見用法
              </div>
              {inspect.common_usages.slice(0, 3).map((usage, index) => (
                <div key={`${usage.expression}-${index}`} className="rounded-xl bg-white/[0.035] p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-jp text-sm font-semibold">{usage.expression || usage.example_ja}</p>
                    <SpeakerButton text={usage.example_ja || usage.expression} size="sm" />
                  </div>
                  {usage.reading ? <p className="font-jp text-[11px] text-[var(--text-romaji)]">{usage.reading}</p> : null}
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{usage.meaning_zh || usage.example_zh}</p>
                  {usage.example_ja ? <p className="mt-2 font-jp text-xs">{usage.example_ja}</p> : null}
                  {usage.example_zh ? <p className="mt-1 text-xs text-[var(--text-muted)]">{usage.example_zh}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <a
        href={`/professor?seed=${encodeURIComponent(popover.text)}`}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--accent-lime)]/30 bg-[var(--accent-lime-bg)] px-3 py-2 text-xs font-semibold text-[var(--accent-lime)] hover:border-[var(--accent-lime)]/60"
      >
        與教授探索更多
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}
