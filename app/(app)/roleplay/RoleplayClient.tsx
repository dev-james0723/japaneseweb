"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Circle, Send, Target } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import type { CanDoGoal } from "@/lib/learning/communicationGoals";

export type Difficulty = "N5" | "N4" | "N3" | "N2" | "N1";

type RubricItem = {
  criterion: string;
  passed: boolean;
  evidence_zh: string;
};

type AssistantReply = {
  reply_ja: string;
  kana: string;
  translation_zh: string;
  correction: null | { original: string; corrected: string; explanation_zh: string };
  suggestion_ja: string | null;
  suggestion_zh: string | null;
  task_complete?: boolean;
  rubric?: RubricItem[];
  reusable_patterns?: string[];
  next_assignment?: string | null;
};

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; data: AssistantReply };

export function RoleplayClient({
  defaultDifficulty,
  goals,
  defaultGoalId,
}: {
  defaultDifficulty: Difficulty;
  goals: CanDoGoal[];
  defaultGoalId: string;
}) {
  const initialGoal = goals.find((goal) => goal.id === defaultGoalId) ?? goals[0];
  const [goalId, setGoalId] = useState(initialGoal?.id ?? "");
  const currentGoal = useMemo(
    () => goals.find((goal) => goal.id === goalId) ?? goals[0],
    [goalId, goals],
  );
  const [scenario, setScenario] = useState(currentGoal?.roleplay.scenario ?? "");
  const [partnerRole, setPartnerRole] = useState(currentGoal?.roleplay.partner ?? "店員");
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultDifficulty);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(currentGoal?.roleplay.starter ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function start(goal: CanDoGoal) {
    setGoalId(goal.id);
    setScenario(goal.roleplay.scenario);
    setPartnerRole(goal.roleplay.partner);
    setInput(goal.roleplay.starter);
    setMessages([]);
    setError(null);
  }

  async function send() {
    if (!input.trim() || pending || !currentGoal) return;
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
          canDo: currentGoal.canDo,
          successCriteria: currentGoal.roleplay.successCriteria,
          requiredPhrases: currentGoal.roleplay.requiredPhrases,
          history: next.map((message) => ({
            role: message.role,
            content: message.role === "user" ? message.content : message.data.reply_ja,
          })),
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

  if (!currentGoal) {
    return (
      <GlassPanel className="p-6 text-sm text-[var(--text-secondary)]">
        目前階段未設定角色扮演任務。
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-3">
      <GlassPanel className="p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="section-eyebrow mb-1">Task-based roleplay</p>
            <h2 className="text-lg font-semibold">{currentGoal.title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {currentGoal.canDo}
            </p>
          </div>
          <div className="chip chip-active w-fit">{difficulty}</div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {goals.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => start(goal)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                goal.id === currentGoal.id
                  ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
                  : "border-white/10 bg-white/[0.035] text-[var(--text-secondary)] hover:bg-white/[0.08]"
              }`}
            >
              {goal.title}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs md:col-span-2"
            placeholder="場景描述"
          />
          <div className="flex gap-2">
            <input
              value={partnerRole}
              onChange={(e) => setPartnerRole(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs"
              placeholder="對手角色"
            />
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs"
            >
              {(["N5", "N4", "N3", "N2", "N1"] as Difficulty[]).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.8fr]">
          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium">
              <Target className="h-4 w-4 text-[var(--accent-lime)]" />
              成功條件
            </div>
            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              {currentGoal.roleplay.successCriteria.map((criterion) => (
                <div key={criterion} className="flex items-start gap-2">
                  <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                  <span className="leading-5">{criterion}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Required phrases</div>
            <div className="flex flex-wrap gap-1.5">
              {currentGoal.roleplay.requiredPhrases.map((phrase) => (
                <span key={phrase} className="chip font-jp text-[10px]">{phrase}</span>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-3 md:p-4">
        <div ref={scrollRef} className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              用 starter 開始，或者直接輸入你自己的日文回應。
            </div>
          )}
          {messages.map((m, i) => (
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl bg-[var(--accent-lime-bg)] p-3 font-jp text-sm">{m.content}</div>
              </div>
            ) : (
              <AssistantBubble key={i} reply={m.data} />
            )
          ))}
          {pending && (
            <div className="text-xs italic text-[var(--text-muted)]">AI 正在判斷任務進度…</div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="用日文回應…"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-jp text-sm focus:border-[var(--accent-lime)] focus:outline-none"
          />
          <button onClick={send} disabled={pending || !input.trim()} className="btn-primary text-sm">
            <Send className="h-4 w-4" />
            送出
          </button>
        </div>
        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
      </GlassPanel>
    </div>
  );
}

function AssistantBubble({ reply }: { reply: AssistantReply }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] space-y-2 rounded-2xl bg-white/5 p-3">
        <div className="font-jp text-sm">{reply.reply_ja}</div>
        <div className="font-jp text-[10px] text-[var(--text-muted)]">{reply.kana}</div>
        <div className="text-xs text-[var(--text-secondary)]">{reply.translation_zh}</div>
        {reply.correction && (
          <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-xs">
            <div className="text-red-300">{reply.correction.original} → <span className="text-[var(--accent-lime)]">{reply.correction.corrected}</span></div>
            <div className="mt-1 text-[var(--text-muted)]">{reply.correction.explanation_zh}</div>
          </div>
        )}
        {reply.suggestion_ja && (
          <div className="mt-2 rounded-lg border border-[var(--accent-sakura)]/20 bg-[var(--accent-sakura)]/10 p-2 text-xs">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent-sakura)]">Next line</div>
            <div className="font-jp">{reply.suggestion_ja}</div>
            {reply.suggestion_zh && <div className="mt-0.5 text-[var(--text-muted)]">{reply.suggestion_zh}</div>}
          </div>
        )}
        {reply.rubric?.length ? (
          <div className="mt-2 rounded-lg border border-white/10 bg-black/15 p-2 text-xs">
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {reply.task_complete ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent-lime)]" /> : <Circle className="h-3.5 w-3.5" />}
              Task rubric
            </div>
            <div className="space-y-1.5">
              {reply.rubric.map((item) => (
                <div key={item.criterion} className="flex items-start gap-2">
                  {item.passed ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-lime)]" />
                  ) : (
                    <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                  )}
                  <div>
                    <div className="text-white">{item.criterion}</div>
                    <div className="text-[var(--text-muted)]">{item.evidence_zh}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {reply.reusable_patterns?.length ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {reply.reusable_patterns.map((pattern) => (
              <span key={pattern} className="chip font-jp text-[10px]">{pattern}</span>
            ))}
          </div>
        ) : null}
        {reply.next_assignment && (
          <div className="border-t border-white/10 pt-2 text-xs leading-5 text-[var(--text-secondary)]">
            <span className="font-medium text-white">下一個任務：</span>{reply.next_assignment}
          </div>
        )}
      </div>
    </div>
  );
}
