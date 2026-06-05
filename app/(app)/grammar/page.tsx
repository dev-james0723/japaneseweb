import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Flame, Gauge, Map as MapIcon } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { checkWeeklyQuota } from "@/lib/os/quota";
import { GrammarAddForm } from "./GrammarAddForm";
import { GrammarPointList, type GrammarPointItem } from "./GrammarPointList";

export const dynamic = "force-dynamic";

type WeaknessEventRow = {
  id: string;
  severity: string;
  prompt: string | null;
  correct_answer: string | null;
  metadata: unknown;
  created_at: string;
};

type GrammarWeaknessSignal = {
  pattern: string;
  count: number;
  lastSeen: string;
  severity: string;
  example: string | null;
};

type GrammarMasteryRow = {
  pattern: string;
  mastery_score: number;
  active_stage: number;
  exposure_count: number;
  correct_count: number;
  miss_count: number;
  hard_count: number;
  leech_count: number;
  production_count: number;
  evidence_summary: string | null;
  last_seen_at: string | null;
};

export default async function GrammarPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const weaknessSince = new Date();
  weaknessSince.setDate(weaknessSince.getDate() - 30);

  const [{ data: points }, quota, { data: weaknessEvents }, masteryResult] = await Promise.all([
    supabase
      .from("grammar_points")
      .select("id, pattern, jlpt_level, core_meaning, construction, similar_patterns, common_mistake, mnemonic, active_stage, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    checkWeeklyQuota(supabase, user.id),
    supabase
      .from("weakness_events")
      .select("id, severity, prompt, correct_answer, metadata, created_at")
      .eq("user_id", user.id)
      .eq("skill_area", "grammar")
      .gte("created_at", weaknessSince.toISOString())
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("grammar_mastery")
      .select("pattern, mastery_score, active_stage, exposure_count, correct_count, miss_count, hard_count, leech_count, production_count, evidence_summary, last_seen_at")
      .eq("user_id", user.id)
      .order("mastery_score", { ascending: true })
      .limit(60),
  ]);
  const weaknessSignals = buildGrammarWeaknessSignals((weaknessEvents ?? []) as WeaknessEventRow[]);
  const masteryRows = isMissingGrammarMasteryTable(masteryResult.error)
    ? []
    : ((masteryResult.data ?? []) as GrammarMasteryRow[]);

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold">📖 文法重點</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              本週新文法: {quota.newGrammarThisWeek}/{quota.grammarQuota}
            </p>
          </div>
          <Link href="/grammar-map" className="btn-ghost text-sm">
            <MapIcon className="h-4 w-4" aria-hidden="true" />
            文法地圖
          </Link>
        </div>
      </GlassPanel>

      <GrammarWeaknessPanel signals={weaknessSignals} />
      <GrammarMasteryPanel rows={masteryRows} schemaReady={!isMissingGrammarMasteryTable(masteryResult.error)} />

      <GlassPanel className="p-5">
        <h2 className="text-sm font-semibold mb-3">+ 新增文法</h2>
        <GrammarAddForm quotaExceeded={quota.grammarExceeded} />
      </GlassPanel>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold px-1">全部文法（{points?.length ?? 0}）</h2>
        {(points ?? []).length === 0 ? (
          <GlassPanel variant="subtle" className="p-6 text-center text-sm text-[var(--text-secondary)]">
            尚未加入任何文法點。
          </GlassPanel>
        ) : (
          <GrammarPointList points={(points ?? []) as GrammarPointItem[]} />
        )}
      </section>
    </div>
  );
}

