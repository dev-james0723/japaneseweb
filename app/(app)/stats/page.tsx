import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { evaluatePhaseAdvancement } from "@/lib/os/phaseProgression";
import { PHASE_INFO } from "@/lib/os/types";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const since = new Date();
  since.setDate(since.getDate() - 28);
  const sinceStr = since.toISOString().slice(0, 10);

  const [{ data: bootLogs }, { count: totalVocab }, { count: totalJournal }, { data: journalRecent }, advancement] = await Promise.all([
    supabase
      .from("os_boot_logs")
      .select("boot_date, boot_layer_done, input_layer_done, review_layer_done, output_layer_done, debug_layer_done, anki_due_completed, anki_due_total, journal_sentences, talk_me_minutes")
      .eq("user_id", user.id)
      .gte("boot_date", sinceStr)
      .order("boot_date", { ascending: true }),
    supabase
      .from("vocabulary_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("journal_entries")
      .select("entry_date, sentence_count")
      .eq("user_id", user.id)
      .gte("entry_date", sinceStr)
      .order("entry_date", { ascending: true }),
    evaluatePhaseAdvancement(supabase, user.id),
  ]);

  const logs = bootLogs ?? [];
  const bootDays = logs.filter((l) =>
    [l.boot_layer_done, l.input_layer_done, l.review_layer_done, l.output_layer_done, l.debug_layer_done].some(Boolean),
  ).length;

  const ankiTotals = logs.reduce(
    (a, l) => ({ completed: a.completed + (l.anki_due_completed ?? 0), total: a.total + (l.anki_due_total ?? 0) }),
    { completed: 0, total: 0 },
  );
  const ankiRate = ankiTotals.total > 0 ? ankiTotals.completed / ankiTotals.total : null;
  const totalTalkMe = logs.reduce((s, l) => s + (l.talk_me_minutes ?? 0), 0);

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h1 className="text-xl font-semibold mb-1">📈 統計 — 最近 28 日</h1>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          階段 {advancement?.currentPhase ?? 1} · 第 {advancement?.daysIntoPhase ?? 0} 日
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="開機天數" value={`${bootDays}/28`} accent="lime" />
          <Stat label="詞彙總數" value={String(totalVocab ?? 0)} accent="sky" />
          <Stat label="Anki 完成率" value={ankiRate != null ? `${Math.round(ankiRate * 100)}%` : "—"} accent="sakura" />
          <Stat label="Talk Me 分鐘" value={String(totalTalkMe)} accent="amber" />
        </div>
      </GlassPanel>

      {/* Boot rate bar chart */}
      <GlassPanel className="p-5">
        <h2 className="text-sm font-semibold mb-3">每日開機層級（最近 28 日）</h2>
        <BootBars logs={logs} sinceStr={sinceStr} />
      </GlassPanel>

      {/* Journal sentences */}
      <GlassPanel className="p-5">
        <h2 className="text-sm font-semibold mb-3">日記句數 / 日</h2>
        <JournalBars data={journalRecent ?? []} sinceStr={sinceStr} />
        <div className="text-xs text-[var(--text-muted)] mt-2">紀錄總數：{totalJournal ?? 0}</div>
      </GlassPanel>

      {/* Phase progression */}
      <GlassPanel className="p-5">
        <h2 className="text-sm font-semibold mb-3">階段進度</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6].map((p) => (
            <div
              key={p}
              className={`p-2 rounded-lg text-center text-xs ${
                p === advancement?.currentPhase
                  ? "bg-[var(--accent-lime-bg)] text-[var(--accent-lime)] border border-[var(--accent-lime)]/40"
                  : p < (advancement?.currentPhase ?? 1)
                    ? "bg-white/5 text-[var(--text-muted)]"
                    : "bg-white/[0.02] text-[var(--text-muted)]"
              }`}
            >
              <div className="font-semibold">階段 {p}</div>
              <div className="text-[10px] mt-0.5">{PHASE_INFO[p].name}</div>
              <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{PHASE_INFO[p].months}</div>
            </div>
          ))}
        </div>
        {advancement && (
          <div className={`p-3 rounded-lg text-xs ${advancement.recommendedAdvance ? "bg-[var(--accent-lime)]/10 text-[var(--accent-lime)]" : "bg-white/[0.02]"}`}>
            <div className="font-semibold mb-1">
              {advancement.recommendedAdvance
                ? `🎉 已達階段 ${advancement.currentPhase + 1} 條件！`
                : `仲未升階段 ${advancement.currentPhase + 1}`}
            </div>
            <ul className="space-y-0.5">
              {advancement.reasons.map((r, i) => <li key={i}>· {r}</li>)}
            </ul>
          </div>
        )}
      </GlassPanel>
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

function BootBars({ logs, sinceStr }: { logs: any[]; sinceStr: string }) {
  const days = buildDayRange(sinceStr, 28);
  const byDate = new Map(logs.map((l) => [l.boot_date, l]));
  return (
    <div className="flex items-end gap-1 h-24">
      {days.map((d) => {
        const l = byDate.get(d);
        const layers = l ? [l.boot_layer_done, l.input_layer_done, l.review_layer_done, l.output_layer_done, l.debug_layer_done].filter(Boolean).length : 0;
        const h = (layers / 5) * 100;
        return (
          <div key={d} className="flex-1 flex flex-col justify-end" title={`${d}：${layers}/5 層`}>
            <div
              className={`rounded-t ${layers === 5 ? "bg-[var(--accent-lime)]" : layers >= 3 ? "bg-[var(--accent-sky)]" : layers > 0 ? "bg-[var(--accent-amber)]" : "bg-white/5"}`}
              style={{ height: `${Math.max(h, 4)}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function JournalBars({ data, sinceStr }: { data: { entry_date: string; sentence_count: number | null }[]; sinceStr: string }) {
  const days = buildDayRange(sinceStr, 28);
  const map = new Map<string, number>();
  for (const d of data) map.set(d.entry_date, (map.get(d.entry_date) ?? 0) + (d.sentence_count ?? 0));
  const max = Math.max(1, ...Array.from(map.values()));
  return (
    <div className="flex items-end gap-1 h-24">
      {days.map((d) => {
        const v = map.get(d) ?? 0;
        const h = (v / max) * 100;
        return (
          <div key={d} className="flex-1 flex flex-col justify-end" title={`${d}：${v} 句`}>
            <div
              className={`rounded-t ${v > 0 ? "bg-[var(--accent-sakura)]" : "bg-white/5"}`}
              style={{ height: `${Math.max(h, 4)}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function buildDayRange(sinceStr: string, days: number): string[] {
  const start = new Date(sinceStr);
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
