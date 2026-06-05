import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { evaluatePhaseAdvancement } from "@/lib/os/phaseProgression";
import { PHASE_INFO } from "@/lib/os/types";
import { fetchAiFeedbackSummary, type AiFeedbackSummary } from "@/lib/learning/aiFeedbackReports";
import { fetchReviewEventSummary, type ReviewEventSummary } from "@/lib/learning/reviewEvents";

export const dynamic = "force-dynamic";

type BootLog = {
  boot_date: string;
  boot_layer_done: boolean;
  input_layer_done: boolean;
  review_layer_done: boolean;
  output_layer_done: boolean;
  debug_layer_done: boolean;
  anki_due_completed: number | null;
  anki_due_total: number | null;
  journal_sentences: number | null;
  talk_me_minutes: number | null;
};

type JournalRow = {
  entry_date: string;
  sentence_count: number | null;
};

type QuizAttemptRow = {
  quiz_type: string;
  is_correct: boolean | null;
  vocab_id: string | null;
  created_at: string;
};

type RoleplaySessionRow = {
  task_complete: boolean | null;
  score: number | null;
  started_at: string | null;
  created_at: string | null;
};

type RadarSnapshot = {
  snapshotDate: string;
  scores: Record<string, number>;
  evidence: Record<string, string>;
};

type RadarSnapshotRow = {
  snapshot_date: string;
  scores: unknown;
  evidence: unknown;
};

type JlptReadinessRow = {
  snapshot_date: string;
  target_level: string;
  readiness_score: number;
  vocabulary_score: number;
  grammar_score: number;
  reading_score: number;
  listening_score: number;
  output_score: number;
  consistency_score: number;
  projected_ready_date: string | null;
  days_until_deadline: number | null;
  pace_status: string;
  source: string;
};

type ReadinessProgress = {
  latest: JlptReadinessRow | null;
  previous: JlptReadinessRow | null;
  error: string | null;
};

type SkillMovement = {
  label: string;
  score: number | null;
  previousScore: number | null;
  delta: number | null;
  evidence: string;
  priorEvidence: string;
  description: string;
  accent: "lime" | "sky" | "sakura" | "amber";
};

