import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { MiningClient } from "./MiningClient";

export const dynamic = "force-dynamic";

export default async function MiningPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: recent } = await supabase
    .from("mined_sentences")
    .select("id, sentence_ja, kana_reading, translation_zh, difficulty_jlpt, source_type, source_title, mined_at")
    .eq("user_id", user.id)
    .order("mined_at", { ascending: false })
    .limit(20);

  const { count: totalMined } = await supabase
    .from("mined_sentences")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-eyebrow mb-1">Sentence mining loop</p>
            <h1 className="text-xl font-semibold">句子採礦</h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-secondary)]">
              貼上日文輸入，抽出能立刻跟讀、填空、聽音回想和產出的短句。保存後會自動進入 Review。
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">已採礦總數</div>
            <div className="text-2xl font-semibold text-[var(--accent-lime)] tabular-nums">{totalMined ?? 0}</div>
          </div>
        </div>
        <MiningClient />
      </GlassPanel>

      {recent && recent.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold px-1">最近紀錄</h2>
          <div className="space-y-2">
            {recent.map((s) => (
              <GlassPanel key={s.id} variant="subtle" className="p-3">
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mb-1.5">
                  <span>{new Date(s.mined_at).toLocaleDateString()}</span>
                  {s.difficulty_jlpt && <span className="px-1.5 py-0.5 rounded bg-[var(--accent-sky)]/10 text-[var(--accent-sky)]">{s.difficulty_jlpt}</span>}
                  {s.source_type && <span>· {s.source_type}</span>}
                  {s.source_title && <span>· {s.source_title}</span>}
                </div>
                <div className="text-sm font-jp">{s.sentence_ja}</div>
                {s.kana_reading && <div className="text-[10px] text-[var(--text-muted)] font-jp">{s.kana_reading}</div>}
                <div className="text-xs text-[var(--text-secondary)] mt-1">{s.translation_zh}</div>
              </GlassPanel>
            ))}
          </div>
        </section>
      ) : (
        <GlassPanel variant="subtle" className="p-6 text-sm text-[var(--text-secondary)]">
          還沒有採礦紀錄。先貼一段短日文，保存 1 句能在今天任務中使用的句子。
        </GlassPanel>
      )}
    </div>
  );
}
