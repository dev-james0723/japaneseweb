import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { JapaneseText } from "@/components/JapaneseText";
import { SpeakerButton } from "@/components/SpeakerButton";
import { BookOpen, Calendar } from "lucide-react";

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      "id, japanese, kana, romaji, meaning_zh, meaning_en, part_of_speech, jlpt_level, notes",
    )
    .eq("deck_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
        <Link href="/dashboard" className="hover:text-white">今日總覽</Link>
        <span>/</span>
        <span className="text-white">{deck.title}</span>
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
        <h1 className="text-2xl md:text-3xl font-semibold mb-1">{deck.title}</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          共 {items?.length ?? 0} 個單字
        </p>
      </GlassPanel>

      <section>
        <div className="flex items-center gap-2 mb-3 px-1">
          <BookOpen className="w-4 h-4 text-[var(--accent-lime)]" />
          <h2 className="text-base font-semibold">單字</h2>
        </div>
        {items && items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((v) => (
              <GlassPanel key={v.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <JapaneseText
                      text={v.japanese}
                      romaji={v.romaji}
                      size="lg"
                      asBlock
                    />
                    {v.kana && (
                      <div className="text-xs text-[var(--text-muted)] mt-1 font-jp">
                        {v.kana}
                      </div>
                    )}
                  </div>
                  <SpeakerButton text={v.japanese} size="md" />
                </div>
                {v.meaning_zh && (
                  <p className="text-sm text-[var(--zh-text)] mt-3">{v.meaning_zh}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {v.part_of_speech && <span className="chip">{v.part_of_speech}</span>}
                  {v.jlpt_level && <span className="chip">{v.jlpt_level}</span>}
                </div>
                {v.notes && (
                  <p className="text-xs text-[var(--text-muted)] mt-3 leading-relaxed">
                    {v.notes}
                  </p>
                )}
              </GlassPanel>
            ))}
          </div>
        ) : (
          <GlassPanel variant="subtle" className="p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">這個詞庫尚未有單字。</p>
          </GlassPanel>
        )}
      </section>
    </div>
  );
}

function sourceLabel(s: string) {
  if (s === "manual") return "手動輸入";
  if (s === "ocr") return "圖片 OCR";
  if (s === "ai_generated") return "AI 生成";
  return s;
}
