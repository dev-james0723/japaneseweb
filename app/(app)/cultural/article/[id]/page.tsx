import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GlassPanel } from "@/components/GlassPanel";
import type { GeneratedCulturalArticle } from "@/lib/cultural/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Paragraph = { ja: string; zh: string; kana_ruby?: string };

export default async function CulturalArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  const { data: row, error } = await supabase
    .from("cultural_contents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) notFound();
  if (row.user_id && row.user_id !== session.user.id) notFound();

  const paragraphs = (row.body_paragraphs as Paragraph[] | null) ?? [];
  const keyVocab = (row.key_vocab as GeneratedCulturalArticle["key_vocab"]) ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/cultural" className="text-sm text-[var(--accent)] hover:underline">
        ← Cultural Hub
      </Link>

      <GlassPanel className="p-6 space-y-2">
        <h1 className="text-xl font-semibold">{row.title_ja}</h1>
        <p className="text-[var(--text-secondary)]">{row.title_zh}</p>
        {row.ai_summary_zh ? (
          <p className="text-sm border-l-2 border-[var(--accent)] pl-3">{row.ai_summary_zh}</p>
        ) : null}
      </GlassPanel>

      <article className="space-y-4">
        {paragraphs.map((p, i) => (
          <GlassPanel key={i} className="p-4 space-y-2">
            <p className="leading-relaxed">{p.kana_ruby || p.ja}</p>
            <p className="text-sm text-[var(--text-secondary)] border-t border-white/10 pt-2">
              {p.zh}
            </p>
          </GlassPanel>
        ))}
      </article>

      {row.cultural_notes ? (
        <GlassPanel className="p-5">
          <h2 className="text-sm font-semibold mb-2">🎌 Cultural Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{row.cultural_notes}</p>
        </GlassPanel>
      ) : null}

      {row.cantonese_lens ? (
        <GlassPanel className="p-5">
          <h2 className="text-sm font-semibold mb-2">🇭🇰 Cantonese Lens</h2>
          <p className="text-sm whitespace-pre-wrap">{row.cantonese_lens}</p>
        </GlassPanel>
      ) : null}

      {keyVocab.length > 0 ? (
        <GlassPanel className="p-5">
          <h2 className="text-sm font-semibold mb-3">🃏 Key Vocab</h2>
          <ul className="space-y-2 text-sm">
            {keyVocab.map((v, i) => (
              <li key={i}>
                <span className="font-medium">{v.word}</span>
                {v.kana ? ` (${v.kana})` : ""} — {v.meaning_zh}
                {v.jlpt_level ? ` · ${v.jlpt_level}` : ""}
              </li>
            ))}
          </ul>
        </GlassPanel>
      ) : null}
    </div>
  );
}
