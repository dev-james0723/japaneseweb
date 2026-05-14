import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { BookOpen, PlusCircle } from "lucide-react";

export default async function DecksIndexPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: decks } = await supabase
    .from("decks")
    .select("id, title, topic, source_type, deck_date")
    .eq("user_id", user!.id)
    .order("deck_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-1">所有詞庫</h1>
          <p className="text-sm text-[var(--text-secondary)]">最近 60 個學習組</p>
        </div>
        <Link href="/decks/new" className="btn-primary">
          <PlusCircle className="w-4 h-4" />
          建立詞庫
        </Link>
      </div>

      {decks && decks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((d) => (
            <Link key={d.id} href={`/decks/${d.id}`}>
              <GlassPanel className="p-5 hover:bg-white/[0.09] transition-colors h-full">
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-2">
                  <BookOpen className="w-3 h-3" />
                  {d.deck_date}
                  <span>·</span>
                  <span>{sourceLabel(d.source_type)}</span>
                  {d.topic && <><span>·</span><span>{d.topic}</span></>}
                </div>
                <div className="text-base font-medium">{d.title}</div>
              </GlassPanel>
            </Link>
          ))}
        </div>
      ) : (
        <GlassPanel variant="subtle" className="p-10 text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
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
