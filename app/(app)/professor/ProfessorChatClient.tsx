"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pickaxe, Send } from "lucide-react";
import { AiFeedbackButton } from "@/components/AiFeedbackButton";
import { QuickSaveButton } from "@/components/QuickSaveButton";
import { SpeakerButton } from "@/components/SpeakerButton";
import { mineSentencesAction, saveMinedSentencesAction } from "@/lib/actions/mining";

type Message = { role: "user" | "assistant"; content: string };

type Candidate = {
  sentence_ja: string;
  kana_reading?: string | null;
  translation_zh: string;
  difficulty_jlpt?: "N5" | "N4" | "N3" | "N2" | "N1" | null;
  key_vocab: string[];
  key_grammar: string[];
  cloze_target?: string | null;
};

export function ProfessorChatClient({ seed }: { seed: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `我哋由「${seed}」開始。你可以問：點讀、點用、同類詞、例句、文化背景，或者叫我幫你出練習。`,
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(nextInput = input) {
    const content = nextInput.trim();
    if (!content || pending) return;
    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/professor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed, history: nextMessages }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "教授暫時未能回應。");
      setMessages([...nextMessages, { role: "assistant", content: json.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知錯誤");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["解釋語感", "給我例句", "音讀訓讀", "出三題練習"].map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => send(prompt)}
            className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--accent-lime)]/35 hover:text-white"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={[
                "max-w-[86%] rounded-2xl border p-4 text-sm leading-7",
                message.role === "user"
                  ? "border-[var(--accent-lime)]/25 bg-[var(--accent-lime-bg)]"
                  : "border-white/10 bg-white/[0.045]",
              ].join(" ")}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.role === "assistant" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <SpeakerButton text={message.content.slice(0, 1000)} size="sm" />
                  <QuickSaveButton
                    text={message.content}
                    context={`教授主題：${seed}`}
                    tags={["professor", "ai-explanation"]}
                    savedFrom="professor"
                  />
                  <ProfessorLearningActions seed={seed} content={message.content} />
                  <AiFeedbackButton
                    sourceSurface="professor"
                    targetType="professor_reply"
                    targetId={`${seed}:${index}`}
                    aiOutput={message.content}
                    metadata={{ seed, message_index: index }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {pending ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            教授思考緊...
          </div>
        ) : null}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              send();
            }
          }}
          className="glass-input min-w-0 flex-1 text-sm"
          placeholder={`繼續問「${seed}」...`}
        />
        <button type="button" onClick={() => send()} disabled={pending || !input.trim()} className="btn-primary text-sm">
          <Send className="h-4 w-4" aria-hidden="true" />
          送出
        </button>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

function ProfessorLearningActions({ seed, content }: { seed: string; content: string }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<{ tone: "success" | "error" | "muted"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const sourceTitle = `教授：${seed}`.slice(0, 200);

  function extractExamples() {
    if (pending) return;
    setStatus(null);
    startTransition(async () => {
      const res = await mineSentencesAction({
        text: [`主題：${seed}`, content].join("\n\n").slice(0, 5000),
        sourceType: "other",
        sourceTitle,
      });
      if (!res.ok) {
        setStatus({ tone: "error", text: res.error });
        return;
      }
      const nextCandidates = res.sentences as Candidate[];
      setCandidates(nextCandidates);
      setSelected(new Set(nextCandidates.map((_, index) => index)));
      setStatus(
        nextCandidates.length
          ? { tone: "muted", text: "揀要保存嘅例句；文法標記會一併送去文法庫。" }
          : { tone: "error", text: "呢段回答未抽到可複習例句。" },
      );
    });
  }

  function saveSelected() {
    const toSave = candidates.filter((_, index) => selected.has(index));
    if (!toSave.length || pending) return;
    startTransition(async () => {
      const res = await saveMinedSentencesAction({
        sourceType: "other",
        sourceUrl: null,
        sourceTitle,
        grammarSourceReference: `/professor?seed=${encodeURIComponent(seed)}`,
        createGrammarPoints: true,
        sentences: toSave,
      });
      if (!res.ok) {
        setStatus({ tone: "error", text: res.error });
        return;
      }
      setCandidates([]);
      setSelected(new Set());
      setStatus({
        tone: res.warning ? "muted" : "success",
        text: res.warning
          ? `已儲存 ${res.saved} 句。${res.warning}`
          : `已儲存 ${res.saved} 句，建立 ${res.reviewPrompts} 張複習卡、${res.grammarPoints} 條文法。`,
      });
      router.refresh();
    });
  }

  function toggleCandidate(index: number) {
    const next = new Set(selected);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelected(next);
  }

  return (
    <div className="w-full basis-full">
      <button
        type="button"
        onClick={extractExamples}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-lime)]/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && candidates.length === 0 ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Pickaxe className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        抽取例句
      </button>

      {status ? (
        <p
          className={[
            "mt-2 text-xs leading-5",
            status.tone === "success"
              ? "text-[var(--accent-lime)]"
              : status.tone === "error"
                ? "text-red-300"
                : "text-[var(--text-muted)]",
          ].join(" ")}
        >
          {status.text}
        </p>
      ) : null}

      {candidates.length ? (
        <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-black/10 p-3">
          {candidates.map((candidate, index) => (
            <label
              key={`${candidate.sentence_ja}-${index}`}
              className={[
                "block cursor-pointer rounded-xl border p-3 transition",
                selected.has(index)
                  ? "border-[var(--accent-lime)]/35 bg-[var(--accent-lime-bg)]/30"
                  : "border-white/10 bg-white/[0.025]",
              ].join(" ")}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(index)}
                  onChange={() => toggleCandidate(index)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                    {candidate.difficulty_jlpt ? (
                      <span className="rounded bg-[var(--accent-sky)]/10 px-1.5 py-0.5 text-[var(--accent-sky)]">
                        {candidate.difficulty_jlpt}
                      </span>
                    ) : null}
                    {candidate.cloze_target ? <span>填空：{candidate.cloze_target}</span> : null}
                  </div>
                  <div className="font-jp text-sm leading-6">{candidate.sentence_ja}</div>
                  {candidate.kana_reading ? (
                    <div className="font-jp text-[10px] text-[var(--text-muted)]">{candidate.kana_reading}</div>
                  ) : null}
                  <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{candidate.translation_zh}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {candidate.key_vocab.map((item) => (
                      <span key={item} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">
                        {item}
                      </span>
                    ))}
                    {candidate.key_grammar.map((item) => (
                      <span
                        key={item}
                        className="rounded bg-[var(--accent-sakura)]/10 px-1.5 py-0.5 text-[10px] text-[var(--accent-sakura)]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </label>
          ))}
          <button
            type="button"
            onClick={saveSelected}
            disabled={pending || selected.size === 0}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            儲存 {selected.size} 句到複習 / 文法
          </button>
        </div>
      ) : null}
    </div>
  );
}
