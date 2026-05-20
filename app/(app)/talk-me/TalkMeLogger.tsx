"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logTalkMeSessionAction } from "@/lib/actions/talkMe";

export function TalkMeLogger() {
  const [duration, setDuration] = useState(10);
  const [lessons, setLessons] = useState("");
  const [sentence, setSentence] = useState("");
  const [shadowing, setShadowing] = useState(false);
  const [convo, setConvo] = useState(false);
  const [addToMined, setAddToMined] = useState(true);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      const res = await logTalkMeSessionAction({
        durationMinutes: duration,
        lessonsCompleted: lessons.split(",").map((s) => s.trim()).filter(Boolean),
        mostUsefulSentence: sentence || null,
        shadowingDone: shadowing,
        conversationModeDone: convo,
        addToMined: addToMined && !!sentence,
      });
      if (!res.ok) { setMsg(res.error); return; }
      setMsg("✓ Logged");
      setLessons("");
      setSentence("");
      setShadowing(false);
      setConvo(false);
      router.refresh();
      setTimeout(() => setMsg(null), 1500);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Duration (min)</div>
          <input
            type="number"
            min={1}
            max={600}
            value={duration}
            onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 0))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm tabular-nums"
          />
        </label>
        <label className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Lessons (comma-separated)</div>
          <input
            type="text"
            value={lessons}
            onChange={(e) => setLessons(e.target.value)}
            placeholder="Self-intro at café, Ordering food"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="block space-y-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Most useful sentence (日文)</div>
        <input
          type="text"
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder="今日學咗最值得記嘅一句…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-jp"
        />
      </label>
      <div className="flex flex-wrap gap-4 text-xs">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={shadowing} onChange={(e) => setShadowing(e.target.checked)} />
          Shadowing 3×
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={convo} onChange={(e) => setConvo(e.target.checked)} />
          Conversation mode
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={addToMined} onChange={(e) => setAddToMined(e.target.checked)} />
          Auto-add sentence to mining
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={pending} className="btn-primary text-sm">
          {pending ? "Saving…" : "Save session"}
        </button>
        {msg && <span className="text-xs text-[var(--accent-lime)]">{msg}</span>}
      </div>
    </div>
  );
}
