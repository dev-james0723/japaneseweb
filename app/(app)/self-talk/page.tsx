import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { SelfTalkQuickLog } from "./SelfTalkQuickLog";

export const dynamic = "force-dynamic";

const STAGE_DESCRIPTIONS: Record<number, string> = {
  1: "單字級：腦中浮現單個日文字（鍵、財布…）",
  2: "短句級：「お腹空いた」「眠い」",
  3: "敘述級：用日文 narrate 一個 thought",
  4: "完整 self-talk：用日文 plan、reflect、自言自語",
};

export default async function SelfTalkPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: recent } = await supabase
    .from("self_talk_progressions")
    .select("id, log_date, stage_level, sample_phrase, context, created_at")
    .eq("user_id", user.id)
    .gte("log_date", sinceStr)
    .order("created_at", { ascending: false })
    .limit(50);

  const todayLogs = (recent ?? []).filter((r) => r.log_date === today);
  const todayMaxStage = Math.max(0, ...todayLogs.map((r) => r.stage_level));

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h1 className="text-xl font-semibold mb-1">📞 自言自語進度</h1>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          每次你腦中自然冒出日文，撳一吓記低。第一年目標：由第 1 級 → 第 4 級。
        </p>
        <div className="flex items-center gap-4 mb-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">今日最高級別</div>
          <div className="text-2xl font-semibold text-[var(--accent-lime)]">
            {todayMaxStage === 0 ? "—" : `第 ${todayMaxStage} 級`}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`p-3 rounded-lg border ${todayMaxStage >= s ? "border-[var(--accent-lime)]/40 bg-[var(--accent-lime-bg)]/30" : "border-white/10 bg-white/[0.02]"}`}>
              <div className="text-xs font-semibold">第 {s} 級</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">{STAGE_DESCRIPTIONS[s]}</div>
            </div>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="p-5">
        <h2 className="text-sm font-semibold mb-3">+ 快速記錄</h2>
        <SelfTalkQuickLog />
      </GlassPanel>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold px-1">最近 7 日</h2>
        {(recent ?? []).length === 0 ? (
          <GlassPanel variant="subtle" className="p-6 text-center text-sm text-[var(--text-secondary)]">
            尚未記錄過。腦中冒出一個日文字都係第 1 級，撳上面快速記錄。
          </GlassPanel>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(recent ?? []).map((r) => (
              <GlassPanel key={r.id} variant="subtle" className="p-3">
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                  <span>{r.log_date}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--accent-sakura)]/10 text-[var(--accent-sakura)]">第 {r.stage_level} 級</span>
                  {r.context && <span>· {r.context}</span>}
                </div>
                {r.sample_phrase && (
                  <div className="text-sm font-jp mt-1.5">{r.sample_phrase}</div>
                )}
              </GlassPanel>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
