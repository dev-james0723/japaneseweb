"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  BookOpen,
  Layers,
  ImageIcon,
  MessageSquare,
  CircleHelp,
  Network,
  Sparkles,
  Loader2,
  Copy,
  RefreshCw,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { ImageLightbox } from "@/components/ImageLightbox";
import { SpeakerButton } from "@/components/SpeakerButton";
import type { VocabularyMemorySessionView } from "@/lib/vocabularyMemory/types";

type Item = {
  id: string;
  japanese: string;
  kana: string | null;
  romaji: string | null;
  meaning_zh: string | null;
  meaning_en: string | null;
  part_of_speech: string | null;
  jlpt_level: string | null;
  priority_tier: number | null;
  notes: string | null;
  core_explanation: string | null;
};

type Sentence = {
  id: string;
  japanese_sentence: string;
  romaji_sentence: string | null;
  meaning_zh: string | null;
  sentence_type: string | null;
  vocab_id: string | null;
};

type GeneratedImage = {
  id: string;
  image_url: string | null;
  image_type: string | null;
  vocab_id: string | null;
};

type Relationship = {
  id: string;
  source_vocab_id: string;
  target_vocab_id: string;
  relationship_type: string;
  explanation: string | null;
  example_sentence: string | null;
};

const TABS = [
  { id: "words", label: "單字", icon: BookOpen },
  { id: "groups", label: "分組", icon: Layers },
  { id: "images", label: "圖像記憶", icon: ImageIcon },
  { id: "sentences", label: "例句", icon: MessageSquare },
  { id: "quiz", label: "小測", icon: CircleHelp },
  { id: "connections", label: "連結", icon: Network },
] as const;

type Tab = (typeof TABS)[number]["id"];

type TargetWord = {
  id: string;
  japanese: string;
  romaji: string | null;
  meaning_zh: string | null;
};

export function DeckTabs({
  deckId,
  deckTitle: _deckTitle,
  deckTopic,
  initialTab,
  items,
  sentences,
  images,
  memorySession,
  relationships,
  targets,
  aiAutoFillCompleted,
  aiAutoFillAttempts,
  aiAutoFillLastError,
}: {
  deckId: string;
  deckTitle: string;
  deckTopic?: string | null;
  initialTab: string;
  items: Item[];
  sentences: Sentence[];
  images: GeneratedImage[];
  memorySession: VocabularyMemorySessionView | null;
  relationships: Relationship[];
  targets: TargetWord[];
  aiAutoFillCompleted: boolean;
  aiAutoFillAttempts: number;
  aiAutoFillLastError: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(
    (TABS.find((t) => t.id === initialTab)?.id ?? "words") as Tab,
  );
  const [autoFillBusy, setAutoFillBusy] = useState(false);
  const [autoFillBanner, setAutoFillBanner] = useState<string | null>(null);
  const autoFillStarted = useRef(false);

  useEffect(() => {
    if (aiAutoFillCompleted || items.length === 0) return;
    if (aiAutoFillAttempts >= 5) return;
    if (autoFillStarted.current) return;
    autoFillStarted.current = true;

    const ac = new AbortController();

    async function run() {
      setAutoFillBusy(true);
      setAutoFillBanner(null);
      try {
        const res = await fetch("/api/ai/deck-auto-fill", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ deckId }),
          signal: ac.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (data.skipped) {
          autoFillStarted.current = false;
          router.refresh();
          return;
        }
        if (!res.ok) {
          autoFillStarted.current = false;
          setAutoFillBanner(data?.error ?? "自動 AI 補充失敗。");
          return;
        }
        if (typeof data.memoryImageFailures === "number" && data.memoryImageFailures > 0) {
          setAutoFillBanner(
            `分鏡場景圖有 ${data.memoryImageFailures} 組生成失敗，請到「圖像記憶」分頁按該組的「重生此組圖」重試。`,
          );
        }
        router.refresh();
      } catch (e: unknown) {
        if ((e as { name?: string })?.name === "AbortError") {
          autoFillStarted.current = false;
          return;
        }
        autoFillStarted.current = false;
        setAutoFillBanner(e instanceof Error ? e.message : "網路錯誤。");
      } finally {
        setAutoFillBusy(false);
      }
    }

    void run();
    return () => {
      ac.abort();
    };
  }, [deckId, aiAutoFillCompleted, aiAutoFillAttempts, items.length, router]);

  const exhausted = !aiAutoFillCompleted && aiAutoFillAttempts >= 5;

  return (
    <div className="space-y-4">
      {autoFillBusy && (
        <GlassPanel variant="subtle" className="p-4 flex items-start gap-3 text-sm text-[var(--text-secondary)]">
          <Loader2 className="w-4 h-4 shrink-0 text-[var(--accent-lime)] animate-spin mt-0.5" />
          <div>
            <p className="font-medium text-white">正在自動補充整份詞庫…</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              系統會依序完成：單字與例句分析、分組標籤、詞庫場景圖（舊版）、分鏡故事與場景圖。影像步驟可能需數分鐘，請勿關閉此頁。
            </p>
          </div>
        </GlassPanel>
      )}
      {autoFillBanner && !autoFillBusy && (
        <p className="text-sm text-[var(--accent-sky)] bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">
          {autoFillBanner}
        </p>
      )}
      {exhausted && aiAutoFillLastError && !autoFillBusy && !autoFillBanner && (
        <p className="text-sm text-[var(--danger)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          自動補充多次失敗：{aiAutoFillLastError} 請稍後重新整理頁面再試。
        </p>
      )}

      <div className="glass-panel-subtle p-1.5 inline-flex gap-1 overflow-x-auto max-w-full">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm transition-all whitespace-nowrap",
                active
                  ? "bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
                  : "text-[var(--text-secondary)] hover:bg-white/5",
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "words" && <WordsTab items={items} />}
      {tab === "groups" && <GroupsTab items={items} />}
      {tab === "images" && (
        <ImagesTab
          images={images}
          items={items}
          deckId={deckId}
          deckTopic={deckTopic ?? null}
          memorySession={memorySession}
          onRefresh={() => router.refresh()}
        />
      )}
      {tab === "sentences" && <SentencesTab sentences={sentences} items={items} />}
      {tab === "quiz" && <QuizTab items={items} deckId={deckId} />}
      {tab === "connections" && (
        <ConnectionsTab
          deckId={deckId}
          items={items}
          relationships={relationships}
          targets={targets}
          onRefresh={() => router.refresh()}
        />
      )}
    </div>
  );
}

