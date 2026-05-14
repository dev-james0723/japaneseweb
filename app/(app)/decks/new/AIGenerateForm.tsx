"use client";

import { useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

// Rotating topic pool — show 12 chips per visit so it feels fresh.
const ALL_TOPICS = [
  "音樂", "藝術", "運動", "食物", "甜品", "建築",
  "國家", "旅行", "學校", "工作", "日常生活", "感情",
  "天氣", "交通", "家庭", "健康", "科技", "電影",
  "動物", "日本文化", "鋼琴", "音樂會", "餐廳", "購物",
  "醫院", "工作室", "錄音", "表演", "節日", "法律",
  "商業", "旅館", "機場", "咖啡店",
];

function pickTopics() {
  const arr = [...ALL_TOPICS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 12);
}

const DIFFICULTIES: { id: "beginner" | "intermediate" | "advanced"; label: string }[] = [
  { id: "beginner", label: "初級 N5–N4" },
  { id: "intermediate", label: "中級 N3–N2" },
  { id: "advanced", label: "高級 N2–N1" },
];

export function AIGenerateForm() {
  const router = useRouter();
  const [topics] = useState(() => pickTopics());
  const [topic, setTopic] = useState("");
  const [custom, setCustom] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalTopic = (custom.trim() || topic).trim();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!finalTopic) {
      setError("請選一個主題，或自己輸入一個。");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate-vocabulary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic: finalTopic, difficulty, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "生成失敗。");
        setLoading(false);
        return;
      }
      router.push(`/decks/${data.deckId}`);
      router.refresh();
    } catch (err: any) {
      setError("生成失敗：" + (err?.message ?? "未知錯誤"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-2">
          選一個主題
        </label>
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTopic(t);
                setCustom("");
              }}
              className={clsx("chip", topic === t && !custom && "chip-active")}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="或自行輸入主題，例如：鋼琴大賽、京都旅行..."
          className="glass-input w-full mt-3"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-2">難度</label>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                className={clsx("chip flex-1 justify-center", difficulty === d.id && "chip-active")}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-2">
            單字數量：<span className="text-white tabular-nums">{count}</span>
          </label>
          <input
            type="range"
            min={5}
            max={15}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full accent-[var(--accent-lime)]"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--danger)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
          <Sparkles className="w-4 h-4" />
          {loading ? "AI 生成中..." : `生成 ${count} 個單字`}
        </button>
        {finalTopic && (
          <span className="text-xs text-[var(--text-muted)]">
            主題：<span className="text-white">{finalTopic}</span>
          </span>
        )}
      </div>
    </form>
  );
}
