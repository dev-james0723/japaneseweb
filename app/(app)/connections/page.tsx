import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { Network } from "lucide-react";

export default async function ConnectionsIndexPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: rels } = await supabase
    .from("vocabulary_relationships")
    .select("id, relationship_type, explanation, example_sentence, source_vocab_id, target_vocab_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const ids = Array.from(
    new Set(
      (rels ?? []).flatMap((r) => [r.source_vocab_id, r.target_vocab_id]).filter(Boolean),
    ),
  );
  const { data: vocab } = ids.length
    ? await supabase
        .from("vocabulary_items")
        .select("id, japanese, deck_id")
        .in("id", ids)
    : { data: [] as any[] };
  const byId = new Map((vocab ?? []).map((v: any) => [v.id, v]));

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Network className="w-5 h-5 text-[var(--accent-lime)]" />
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-1">智能連結</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            最近 50 條新舊詞之間的關係。
          </p>
        </div>
      </header>

      {(rels ?? []).length === 0 ? (
        <GlassPanel variant="subtle" className="p-10 text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            尚未生成任何連結。打開任一詞庫的「連結」分頁，按「生成連結」即可。
          </p>
          <Link href="/dashboard" className="btn-primary inline-flex">
            回到總覽
          </Link>
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {(rels ?? []).map((r) => {
            const s: any = byId.get(r.source_vocab_id);
            const t: any = byId.get(r.target_vocab_id);
            return (
              <GlassPanel key={r.id} className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href={s ? `/decks/${s.deck_id}` : "#"}
                    className="font-jp text-base hover:text-[var(--accent-lime)]"
                  >
                    {s?.japanese ?? "?"}
                  </Link>
                  <span className="chip text-[10px]">{r.relationship_type}</span>
                  <span className="text-xs text-[var(--text-muted)]">↔</span>
                  <Link
                    href={t ? `/decks/${t.deck_id}` : "#"}
                    className="font-jp text-base hover:text-[var(--accent-lime)]"
                  >
                    {t?.japanese ?? "?"}
                  </Link>
                </div>
                {r.explanation && (
                  <p className="text-sm text-[var(--text-secondary)] mt-2">{r.explanation}</p>
                )}
                {r.example_sentence && (
                  <p className="font-jp text-sm mt-2 pt-2 border-t border-white/5">
                    {r.example_sentence}
                  </p>
                )}
              </GlassPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
