import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { weekStartDate } from "@/lib/os/types";
import { WeeklyReviewForm } from "./WeeklyReviewForm";

export const dynamic = "force-dynamic";

export default async function WeeklyReviewPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const wk = weekStartDate();
  const [{ count: newVocab }, { count: newGrammar }, { data: bootLogs }, { data: existing }, { data: leeches }] = await Promise.all([
    supabase.from("vocabulary_items").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", `${wk}T00:00:00Z`),
    supabase.from("grammar_points").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", `${wk}T00:00:00Z`),
    supabase
      .from("os_boot_logs")
      .select("boot_date, boot_layer_done, input_layer_done, review_layer_done, output_layer_done, debug_layer_done, anki_due_completed, anki_due_total")
      .eq("user_id", user.id)
      .gte("boot_date", wk),
    supabase
      .from("weekly_reviews")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start_date", wk)
      .maybeSingle(),
    supabase
      .from("vocabulary_items")
      .select("id, japanese, meaning_zh")
      .eq("user_id", user.id)
      .eq("is_false_friend", false)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const bootDays = (bootLogs ?? []).filter((l) =>
    [l.boot_layer_done, l.input_layer_done, l.review_layer_done, l.output_layer_done, l.debug_layer_done].some(Boolean),
  ).length;
  const totals = (bootLogs ?? []).reduce((a, l) => ({ c: a.c + (l.anki_due_completed ?? 0), t: a.t + (l.anki_due_total ?? 0) }), { c: 0, t: 0 });
  const ankiRate = totals.t > 0 ? totals.c / totals.t : null;

  const quiz = existing?.ai_generated_quiz as { questions?: any[] } | null;

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h1 className="text-xl font-semibold mb-1">🗓️ 每週回顧</h1>
        <p className="text-xs text-[var(--text-secondary)]">週次：{wk}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <Stat label="新詞彙" value={String(newVocab ?? 0)} accent="lime" />
          <Stat label="新文法" value={String(newGrammar ?? 0)} accent="sky" />
          <Stat label="開機天數" value={`${bootDays}/7`} accent="sakura" />
          <Stat label="Anki 完成率" value={ankiRate != null ? `${Math.round(ankiRate * 100)}%` : "—"} accent="amber" />
        </div>
      </GlassPanel>

      <GlassPanel className="p-5">
        <h2 className="text-sm font-semibold mb-3">反思</h2>
        <WeeklyReviewForm
          initial={{
            userReflection: existing?.user_reflection ?? "",
            nextWeekFocus: existing?.next_week_focus ?? "",
          }}
          weekStart={wk}
          existingQuiz={quiz}
        />
      </GlassPanel>

      {(leeches ?? []).length > 0 && (
        <GlassPanel className="p-5">
          <h2 className="text-sm font-semibold mb-3">📌 最近詞彙觸點</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(leeches ?? []).map((v) => (
              <div key={v.id} className="p-2 rounded-lg bg-white/[0.03] text-sm">
                <span className="font-jp">{v.japanese}</span>
                <span className="text-xs text-[var(--text-muted)] ml-2">{v.meaning_zh}</span>
              </div>
            ))}
          </div>
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
