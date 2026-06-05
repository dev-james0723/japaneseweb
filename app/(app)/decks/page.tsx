import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { BookOpen, CalendarDays, ChevronRight, Layers3, PlusCircle } from "lucide-react";

export default async function DecksIndexPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: decks } = await supabase
    .from("decks")
    .select("id, title, topic, source_type, deck_date")
    .eq("user_id", user.id)
    .order("deck_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="section-eyebrow mb-2">詞庫總覽</p>
          <h1 className="heading-balance text-2xl font-semibold md:text-3xl">所有詞庫</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            最近 60 個學習組，用主題、來源同日期快速回到當日內容。
          </p>
        </div>
        <Link href="/decks/new" className="btn-primary w-fit">
          <PlusCircle className="w-4 h-4" />
          建立詞庫
        </Link>
      </div>

      {decks && decks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((d) => (
            <Link
              key={d.id}
              href={`/decks/${d.id}`}
              className="glass-panel group flex h-full flex-col justify-between gap-5 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.09]"
            >
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/10 text-[var(--accent-lime)]">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <span className="chip text-[10px]">{sourceLabel(d.source_type)}</span>
                </div>
                <div className="body-pretty text-base font-medium leading-snug">{d.title}</div>
                {d.topic && (
                  <p className="mt-2 line-clamp-2 text-xs text-[var(--text-muted)]">{d.topic}</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {d.deck_date}
                </span>
                <span className="inline-flex items-center gap-1 text-[var(--text-secondary)] transition-colors group-hover:text-white">
                  開啟
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <GlassPanel variant="subtle" className="p-10 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-black/10 text-[var(--accent-lime)]">
            <Layers3 className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold">尚未建立詞庫</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)] mb-5">
            尚未建立任何詞庫。
          </p>
          <Link href="/decks/new" className="btn-primary inline-flex">
            建立第一個詞庫
          </Link>
        </GlassPanel>
      )}
    </div>
  );
}

function sourceLabel(s: string) {
  if (s === "manual") return "手動";
  if (s === "ocr") return "OCR";
  if (s === "ai_generated") return "AI";
  return s;
}