export default async function StatsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const currentStart = new Date();
  currentStart.setDate(currentStart.getDate() - 14);
  const previousStart = new Date();
  previousStart.setDate(previousStart.getDate() - 28);
  const currentStartStr = currentStart.toISOString().slice(0, 10);
  const sinceStr = previousStart.toISOString().slice(0, 10);

  const [
    { data: bootLogs },
    { count: totalVocab },
    { count: totalJournal },
    { data: journalRecent },
    { data: quizAttempts },
    { data: roleplaySessions },
    readinessSnapshotsResult,
    radarSnapshotResult,
    reviewEventSummary,
    aiFeedbackSummary,
    advancement,
  ] = await Promise.all([
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
    supabase
      .from("quiz_attempts")
      .select("quiz_type, is_correct, vocab_id, created_at")
      .eq("user_id", user.id)
      .gte("created_at", `${sinceStr}T00:00:00Z`)
      .order("created_at", { ascending: true }),
    supabase
      .from("roleplay_sessions")
      .select("task_complete, score, started_at, created_at")
      .eq("user_id", user.id)
      .gte("started_at", `${sinceStr}T00:00:00Z`)
      .order("started_at", { ascending: true }),
    supabase
      .from("jlpt_readiness_snapshots")
      .select("snapshot_date, target_level, readiness_score, vocabulary_score, grammar_score, reading_score, listening_score, output_score, consistency_score, projected_ready_date, days_until_deadline, pace_status, source")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("radar_snapshots")
      .select("snapshot_date, scores, evidence")
      .eq("user_id", user.id)
      .eq("source", "computed")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchReviewEventSummary({ supabase, userId: user.id, days: 14 }),
    fetchAiFeedbackSummary({ supabase, userId: user.id, days: 30 }),
    evaluatePhaseAdvancement(supabase, user.id),
  ]);

  const logs = (bootLogs ?? []) as BootLog[];
  const journals = (journalRecent ?? []) as JournalRow[];
  const attempts = (quizAttempts ?? []) as QuizAttemptRow[];
  const roleplays = (roleplaySessions ?? []) as RoleplaySessionRow[];
  const radarSnapshot = normalizeRadarSnapshot((radarSnapshotResult.data ?? null) as RadarSnapshotRow | null);
  const readinessProgress = normalizeReadinessProgress(
    (readinessSnapshotsResult.data ?? []) as JlptReadinessRow[],
    readinessSnapshotsResult.error?.message ?? null,
  );
  if (radarSnapshotResult.error) {
    console.error("[stats] radar snapshot:", radarSnapshotResult.error.message);
  }
  if (readinessSnapshotsResult.error) {
    console.error("[stats] readiness snapshots:", readinessSnapshotsResult.error.message);
  }
  const bootDays = logs.filter((l) =>
    [l.boot_layer_done, l.input_layer_done, l.review_layer_done, l.output_layer_done, l.debug_layer_done].some(Boolean),
  ).length;

  const ankiTotals = logs.reduce(
    (a, l) => ({ completed: a.completed + (l.anki_due_completed ?? 0), total: a.total + (l.anki_due_total ?? 0) }),
    { completed: 0, total: 0 },
  );
  const ankiRate = ankiTotals.total > 0 ? ankiTotals.completed / ankiTotals.total : null;
  const totalTalkMe = logs.reduce((s, l) => s + (l.talk_me_minutes ?? 0), 0);
  const skillMovement = buildSkillMovements({
    logs,
    journals,
    attempts,
    roleplays,
    currentStartStr,
  });

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

      <JlptReadinessPanel progress={readinessProgress} />

      <EvidenceRadarPanel snapshot={radarSnapshot} />

      <ReviewEventLedgerPanel summary={reviewEventSummary} />

      <AiQualityPanel summary={aiFeedbackSummary} />

      <GlassPanel className="p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">技能變化</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              最近 14 日對比前 14 日
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {skillMovement.map((metric) => (
            <SkillMovementCard key={metric.label} metric={metric} />
          ))}
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

const RADAR_DIMENSIONS = [
  { key: "vocabulary_recognition", label: "詞彙辨認", accent: "sky" },
  { key: "vocabulary_production", label: "詞彙產出", accent: "sky" },
  { key: "kanji_recognition", label: "漢字辨認", accent: "amber" },
  { key: "grammar_understanding", label: "文法理解", accent: "amber" },
  { key: "grammar_production", label: "文法產出", accent: "amber" },
  { key: "reading_comprehension", label: "閱讀理解", accent: "lime" },
  { key: "listening_comprehension", label: "聽力理解", accent: "lime" },
  { key: "speaking_shadowing", label: "口說／跟讀", accent: "sakura" },
  { key: "writing_accuracy", label: "寫作準確度", accent: "sakura" },
  { key: "sentence_mining_retention", label: "句子保留", accent: "lime" },
  { key: "output_consistency", label: "輸出穩定度", accent: "sakura" },
  { key: "cultural_literacy", label: "文化理解", accent: "sky" },
] as const satisfies readonly { key: string; label: string; accent: SkillMovement["accent"] }[];

