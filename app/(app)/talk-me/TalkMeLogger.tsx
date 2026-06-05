"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logTalkMeSessionAction } from "@/lib/actions/talkMe";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";

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
      emitOSBuddyEvent({ type: "talk-me:logged", minutes: duration });
      if (sentence) emitOSBuddyEvent({ type: "mining:save", sentence });
      setMsg(
        res.warning
          ? `已記錄。${res.warning}`
          : res.reviewPrompts
            ? `已記錄，並建立 ${res.reviewPrompts} 張複習卡。`
            : "已記錄。",
      );
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
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">時長（分鐘）</div>
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
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">課程（逗號分隔）</div>
          <input
            type="text"
            value={lessons}
            onChange={(e) => setLessons(e.target.value)}
            placeholder="咖啡店自我介紹、點餐"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="block space-y-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">最有用的一句（日文）</div>
        <input
          type="text"
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder="今日學咗最值得記嘅一句…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-jp"
        />
      </label>
      <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs text-[var(--text-secondary)] md:grid-cols-3">
        <ShadowingStep number="1" text="先只聽一次，抓節奏和重音。" />
        <ShadowingStep number="2" text="看文字跟讀三次，貼近原速。" />
        <ShadowingStep number="3" text="遮住文字再說一次，保存最有用的一句。" />
      </div>
      <div className="flex flex-wrap gap-4 text-xs">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={shadowing} onChange={(e) => setShadowing(e.target.checked)} />
          跟讀 3 次
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={convo} onChange={(e) => setConvo(e.target.checked)} />
          對話模式
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={addToMined} onChange={(e) => setAddToMined(e.target.checked)} />
          自動加入句子採礦
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={pending} className="btn-primary text-sm">
          {pending ? "儲存中…" : "儲存時段"}
        </button>
        {msg && <span className="text-xs text-[var(--accent-lime)]">{msg}</span>}
      </div>
    </div>
  );
}

function ShadowingStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/10 text-[10px] text-[var(--accent-lime)]">
        {number}
      </span>
      <span className="leading-5">{text}</span>
    </div>
  );
}
