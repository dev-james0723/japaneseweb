"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, Flag, Loader2, X } from "lucide-react";
import {
  recordAiFeedbackAction,
  type RecordAiFeedbackInput,
} from "@/lib/actions/aiFeedback";

const reportTypes: { value: RecordAiFeedbackInput["reportType"]; label: string }[] = [
  { value: "wrong_japanese", label: "日文錯誤" },
  { value: "wrong_translation", label: "翻譯錯誤" },
  { value: "wrong_explanation", label: "解釋錯誤" },
  { value: "bad_source_claim", label: "來源聲稱錯誤" },
  { value: "unsafe_or_sensitive", label: "安全問題" },
  { value: "copyright_or_policy", label: "政策問題" },
  { value: "other", label: "其他" },
];

export function AiFeedbackButton({
  sourceSurface,
  targetType = "ai_output",
  targetId = null,
  aiOutput,
  metadata = {},
  className = "",
}: {
  sourceSurface: string;
  targetType?: RecordAiFeedbackInput["targetType"];
  targetId?: string | null;
  aiOutput: string;
  metadata?: Record<string, unknown>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState<RecordAiFeedbackInput["reportType"]>("wrong_explanation");
  const [severity, setSeverity] = useState<RecordAiFeedbackInput["severity"]>("medium");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error" | "muted"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (pending) return;
    startTransition(async () => {
      const res = await recordAiFeedbackAction({
        sourceSurface,
        targetType,
        targetId,
        reportType,
        severity,
        aiOutputExcerpt: aiOutput.slice(0, 1200),
        userNote: note,
        contextUrl: typeof window === "undefined" ? null : window.location.pathname,
        metadata,
      });
      if (!res.ok) {
        setMessage({ tone: "error", text: res.error });
        return;
      }
      setMessage({
        tone: res.skipped ? "muted" : "success",
        text: res.skipped ? "回饋資料表尚未就緒。" : "已回報。多謝你幫手校準 AI。",
      });
      setNote("");
      window.setTimeout(() => {
        setOpen(false);
        setMessage(null);
      }, 1600);
    });
  }

  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-amber)]/35 hover:text-white"
        aria-expanded={open}
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        回報問題
      </button>

      {open ? (
        <div className="mt-2 w-full max-w-sm rounded-xl border border-white/10 bg-[var(--surface-ink)] p-3 shadow-2xl">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 text-xs leading-5 text-[var(--text-secondary)]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-amber)]" aria-hidden="true" />
              <span>AI 建議內容；考試關鍵日文請再核對。</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 text-[var(--text-muted)] hover:bg-white/10">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">問題類型</span>
              <select
                value={reportType}
                onChange={(event) => setReportType(event.target.value as RecordAiFeedbackInput["reportType"])}
                className="glass-input w-full py-1.5 text-xs"
              >
                {reportTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">嚴重程度</span>
              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value as RecordAiFeedbackInput["severity"])}
                className="glass-input w-full py-1.5 text-xs"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </label>
          </div>

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="glass-input mt-2 w-full resize-y text-xs"
            placeholder="邊句錯？應該點改？"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={submit} disabled={pending} className="btn-primary px-3 py-1.5 text-xs">
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              送出回報
            </button>
            {message ? (
              <span
                className={[
                  "text-[11px]",
                  message.tone === "error" ? "text-red-300" : message.tone === "muted" ? "text-[var(--text-muted)]" : "text-[var(--accent-lime)]",
                ].join(" ")}
              >
                {message.text}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
