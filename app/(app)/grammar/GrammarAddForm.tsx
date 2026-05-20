"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addGrammarPointAction } from "@/lib/actions/grammar";

export function GrammarAddForm({ quotaExceeded }: { quotaExceeded: boolean }) {
  const [pattern, setPattern] = useState("");
  const [jlpt, setJlpt] = useState<"N5" | "N4" | "N3" | "N2" | "N1">("N4");
  const [meaning, setMeaning] = useState("");
  const [construction, setConstruction] = useState("");
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
        commonMistake: mistake || undefined,
        mnemonic: mnemonic || undefined,
        override,
      });
      if (!res.ok) { setMsg(res.error); return; }
      setPattern(""); setMeaning(""); setConstruction(""); setMistake(""); setMnemonic("");
      setMsg("✓ Added");
      setTimeout(() => setMsg(null), 1500);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {quotaExceeded && (
        <div className="p-2 rounded-lg bg-amber-500/10 text-xs text-amber-300 border border-amber-500/30">
          ⚠️ 已達本週 quota。如要強行加，撳下面 override checkbox（強烈不建議）。
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="Pattern e.g. 〜と思います" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-jp" />
        <select value={jlpt} onChange={(e) => setJlpt(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
          {(["N5", "N4", "N3", "N2", "N1"] as const).map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <input value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="Core meaning (繁中)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
      <input value={construction} onChange={(e) => setConstruction(e.target.value)} placeholder="Construction e.g. V-て + います" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
      <input value={mistake} onChange={(e) => setMistake(e.target.value)} placeholder="中文母語者常見錯誤 (optional)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
      <input value={mnemonic} onChange={(e) => setMnemonic(e.target.value)} placeholder="Mnemonic / 記憶法 (optional)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={submit} disabled={pending || !pattern.trim()} className="btn-primary text-sm">{pending ? "…" : "Add"}</button>
        {quotaExceeded && (
          <label className="text-xs flex items-center gap-1.5">
            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
            Override quota
          </label>
        )}
        {msg && <span className="text-xs text-[var(--accent-lime)]">{msg}</span>}
      </div>
    </div>
  );
}
