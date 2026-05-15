import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { CalendarView } from "./CalendarView";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const { month, date } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date();
  const [year, mon] = month
    ? month.split("-").map(Number)
    : [today.getUTCFullYear(), today.getUTCMonth() + 1];

  const monthStart = new Date(Date.UTC(year, mon - 1, 1));
  const monthEnd = new Date(Date.UTC(year, mon, 0));
  const startISO = monthStart.toISOString().slice(0, 10);
  const endISO = monthEnd.toISOString().slice(0, 10);

  const { data: monthDecks } = await supabase
    .from("decks")
    .select("id, title, deck_date, topic, source_type")
    .eq("user_id", user!.id)
    .gte("deck_date", startISO)
    .lte("deck_date", endISO);

  type Deck = NonNullable<typeof monthDecks>[number];
  const decksByDate = new Map<string, Deck[]>();
  for (const d of monthDecks ?? []) {
    const list = decksByDate.get(d.deck_date) ?? [];
    list.push(d);
    decksByDate.set(d.deck_date, list);
  }

  const selectedDate = date ?? today.toISOString().slice(0, 10);
  const selectedDecks = decksByDate.get(selectedDate) ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold mb-1">學習日曆</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          點擊任一日期，查看當天建立的詞庫。
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CalendarView
            year={year}
            month={mon}
            decksByDate={Object.fromEntries(decksByDate)}
            selectedDate={selectedDate}
          />
        </div>

        <GlassPanel className="p-5 h-fit">
          <div className="text-xs text-[var(--text-muted)] mb-1">所選日期</div>
          <div className="text-lg font-semibold mb-4">{selectedDate}</div>
          {selectedDecks.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">當天沒有建立詞庫。</p>
          ) : (
            <div className="space-y-2">
              {selectedDecks.map((d: any) => (
                <Link key={d.id} href={`/decks/${d.id}`}>
                  <GlassPanel variant="subtle" className="p-3 hover:bg-white/10 transition-colors">
                    <div className="text-sm font-medium">{d.title}</div>
                    {d.topic && (
                      <div className="text-xs text-[var(--text-muted)] mt-1">{d.topic}</div>
                    )}
                  </GlassPanel>
                </Link>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