function ReviewEventLedgerPanel({ summary }: { summary: ReviewEventSummary }) {
  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">複習事件證據</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {summary.available
              ? `最近 ${summary.days} 日 · ${summary.total} 次可追蹤回想`
              : "複習事件資料庫遷移尚未套用"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right">
          <MiniMetric label="準確率" value={summary.accuracy == null ? "—" : `${summary.accuracy}%`} accent="lime" />
          <MiniMetric label="薄弱" value={String(summary.weakSignals)} accent="amber" />
          <MiniMetric label="最新" value={summary.latestAt ? summary.latestAt.slice(5, 10) : "—"} accent="sky" />
        </div>
      </div>

      {summary.error && (
        <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {summary.error}
        </div>
      )}

      {summary.available && summary.buckets.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {summary.buckets.map((bucket) => (
            <GlassPanel key={bucket.targetType} variant="subtle" className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{bucket.label}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    {bucket.total} 次嘗試 · {bucket.correct} 次答中
                  </div>
                </div>
                <div className="text-xl font-semibold tabular-nums text-[var(--accent-lime)]">
                  {bucket.accuracy == null ? "—" : `${bucket.accuracy}%`}
                </div>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-[var(--accent-lime)]"
                  style={{ width: `${Math.max(4, bucket.accuracy ?? 0)}%` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] text-[var(--text-muted)]">
                <RatingPill label="再來" value={bucket.ratings.again} />
                <RatingPill label="困難" value={bucket.ratings.hard} />
                <RatingPill label="良好" value={bucket.ratings.good} />
                <RatingPill label="簡單" value={bucket.ratings.easy} />
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-[var(--text-muted)]">
          {summary.available
            ? "這個時間窗暫時未有複習事件。"
            : "套用 review_events 資料庫遷移後，這裡會顯示回想層級分析。"}
        </div>
      )}
    </GlassPanel>
  );
}

function AiQualityPanel({ summary }: { summary: AiFeedbackSummary }) {
  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">AI 品質回報</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {summary.available
              ? `最近 ${summary.days} 日 · 用戶回報的 AI 問題`
              : "AI 回報資料庫遷移尚未套用"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right">
          <MiniMetric label="回報" value={String(summary.total)} accent="sakura" />
          <MiniMetric label="未處理" value={String(summary.open)} accent="amber" />
          <MiniMetric label="高風險" value={String(summary.highSeverity)} accent="sky" />
        </div>
      </div>

      {summary.error ? (
        <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {summary.error}
        </div>
      ) : null}

      {summary.available && summary.buckets.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {summary.buckets.map((bucket) => (
            <GlassPanel key={bucket.reportType} variant="subtle" className="p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{bucket.label}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    {bucket.total} 總數 · {bucket.open} 未處理
                  </div>
                </div>
                <div className="text-xl font-semibold tabular-nums text-[var(--accent-sakura)]">
                  {bucket.highSeverity}
                </div>
              </div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                高風險 · 最新 {bucket.latestAt ? bucket.latestAt.slice(5, 10) : "—"}
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-[var(--text-muted)]">
          {summary.available
            ? "這個時間窗未有 AI 品質回報。"
            : "套用 ai_feedback_reports 資料庫遷移後，這裡會顯示 AI 品質指標。"}
        </div>
      )}
    </GlassPanel>
  );
}

function MiniMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: SkillMovement["accent"];
}) {
  return (
    <div className="min-w-[4.5rem] rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${accentClass(accent)}`}>{value}</div>
    </div>
  );
}

function RatingPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1">
      <div>{label}</div>
      <div className="mt-0.5 font-semibold tabular-nums text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function EvidenceRadarPanel({ snapshot }: { snapshot: RadarSnapshot | null }) {
  const dimensions = RADAR_DIMENSIONS.map((dimension) => ({
    ...dimension,
    score: snapshot?.scores[dimension.key] ?? null,
    evidence: snapshot?.evidence[dimension.key] ?? "等待證據",
  }));
  const scored = dimensions
    .map((dimension) => dimension.score)
    .filter((score): score is number => typeof score === "number");
  const average = scored.length
    ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
    : null;
  const snapshotLabel = snapshot
    ? `快照 ${snapshot.snapshotDate}`
    : "尚未計算快照";

  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">證據雷達</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {snapshotLabel}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">平均</div>
          <div className="text-2xl font-semibold tabular-nums text-[var(--accent-lime)]">
            {average == null ? "—" : `${average}%`}
          </div>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {dimensions.map((dimension) => (
          <RadarDimensionCard key={dimension.key} dimension={dimension} />
        ))}
      </div>
    </GlassPanel>
  );
}