/* ---------- Words tab ---------- */
function WordsTab({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <GlassPanel variant="subtle" className="p-8 text-center text-sm text-[var(--text-secondary)]">
        這個詞庫尚未有單字。
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text-muted)]">
        建立詞庫後，系統會<strong className="text-[var(--text-secondary)]">自動</strong>
        為每個單字補上 Romaji、例句、詞性、JLPT、諧音提示、動詞／形容詞變化，並用同一套資料更新「分組」與「例句」分頁。
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((v) => (
          <GlassPanel key={v.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-jp text-2xl">{v.japanese}</div>
                {v.romaji && (
                  <div className="text-xs text-[var(--text-romaji)] mt-0.5">{v.romaji}</div>
                )}
                {v.kana && (
                  <div className="text-xs text-[var(--text-muted)] mt-0.5 font-jp">{v.kana}</div>
                )}
              </div>
              <SpeakerButton text={v.japanese} size="md" />
            </div>
            {v.meaning_zh && (
              <p className="text-sm text-[var(--zh-text)] mt-3">{v.meaning_zh}</p>
            )}
            {v.core_explanation && (
              <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                {v.core_explanation}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {v.part_of_speech && <span className="chip">{v.part_of_speech}</span>}
              {v.jlpt_level && <span className="chip">{v.jlpt_level}</span>}
              {v.priority_tier && (
                <span className="chip">Tier {v.priority_tier}</span>
              )}
            </div>
            {v.notes && (
              <p className="text-xs text-[var(--accent-sakura)]/80 mt-3 italic leading-relaxed">
                💡 {v.notes}
              </p>
            )}
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

/* ---------- Groups tab ---------- */
function GroupsTab({ items }: { items: Item[] }) {
  const byPos = new Map<string, Item[]>();
  const byJlpt = new Map<string, Item[]>();
  const byTier = new Map<string, Item[]>();
  for (const it of items) {
    const pos = it.part_of_speech || "未分類";
    byPos.set(pos, [...(byPos.get(pos) ?? []), it]);
    const jlpt = it.jlpt_level || "未標示";
    byJlpt.set(jlpt, [...(byJlpt.get(jlpt) ?? []), it]);
    const tier = it.priority_tier ? `Tier ${it.priority_tier}` : "未分類";
    byTier.set(tier, [...(byTier.get(tier) ?? []), it]);
  }

  return (
    <div className="space-y-5">
      <GroupBlock title="依詞性" groups={byPos} />
      <GroupBlock title="依 JLPT 等級" groups={byJlpt} />
      <GroupBlock title="依優先級" groups={byTier} />
    </div>
  );
}

function GroupBlock({ title, groups }: { title: string; groups: Map<string, Item[]> }) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2 px-1">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from(groups.entries()).map(([k, arr]) => (
          <GlassPanel key={k} variant="subtle" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="chip chip-active">{k}</span>
              <span className="text-xs text-[var(--text-muted)] tabular-nums">{arr.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {arr.map((it) => (
                <span key={it.id} className="font-jp text-sm">
                  {it.japanese}
                </span>
              ))}
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

/* ---------- Images tab ---------- */
function ImagesTab({
  images,
  items,
  deckId,
  deckTopic,
  memorySession,
  onRefresh,
}: {
  images: GeneratedImage[];
  items: Item[];
  deckId: string;
  deckTopic: string | null;
  memorySession: VocabularyMemorySessionView | null;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState<"deck" | "memory" | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  async function gen(type: "deck_scene" | "mnemonic", vocabId?: string) {
    setLoading(type === "deck_scene" ? "deck" : vocabId ?? null);
    setError(null);
    const res = await fetch("/api/images/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, deckId: type === "deck_scene" ? deckId : undefined, vocabId }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data?.error ?? "圖像生成失敗。");
      return;
    }
    onRefresh();
  }

  async function runMemoryScenes() {
    setLoading("memory");
    setError(null);
    const res = await fetch("/api/ai/vocabulary-memory/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deckId }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data?.error ?? "分鏡場景生成失敗。");
      return;
    }
    const fails = (data.imageResults as { ok: boolean }[] | undefined)?.filter((x) => !x.ok).length ?? 0;
    if (fails > 0) {
      setError(`已完成，但有 ${fails} 組影像失敗。可於卡片上重試該組。`);
    }
    onRefresh();
  }

  async function regenerateGroup(groupId: string) {
    setLoading(groupId);
    setError(null);
    const res = await fetch("/api/ai/vocabulary-memory/regenerate-group", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ groupId }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data?.error ?? "重生失敗。");
      return;
    }
    onRefresh();
  }

  async function copyPrompt(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNote("已複製英文 image prompt。");
      setTimeout(() => setCopyNote(null), 2200);
    } catch {
      setCopyNote("無法複製，請手動選取。");
      setTimeout(() => setCopyNote(null), 2200);
    }
  }

  const deckImages = images.filter((i) => i.image_type === "deck_scene");
  const mnemonicByVocab = new Map<string, GeneratedImage>();
  for (const img of images) {
    if (img.image_type === "mnemonic" && img.vocab_id) {
      if (!mnemonicByVocab.has(img.vocab_id)) mnemonicByVocab.set(img.vocab_id, img);
    }
  }

  const memGroups = memorySession?.storylineGroups ?? [];
  const memFailCount = memGroups.filter((g) => g.generationStatus === "failed").length;
  const memOkCount = memGroups.filter((g) => g.generationStatus === "completed" && g.imageUrl).length;

  return (
    <div className="space-y-5">
      <ImageLightbox
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        src={lightbox?.src ?? ""}
        alt={lightbox?.alt ?? ""}
      />

      {error && (
        <p className="text-sm text-[var(--danger)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {copyNote && (
        <p className="text-xs text-[var(--accent-sky)] bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">
          {copyNote}
        </p>
      )}

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-medium">分鏡故事記憶場景</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xl">
              AI 會先為整份詞庫分群、撰寫日中對照小故事，再為每一組各生成一張 16:9 場景圖（含假名標音的日文標籤）。可點圖放大縮放檢視。
              {deckTopic ? ` 主題提示：${deckTopic}` : ""}
            </p>
          </div>
          <button
            onClick={() => runMemoryScenes()}
            disabled={loading === "memory" || items.length === 0}
            className="btn-ghost text-xs disabled:opacity-60 shrink-0 self-start sm:self-center inline-flex items-center gap-1.5"
          >
            {loading === "memory" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {memGroups.length > 0 ? "重新分析並生成全部分鏡" : "分析詞庫並生成分鏡圖"}
          </button>
        </div>

        {memGroups.length === 0 ? (
          <GlassPanel variant="subtle" className="p-8 text-center text-sm text-[var(--text-secondary)]">
            尚未建立分鏡故事場景。新詞庫會在開啟本頁時自動分析並生成；若長時間仍為空白，請稍後重新整理，或使用上方按鈕手動重跑。
          </GlassPanel>
        ) : (
          <>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              本輪共 {memGroups.length} 組故事線
              {memOkCount > 0 ? ` · 成功 ${memOkCount} 張圖` : ""}
              {memFailCount > 0 ? ` · ${memFailCount} 組失敗` : ""}
            </p>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {memGroups.map((g) => {
                const busy = loading === g.id;
                const pending =
                  g.generationStatus === "pending" || g.generationStatus === "generating";
                return (
                  <GlassPanel key={g.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-[var(--zh-text)] leading-snug">
                        {g.titleTraditionalChinese}
                      </h4>
                      <span className="text-[10px] text-[var(--text-muted)] tabular-nums shrink-0">
                        #{g.groupIndex + 1}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="relative w-full rounded-xl overflow-hidden border border-white/10 bg-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-lime)]"
                      onClick={() =>
                        g.imageUrl &&
                        g.generationStatus === "completed" &&
                        setLightbox({ src: g.imageUrl, alt: g.titleTraditionalChinese })
                      }
                      disabled={!g.imageUrl || g.generationStatus !== "completed"}
                    >
                      {g.imageUrl && g.generationStatus === "completed" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.imageUrl}
                          alt={g.titleTraditionalChinese}
                          className="w-full aspect-video object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-video flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)] px-4">
                          {pending ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin opacity-70" />
                              影像生成中…
                            </>
                          ) : (
                            <>
                              <span>此組影像失敗</span>
                              {g.errorMessage && (
                                <span className="text-[var(--danger)] text-center">{g.errorMessage}</span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      {g.imageUrl && g.generationStatus === "completed" && (
                        <span className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded bg-black/60 text-white/90">
                          點擊放大
                        </span>
                      )}
                    </button>

                    <div className="space-y-2 text-sm">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-0.5">
                          日文故事
                        </div>
                        <p className="font-jp leading-relaxed">{g.storylineJapanese}</p>
                        <div className="mt-1.5">
                          <SpeakerButton text={g.storylineJapanese} size="sm" />
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-0.5">
                          繁中翻譯
                        </div>
                        <p className="text-[var(--zh-text)] leading-relaxed">{g.storylineTraditionalChinese}</p>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] mb-1.5">本組單字</div>
                      <ul className="space-y-2">
                        {g.words.map((w) => (
                          <li key={w.word} className="text-xs border border-white/5 rounded-lg p-2">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className="font-jp text-sm">{w.word}</span>
                              {w.reading && (
                                <span className="font-jp text-[var(--text-muted)]">{w.reading}</span>
                              )}
                            </div>
                            {w.meaningTraditionalChinese && (
                              <div className="text-[var(--zh-text)] mt-0.5">{w.meaningTraditionalChinese}</div>
                            )}
                            {w.visualAnchor && (
                              <div className="text-[var(--text-secondary)] mt-1 leading-relaxed">
                                畫面：{w.visualAnchor}
                              </div>
                            )}
                            {w.roleInStory && (
                              <div className="text-[var(--text-muted)] mt-0.5">敘事：{w.roleInStory}</div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => regenerateGroup(g.id)}
                        disabled={busy || pending}
                        className="btn-ghost text-xs inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        重生此組圖
                      </button>
                      <button
                        type="button"
                        onClick={() => copyPrompt(g.imagePrompt)}
                        className="btn-ghost text-xs inline-flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        複製 image prompt
                      </button>
                    </div>
                  </GlassPanel>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium">詞庫場景圖（舊版）</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              單張場景，仍舊資料可繼續瀏覽；新建議使用上方「分鏡故事記憶場景」。
            </p>
          </div>
          <button
            onClick={() => gen("deck_scene")}
            disabled={loading === "deck"}
            className="btn-ghost text-xs disabled:opacity-60"
          >
            {loading === "deck" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {deckImages.length > 0 ? "重新生成（舊）" : "生成（舊）"}
          </button>
        </div>
        {deckImages.length === 0 ? (
          <GlassPanel variant="subtle" className="p-8 text-center text-sm text-[var(--text-secondary)]">
            尚未生成舊版詞庫場景圖。新詞庫會自動產生一張；若仍沒有圖，請稍後重新整理或使用上方按鈕手動生成。
          </GlassPanel>
        ) : (
          <GlassPanel className="p-3 overflow-hidden">
            <button
              type="button"
              className="w-full block relative group"
              onClick={() =>
                deckImages[0].image_url &&
                setLightbox({ src: deckImages[0].image_url, alt: "詞庫場景（舊版）" })
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={deckImages[0].image_url ?? ""}
                alt="詞庫場景"
                className="w-full rounded-xl"
              />
              <span className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded bg-black/60 text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                點擊放大
              </span>
            </button>
          </GlassPanel>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium mb-3">單字記憶圖</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it) => {
            const img = mnemonicByVocab.get(it.id);
            const busy = loading === it.id;
            return (
              <GlassPanel key={it.id} variant="subtle" className="p-3">
                {img ? (
                  <button
                    type="button"
                    className="w-full block relative group"
                    onClick={() =>
                      img.image_url && setLightbox({ src: img.image_url, alt: it.japanese })
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.image_url ?? ""}
                      alt={it.japanese}
                      className="w-full aspect-square rounded-lg object-cover mb-2"
                    />
                    <span className="absolute bottom-3 right-2 text-[10px] px-2 py-0.5 rounded bg-black/60 text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                      點擊放大
                    </span>
                  </button>
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-white/5 mb-2 flex items-center justify-center text-xs text-[var(--text-muted)]">
                    尚未生成
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="font-jp text-sm truncate">{it.japanese}</div>
                  <button
                    onClick={() => gen("mnemonic", it.id)}
                    disabled={busy}
                    className="text-xs text-[var(--accent-lime)] hover:underline disabled:opacity-60 inline-flex items-center gap-1"
                  >
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {img ? "重生" : "生成"}
                  </button>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ---------- Sentences tab ---------- */
function SentencesTab({ sentences, items }: { sentences: Sentence[]; items: Item[] }) {
  const byVocab = new Map<string, Item>();
  for (const it of items) byVocab.set(it.id, it);

  if (sentences.length === 0) {
    return (
      <GlassPanel variant="subtle" className="p-8 text-center text-sm text-[var(--text-secondary)]">
        尚未有例句。建立詞庫後系統會自動分析並加入例句；若仍顯示此訊息，請稍候或重新整理頁面。
      </GlassPanel>
    );
  }
  return (
    <div className="space-y-3">
      {sentences.map((s) => (
        <GlassPanel key={s.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-jp text-base">{s.japanese_sentence}</div>
              {s.romaji_sentence && (
                <div className="text-xs text-[var(--text-romaji)] mt-1">{s.romaji_sentence}</div>
              )}
              {s.meaning_zh && (
                <div className="text-sm text-[var(--zh-text)] mt-2">{s.meaning_zh}</div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <SpeakerButton text={s.japanese_sentence} size="sm" />
              {s.sentence_type && (
                <span className="chip text-[10px]">{sentenceTypeLabel(s.sentence_type)}</span>
              )}
            </div>
          </div>
          {s.vocab_id && byVocab.get(s.vocab_id) && (
            <div className="text-xs text-[var(--text-muted)] mt-2 pt-2 border-t border-white/5">
              來自單字：<span className="font-jp">{byVocab.get(s.vocab_id)!.japanese}</span>
            </div>
          )}
        </GlassPanel>
      ))}
    </div>
  );
}

function sentenceTypeLabel(t: string) {
  if (t === "example") return "例句";
  if (t === "personal") return "個人";
  if (t === "conversation") return "會話";
  if (t === "story") return "故事";
  return t;
}

/* ---------- Quiz tab ---------- */
function QuizTab({ items, deckId }: { items: Item[]; deckId: string }) {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [_, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <GlassPanel variant="subtle" className="p-8 text-center text-sm text-[var(--text-secondary)]">
        詞庫尚未有單字，無法生成小測。
      </GlassPanel>
    );
  }
  const valid = items.filter((i) => i.meaning_zh);
  if (valid.length < 3) {
    return (
      <GlassPanel variant="subtle" className="p-8 text-center text-sm text-[var(--text-secondary)]">
        小測需要至少 3 個帶中文意思的單字。請等待頁面上方自動補充完成，或稍後重新整理。
      </GlassPanel>
    );
  }

  const cur = valid[idx % valid.length];
  const distractors = pickDistractors(valid, cur, 3).map((d) => d.meaning_zh!);
  const options = shuffle([cur.meaning_zh!, ...distractors]);

  function answer(opt: string) {
    const isCorrect = opt === cur.meaning_zh;
    setRevealed(true);
    startTransition(async () => {
      await fetch("/api/review/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vocabId: cur.id,
          deckId,
          isCorrect,
          quizType: "recognition",
          prompt: cur.japanese,
          userAnswer: opt,
          correctAnswer: cur.meaning_zh,
        }),
      });
    });
  }

  return (
    <GlassPanel className="p-6 md:p-8">
      <div className="text-xs text-[var(--text-muted)] mb-2 tabular-nums">
        {idx + 1} / ∞
      </div>
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className="font-jp text-3xl md:text-4xl">{cur.japanese}</div>
        <SpeakerButton text={cur.japanese} size="md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => !revealed && answer(o)}
            disabled={revealed}
            className={clsx(
              "p-4 rounded-xl border text-left transition-colors",
              revealed && o === cur.meaning_zh && "bg-emerald-500/15 border-emerald-500/40",
              revealed && o !== cur.meaning_zh && "bg-red-500/10 border-red-500/20 opacity-60",
              !revealed && "bg-white/5 border-white/10 hover:bg-white/10",
            )}
          >
            <span className="text-sm">{o}</span>
          </button>
        ))}
      </div>
      {revealed && (
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={() => {
              setRevealed(false);
              setIdx((i) => i + 1);
            }}
            className="btn-primary"
          >
            下一題
          </button>
        </div>
      )}
    </GlassPanel>
  );
}

function pickDistractors(all: Item[], current: Item, n: number): Item[] {
  const pool = all.filter((x) => x.id !== current.id);
  return shuffle(pool).slice(0, n);
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Connections tab ---------- */
function ConnectionsTab({
  deckId,
  items,
  relationships,
  targets,
  onRefresh,
}: {
  deckId: string;
  items: Item[];
  relationships: Relationship[];
  targets: TargetWord[];
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const byId = new Map<string, { japanese: string; romaji?: string | null }>();
  for (const i of items) byId.set(i.id, { japanese: i.japanese, romaji: i.romaji });
  for (const t of targets) byId.set(t.id, { japanese: t.japanese, romaji: t.romaji });

  async function generate() {
    setLoading(true);
    setError(null);
    setNote(null);
    const res = await fetch("/api/ai/generate-connections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deckId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "生成失敗。");
      return;
    }
    if (data.note) setNote(data.note);
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">
          AI 會把今日新詞與你之前學過的單字連起來，並生成混合例句。
        </p>
        <button onClick={generate} disabled={loading} className="btn-ghost text-xs disabled:opacity-60">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Network className="w-3.5 h-3.5" />}
          {loading ? "生成中..." : "生成連結"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-[var(--danger)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {note && (
        <p className="text-sm text-[var(--accent-sky)] bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">
          {note}
        </p>
      )}

      {relationships.length === 0 ? (
        <GlassPanel variant="subtle" className="p-8 text-center text-sm text-[var(--text-secondary)]">
          尚未生成連結。建立更多詞庫後，AI 才能找到新舊詞之間的關係。
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {relationships.map((r) => {
            const s = byId.get(r.source_vocab_id);
            const t = byId.get(r.target_vocab_id);
            return (
              <GlassPanel key={r.id} className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-jp text-base">{s?.japanese ?? "?"}</span>
                  <span className="chip text-[10px]">{relationshipLabel(r.relationship_type)}</span>
                  <span className="text-xs text-[var(--text-muted)]">↔</span>
                  <span className="font-jp text-base text-[var(--text-secondary)]">{t?.japanese ?? "?"}</span>
                </div>
                {r.explanation && (
                  <p className="text-sm text-[var(--text-secondary)] mt-2">{r.explanation}</p>
                )}
                {r.example_sentence && (
                  <div className="flex items-start justify-between gap-3 mt-3 pt-3 border-t border-white/5">
                    <div className="font-jp text-sm">{r.example_sentence}</div>
                    <SpeakerButton text={r.example_sentence} size="sm" />
                  </div>
                )}
              </GlassPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}

function relationshipLabel(t: string) {
  const m: Record<string, string> = {
    same_topic: "同主題",
    opposite: "相反",
    similar: "近義",
    often_together: "常一起",
    same_kanji: "共用漢字",
    same_radical: "同部首",
    same_grammar: "同文法",
    confusing_pair: "易混淆",
    same_situation: "同場景",
  };
  return m[t] ?? t;
}
