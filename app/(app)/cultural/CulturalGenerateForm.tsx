"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Coffee,
  Landmark,
  Languages,
  Leaf,
  Loader2,
  Map,
  Newspaper,
  Sparkles,
  Smartphone,
  Wand2,
} from "lucide-react";
import {
  CULTURAL_CATEGORIES,
  CULTURAL_CATEGORY_LABELS,
  type CulturalCategory,
} from "@/lib/cultural/categories";

type LoadingIntent = "professor" | "custom" | `idea-${number}` | null;

const CATEGORY_PROFILES: Record<
  CulturalCategory,
  { icon: LucideIcon; focus: string; prompt: string }
> = {
  history_festivals: {
    icon: Landmark,
    focus: "背景、儀式、故事",
    prompt: "把節日背後的日文詞拆開讀",
  },
  language_history: {
    icon: Languages,
    focus: "漢字、假名、語感",
    prompt: "連起音讀、訓讀與現代用法",
  },
  pop_culture: {
    icon: Smartphone,
    focus: "動漫、流行語、媒體",
    prompt: "從熟悉材料抽真正會用的句子",
  },
  traditional_arts: {
    icon: Leaf,
    focus: "茶道、工藝、美學",
    prompt: "把抽象美學變成可說出口的日文",
  },
  regional_culture: {
    icon: Map,
    focus: "地方差異、方言、生活",
    prompt: "比較地域語感與香港日常",
  },
  news_current: {
    icon: Newspaper,
    focus: "時事、社會、趨勢",
    prompt: "把新聞變成 N 級可消化素材",
  },
  lifestyle_niche: {
    icon: Coffee,
    focus: "生活細節、小眾觀察",
    prompt: "用微小日常學自然表達",
  },
};

const TOPIC_IDEAS: Array<{
  title: string;
  topic: string;
  category: CulturalCategory;
  lens: string;
}> = [
  {
    title: "梅雨不是普通落雨",
    topic: "梅雨と日本人の生活感覚",
    category: "lifestyle_niche",
    lens: "天氣詞、季節感、生活語彙",
  },
  {
    title: "漢字點解有兩種讀法",
    topic: "音読みと訓読みの文化史",
    category: "language_history",
    lens: "漢字、假名、中文母語者盲點",
  },
  {
    title: "關西同關東的語感差",
    topic: "関西と関東のことばと距離感",
    category: "regional_culture",
    lens: "方言、禮貌距離、香港比較",
  },
  {
    title: "便利店其實是文化課",
    topic: "コンビニ文化から見る日本の気配り",
    category: "pop_culture",
    lens: "日常服務語、敬語、觀察力",
  },
];

export function CulturalGenerateForm({
  hasDailyPick = false,
}: {
  hasDailyPick?: boolean;
}) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState<CulturalCategory>("language_history");
  const [loadingIntent, setLoadingIntent] = useState<LoadingIntent>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = CATEGORY_PROFILES[category];
  const SelectedIcon = selected.icon;
  const isLoading = loadingIntent !== null;
  const topicTooShort = topic.trim().length > 0 && topic.trim().length < 2;

  async function generate(params: {
    intent: NonNullable<LoadingIntent>;
    topicOverride?: string;
    categoryOverride?: CulturalCategory;
    asDailyPick?: boolean;
  }) {
    const nextTopic = params.topicOverride ?? topic;
    const nextCategory = params.categoryOverride ?? category;

    setLoadingIntent(params.intent);
    setError(null);
    try {
      const res = await fetch("/api/cultural/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: nextTopic,
          category: nextCategory,
          save: true,
          as_daily_pick: params.asDailyPick ?? false,
        }),
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
      setLoadingIntent(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
        <div className="space-y-3">
          <label htmlFor="cultural-topic" className="text-xs font-semibold text-[var(--text-muted)]">
            想深入的題材
          </label>
          <input
            id="cultural-topic"
            type="text"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="可留空，教授會按你的進度與季節替你揀"
            className="glass-input w-full text-sm"
            maxLength={200}
          />
          {topicTooShort ? (
            <p className="text-xs text-[var(--warning)]">寫至少 2 個字，或者留空交給教授策展。</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                generate({
                  intent: "professor",
                  asDailyPick: !hasDailyPick,
                })
              }
              disabled={isLoading}
              className="btn-primary"
            >
              {loadingIntent === "professor" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="h-4 w-4" aria-hidden="true" />
              )}
              教授替我揀一課
            </button>
            <button
              type="button"
              onClick={() => generate({ intent: "custom" })}
              disabled={isLoading || topic.trim().length === 0 || topicTooShort}
              className="btn-ghost text-sm"
            >
              {loadingIntent === "custom" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              )}
              深化我的題材
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
          <div className="mb-3 flex items-center gap-2">
            <SelectedIcon className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">{CULTURAL_CATEGORY_LABELS[category].zh}</p>
              <p className="text-xs text-[var(--text-muted)]">{selected.focus}</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{selected.prompt}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {CULTURAL_CATEGORIES.map((key) => {
          const profile = CATEGORY_PROFILES[key];
          const Icon = profile.icon;
          const active = key === category;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              aria-pressed={active}
              className={[
                "min-h-[86px] rounded-xl border p-3 text-left transition",
                active
                  ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)]"
                  : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.07]",
              ].join(" ")}
            >
              <Icon
                className={[
                  "mb-2 h-4 w-4",
                  active ? "text-[var(--accent-lime)]" : "text-[var(--text-muted)]",
                ].join(" ")}
                aria-hidden="true"
              />
              <span className="block text-sm font-semibold">{CULTURAL_CATEGORY_LABELS[key].zh}</span>
              <span className="mt-1 block text-xs leading-relaxed text-[var(--text-muted)]">
                {profile.focus}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
          <h3 className="text-sm font-semibold">教授今日可開的入口</h3>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {TOPIC_IDEAS.map((idea, index) => (
            <button
              key={idea.topic}
              type="button"
              onClick={() =>
                generate({
                  intent: `idea-${index}`,
                  topicOverride: idea.topic,
                  categoryOverride: idea.category,
                  asDailyPick: !hasDailyPick,
                })
              }
              disabled={isLoading}
              className="group min-h-[118px] rounded-xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-[var(--accent-lime)]/35 hover:bg-white/[0.07]"
            >
              <span className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold leading-snug">{idea.title}</span>
                {loadingIntent === `idea-${index}` ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--accent-lime)]" aria-hidden="true" />
                ) : (
                  <BookOpen className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent-lime)]" aria-hidden="true" />
                )}
              </span>
              <span className="block font-jp text-xs text-[var(--text-secondary)]">
                {idea.topic}
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-[var(--text-muted)]">
                {idea.lens}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
        <Brain className="h-3.5 w-3.5" aria-hidden="true" />
        <span>會避開你近期讀過的題材，並按學習階段調整日文比例。</span>
      </div>
    </div>
  );
}
