"use client";

import { useState, useTransition } from "react";
import { createDeckFromTextAction } from "@/lib/actions/decks";

export function ManualInputForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createDeckFromTextAction(formData);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
            詞庫標題
          </label>
          <input
            name="title"
            required
            defaultValue={`今日詞庫 · ${new Date().toLocaleDateString("zh-Hant-TW")}`}
            className="glass-input w-full"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
            主題（選填）
          </label>
          <input
            name="topic"
            placeholder="例如：旅行、音樂、日常生活"
            className="glass-input w-full"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
          單字清單
        </label>
        <textarea
          name="raw"
          rows={10}
          required
          placeholder={"每行一個單字，可用 ｜ 加上中文意思：\n\n神社 ｜ 神社\n練習する ｜ 練習\n静か ｜ 安靜\nなるべく ｜ 盡量"}
          className="glass-input w-full font-jp leading-relaxed"
        />
        <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
          可以只貼單字，也可以用「日文｜中文」格式。Romaji 與其他欄位會在後續 Phase 5 由 AI 補上。
        </p>
      </div>

      {error && (
        <p className="text-sm text-[var(--danger)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          {pending ? "建立中..." : "建立詞庫"}
        </button>
        <span className="text-xs text-[var(--text-muted)]">
          詞庫日期：{new Date().toISOString().slice(0, 10)}
        </span>
      </div>
    </form>
  );
}
