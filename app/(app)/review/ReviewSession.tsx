"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Check,
  Headphones,
  Languages,
  Lightbulb,
  Mic2,
  PencilLine,
  RefreshCw,
  Repeat2,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { KanaKanjiBridge } from "@/components/KanaKanjiBridge";
import { SpeakerButton } from "@/components/SpeakerButton";
import type { ReviewRating } from "@/lib/srs";
import { sentencePromptLabel, type SentenceReviewPromptType } from "@/lib/sentenceReview";

type VocabReviewItem = {
  kind: "vocab";
  id: string;
  japanese: string;
  kana: string | null;
  romaji: string | null;
  meaning_zh: string | null;
  meaning_en: string | null;
  deck_id: string;
  status?: string | null;
  stability?: number | null;
  difficulty?: number | null;
  lapses?: number | null;
  is_leech?: boolean | null;
};

type SentenceReviewItem = {
  kind: "sentence";
  id: string;
  prompt_type: SentenceReviewPromptType;
  prompt: string;
  answer: string;
  sentence_ja: string;
  kana_reading: string | null;
  translation_zh: string | null;
  difficulty_jlpt: string | null;
  key_vocab: string[] | null;
  key_grammar: string[] | null;
  status?: string | null;
  stability?: number | null;
  difficulty?: number | null;
  lapses?: number | null;
  is_leech?: boolean | null;
};

type Item = VocabReviewItem | SentenceReviewItem;

type ReviewMode = {
  id: "recognition" | "production" | "listening" | "cloze" | "shadowing";
  label: string;
  instruction: string;
  icon: LucideIcon;
};

type Outcome = ReviewRating | null;

const RATING_BUTTONS: {
  rating: ReviewRating;
  label: string;
  hint: string;
  icon: LucideIcon;
  className: string;
}[] = [
  {
    rating: "again",
    label: "忘記",
    hint: "即時救援",
    icon: X,
    className: "border-red-500/30 bg-red-500/10 text-[var(--danger)] hover:bg-red-500/20",
  },
  {
    rating: "hard",
    label: "吃力",
    hint: "縮短間隔",
    icon: RotateCcw,
    className: "border-amber-500/30 bg-amber-500/10 text-[var(--accent-amber)] hover:bg-amber-500/20",
  },
  {
    rating: "good",
    label: "記得",
    hint: "正常排程",
    icon: Check,
    className: "border-emerald-500/30 bg-emerald-500/10 text-[var(--success)] hover:bg-emerald-500/20",
  },
  {
    rating: "easy",
    label: "太易",
    hint: "拉長間隔",
    icon: Sparkles,
    className: "border-[var(--accent-lime)]/35 bg-[var(--accent-lime-bg)] text-[var(--accent-lime)] hover:bg-[var(--accent-lime-bg)]/80",
  },
];