function RadarDimensionCard({
  dimension,
}: {
  dimension: {
    key: string;
    label: string;
    accent: SkillMovement["accent"];
    score: number | null;
    evidence: string;
  };
}) {
  const width = dimension.score == null
    ? 0
    : Math.max(4, Math.min(100, dimension.score));
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 text-xs font-medium">{dimension.label}</div>
        <div className={`shrink-0 text-sm font-semibold tabular-nums ${accentClass(dimension.accent)}`}>
          {dimension.score == null ? "—" : `${dimension.score}%`}
        </div>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${barClass(dimension.accent)}`} style={{ width: `${width}%` }} />
      </div>
      <div className="line-clamp-2 text-[10px] leading-4 text-[var(--text-muted)]">
        {dimension.evidence}
      </div>
    </div>
  );
}

function normalizeRadarSnapshot(row: RadarSnapshotRow | null): RadarSnapshot | null {
  if (!row) return null;
  return {
    snapshotDate: row.snapshot_date,
    scores: numericRecord(row.scores),
    evidence: stringRecord(row.evidence),
  };
}

function normalizeReadinessProgress(rowsData: JlptReadinessRow[], error: string | null): ReadinessProgress {
  const rows = Array.isArray(rowsData) ? rowsData : [];
  return {
    latest: rows[0] ?? null,
    previous: rows[1] ?? null,
    error,
  };
}

function JlptReadinessPanel({ progress }: { progress: ReadinessProgress }) {
  const latest = progress.latest;
  const previous = progress.previous;
  const delta = latest && previous ? latest.readiness_score - previous.readiness_score : null;
  const dimensions = latest ? readinessDimensions(latest) : [];
  const weakest = dimensions
    .filter((dimension) => typeof dimension.score === "number")
    .sort((a, b) => a.score - b.score)[0] ?? null;

  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">JLPT 準備度推算</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {latest
              ? `${latest.target_level} · ${sourceLabel(latest.source)}快照 · ${latest.snapshot_date}`
              : "尚未有準備度快照"}
          </p>
        </div>
        {latest ? <PaceBadge status={latest.pace_status} /> : null}
      </div>

      {progress.error ? (
        <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {progress.error}
        </div>
      ) : null}

      {latest ? (
        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_260px]">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">準備度</div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-semibold tabular-nums text-[var(--accent-lime)]">
                {latest.readiness_score}%
              </span>
              <DeltaBadge delta={delta} />
            </div>
            <div className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
              預計準備好 {latest.projected_ready_date ?? "—"} · 截止 {deadlineWindow(latest.days_until_deadline)}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {dimensions.map((dimension) => (
              <ReadinessDimension key={dimension.label} dimension={dimension} />
            ))}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">下一個瓶頸</div>
            <div className="text-base font-semibold">{weakest?.label ?? "等待證據"}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--accent-amber)]">
              {weakest ? `${weakest.score}%` : "—"}
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
              {weakest
                ? bottleneckAdvice(weakest.label)
                : "完成複習、每日輸入、輸出或跟讀後，系統會建立推算。"}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-[var(--text-muted)]">
          透過複習、角色扮演、日記、每週回顧或目標頁刷新雷達後，這裡會建立準備度推算。
        </div>
      )}
    </GlassPanel>
  );
}

function readinessDimensions(row: JlptReadinessRow) {
  return [
    { label: "詞彙", score: row.vocabulary_score, accent: "sky" },
    { label: "文法", score: row.grammar_score, accent: "amber" },
    { label: "閱讀", score: row.reading_score, accent: "lime" },
    { label: "聽力", score: row.listening_score, accent: "lime" },
    { label: "輸出", score: row.output_score, accent: "sakura" },
    { label: "穩定度", score: row.consistency_score, accent: "sakura" },
  ] as const satisfies readonly { label: string; score: number; accent: SkillMovement["accent"] }[];
}

function ReadinessDimension({
  dimension,
}: {
  dimension: { label: string; score: number; accent: SkillMovement["accent"] };
}) {
  const width = Math.max(4, Math.min(100, dimension.score));
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs font-medium">{dimension.label}</div>
        <div className={`text-sm font-semibold tabular-nums ${accentClass(dimension.accent)}`}>
          {dimension.score}%
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${barClass(dimension.accent)}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function PaceBadge({ status }: { status: string }) {
  const label = paceStatusLabel(status);
  const tone =
    status === "ahead" || status === "on_track"
      ? "border-emerald-500/20 bg-emerald-500/10 text-[var(--success)]"
      : status === "behind"
        ? "border-red-500/20 bg-red-500/10 text-red-300"
        : "border-white/10 bg-white/[0.045] text-[var(--text-muted)]";
  return (
    <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${tone}`}>
      {label}
    </span>
  );
}

