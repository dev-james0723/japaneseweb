import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { ReviewSession } from "./ReviewSession";

type QueueMetric = {
  label: string;
  value: number;
  detail: string;
  accent: "lime" | "sky" | "sakura" | "amber" | "danger";
};

type DueReviewLite = {
  status: string | null;
  is_leech: boolean | null;
};

type SentencePromptLite = {
  prompt_type: string;
  key_grammar: string[] | null;
  status: string | null;
  is_leech: boolean | null;
};

export default async function ReviewPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");
  const today = new Date().toISOString().slice(0, 10);
  const grammarMistakeSince = new Date();
  grammarMistakeSince.setDate(grammarMistakeSince.getDate() - 30);

  // Due reviews + freshly-added words that have no review row yet.
  const [dueReviewsResult, grammarMistakesResult] = await Promise.all([
    supabase
      .from("reviews")
      .select("vocab_id, status, next_review_date, next_review_at, stability, difficulty, lapses, is_leech")
      .eq("user_id", user.id)
      .lte("next_review_date", today)
      .order("is_leech", { ascending: false })
      .order("next_review_date", { ascending: true })
      .limit(30),
    supabase
      .from("weakness_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("skill_area", "grammar")
      .in("severity", ["hard", "miss", "leech"])
      .gte("created_at", grammarMistakeSince.toISOString()),
  ]);
  const dueReviews = dueReviewsResult.data ?? [];
  const grammarMistakeCount = grammarMistakesResult.error ? 0 : (grammarMistakesResult.count ?? 0);
  if (grammarMistakesResult.error) {
    console.warn("[review] grammar weakness count:", grammarMistakesResult.error.message);
  }

  const dueIds = new Set(dueReviews.map((r) => r.vocab_id));

  const { data: recentWords } = await supabase
    .from("vocabulary_items")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const recentIds = (recentWords ?? []).map((v) => v.id);
  const { data: recentReviewRows } = recentIds.length
    ? await supabase
        .from("reviews")
        .select("vocab_id")
        .eq("user_id", user.id)
        .in("vocab_id", recentIds)
    : { data: [] };

  const alreadyTrackedIds = new Set([
    ...dueIds,
    ...((recentReviewRows ?? []).map((r) => r.vocab_id)),
  ]);
  const freshIds = recentIds.filter((id) => !alreadyTrackedIds.has(id)).slice(0, 12);

  const vocabIds = Array.from(
    new Set([...dueReviews.map((r) => r.vocab_id), ...freshIds]),
  );

  const { data: sentencePrompts, error: sentencePromptError } = await supabase
    .from("sentence_review_prompts")
    .select("id, prompt_type, prompt, answer, sentence_ja, kana_reading, translation_zh, difficulty_jlpt, key_vocab, key_grammar, status, next_review_date, next_review_at, stability, difficulty, lapses, is_leech")
    .eq("user_id", user.id)
    .lte("next_review_date", today)
    .order("is_leech", { ascending: false })
    .order("next_review_date", { ascending: true })
    .limit(24);

  const dueSentencePrompts = sentencePromptError ? [] : (sentencePrompts ?? []);

  if (vocabIds.length === 0 && dueSentencePrompts.length === 0) {
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[var(--accent-lime)]">
            <RefreshCw className="h-5 w-5" />
          </span>
          <div>
            <p className="section-eyebrow mb-1">複習隊列</p>
            <h1 className="text-2xl md:text-3xl font-semibold">待複習</h1>
          </div>
        </header>
        <GlassPanel variant="subtle" className="p-10 text-center">
          <p className="mx-auto mb-5 max-w-md text-sm text-[var(--text-secondary)]">
            今天沒有需要複習的單字或句子。先建立一個詞庫，或從真日文採一句做輸出材料。
          </p>
          <Link href="/mining" className="btn-primary inline-flex">
            採一句真日文
          </Link>
        </GlassPanel>
      </div>
    );
  }

  const { data: items } = vocabIds.length
    ? await supabase
        .from("vocabulary_items")
        .select("id, japanese, kana, romaji, meaning_zh, meaning_en, deck_id")
        .in("id", vocabIds)
    : { data: [] };

  const reviewByVocabId = new Map(dueReviews.map((review) => [review.vocab_id, review]));
  const vocabItems = vocabIds
    .map((id) => {
      const item = items?.find((it) => it.id === id);
      if (!item) return null;
      const review = reviewByVocabId.get(id);
      return {
        kind: "vocab" as const,
        ...item,
        status: review?.status ?? null,
        stability: review?.stability ?? null,
        difficulty: review?.difficulty ?? null,
        lapses: review?.lapses ?? null,
        is_leech: review?.is_leech ?? null,
      };
    })
    .filter((it): it is NonNullable<typeof it> => !!it);
  const sentenceItems = dueSentencePrompts.map((prompt) => ({
    kind: "sentence" as const,
    ...prompt,
  }));
  const orderedItems = interleaveReviewItems(vocabItems, sentenceItems);
  const weakCount =
    dueReviews.filter((r) => r.is_leech || r.status === "weak").length +
    dueSentencePrompts.filter((r) => r.is_leech || r.status === "weak").length;
  const queueMetrics = buildQueueMetrics({
    dueReviews,
    dueSentencePrompts,
    freshCount: freshIds.length,
    grammarMistakeCount,
    totalCount: orderedItems.length,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="section-eyebrow mb-2">複習道場</p>
          <h1 className="text-2xl font-semibold md:text-3xl">待複習</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            共 {orderedItems.length} 張：混合新詞、舊詞、弱點和句子卡，先主動回想再揭曉。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="chip chip-active w-fit">{dueIds.size} 張今日到期</div>
          {dueSentencePrompts.length > 0 && <div className="chip w-fit">{dueSentencePrompts.length} 張句子提示</div>}
          {weakCount > 0 && <div className="chip w-fit text-[var(--danger)]">{weakCount} 張要救援</div>}
        </div>
      </header>
      <ReviewQueueBreakdown metrics={queueMetrics} />
      <ReviewSession items={orderedItems} />
    </div>
  );
}

