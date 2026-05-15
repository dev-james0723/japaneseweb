import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { Calendar } from "lucide-react";
import { DeckTabs } from "./DeckTabs";

export default async function DeckDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: deck } = await supabase
    .from("decks")
    .select("id, title, topic, source_type, deck_date, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!deck) notFound();

  const { data: items } = await supabase
    .from("vocabulary_items")
    .select(
      "id, japanese, kana, romaji, meaning_zh, meaning_en, part_of_speech, jlpt_level, priority_tier, notes, core_explanation",
    )
    .eq("deck_id", id)
    .order("created_at", { ascending: true });

  const { data: sentences } = await supabase
    .from("example_sentences")
    .select("id, japanese_sentence, romaji_sentence, meaning_zh, sentence_type, vocab_id")
    .eq("deck_id", id)
    .order("created_at", { ascending: true });

  const { data: images } = await supabase
    .from("generated_images")
    .select("id, image_url, image_type, vocab_id, created_at")
    .eq("deck_id", id)
    .order("created_at", { ascending: false });

  const vocabIds = (items ?? []).map((v) => v.id);
  const { data: relationships } = vocabIds.length
    ? await supabase
        .from("vocabulary_relationships")
        .select("id, source_vocab_id, target_vocab_id, relationship_type, explanation, example_sentence")
        .in("source_vocab_id", vocabIds)
    : { data: [] as any[] };

  const targetIds = Array.from(
    new Set((relationships ?? []).map((r) => r.target_vocab_id).filter(Boolean)),
  );
  const { data: targetItems } = targetIds.length
    ? await supabase
        .from("vocabulary_items")
        .select("id, japanese, romaji, meaning_zh")
        .in("id", targetIds)
    : { data: [] as any[] };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
        <Link href="/dashboard" className="hover:text-white">今日總覽</Link>
        <span>/</span>
        <Link href="/decks" className="hover:text-white">所有詞庫</Link>
        <span>/</span>
        <span className="text-white truncate">{deck.title}</span>
      </div>

      <GlassPanel className="p-6 md:p-8">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2">
          <Calendar className="w-3.5 h-3.5" />
          {deck.deck_date}
          <span>·</span>
          <span>{sourceLabel(deck.source_type)}</span>
          {deck.topic && (
            <>
              <span>·</span>
              <span>{deck.topic}</span>
            </>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold">{deck.title}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          共 {items?.length ?? 0} 個單字
        </p>
      </GlassPanel>

      <DeckTabs
        deckId={deck.id}
        deckTitle={deck.title}
        initialTab={tab ?? "words"}
        items={items ?? []}
        sentences={sentences ?? []}
        images={images ?? []}
        relationships={(relationships ?? []) as any[]}
        targets={(targetItems ?? []) as any[]}
      />
    </div>
  );
}

function sourceLabel(s: string) {
  if (s === "manual") return "手動輸入";
  if (s === "ocr") return "圖片 OCR";
  if (s === "ai_generated") return "AI 生成";
  return s;
}