export function ReviewSession({ items }: { items: Item[] }) {
  const [idx, setIdx] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>(() => items.map(() => null));
  const [submitting, setSubmitting] = useState(false);
  const [repair, setRepair] = useState<{ item: Item; rating: ReviewRating } | null>(null);

  const current = items[idx];
  const done = idx >= items.length;
  const mode = current ? reviewModeFor(current, idx) : null;
  const rememberedCount = outcomes.filter((o) => o && o !== "again").length;
  const againCount = outcomes.filter((o) => o === "again").length;
  const hardCount = outcomes.filter((o) => o === "hard").length;

  async function record(rating: ReviewRating) {
    if (!current || !mode || submitting) return;
    setSubmitting(true);
    const isCorrect = rating !== "again";
    try {
      const endpoint = current.kind === "sentence" ? "/api/review/sentence-submit" : "/api/review/submit";
      const body = current.kind === "sentence"
        ? {
            promptId: current.id,
            isCorrect,
            rating,
            quizType: mode.id,
            prompt: promptForMode(current, mode),
            userAnswer: rating,
            correctAnswer: answerForMode(current, mode),
          }
        : {
            vocabId: current.id,
            deckId: current.deck_id,
            isCorrect,
            rating,
            quizType: mode.id,
            prompt: promptForMode(current, mode),
            userAnswer: rating,
            correctAnswer: answerForMode(current, mode),
          };
      await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      setOutcomes((prev) => {
        const next = [...prev];
        next[idx] = rating;
        return next;
      });
      setReveal(false);
      setIdx((i) => i + 1);
      if (rating === "again" || rating === "hard") {
        setRepair({ item: current, rating });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (repair) {
    return (
      <WeakRepairPanel
        item={repair.item}
        rating={repair.rating}
        onContinue={() => setRepair(null)}
      />
    );
  }

  if (done) {
    return (
      <GlassPanel className="p-7 text-center md:p-9">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[var(--accent-lime)]/25 bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]">
          <Trophy className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-semibold">複習完成</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">
          今日卡片已記錄。吃力或忘記的單字已轉入較短間隔，下一次會更早回來。
        </p>
        <div className="my-6 flex items-center justify-center gap-6">
          <Stat label="記得" value={rememberedCount} color="text-[var(--success)]" />
          <Stat label="吃力" value={hardCount} color="text-[var(--accent-amber)]" />
          <Stat label="忘記" value={againCount} color="text-[var(--danger)]" />
          <Stat label="總數" value={items.length} color="text-[var(--accent-lime)]" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-ghost">回到總覽</Link>
          <button
            type="button"
            onClick={() => {
              setIdx(0);
              setOutcomes(items.map(() => null));
              setReveal(false);
              setRepair(null);
            }}
            className="btn-primary"
          >
            <RefreshCw className="w-4 h-4" />
            再複習一次
          </button>
        </div>
      </GlassPanel>
    );
  }

  if (!current || !mode) return null;

  const ModeIcon = mode.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--accent-lime)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{ width: `${(idx / items.length) * 100}%` }}
          />
        </div>
        <div className="text-xs tabular-nums text-[var(--text-muted)]">
          {idx + 1} / {items.length}
        </div>
      </div>

      <GlassPanel className="flex min-h-[430px] flex-col p-5 md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs text-[var(--text-muted)]">
            <ModeIcon className="h-3.5 w-3.5 text-[var(--accent-lime)]" />
            {mode.label}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {current.is_leech && <span className="chip text-[10px] text-[var(--danger)]">救援卡</span>}
            {current.status && <span className="chip text-[10px]">{statusLabel(current.status)}</span>}
            {current.lapses != null && current.lapses > 0 && (
              <span className="chip text-[10px]">lapse {current.lapses}</span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-7 text-center">
          <div className="w-full">
            <p className="mb-5 text-xs text-[var(--text-muted)]">{mode.instruction}</p>
            <PromptView item={current} mode={mode} />
          </div>

          {reveal ? (
            <AnswerPanel item={current} />
          ) : (
            <button
              type="button"
              onClick={() => setReveal(true)}
              className="btn-ghost"
            >
              顯示意思
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {reveal && (
          <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-5 md:grid-cols-4">
            {RATING_BUTTONS.map((button) => {
              const Icon = button.icon;
              return (
                <button
                  key={button.rating}
                  type="button"
                  onClick={() => record(button.rating)}
                  disabled={submitting}
                  className={clsx(
                    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-300 disabled:opacity-60",
                    button.className,
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="h-4 w-4" />
                    {button.label}
                  </span>
                  <span className="text-[10px] opacity-75">{button.hint}</span>
                </button>
              );
            })}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}

function AnswerPanel({ item }: { item: Item }) {
  if (item.kind === "sentence") {
    return (
      <div className="w-full max-w-3xl rounded-xl border border-white/10 bg-black/15 px-5 py-4 text-left">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 text-[10px] uppercase text-[var(--text-muted)]">答案</div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-jp text-2xl leading-relaxed text-white">{item.sentence_ja}</span>
              <SpeakerButton text={item.sentence_ja} size="sm" />
            </div>
          </div>
          {item.difficulty_jlpt && <span className="chip text-[10px]">{item.difficulty_jlpt}</span>}
        </div>
        {item.kana_reading && (
          <div className="font-jp text-xs leading-5 text-[var(--text-muted)]">{item.kana_reading}</div>
        )}
        <div className="mt-2 text-base leading-7 text-[var(--zh-text)]">
          {item.translation_zh || "這張卡重點是聽音、填空或產出；請用自己的話確認意思。"}
        </div>
        {(item.key_vocab?.length || item.key_grammar?.length) ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {item.key_vocab?.map((vocab) => <span key={vocab} className="chip text-[10px]">{vocab}</span>)}
            {item.key_grammar?.map((grammar) => (
              <span key={grammar} className="chip text-[10px] text-[var(--accent-sakura)]">{grammar}</span>
            ))}
          </div>
        ) : null}
        {item.prompt_type === "shadowing" && (
          <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-sm text-[var(--text-secondary)] md:grid-cols-3">
            <RescueStep number="1" text="只聽一次，抓節奏。" />
            <RescueStep number="2" text="看文字跟讀三次。" />
            <RescueStep number="3" text="遮住文字再說一次。" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-black/15 px-5 py-4 text-left">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="mb-1 text-[10px] uppercase text-[var(--text-muted)]">答案</div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-jp text-2xl text-white">{item.japanese}</span>
            <SpeakerButton text={item.japanese} size="sm" />
          </div>
        </div>
        {item.kana && (
          <div className="text-right font-jp text-xs text-[var(--text-muted)]">{item.kana}</div>
        )}
      </div>
      <div className="text-lg text-[var(--zh-text)]">{item.meaning_zh ?? "（沒有中文解釋）"}</div>
      {item.meaning_en && (
        <div className="mt-1 text-xs text-[var(--text-muted)]">{item.meaning_en}</div>
      )}
      <KanaKanjiBridge
        japanese={item.japanese}
        kana={item.kana}
        romaji={item.romaji}
        meaning={item.meaning_zh}
        className="mt-4"
      />
    </div>
  );
}

function PromptView({ item, mode }: { item: Item; mode: ReviewMode }) {
  if (item.kind === "sentence") {
    if (mode.id === "listening") {
      return (
        <div className="mx-auto max-w-xl">
          <div className="mb-5 flex justify-center">
            <SpeakerButton text={item.sentence_ja} size="lg" />
          </div>
          <div className="text-lg leading-7 text-[var(--text-secondary)]">
            {item.prompt}
          </div>
        </div>
      );
    }

    if (mode.id === "production") {
      return (
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            中文 / 情境 → 日文
          </div>
          <div className="text-2xl leading-relaxed text-[var(--zh-text)] md:text-3xl">
            {item.prompt}
          </div>
        </div>
      );
    }

    if (mode.id === "shadowing") {
      return (
        <div className="mx-auto max-w-2xl">
          <div className="mb-5 flex justify-center">
            <SpeakerButton text={item.sentence_ja} size="lg" />
          </div>
          <div className="grid gap-3 text-left text-sm text-[var(--text-secondary)] md:grid-cols-3">
            <RescueStep number="1" text="先聽，不看字。" />
            <RescueStep number="2" text="看句子跟讀。" />
            <RescueStep number="3" text="遮字再說一次。" />
          </div>
          <div className="mt-5 font-jp text-2xl leading-relaxed">{item.sentence_ja}</div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          填入缺口
        </div>
        <div className="font-jp text-3xl leading-relaxed md:text-5xl">{item.prompt}</div>
        {item.translation_zh && (
          <div className="mt-4 text-sm text-[var(--text-secondary)]">{item.translation_zh}</div>
        )}
      </div>
    );
  }

  if (mode.id === "production") {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          中文 → 日文
        </div>
        <div className="text-2xl leading-relaxed text-[var(--zh-text)] md:text-3xl">
          {item.meaning_zh ?? item.meaning_en ?? "請講出日文"}
        </div>
      </div>
    );
  }

  if (mode.id === "listening") {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-5 flex justify-center">
          <SpeakerButton text={item.japanese} size="lg" />
        </div>
        <div className="text-lg text-[var(--text-secondary)]">
          先聽音，心入面寫出假名，再講中文意思。
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-center gap-3">
        <span className="font-jp text-5xl leading-tight md:text-7xl">{item.japanese}</span>
        <SpeakerButton text={item.japanese} size="lg" />
      </div>
      {item.kana && (
        <div className="mt-3 font-jp text-sm text-[var(--text-muted)]">{item.kana}</div>
      )}
      {item.romaji && (
        <div className="mt-1 text-xs text-[var(--text-romaji)]">{item.romaji}</div>
      )}
    </div>
  );
}

function WeakRepairPanel({
  item,
  rating,
  onContinue,
}: {
  item: Item;
  rating: ReviewRating;
  onContinue: () => void;
}) {
  if (item.kind === "sentence") {
    return (
      <GlassPanel className="p-6 md:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="section-eyebrow mb-2">Sentence rescue</p>
            <h2 className="text-xl font-semibold">把句子變成可開口的模式</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {rating === "again"
                ? "先不要追求完整背誦。抓住聲音、意思和可替換位置，下一輪會更早回來。"
                : "這句仍然需要自動化。現在慢速跟讀一次，再用自己的場景換一個詞。"}
            </p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--accent-amber)]/25 bg-amber-500/10 text-[var(--accent-amber)]">
            <Lightbulb className="h-5 w-5" />
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="font-jp text-2xl leading-relaxed">{item.sentence_ja}</div>
          <SpeakerButton text={item.sentence_ja} size="md" />
          {item.kana_reading && <div className="font-jp text-xs text-[var(--text-muted)]">{item.kana_reading}</div>}
        </div>

        {item.translation_zh && (
          <div className="mb-4 text-sm leading-6 text-[var(--zh-text)]">{item.translation_zh}</div>
        )}

        <div className="mt-5 grid gap-3 text-sm text-[var(--text-secondary)] md:grid-cols-3">
          <RescueStep number="1" text="聽一次，只追聲調和節奏。" />
          <RescueStep number="2" text="遮住目標詞，補回缺口。" />
          <RescueStep number="3" text="換一個人物/地點再講一次。" />
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onContinue} className="btn-primary">
            下一張
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className="p-6 md:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="section-eyebrow mb-2">Weak-card rescue</p>
          <h2 className="text-xl font-semibold">把這張卡重新接上</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            {rating === "again"
              ? "忘記不是失敗，是聲音、字形、意思其中一條線未接實。用 30 秒重建它。"
              : "吃力代表它還未自動化。現在做一次慢速連接，下一次會輕很多。"}
          </p>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--accent-amber)]/25 bg-amber-500/10 text-[var(--accent-amber)]">
          <Lightbulb className="h-5 w-5" />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="font-jp text-3xl">{item.japanese}</div>
        <SpeakerButton text={item.japanese} size="md" />
        {item.kana && <div className="font-jp text-sm text-[var(--text-muted)]">{item.kana}</div>}
      </div>

      <KanaKanjiBridge
        japanese={item.japanese}
        kana={item.kana}
        romaji={item.romaji}
        meaning={item.meaning_zh}
      />

      <div className="mt-5 grid gap-3 text-sm text-[var(--text-secondary)] md:grid-cols-3">
        <RescueStep number="1" text="遮住漢字，只讀出假名。" />
        <RescueStep number="2" text="看高亮漢字，讀同一個音。" />
        <RescueStep number="3" text="合眼講意思，再講一次日文。" />
      </div>

      <div className="mt-6 flex justify-end">
        <button type="button" onClick={onContinue} className="btn-primary">
          下一張
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </GlassPanel>
  );
}

function RescueStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-start gap-3 border-t border-white/10 pt-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[10px] text-[var(--accent-lime)]">
        {number}
      </span>
      <span className="leading-6">{text}</span>
    </div>
  );
}

function reviewModeFor(item: Item, index: number): ReviewMode {
  if (item.kind === "sentence") {
    if (item.prompt_type === "cloze") {
      return {
        id: "cloze",
        label: sentencePromptLabel(item.prompt_type),
        instruction: "先補出空格，不要看答案。講出整句後才揭曉。",
        icon: PencilLine,
      };
    }
    if (item.prompt_type === "listening") {
      return {
        id: "listening",
        label: sentencePromptLabel(item.prompt_type),
        instruction: "只靠聲音回想句子、意思和關鍵詞。",
        icon: Headphones,
      };
    }
    if (item.prompt_type === "production") {
      return {
        id: "production",
        label: sentencePromptLabel(item.prompt_type),
        instruction: "用中文意思或情境倒推出自然日文句子。",
        icon: Mic2,
      };
    }
    return {
      id: "shadowing",
      label: sentencePromptLabel(item.prompt_type),
      instruction: "完成聽一次、看字跟讀、遮字復述三步。",
      icon: Repeat2,
    };
  }

  if (index % 3 === 1 && (item.meaning_zh || item.meaning_en)) {
    return {
      id: "production",
      label: "看義產出",
      instruction: "先不要看日文。用中文意思倒推出日文讀音和字形。",
      icon: Mic2,
    };
  }

  if (index % 3 === 2) {
    return {
      id: "listening",
      label: "聽音辨義",
      instruction: "先按播放，只靠耳朵回想假名、漢字和意思。",
      icon: Headphones,
    };
  }

  return {
    id: "recognition",
    label: "看字認義",
    instruction: "先自己講出讀音和意思，講完才揭曉答案。",
    icon: Languages,
  };
}

function promptForMode(item: Item, mode: ReviewMode) {
  if (item.kind === "sentence") {
    if (mode.id === "listening") return "[audio] " + item.sentence_ja;
    return item.prompt;
  }
  if (mode.id === "production") return item.meaning_zh ?? item.meaning_en ?? "";
  if (mode.id === "listening") return "[audio] " + item.japanese;
  return item.japanese;
}

function answerForMode(item: Item, mode: ReviewMode) {
  if (item.kind === "sentence") {
    if (mode.id === "cloze") return item.answer;
    return item.sentence_ja;
  }
  if (mode.id === "production") return item.japanese;
  return item.meaning_zh ?? item.meaning_en ?? "";
}

function statusLabel(status: string) {
  if (status === "weak") return "弱點";
  if (status === "learning") return "學習中";
  if (status === "reviewing") return "複習中";
  if (status === "mastered") return "穩定";
  return status;
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase mb-1">
        {label}
      </div>
      <div className={`text-3xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