function deadlineWindow(days: number | null) {
  if (days == null) return "未設定";
  if (days < 0) return `${Math.abs(days)} 日前`;
  if (days === 0) return "今日";
  return `${days} 日`;
}

function bottleneckAdvice(label: string) {
  const advice: Record<string, string> = {
    詞彙: "做產出卡，並從今日輸入採兩句實用例句。",
    文法: "新增新句型之前，先做一次文法對決或修一個重複錯誤。",
    閱讀: "完成一個每日輸入課包，並回答生成的回想小測。",
    聽力: "做一個聽力或跟讀提示，再開始輸出。",
    輸出: "用今日文法寫或講一句，並儲存修正。",
    穩定度: "用最小每日計劃：複習、一個輸入、一句輸出證據。",
  };
  return advice[label] ?? "先處理今日最弱的證據層。";
}

function paceStatusLabel(status: string) {
  if (status === "ahead") return "領先";
  if (status === "on_track") return "正常";
  if (status === "behind") return "落後";
  if (status === "no_deadline") return "未設期限";
  return status.replace(/_/g, " ");
}

function sourceLabel(source: string) {
  if (source === "review") return "複習";
  if (source === "weekly_review") return "每週回顧";
  if (source === "goals") return "目標";
  if (source === "radar") return "雷達";
  return source ? `${source} ` : "";
}

function numericRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, score]) => [key, typeof score === "number" && Number.isFinite(score) ? score : null] as const)
      .filter((entry): entry is readonly [string, number] => entry[1] !== null),
  );
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, evidence]) => [key, typeof evidence === "string" ? evidence : null] as const)
      .filter((entry): entry is readonly [string, string] => entry[1] !== null),
  );
}

function SkillMovementCard({ metric }: { metric: SkillMovement }) {
  const color = accentClass(metric.accent);
  const width = metric.score == null ? 0 : Math.max(4, Math.min(100, metric.score));
  return (
    <GlassPanel variant="subtle" className="p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{metric.label}</div>
          <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{metric.description}</div>
        </div>
        <DeltaBadge delta={metric.delta} />
      </div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className={`text-2xl font-semibold tabular-nums ${color}`}>
          {metric.score == null ? "—" : `${metric.score}%`}
        </div>
        <div className="text-right text-[10px] leading-4 text-[var(--text-muted)]">
          <div>{metric.evidence}</div>
          <div>前期 {metric.previousScore == null ? "—" : `${metric.previousScore}%`} · {metric.priorEvidence}</div>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${barClass(metric.accent)}`} style={{ width: `${width}%` }} />
      </div>
    </GlassPanel>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) {
    return (
      <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-[10px] text-[var(--text-muted)]">
        新資料
      </span>
    );
  }
  const positive = delta >= 0;
  return (
    <span
      className={`rounded-full border px-2 py-1 text-[10px] tabular-nums ${
        positive
          ? "border-emerald-500/20 bg-emerald-500/10 text-[var(--success)]"
          : "border-red-500/20 bg-red-500/10 text-red-300"
      }`}
    >
      {positive ? "+" : ""}{delta}
    </span>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: "lime" | "sky" | "sakura" | "amber" }) {
  const color = accentClass(accent);
  return (
    <GlassPanel variant="subtle" className="p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${color}`}>{value}</div>
    </GlassPanel>
  );
}

