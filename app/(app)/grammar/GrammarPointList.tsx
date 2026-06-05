"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { deleteGrammarPointAction, updateGrammarPointAction } from "@/lib/actions/grammar";

export type GrammarPointItem = {
  id: string;
  pattern: string;
  jlpt_level: string | null;
  core_meaning: string | null;
  construction: string | null;
  similar_patterns: string[];
  common_mistake: string | null;
  mnemonic: string | null;
  active_stage: number;
};

type Draft = {
  pattern: string;
  jlptLevel: "N5" | "N4" | "N3" | "N2" | "N1";
  coreMeaning: string;
  construction: string;
  similarPatterns: string;
  commonMistake: string;
  mnemonic: string;
  activeStage: number;
};

export function GrammarPointList({ points }: { points: GrammarPointItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function beginEdit(point: GrammarPointItem) {
    setEditingId(point.id);
    setDraft({
      pattern: point.pattern,
      jlptLevel: normalizeJlpt(point.jlpt_level),
      coreMeaning: point.core_meaning ?? "",
      construction: point.construction ?? "",
      similarPatterns: point.similar_patterns?.join(", ") ?? "",
      commonMistake: point.common_mistake ?? "",
      mnemonic: point.mnemonic ?? "",
      activeStage: point.active_stage ?? 1,
    });
    setMessage(null);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setError(null);
  }

  function saveEdit(pointId: string) {
    if (!draft?.pattern.trim()) return;
    startTransition(async () => {
      setError(null);
      const result = await updateGrammarPointAction({
        id: pointId,
        pattern: draft.pattern,
        jlptLevel: draft.jlptLevel,
        coreMeaning: draft.coreMeaning || undefined,
        construction: draft.construction || undefined,
        similarPatterns: parseSimilarPatterns(draft.similarPatterns),
        commonMistake: draft.commonMistake || undefined,
        mnemonic: draft.mnemonic || undefined,
        activeStage: draft.activeStage,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("已更新。");
      cancelEdit();
      router.refresh();
    });
  }

  function deletePoint(pointId: string) {
    if (!confirm("刪除此文法重點？")) return;
    startTransition(async () => {
      setError(null);
      const result = await deleteGrammarPointAction({ id: pointId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("已刪除。");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p> : null}
      {message ? <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-[var(--success)]">{message}</p> : null}

      {points.map((point) => {
        const isEditing = editingId === point.id && draft;
        return (
          <GlassPanel key={point.id} variant="subtle" className="p-4">
            {isEditing ? (
              <div className="space-y-3">
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_96px_96px]">
                  <input
                    value={draft.pattern}
                    onChange={(event) => setDraft({ ...draft, pattern: event.target.value })}
                    className="glass-input font-jp text-sm"
                    placeholder="句型"
                  />
                  <select
                    value={draft.jlptLevel}
                    onChange={(event) => setDraft({ ...draft, jlptLevel: event.target.value as Draft["jlptLevel"] })}
                    className="glass-input text-sm"
                  >
                    {(["N5", "N4", "N3", "N2", "N1"] as const).map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  <select
                    value={draft.activeStage}
                    onChange={(event) => setDraft({ ...draft, activeStage: Number(event.target.value) })}
                    className="glass-input text-sm"
                  >
                    {[1, 2, 3, 4].map((stage) => (
                      <option key={stage} value={stage}>第 {stage} 級</option>
                    ))}
                  </select>
                </div>
                <input
                  value={draft.coreMeaning}
                  onChange={(event) => setDraft({ ...draft, coreMeaning: event.target.value })}
                  className="glass-input w-full text-sm"
                  placeholder="核心意思"
                />
                <input
                  value={draft.construction}
                  onChange={(event) => setDraft({ ...draft, construction: event.target.value })}
                  className="glass-input w-full text-sm"
                  placeholder="接續 / 結構"
                />
                <input
                  value={draft.similarPatterns}
                  onChange={(event) => setDraft({ ...draft, similarPatterns: event.target.value })}
                  className="glass-input w-full text-sm"
                  placeholder="相近句型 / 對比，例如 〜ために, 〜ように"
                />
                <input
                  value={draft.commonMistake}
                  onChange={(event) => setDraft({ ...draft, commonMistake: event.target.value })}
                  className="glass-input w-full text-sm"
                  placeholder="常見錯誤"
                />
                <input
                  value={draft.mnemonic}
                  onChange={(event) => setDraft({ ...draft, mnemonic: event.target.value })}
                  className="glass-input w-full text-sm"
                  placeholder="記憶法"
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => saveEdit(point.id)} disabled={pending || !draft.pattern.trim()} className="btn-primary px-3 py-1.5 text-xs">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    儲存
                  </button>
                  <button type="button" onClick={cancelEdit} disabled={pending} className="btn-ghost px-3 py-1.5 text-xs">
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-jp text-base">{point.pattern}</span>
                    {point.jlpt_level ? <span className="rounded bg-[var(--accent-sky)]/10 px-1.5 py-0.5 text-[10px] text-[var(--accent-sky)]">{point.jlpt_level}</span> : null}
                    <span className="rounded bg-[var(--accent-sakura)]/10 px-1.5 py-0.5 text-[10px] text-[var(--accent-sakura)]">第 {point.active_stage} 級</span>
                  </div>
                  {point.core_meaning ? <div className="text-xs text-[var(--text-secondary)]">{point.core_meaning}</div> : null}
                  {point.construction ? <div className="mt-1 text-[10px] text-[var(--text-muted)]">構造: {point.construction}</div> : null}
                  {point.similar_patterns?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {point.similar_patterns.slice(0, 5).map((pattern) => (
                        <span key={pattern} className="rounded bg-[var(--accent-amber)]/10 px-1.5 py-0.5 text-[10px] text-[var(--accent-amber)]">
                          vs {pattern}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {point.common_mistake ? <div className="mt-1 text-[10px] text-red-300">{point.common_mistake}</div> : null}
                  {point.mnemonic ? <div className="mt-1 text-[10px] text-[var(--accent-lime)]">{point.mnemonic}</div> : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => beginEdit(point)}
                    className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-[var(--text-secondary)] hover:text-white"
                    aria-label={`編輯 ${point.pattern}`}
                    title="編輯"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePoint(point.id)}
                    className="grid h-9 w-9 place-items-center rounded-full border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15"
                    aria-label={`刪除 ${point.pattern}`}
                    title="刪除"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </GlassPanel>
        );
      })}
    </div>
  );
}

function normalizeJlpt(value: string | null): Draft["jlptLevel"] {
  if (value === "N5" || value === "N4" || value === "N3" || value === "N2" || value === "N1") return value;
  return "N4";
}

function parseSimilarPatterns(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n，、/／]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 8);
}
