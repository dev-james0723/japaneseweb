"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mineSentencesAction, saveMinedSentencesAction } from "@/lib/actions/mining";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";

type Candidate = {
  sentence_ja: string;
  kana_reading?: string | null;
  translation_zh: string;
  difficulty_jlpt?: "N5" | "N4" | "N3" | "N2" | "N1" | null;
  key_vocab: string[];
  key_grammar: string[];
  cloze_target?: string | null;
};

const SOURCES = ["manual", "nhk", "youtube", "talk_me", "podcast", "article", "other"] as const;

const SOURCE_LABELS: Record<(typeof SOURCES)[number], string> = {
  manual: "手動",
  nhk: "NHK",
  youtube: "YouTube",
  talk_me: "Talk Me",
  podcast: "Podcast",
  article: "文章",
  other: "其他",
};

export function MiningClient() {
  const [text, setText] = useState("");
  const [sourceType, setSourceType] = useState<(typeof SOURCES)[number]>("manual");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  function mine() {
    if (text.trim().length < 10) return;
    setMsg(null);
    startTransition(async () => {
      const res = await mineSentencesAction({
        text,
        sourceType,
        sourceUrl: sourceUrl || undefined,
        sourceTitle: sourceTitle || undefined,
      });
      if (!res.ok) { setMsg(res.error); return; }
      setCandidates(res.sentences as Candidate[]);
      setSelected(new Set(res.sentences.map((_, i) => i)));
    });
  }

  function save() {
    const toSave = candidates.filter((_, i) => selected.has(i));
    if (!toSave.length) return;
    startTransition(async () => {
      const res = await saveMinedSentencesAction({
        sourceType,
        sourceUrl: sourceUrl || null,
        sourceTitle: sourceTitle || null,
        sentences: toSave,
      });
      if (!res.ok) { setMsg(res.error); return; }
      toSave.forEach((sentence) => emitOSBuddyEvent({ type: "mining:save", sentence: sentence.sentence_ja }));
      setMsg(
        res.warning
          ? `已儲存 ${res.saved} 句。${res.warning}`
          : `已儲存 ${res.saved} 句，建立 ${res.reviewPrompts} 張複習卡。`,
      );
      setCandidates([]);
      setSelected(new Set());
      setText("");
      router.refresh();
    });
  }

  function toggle(i: number) {
    const next = new Set(selected);
    if (next.has(i)) {
      next.delete(i);
    } else {
      next.add(i);
    }
    setSelected(next);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as (typeof SOURCES)[number])}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
        >
          {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
        </select>
        <input
          type="text"
          placeholder="來源標題（可選）"
          value={sourceTitle}
          onChange={(e) => setSourceTitle(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="來源網址（可選）"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="貼上日文段落…"
        rows={6}
        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-jp resize-y focus:border-[var(--accent-lime)] focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <button onClick={mine} disabled={pending || text.length < 10} className="btn-primary text-sm">
          {pending && !candidates.length ? "採礦中…" : "擷取句子"}
        </button>
        {msg && <span className="text-xs text-[var(--accent-lime)]">{msg}</span>}
      </div>

      {candidates.length > 0 && (
        <div className="space-y-2 mt-2">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-[0.2em]">候選句子 — 揀要保存嘅</div>
          {candidates.map((c, i) => (
            <label
              key={i}
              className={`block p-3 rounded-xl border cursor-pointer transition-colors ${
                selected.has(i)
                  ? "border-[var(--accent-lime)]/40 bg-[var(--accent-lime-bg)]/30"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-start gap-2">
                <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mb-1">
                    {c.difficulty_jlpt && <span className="px-1.5 py-0.5 rounded bg-[var(--accent-sky)]/10 text-[var(--accent-sky)]">{c.difficulty_jlpt}</span>}
                    {c.cloze_target && <span>填空：{c.cloze_target}</span>}
                  </div>
                  <div className="text-sm font-jp">{c.sentence_ja}</div>
                  {c.kana_reading && <div className="text-[10px] text-[var(--text-muted)] font-jp">{c.kana_reading}</div>}
                  <div className="text-xs text-[var(--text-secondary)] mt-1">{c.translation_zh}</div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.key_vocab?.map((v) => <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5">{v}</span>)}
                    {c.key_grammar?.map((g) => <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-sakura)]/10 text-[var(--accent-sakura)]">{g}</span>)}
                  </div>
                </div>
              </div>
            </label>
          ))}
          <button onClick={save} disabled={pending || selected.size === 0} className="btn-primary text-sm">
            {pending ? "儲存中…" : `儲存 ${selected.size} 句`}
          </button>
        </div>
      )}
    </div>
  );
}
