import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { checkWeeklyQuota } from "@/lib/os/quota";
import { GrammarAddForm } from "./GrammarAddForm";

export const dynamic = "force-dynamic";

export default async function GrammarPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const [{ data: points }, quota] = await Promise.all([
    supabase
      .from("grammar_points")
      .select("id, pattern, jlpt_level, core_meaning, construction, common_mistake, mnemonic, active_stage, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    checkWeeklyQuota(supabase, user.id),
  ]);

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold">📖 Grammar Points</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              本週新文法: {quota.newGrammarThisWeek}/{quota.grammarQuota}
            </p>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-5">
        <h2 className="text-sm font-semibold mb-3">+ Add grammar point</h2>
        <GrammarAddForm quotaExceeded={quota.grammarExceeded} />
      </GlassPanel>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold px-1">All grammar ({points?.length ?? 0})</h2>
        {(points ?? []).length === 0 ? (
          <GlassPanel variant="subtle" className="p-6 text-center text-sm text-[var(--text-secondary)]">
            尚未加入任何 grammar point。
          </GlassPanel>
        ) : (
          <div className="space-y-2">
            {points!.map((p) => (
              <GlassPanel key={p.id} variant="subtle" className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-jp">{p.pattern}</span>
                  {p.jlpt_level && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-sky)]/10 text-[var(--accent-sky)]">{p.jlpt_level}</span>}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-sakura)]/10 text-[var(--accent-sakura)]">Stage {p.active_stage}</span>
                </div>
                {p.core_meaning && <div className="text-xs text-[var(--text-secondary)]">{p.core_meaning}</div>}
                {p.construction && <div className="text-[10px] text-[var(--text-muted)] mt-1">構造: {p.construction}</div>}
                {p.common_mistake && <div className="text-[10px] text-red-300 mt-1">⚠️ {p.common_mistake}</div>}
                {p.mnemonic && <div className="text-[10px] text-[var(--accent-lime)] mt-1">💡 {p.mnemonic}</div>}
              </GlassPanel>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
