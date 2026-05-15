"use client";

import { useState, useTransition } from "react";
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
} from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { SpeakerButton } from "@/components/SpeakerButton";

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
  deckTitle,
  initialTab,
  items,
  sentences,
  images,
  relationships,
  targets,
}: {
  deckId: string;
  deckTitle: string;
  initialTab: string;
  items: Item[];
  sentences: Sentence[];
  images: GeneratedImage[];
  relationships: Relationship[];
  targets: TargetWord[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(
    (TABS.find((t) => t.id === initialTab)?.id ?? "words") as Tab,
  );

  return (
    <div className="space-y-4">
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

      {tab === "words" && <WordsTab items={items} deckId={deckId} onRefresh={() => router.refresh()} />}
      {tab === "groups" && <GroupsTab items={items} />}
      {tab === "images" && (
        <ImagesTab images={images} items={items} deckId={deckId} onRefresh={() => router.refresh()} />
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
function WordsTab({
  items,
  deckId,
  onRefresh,
}: {
  items: Item[];
  deckId: string;
  onRefresh: () => void;
}) {
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enrich() {
    setEnriching(true);
    setError(null);
    const res = await fetch("/api/ai/analyze-vocabulary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deckId }),
    });
    const data = await res.json();
    setEnriching(false);
    if (!res.ok) {
      setError(data?.error ?? "AI 補充失敗。");
      return;
    }
    onRefresh();
  }

  if (items.length === 0) {
    return (
      <GlassPanel variant="subtle" className="p-8 text-center text-sm text-[var(--text-secondary)]">
        這個詞庫尚未有單字。
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">
          AI 可為每個單字補上 Romaji、例句、詞性、JLPT、記憶法、動詞 / 形容詞變化。
        </p>
        <button onClick={enrich} disabled={enriching} className="btn-ghost text-xs disabled:opacity-60">
          {enriching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {enriching ? "補充中..." : "AI 補充全部"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-[var(--danger)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
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
  onRefresh,
}: {
  images: GeneratedImage[];
  items: Item[];
  deckId: string;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState<"deck" | string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const deckImages = images.filter((i) => i.image_type === "deck_scene");
  const mnemonicByVocab = new Map<string, GeneratedImage>();
  for (const img of images) {
    if (img.image_type === "mnemonic" && img.vocab_id) {
      if (!mnemonicByVocab.has(img.vocab_id)) mnemonicByVocab.set(img.vocab_id, img);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className="text-sm text-[var(--danger)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">詞庫場景圖</h3>
          <button
            onClick={() => gen("deck_scene")}
            disabled={loading === "deck"}
            className="btn-ghost text-xs disabled:opacity-60"
          >
            {loading === "deck" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {deckImages.length > 0 ? "重新生成" : "生成詞庫場景"}
          </button>
        </div>
        {deckImages.length === 0 ? (
          <GlassPanel variant="subtle" className="p-8 text-center text-sm text-[var(--text-secondary)]">
            尚未生成詞庫場景圖。GPT Image 會把今日多個單字編進一張場景。
          </GlassPanel>
        ) : (
          <GlassPanel className="p-3 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={deckImages[0].image_url ?? ""}
              alt="詞庫場景"
              className="w-full rounded-xl"
            />
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.image_url ?? ""} alt={it.japanese} className="w-full aspect-square rounded-lg object-cover mb-2" />
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
        尚未有例句。在「單字」分頁點「AI 補充全部」即可生成例句。
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
        小測需要至少 3 個帶中文意思的單字。先「AI 補充」一下吧。
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
