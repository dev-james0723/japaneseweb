"use client";

import { useState, useRef, useEffect } from "react";
import { GlassPanel } from "@/components/GlassPanel";

type Difficulty = "N5" | "N4" | "N3" | "N2";

type AssistantReply = {
  reply_ja: string;
  kana: string;
  translation_zh: string;
  correction: null | { original: string; corrected: string; explanation_zh: string };
  suggestion_ja: string | null;
  suggestion_zh: string | null;
};

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; data: AssistantReply };

const PRESETS = [
  { label: "Café 點餐", scenario: "你喺東京嘅一間 café 想點咖啡同蛋糕。", partner: "店員" },
  { label: "便利店結帳", scenario: "你喺 7-11 結帳，店員會問你要唔要袋／加熱／用 IC 卡。", partner: "店員" },
  { label: "問路", scenario: "你喺新宿問路去歌舞伎町。", partner: "路人" },
  { label: "酒店入住", scenario: "你入住一間旅館，要交護照、確認晚餐時間。", partner: "前台" },
  { label: "同事閒聊", scenario: "你係新人，午飯時同同事閒聊。", partner: "同事" },
];

export function RoleplayClient({ defaultDifficulty }: { defaultDifficulty: Difficulty }) {
  const [scenario, setScenario] = useState(PRESETS[0].scenario);
  const [partnerRole, setPartnerRole] = useState(PRESETS[0].partner);
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultDifficulty);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || pending) return;
    setError(null);
    const userMsg: Message = { role: "user", content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setPending(true);
    try {
      const res = await fetch("/api/ai/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          partnerRole,
          difficulty,
          history: next.map((m) => ({ role: m.role, content: m.role === "user" ? m.content : (m as any).data.reply_ja })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `HTTP ${res.status}`);
        setPending(false);
        return;
      }
      const data: AssistantReply = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply_ja, data }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知錯誤");
    } finally {
      setPending(false);
    }
  }

  function start(preset: typeof PRESETS[number]) {
    setScenario(preset.scenario);
    setPartnerRole(preset.partner);
    setMessages([]);
    setError(null);
  }

  return (
    <div className="space-y-3">
      <GlassPanel className="p-4">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => start(p)}
              className="text-xs px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="md:col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs"
            placeholder="場景描述"
          />
          <div className="flex gap-2">
            <input
              value={partnerRole}
              onChange={(e) => setPartnerRole(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs"
              placeholder="對手角色"
            />
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs"
            >
              {(["N5", "N4", "N3", "N2"] as Difficulty[]).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-3 md:p-4">
        <div ref={scrollRef} className="max-h-[55vh] overflow-y-auto space-y-3 pr-1">
          {messages.length === 0 && (
            <div className="text-xs text-center py-12 text-[var(--text-muted)]">
              撳上面 preset，或者寫一句日文開始對話。
            </div>
          )}
          {messages.map((m, i) => (
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] p-3 rounded-2xl bg-[var(--accent-lime-bg)] text-sm font-jp">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[85%] p-3 rounded-2xl bg-white/5 space-y-2">
                  <div className="text-sm font-jp">{m.data.reply_ja}</div>
                  <div className="text-[10px] text-[var(--text-muted)] font-jp">{m.data.kana}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{m.data.translation_zh}</div>
                  {m.data.correction && (
                    <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
                      <div className="text-red-300">⚠️ {m.data.correction.original} → <span className="text-[var(--accent-lime)]">{m.data.correction.corrected}</span></div>
                      <div className="text-[var(--text-muted)] mt-1">{m.data.correction.explanation_zh}</div>
                    </div>
                  )}
                  {m.data.suggestion_ja && (
                    <div className="mt-2 p-2 rounded-lg bg-[var(--accent-sakura)]/10 border border-[var(--accent-sakura)]/20 text-xs">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent-sakura)]">💡 點答</div>
                      <div className="font-jp">{m.data.suggestion_ja}</div>
                      {m.data.suggestion_zh && <div className="text-[var(--text-muted)] mt-0.5">{m.data.suggestion_zh}</div>}
                    </div>
                  )}
                </div>
              </div>
            )
          ))}
          {pending && (
            <div className="text-xs text-[var(--text-muted)] italic">…AI 諗緊</div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="用日文回應…"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-jp focus:border-[var(--accent-lime)] focus:outline-none"
          />
          <button onClick={send} disabled={pending || !input.trim()} className="btn-primary text-sm">
            送出
          </button>
        </div>
        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
      </GlassPanel>
    </div>
  );
}
