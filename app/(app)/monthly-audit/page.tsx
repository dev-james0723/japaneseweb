import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { monthStartDate } from "@/lib/os/types";
import { evaluatePhaseAdvancement } from "@/lib/os/phaseProgression";
import { MonthlyAuditForm } from "./MonthlyAuditForm";

export const dynamic = "force-dynamic";

export default async function MonthlyAuditPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const ms = monthStartDate();
  const [{ count: cumVocab }, { data: bootLogs }, { data: journals }, { data: existing }, advancement] = await Promise.all([
    supabase.from("vocabulary_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("os_boot_logs")
      .select("boot_date, boot_layer_done, input_layer_done, review_layer_done, output_layer_done, debug_layer_done")
      .eq("user_id", user.id)
      .gte("boot_date", ms),
    supabase.from("journal_entries").select("sentence_count").eq("user_id", user.id).gte("entry_date", ms),
    supabase.from("monthly_audits").select("*").eq("user_id", user.id).eq("month_start", ms).maybeSingle(),
    evaluatePhaseAdvancement(supabase, user.id),
  ]);

  const totalDays = new Date(new Date(ms).getFullYear(), new Date(ms).getMonth() + 1, 0).getDate();
  const bootDays = (bootLogs ?? []).filter((l) =>
    [l.boot_layer_done, l.input_layer_done, l.review_layer_done, l.output_layer_done, l.debug_layer_done].some(Boolean),
  ).length;
  const bootRate = totalDays > 0 ? bootDays / totalDays : 0;
  const avgSentences = (journals ?? []).length ? (journals ?? []).reduce((s, j) => s + (j.sentence_count ?? 0), 0) / (journals ?? []).length : 0;

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h1 className="text-xl font-semibold mb-1">🌙 每月檢討</h1>
        <p className="text-xs text-[var(--text-secondary)]">月份：{ms}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <Stat label="詞彙總數" value={String(cumVocab ?? 0)} accent="lime" />
          <Stat label="開機率" value={`${Math.round(bootRate * 100)}%`} accent="sky" />
          <Stat label="平均日記 / 日" value={avgSentences.toFixed(1)} accent="sakura" />
          <Stat label="開機天數" value={`${bootDays}/${totalDays}`} accent="amber" />
        </div>
      </GlassPanel>

      {advancement && (
        <GlassPanel className="p-5">
          <h2 className="text-sm font-semibold mb-3">階段晉升</h2>
          <div className="text-xs text-[var(--text-secondary)] mb-3">
            目前：<span className="text-[var(--accent-lime)] font-semibold">階段 {advancement.currentPhase}</span>（第 {advancement.daysIntoPhase} 日）
          </div>
          <ul className="text-xs space-y-0.5 mb-3">
            {advancement.reasons.map((r, i) => <li key={i}>· {r}</li>)}
          </ul>
          <MonthlyAuditForm
            initial={{
              biggestProgress: existing?.biggest_progress ?? "",
              biggestBottleneck: existing?.biggest_bottleneck ?? "",
              nextMonthFocus: existing?.next_month_focus ?? "",
              planningRating: existing?.planning_rating ?? null,
              talkMeNaturalness: existing?.talk_me_naturalness ?? null,
            }}
            monthStart={ms}
            canAdvance={advancement.recommendedAdvance}
          />
        </GlassPanel>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: "lime" | "sky" | "sakura" | "amber" }) {
  const color = {
    lime: "text-[var(--accent-lime)]",
    sky: "text-[var(--accent-sky)]",
    sakura: "text-[var(--accent-sakura)]",
    amber: "text-[var(--accent-amber)]",
  }[accent];
  return (
    <GlassPanel variant="subtle" className="p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${color}`}>{value}</div>
    </GlassPanel>
  );
}
