import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { ReviewSession } from "./ReviewSession";

export default async function ReviewPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const today = new Date().toISOString().slice(0, 10);

  // Due reviews + freshly-added words that have no review row yet.
  const { data: dueReviews } = await supabase
    .from("reviews")
    .select("vocab_id, status, next_review_date")
    .eq("user_id", user!.id)
    .lte("next_review_date", today)
    .limit(30);

  const dueIds = new Set((dueReviews ?? []).map((r) => r.vocab_id));

  const { data: untracked } = await supabase
    .from("vocabulary_items")
    .select("id")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const vocabIds = Array.from(
    new Set([...(dueReviews ?? []).map((r) => r.vocab_id), ...((untracked ?? []).map((v) => v.id))]),
  );

  if (vocabIds.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-semibold mb-1">待複習</h1>
        </header>
        <GlassPanel variant="subtle" className="p-10 text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            今天沒有需要複習的單字。先建立一個詞庫吧。
          </p>
          <Link href="/decks/new" className="btn-primary inline-flex">
            建立詞庫
          </Link>
        </GlassPanel>
      </div>
    );
  }

  const { data: items } = await supabase
    .from("vocabulary_items")
    .select("id, japanese, kana, romaji, meaning_zh, meaning_en, deck_id")
    .in("id", vocabIds);

  const orderedItems = vocabIds
    .map((id) => items?.find((it) => it.id === id))
    .filter((it): it is NonNullable<typeof it> => !!it);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-1">待複習</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            共 {orderedItems.length} 個單字（含 {dueIds.size} 個已到期）。
          </p>
        </div>
      </header>
      <ReviewSession items={orderedItems} />
    </div>
  );
}
