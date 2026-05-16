import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { VocabularyMemorySessionView } from "@/lib/vocabularyMemory/types";
import { DeckDetailTitleCard } from "@/components/DeckDetailTitleCard";
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
    .select(
      "id, title, topic, source_type, deck_date, created_at, ai_auto_fill_completed, ai_auto_fill_attempts, ai_auto_fill_last_error",
    )
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

  const { data: latestMem } = await supabase
    .from("vocabulary_sessions")
    .select("id, source_input, extracted_vocabulary, created_at")
    .eq("deck_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let memorySession: VocabularyMemorySessionView | null = null;

  if (latestMem) {
    const { data: memGroups } = await supabase
      .from("vocabulary_storyline_groups")
      .select(
        "id, group_index, title_traditional_chinese, storyline_japanese, storyline_traditional_chinese, words, image_prompt, image_url, generation_status, error_message",
      )
      .eq("session_id", latestMem.id)
      .order("group_index", { ascending: true });

    const ev = (latestMem.extracted_vocabulary ?? []) as Array<{
      word?: string;
      reading?: string;
      meaningTraditionalChinese?: string;
    }>;

    memorySession = {
      id: latestMem.id,
      sourceInput: latestMem.source_input,
      vocabulary: ev.map((x) => ({
        word: x.word ?? "",
        reading: x.reading,
        meaningTraditionalChinese: x.meaningTraditionalChinese,
      })),
      storylineGroups: (memGroups ?? []).map((g) => ({
        id: g.id,
        groupIndex: g.group_index,
        titleTraditionalChinese: g.title_traditional_chinese,
        storylineJapanese: g.storyline_japanese,
        storylineTraditionalChinese: g.storyline_traditional_chinese,
        words: (g.words ?? []) as Array<{
          word: string;
          reading?: string | null;
          meaningTraditionalChinese?: string | null;
          visualAnchor?: string | null;
          roleInStory?: string | null;
        }>,
        imagePrompt: g.image_prompt,
        imageUrl: g.image_url,
        generationStatus: g.generation_status,
        errorMessage: g.error_message,
      })),
      createdAt: latestMem.created_at,
    };
  }

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

      <DeckDetailTitleCard
        deckId={deck.id}
        initialTitle={deck.title}
        deckDate={deck.deck_date}
        sourceType={deck.source_type}
        topic={deck.topic}
        itemCount={items?.length ?? 0}
      />

      <DeckTabs
        deckId={deck.id}
        deckTitle={deck.title}
        deckTopic={deck.topic}
        initialTab={tab ?? "words"}
        items={items ?? []}
        sentences={sentences ?? []}
        images={images ?? []}
        memorySession={memorySession}
        relationships={(relationships ?? []) as any[]}
        targets={(targetItems ?? []) as any[]}
        aiAutoFillCompleted={deck.ai_auto_fill_completed ?? false}
        aiAutoFillAttempts={deck.ai_auto_fill_attempts ?? 0}
        aiAutoFillLastError={deck.ai_auto_fill_last_error ?? null}
      />
    </div>
  );
}
