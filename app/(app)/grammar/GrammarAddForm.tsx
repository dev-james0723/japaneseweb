"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addGrammarPointAction } from "@/lib/actions/grammar";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";

export function GrammarAddForm({ quotaExceeded }: { quotaExceeded: boolean }) {
  const [pattern, setPattern] = useState("");
  const [jlpt, setJlpt] = useState<"N5" | "N4" | "N3" | "N2" | "N1">("N4");
  const [meaning, setMeaning] = useState("");
  const [construction, setConstruction] = useState("");
  const [similarPatterns, setSimilarPatterns] = useState("");
  const [mistake, setMistake] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [override, setOverride] = useState(false);
  const router = useRouter();

  function submit() {
    if (!pattern.trim()) return;
    startTransition(async () => {
      const res = await addGrammarPointAction({
        pattern,
        jlptLevel: jlpt,
        coreMeaning: meaning || undefined,
        construction: construction || undefined,
        similarPatterns: parseSimilarPatterns(similarPatterns),
        commonMistake: mistake || undefined,
        mnemonic: mnemonic || undefined,
        override,
      });
      if (!res.ok) { setMsg(res.error); return; }
      emitOSBuddyEvent({ type: "grammar:add", pattern });
      setPattern(""); setMeaning(""); setConstruction(""); setSimilarPatterns(""); setMistake(""); setMnemonic("");
      setMsg("✓ 已新增");
      setTimeout(() => setMsg(null), 1500);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {quotaExceeded && (
        <div className="p-2 rounded-lg bg-amber-500/10 text-xs text-amber-300 border border-amber-500/30">
          ⚠️ 已達本週配額。如要強行加，請勾選下面的突破配額（強烈不建議）。
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="句型，例如 〜と思います" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-jp" />
        <select value={jlpt} onChange={(e) => setJlpt(e.target.value as typeof jlpt)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
          {(["N5", "N4", "N3", "N2", "N1"] as const).map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <input value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="核心意思（繁中）" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
      <input value={construction} onChange={(e) => setConstruction(e.target.value)} placeholder="接續，例如 V-て + います" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
      <input value={similarPatterns} onChange={(e) => setSimilarPatterns(e.target.value)} placeholder="相近句型 / 對比，例如 〜ために, 〜ように" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
      <input value={mistake} onChange={(e) => setMistake(e.target.value)} placeholder="中文母語者常見錯誤（可選）" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
      <input value={mnemonic} onChange={(e) => setMnemonic(e.target.value)} placeholder="記憶法（可選）" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={submit} disabled={pending || !pattern.trim()} className="btn-primary text-sm">{pending ? "…" : "新增"}</button>
        {quotaExceeded && (
          <label className="text-xs flex items-center gap-1.5">
            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
            突破配額限制
          </label>
        )}
        {msg && <span className="text-xs text-[var(--accent-lime)]">{msg}</span>}
      </div>
    </div>
  );
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