function BootBars({ logs, sinceStr }: { logs: BootLog[]; sinceStr: string }) {
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

function JournalBars({ data, sinceStr }: { data: JournalRow[]; sinceStr: string }) {
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

function buildSkillMovements({
  logs,
  journals,
  attempts,
  roleplays,
  currentStartStr,
}: {
  logs: BootLog[];
  journals: JournalRow[];
  attempts: QuizAttemptRow[];
  roleplays: RoleplaySessionRow[];
  currentStartStr: string;
}): SkillMovement[] {
  const currentAttempts = attempts.filter((attempt) => dayFromIso(attempt.created_at) >= currentStartStr);
  const previousAttempts = attempts.filter((attempt) => dayFromIso(attempt.created_at) < currentStartStr);
  const currentLogs = logs.filter((log) => log.boot_date >= currentStartStr);
  const previousLogs = logs.filter((log) => log.boot_date < currentStartStr);
  const currentJournals = journals.filter((journal) => journal.entry_date >= currentStartStr);
  const previousJournals = journals.filter((journal) => journal.entry_date < currentStartStr);
  const currentRoleplays = roleplays.filter((roleplay) => roleplayDate(roleplay) >= currentStartStr);
  const previousRoleplays = roleplays.filter((roleplay) => roleplayDate(roleplay) < currentStartStr);

  const currentVocab = currentAttempts.filter((attempt) => Boolean(attempt.vocab_id));
  const previousVocab = previousAttempts.filter((attempt) => Boolean(attempt.vocab_id));
  const currentWeeklyQuiz = currentAttempts.filter((attempt) => attempt.quiz_type.startsWith("weekly_"));
  const previousWeeklyQuiz = previousAttempts.filter((attempt) => attempt.quiz_type.startsWith("weekly_"));
  const currentSentence = currentAttempts.filter((attempt) =>
    !attempt.vocab_id &&
    !attempt.quiz_type.startsWith("weekly_") &&
    ["cloze", "listening", "production", "shadowing"].includes(attempt.quiz_type),
  );
  const previousSentence = previousAttempts.filter((attempt) =>
    !attempt.vocab_id &&
    !attempt.quiz_type.startsWith("weekly_") &&
    ["cloze", "listening", "production", "shadowing"].includes(attempt.quiz_type),
  );

  const currentReview = reviewScore(currentLogs);
  const previousReview = reviewScore(previousLogs);
  const currentOutput = outputScore(currentLogs, currentJournals, currentRoleplays);
  const previousOutput = outputScore(previousLogs, previousJournals, previousRoleplays);
  const currentSpeaking = speakingScore(currentLogs, currentRoleplays, currentSentence);
  const previousSpeaking = speakingScore(previousLogs, previousRoleplays, previousSentence);

  return [
    makeMetric({
      label: "詞彙回想",
      score: accuracyScore(currentVocab),
      previousScore: accuracyScore(previousVocab),
      evidence: `${currentVocab.length} 次嘗試`,
      priorEvidence: `${previousVocab.length} 次嘗試`,
      description: "詞卡辨認／產出正確率",
      accent: "sky",
    }),
    makeMetric({
      label: "句子回想",
      score: accuracyScore(currentSentence),
      previousScore: accuracyScore(previousSentence),
      evidence: `${currentSentence.length} 個提示`,
      priorEvidence: `${previousSentence.length} 個提示`,
      description: "採礦句填空／聽力／跟讀",
      accent: "lime",
    }),
    makeMetric({
      label: "文法回想",
      score: accuracyScore(currentWeeklyQuiz),
      previousScore: accuracyScore(previousWeeklyQuiz),
      evidence: `${currentWeeklyQuiz.length} 次小測答案`,
      priorEvidence: `${previousWeeklyQuiz.length} 次小測答案`,
      description: "每週小測答題正確率",
      accent: "amber",
    }),
    makeMetric({
      label: "輸出穩定度",
      score: currentOutput.score,
      previousScore: previousOutput.score,
      evidence: currentOutput.evidence,
      priorEvidence: previousOutput.evidence,
      description: "日記、輸出層、角色扮演完成日",
      accent: "sakura",
    }),
    makeMetric({
      label: "複習紀律",
      score: currentReview.score,
      previousScore: previousReview.score,
      evidence: currentReview.evidence,
      priorEvidence: previousReview.evidence,
      description: "到期卡完成率；無到期卡時看複習層",
      accent: "lime",
    }),
    makeMetric({
      label: "口說次數",
      score: currentSpeaking.score,
      previousScore: previousSpeaking.score,
      evidence: currentSpeaking.evidence,
      priorEvidence: previousSpeaking.evidence,
      description: "Talk Me、角色扮演、跟讀觸點",
      accent: "sky",
    }),
  ];
}

function makeMetric(input: Omit<SkillMovement, "delta">): SkillMovement {
  const delta =
    input.score == null || input.previousScore == null
      ? null
      : input.score - input.previousScore;
  return { ...input, delta };
}

function accuracyScore(attempts: QuizAttemptRow[]) {
  const answered = attempts.filter((attempt) => attempt.is_correct !== null);
  if (!answered.length) return null;
  const correct = answered.filter((attempt) => attempt.is_correct).length;
  return Math.round((correct / answered.length) * 100);
}

function reviewScore(logs: BootLog[]) {
  const totals = logs.reduce(
    (acc, log) => ({
      completed: acc.completed + (log.anki_due_completed ?? 0),
      total: acc.total + (log.anki_due_total ?? 0),
    }),
    { completed: 0, total: 0 },
  );

  if (totals.total > 0) {
    return {
      score: Math.round((totals.completed / totals.total) * 100),
      evidence: `${totals.completed}/${totals.total} 到期`,
    };
  }

  const reviewDays = logs.filter((log) => log.review_layer_done).length;
  return {
    score: Math.round((reviewDays / 14) * 100),
    evidence: `${reviewDays}/14 複習日`,
  };
}

function outputScore(logs: BootLog[], journals: JournalRow[], roleplays: RoleplaySessionRow[]) {
  const dates = new Set<string>();
  for (const log of logs) {
    if (log.output_layer_done || (log.journal_sentences ?? 0) > 0) dates.add(log.boot_date);
  }
  for (const journal of journals) {
    if ((journal.sentence_count ?? 0) > 0) dates.add(journal.entry_date);
  }
  for (const roleplay of roleplays) {
    if (roleplay.task_complete) dates.add(roleplayDate(roleplay));
  }
  return {
    score: Math.round((dates.size / 14) * 100),
    evidence: `${dates.size}/14 輸出日`,
  };
}

function speakingScore(logs: BootLog[], roleplays: RoleplaySessionRow[], sentenceAttempts: QuizAttemptRow[]) {
  const talkMinutes = logs.reduce((sum, log) => sum + (log.talk_me_minutes ?? 0), 0);
  const completedRoleplays = roleplays.filter((roleplay) => roleplay.task_complete).length;
  const shadowingAttempts = sentenceAttempts.filter((attempt) => attempt.quiz_type === "shadowing").length;
  const score = Math.min(100, Math.round((talkMinutes / 70) * 60 + completedRoleplays * 15 + shadowingAttempts * 5));
  return {
    score,
    evidence: `${talkMinutes} 分 · ${completedRoleplays} 次角色扮演 · ${shadowingAttempts} 次跟讀`,
  };
}

function dayFromIso(value: string) {
  return value.slice(0, 10);
}

function roleplayDate(roleplay: RoleplaySessionRow) {
  return dayFromIso(roleplay.started_at ?? roleplay.created_at ?? "0000-00-00");
}

function accentClass(accent: SkillMovement["accent"]) {
  return {
    lime: "text-[var(--accent-lime)]",
    sky: "text-[var(--accent-sky)]",
    sakura: "text-[var(--accent-sakura)]",
    amber: "text-[var(--accent-amber)]",
  }[accent];
}

function barClass(accent: SkillMovement["accent"]) {
  return {
    lime: "bg-[var(--accent-lime)]",
    sky: "bg-[var(--accent-sky)]",
    sakura: "bg-[var(--accent-sakura)]",
    amber: "bg-[var(--accent-amber)]",
  }[accent];
}
