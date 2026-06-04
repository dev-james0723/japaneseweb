"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { SpeakerButton } from "@/components/SpeakerButton";

type Message = { role: "user" | "assistant"; content: string };

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
                <div className="mt-3">
                  <SpeakerButton text={message.content.slice(0, 1000)} size="sm" />
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
