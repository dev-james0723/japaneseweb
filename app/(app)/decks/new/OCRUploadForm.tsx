"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Trash2, Plus, Loader2 } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { confirmOcrImportAction } from "@/lib/actions/ocr";

type Item = {
  japanese: string;
  kana?: string | null;
  romaji?: string | null;
  meaning_zh?: string | null;
  meaning_en?: string | null;
  part_of_speech?: string | null;
  jlpt_level?: string | null;
};

export function OCRUploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrId, setOcrId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/ocr/gemini", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "OCR 失敗。");
        setLoading(false);
        return;
      }
      setOcrId(data.ocrId);
      setTitle(data.title);
      setItems(data.items);
    } catch (err: any) {
      setError("OCR 請求失敗：" + (err?.message ?? "未知"));
    } finally {
      setLoading(false);
    }
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function addItem() {
    setItems((prev) => [...prev, { japanese: "" }]);
  }

  async function onConfirm() {
    if (!ocrId) return;
    setSaving(true);
    setError(null);
    const res = await confirmOcrImportAction({
      ocrId,
      title: title || "OCR 詞庫",
      topic: topic || null,
      items: items.filter((it) => it.japanese.trim()),
    });
    if (!res.ok) {
      setError(res.error);
      setSaving(false);
      return;
    }
    router.push(`/decks/${res.deckId}`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {!ocrId && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="glass-panel-subtle w-full py-10 px-6 text-center hover:bg-white/[0.08] transition-colors flex flex-col items-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-8 h-8 text-[var(--accent-sky)] animate-spin" />
                <span className="text-sm text-[var(--text-secondary)]">Gemini 識別中...</span>
              </>
            ) : (
              <>
                <ImageUp className="w-8 h-8 text-[var(--accent-sky)]" />
                <span className="text-sm text-[var(--text-secondary)]">
                  選擇日文教材、課本、筆記、手寫單字照片
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  支援 JPG / PNG / WEBP / HEIC ≤ 8MB
                </span>
              </>
            )}
          </button>
          {preview && !loading && (
            <img src={preview} alt="預覽" className="mt-4 rounded-xl max-h-64 mx-auto" />
          )}
        </div>
      )}

      {ocrId && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1.5">詞庫標題</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1.5">主題（選填）</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="glass-input w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                識別到 {items.length} 個單字（可編輯 / 刪除）
              </h3>
              <button type="button" onClick={addItem} className="btn-ghost text-xs">
                <Plus className="w-3.5 h-3.5" />
                新增一行
              </button>
            </div>
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {items.map((it, i) => (
                <GlassPanel key={i} variant="subtle" className="p-3">
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <input
                      value={it.japanese}
                      onChange={(e) => updateItem(i, { japanese: e.target.value })}
                      placeholder="日文"
                      className="glass-input col-span-3 font-jp"
                    />
                    <input
                      value={it.kana ?? ""}
                      onChange={(e) => updateItem(i, { kana: e.target.value })}
                      placeholder="假名"
                      className="glass-input col-span-2 font-jp"
                    />
                    <input
                      value={it.romaji ?? ""}
                      onChange={(e) => updateItem(i, { romaji: e.target.value })}
                      placeholder="Romaji"
                      className="glass-input col-span-2"
                    />
                    <input
                      value={it.meaning_zh ?? ""}
                      onChange={(e) => updateItem(i, { meaning_zh: e.target.value })}
                      placeholder="中文意思"
                      className="glass-input col-span-4"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="col-span-1 h-10 rounded-lg bg-white/5 hover:bg-red-500/20 text-[var(--text-muted)] hover:text-[var(--danger)] flex items-center justify-center transition-colors"
                      aria-label="刪除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </GlassPanel>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-[var(--danger)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button onClick={onConfirm} disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? "儲存中..." : "確認匯入"}
            </button>
            <button
              onClick={() => {
                setOcrId(null);
                setItems([]);
                setPreview(null);
              }}
              className="btn-ghost text-sm"
            >
              重新上傳
            </button>
          </div>
        </>
      )}

      {error && !ocrId && (
        <p className="text-sm text-[var(--danger)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
