import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { fetchOsSettings, fetchTodayBootLog, fetchWeeklyStats, fetchStreak } from "@/lib/os/queries";
import { LAYER_INFO, LAYER_ORDER, MODE_INFO, PHASE_INFO, layerCompletion } from "@/lib/os/types";
import { BootSequence } from "./BootSequence";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const [osSettings, todayLog, weekly, streak] = await Promise.all([
    fetchOsSettings(supabase, user.id),
    fetchTodayBootLog(supabase, user.id),
    fetchWeeklyStats(supabase, user.id),
    fetchStreak(supabase, user.id),
  ]);

  const phase = osSettings?.current_phase ?? 1;
  const phaseInfo = PHASE_INFO[phase];
  const mode = todayLog?.mode ?? osSettings?.daily_mode ?? "standard";
  const completion = layerCompletion(todayLog);
  const daysIntoPhase = osSettings?.phase_started_at
    ? Math.max(
        1,
        Math.floor(
          (Date.now() - new Date(osSettings.phase_started_at).getTime()) / (1000 * 60 * 60 * 24),
        ) + 1,
      )
    : 1;

  const layers: Record<string, boolean> = {
    boot: todayLog?.boot_layer_done ?? false,
    input: todayLog?.input_layer_done ?? false,
    review: todayLog?.review_layer_done ?? false,
    output: todayLog?.output_layer_done ?? false,
    debug: todayLog?.debug_layer_done ?? false,
  };

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-[var(--text-muted)] uppercase mb-2">
              🌸 Japanese OS · {new Date().toLocaleDateString("zh-Hant-TW", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold mb-1">
              Phase {phase}: {phaseInfo.name}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {phaseInfo.months} · Day {daysIntoPhase} · Target {osSettings?.target_jlpt ?? "N2"}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-2">{phaseInfo.goal}</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase">Today&rsquo;s Boot</div>
            <div className="text-3xl font-semibold tabular-nums text-[var(--accent-lime)]">{completion}%</div>
            <div className="text-xs text-[var(--text-muted)]">
              {MODE_INFO[mode].label} mode · {MODE_INFO[mode].minutes} min · Streak {streak} 日
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {LAYER_ORDER.map((layer) => {
            const done = layers[layer];
            const info = LAYER_INFO[layer];
            return (
              <div key={layer} className="flex items-center gap-3">
                <div className="w-20 text-xs flex items-center gap-1.5 shrink-0">
                  <span>{info.emoji}</span>
                  <span className={done ? "text-[var(--accent-lime)]" : "text-[var(--text-secondary)]"}>
                    {info.label}
                  </span>
                </div>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full transition-all ${done ? "bg-[var(--accent-lime)] w-full" : "bg-white/10 w-0"}`} />
                </div>
                <div className="w-10 text-right text-[10px] text-[var(--text-muted)] tabular-nums shrink-0">
                  {done ? "100%" : "0%"}
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      <BootSequence currentMode={mode} layers={layers} />

      <GlassPanel className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">📊 This Week (since {weekly.weekStart})</h2>
          <Link href="/stats" className="text-xs text-[var(--text-muted)] hover:text-white">查看詳細 →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <WeekStat label="Boot Days" value={`${weekly.bootDays}/7`} accent="lime" />
          <WeekStat
            label="New Vocab"
            value={`${weekly.newVocab}/${osSettings?.weekly_new_vocab_quota ?? 20}`}
            accent={weekly.newVocab > (osSettings?.weekly_new_vocab_quota ?? 20) ? "amber" : "sky"}
          />
          <WeekStat
            label="Anki Rate"
            value={weekly.ankiRate != null ? `${Math.round(weekly.ankiRate * 100)}%` : "—"}
            accent="sakura"
          />
          <WeekStat label="Due Now" value={String(weekly.dueCount)} accent="amber" />
        </div>
      </GlassPanel>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickLink href="/journal" emoji="📓" label="Journal" />
        <QuickLink href="/mining" emoji="⛏️" label="Sentence Mining" />
        <QuickLink href="/talk-me" emoji="📞" label="Talk Me" />
        <QuickLink href="/roleplay" emoji="🎭" label="Roleplay" />
        <QuickLink href="/grammar" emoji="📖" label="Grammar" />
        <QuickLink href="/weekly-review" emoji="🗓️" label="Weekly Review" />
        <QuickLink href="/monthly-audit" emoji="🌙" label="Monthly Audit" />
        <QuickLink href="/decks" emoji="🃏" label="Vocab Decks" />
      </div>
    </div>
  );
}

function WeekStat({ label, value, accent }: { label: string; value: string; accent: "lime" | "sky" | "amber" | "sakura" }) {
  const color = {
    lime: "text-[var(--accent-lime)]",
    sky: "text-[var(--accent-sky)]",
    amber: "text-[var(--accent-amber)]",
    sakura: "text-[var(--accent-sakura)]",
  }[accent];
  return (
    <GlassPanel variant="subtle" className="p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${color}`}>{value}</div>
    </GlassPanel>
  );
}

function QuickLink({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <Link href={href}>
      <GlassPanel variant="subtle" className="p-4 hover:bg-white/[0.09] transition-colors h-full flex flex-col gap-1 items-start">
        <div className="text-xl">{emoji}</div>
        <div className="text-sm font-medium">{label}</div>
      </GlassPanel>
    </Link>
  );
}