function GrammarMasteryPanel({ rows, schemaReady }: { rows: GrammarMasteryRow[]; schemaReady: boolean }) {
  const weak = rows
    .filter((row) => row.exposure_count > 0)
    .sort((a, b) => a.mastery_score - b.mastery_score || (b.miss_count + b.hard_count + b.leech_count) - (a.miss_count + a.hard_count + a.leech_count))
    .slice(0, 4);
  const owned = rows
    .filter((row) => row.mastery_score >= 70)
    .sort((a, b) => b.mastery_score - a.mastery_score)
    .slice(0, 3);
  const average = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.mastery_score, 0) / rows.length)
    : 0;

  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-eyebrow mb-1">掌握證據</p>
          <h2 className="text-sm font-semibold">由接觸、複習、輸出計出的文法掌握度</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            手動筆記只是起點；分數會被複習正答、輸出產出、錯題和修復證據推動。
          </p>
        </div>
        <span className="chip chip-active">
          <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
          平均 {average}
        </span>
      </div>

      {!schemaReady ? (
        <div className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-[var(--text-secondary)]">
          文法掌握度資料庫遷移尚未套用；文法列表仍可使用，但掌握證據暫未統計。
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-[var(--text-secondary)]">
          暫時未有掌握證據。完成文法相關複習、採礦或輸出修正後會自動出現。
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-3 md:grid-cols-2">
            {weak.map((row) => (
              <MasteryCard key={row.pattern} row={row} tone="weak" />
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
              已掌握候選
            </div>
            {owned.length ? owned.map((row) => (
              <MasteryCard key={row.pattern} row={row} tone="owned" compact />
            )) : (
              <p className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-xs text-[var(--text-muted)]">
                仍未有 70+ 掌握度句型。繼續做文法相關複習。
              </p>
            )}
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

function MasteryCard({ row, tone, compact = false }: { row: GrammarMasteryRow; tone: "weak" | "owned"; compact?: boolean }) {
  const misses = row.miss_count + row.hard_count + row.leech_count;
  return (
    <div className={[
      "rounded-xl border p-3",
      tone === "owned" ? "border-[var(--accent-lime)]/25 bg-[var(--accent-lime-bg)]/20" : "border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/7",
    ].join(" ")}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-jp text-sm font-semibold">{row.pattern}</p>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            階段 {row.active_stage} · {row.exposure_count} 次接觸
          </p>
        </div>
        <span className="text-sm font-semibold tabular-nums text-[var(--accent-lime)]">{row.mastery_score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full rounded-full bg-[var(--accent-lime)]" style={{ width: `${row.mastery_score}%` }} />
      </div>
      {!compact ? (
        <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
          {row.correct_count} 次答中 · {misses} 次薄弱 · {row.production_count} 次產出
        </p>
      ) : null}
    </div>
  );
}

function GrammarWeaknessPanel({ signals }: { signals: GrammarWeaknessSignal[] }) {
  return (
    <GlassPanel variant="subtle" className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-eyebrow mb-1">文法醫生</p>
          <h2 className="text-sm font-semibold">複習入面暴露出的文法弱點</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            來自近 30 日句子複習的錯題；不是手動筆記，而是真實失誤證據。
          </p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--accent-sakura)]/25 bg-[var(--accent-sakura)]/10 text-[var(--accent-sakura)]">
          <Flame className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      {signals.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm text-[var(--text-secondary)]">
          暫時未有文法弱點。當句子複習出現錯題並帶有文法標籤，這裡會自動生成修復隊列。
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {signals.map((signal) => (
            <div key={signal.pattern} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-jp text-base font-semibold">{signal.pattern}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {signal.count} 次 · {weaknessSeverityLabel(signal.severity)}
                  </p>
                </div>
                <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--accent-amber)]" aria-hidden="true" />
              </div>
              {signal.example ? (
                <p className="line-clamp-3 text-xs leading-5 text-[var(--text-secondary)]">{signal.example}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}

function buildGrammarWeaknessSignals(events: WeaknessEventRow[]): GrammarWeaknessSignal[] {
  const byPattern = new Map<string, GrammarWeaknessSignal>();
  events.forEach((event) => {
    const pattern = patternFromMetadata(event.metadata);
    if (!pattern) return;
    const existing = byPattern.get(pattern);
    const example = event.correct_answer || event.prompt;
    if (existing) {
      existing.count += 1;
      return;
    }
    byPattern.set(pattern, {
      pattern,
      count: 1,
      lastSeen: event.created_at,
      severity: event.severity,
      example,
    });
  });
  return Array.from(byPattern.values())
    .sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen))
    .slice(0, 6);
}

function patternFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as { pattern?: unknown; grammar_point?: unknown; grammar_tags?: unknown };
  const pattern = record.pattern ?? record.grammar_point;
  if (typeof pattern === "string" && pattern.trim()) return pattern.trim();
  if (Array.isArray(record.grammar_tags)) {
    const first = record.grammar_tags.find((item) => typeof item === "string" && item.trim());
    return typeof first === "string" ? first.trim() : null;
  }
  return null;
}

function weaknessSeverityLabel(severity: string) {
  if (severity === "leech") return "高風險補救";
  if (severity === "hard") return "吃力";
  return "miss";
}

function isMissingGrammarMasteryTable(error: unknown) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  return /does not exist|schema cache|PGRST205|42P01|grammar_mastery|grammar_exposures/i.test(message);
}