function ReviewQueueBreakdown({ metrics }: { metrics: QueueMetric[] }) {
  return (
    <GlassPanel variant="subtle" className="p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">隊列拆解</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            今日會交錯不同回想模式，避免一口氣只刷同一類卡。
          </p>
        </div>
      </div>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="border-l border-white/10 pl-3">
            <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {metric.label}
            </div>
            <div className={`mt-1 text-xl font-semibold tabular-nums ${queueAccentClass(metric.accent)}`}>
              {metric.value}
            </div>
            <div className="mt-1 min-h-8 text-xs leading-4 text-[var(--text-secondary)]">
              {metric.detail}
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

function buildQueueMetrics({
  dueReviews,
  dueSentencePrompts,
  freshCount,
  grammarMistakeCount,
  totalCount,
}: {
  dueReviews: DueReviewLite[];
  dueSentencePrompts: SentencePromptLite[];
  freshCount: number;
  grammarMistakeCount: number;
  totalCount: number;
}): QueueMetric[] {
  const sentenceTypes = countSentencePromptTypes(dueSentencePrompts);
  const grammarLinkedCount = dueSentencePrompts.filter((prompt) => (prompt.key_grammar?.length ?? 0) > 0).length;
  const rescueCount =
    dueReviews.filter((review) => review.is_leech || review.status === "weak").length +
    dueSentencePrompts.filter((prompt) => prompt.is_leech || prompt.status === "weak").length;
  const leechCount =
    dueReviews.filter((review) => review.is_leech).length +
    dueSentencePrompts.filter((prompt) => prompt.is_leech).length;

  return [
    {
      label: "總數",
      value: totalCount,
      detail: "今次混合複習入面嘅啟用卡",
      accent: "lime",
    },
    {
      label: "到期單字",
      value: dueReviews.length,
      detail: "今日已排程的單字卡",
      accent: "sky",
    },
    {
      label: "新單字",
      value: freshCount,
      detail: "第一次進入主動回想的新詞",
      accent: "lime",
    },
    {
      label: "句子",
      value: dueSentencePrompts.length,
      detail: `${sentenceTypes.cloze} 填空 / ${sentenceTypes.production} 產出`,
      accent: "sakura",
    },
    {
      label: "聽力",
      value: sentenceTypes.listening,
      detail: "先聽音的句子提示",
      accent: "amber",
    },
    {
      label: "跟讀",
      value: sentenceTypes.shadowing,
      detail: "聽後跟讀練習",
      accent: "sky",
    },
    {
      label: "文法相關",
      value: grammarLinkedCount,
      detail: "帶有文法標籤的句子",
      accent: "sakura",
    },
    {
      label: "文法錯題",
      value: grammarMistakeCount,
      detail: "近期真實失誤留下的弱點事件",
      accent: grammarMistakeCount > 0 ? "danger" : "amber",
    },
    {
      label: "救援",
      value: rescueCount,
      detail: `${leechCount} 張弱項卡需要修復`,
      accent: rescueCount > 0 ? "danger" : "amber",
    },
  ];
}

function countSentencePromptTypes(prompts: SentencePromptLite[]) {
  return prompts.reduce(
    (counts, prompt) => {
      if (prompt.prompt_type === "cloze") counts.cloze += 1;
      if (prompt.prompt_type === "listening") counts.listening += 1;
      if (prompt.prompt_type === "production") counts.production += 1;
      if (prompt.prompt_type === "shadowing") counts.shadowing += 1;
      return counts;
    },
    { cloze: 0, listening: 0, production: 0, shadowing: 0 },
  );
}

function queueAccentClass(accent: QueueMetric["accent"]) {
  return {
    lime: "text-[var(--accent-lime)]",
    sky: "text-[var(--accent-sky)]",
    sakura: "text-[var(--accent-sakura)]",
    amber: "text-[var(--accent-amber)]",
    danger: "text-[var(--danger)]",
  }[accent];
}

function interleaveReviewItems<T, U>(vocabItems: T[], sentenceItems: U[]) {
  const mixed: Array<T | U> = [];
  const max = Math.max(vocabItems.length, sentenceItems.length);
  for (let i = 0; i < max; i += 1) {
    if (vocabItems[i]) mixed.push(vocabItems[i]);
    if (sentenceItems[i]) mixed.push(sentenceItems[i]);
  }
  return mixed;
}
