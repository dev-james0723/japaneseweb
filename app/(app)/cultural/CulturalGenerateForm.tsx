"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CULTURAL_CATEGORIES, CULTURAL_CATEGORY_LABELS, type CulturalCategory } from "@/lib/cultural/categories";

export function CulturalGenerateForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState<CulturalCategory>("history_festivals");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cultural/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, category, save: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "生成失敗");
      if (json.content_id) {
        router.push(`/cultural/article/${json.content_id}`);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "未知錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="祇園祭の歴史 / 漢字の伝来 / 京都と大阪の違い"
        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm"
        required
        minLength={2}
        maxLength={200}
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as CulturalCategory)}
        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm"
      >
        {CULTURAL_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {CULTURAL_CATEGORY_LABELS[c].emoji} {CULTURAL_CATEGORY_LABELS[c].zh}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "生成中…" : "AI 生成文章"}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
