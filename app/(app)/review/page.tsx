import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { ReviewSession } from "./ReviewSession";

export default async function ReviewPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");
  const today = new Date().toISOString().slice(0, 10);

  // Due reviews + freshly-added words that have no review row yet.
  const { data: dueReviews } = await supabase
    .from("reviews")
    .select("vocab_id, status, next_review_date, next_review_at, stability, difficulty, lapses, is_leech")
    .eq("user_id", user.id)
    .lte("next_review_date", today)
    .order("is_leech", { ascending: false })
    .order("next_review_date", { ascending: true })
    .limit(30);

  const dueIds = new Set((dueReviews ?? []).map((r) => r.vocab_id));

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
    new Set([...(dueReviews ?? []).map((r) => r.vocab_id), ...freshIds]),
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
            <p className="section-eyebrow mb-1">Review queue</p>
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

  const { data: items } = await supabase
    .from("vocabulary_items")
    .select("id, japanese, kana, romaji, meaning_zh, meaning_en, deck_id")
    .in("id", vocabIds);

  const reviewByVocabId = new Map((dueReviews ?? []).map((review) => [review.vocab_id, review]));
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
    (dueReviews ?? []).filter((r) => r.is_leech || r.status === "weak").length +
    dueSentencePrompts.filter((r) => r.is_leech || r.status === "weak").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="section-eyebrow mb-2">Review dojo</p>
          <h1 className="text-2xl font-semibold md:text-3xl">待複習</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            共 {orderedItems.length} 張：混合新詞、舊詞、弱點和句子卡，先主動回想再揭曉。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="chip chip-active w-fit">{dueIds.size} due today</div>
          {dueSentencePrompts.length > 0 && <div className="chip w-fit">{dueSentencePrompts.length} sentence prompts</div>}
          {weakCount > 0 && <div className="chip w-fit text-[var(--danger)]">{weakCount} rescue</div>}
        </div>
      </header>
      <ReviewSession items={orderedItems} />
    </div>
  );
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
