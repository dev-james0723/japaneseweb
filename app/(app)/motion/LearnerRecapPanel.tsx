import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCode2,
  Film,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import {
  requestDailyRecapVideoAction,
  requestWeeklyRecapVideoAction,
} from "@/lib/actions/recapMotion";
import type {
  LearnerRecapOverview,
  LearnerRecapStatus,
  LearnerRecapVideoSummary,
  LearnerRenderJobSummary,
} from "@/lib/motion/learnerRecapJobs";

export function LearnerRecapPanel({ overview }: { overview: LearnerRecapOverview }) {
  const latest = [overview.daily, overview.weekly].filter(
    (recap): recap is LearnerRecapVideoSummary => Boolean(recap),
  );

  return (
    <section className="space-y-4">
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="section-eyebrow">學習回顧影片</p>
            <h2 className="mt-2 text-xl font-semibold leading-tight">每日 / 每週回顧影片</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              學習證據已整理好，可交給 Remotion 與 HyperFrames 生成影片。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={requestDailyRecapVideoAction}>
              <button
                type="submit"
                disabled={!overview.schemaReady}
                className="btn-primary inline-flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Film className="h-4 w-4" aria-hidden="true" />
                每日
              </button>
            </form>
            <form action={requestWeeklyRecapVideoAction}>
              <button
                type="submit"
                disabled={!overview.schemaReady}
                className="btn-ghost inline-flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                每週
              </button>
            </form>
          </div>
        </div>

        {!overview.schemaReady ? (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>回顧影片資料表尚未就緒，先執行 recap_video_render_jobs 資料庫遷移。</p>
          </div>
        ) : null}
      </GlassPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4 md:grid-cols-2">
          <RecapSlot
            title="每日回顧"
            emptyDate={overview.todayDate}
            recap={overview.daily}
          />
          <RecapSlot
            title="每週回顧"
            emptyDate={overview.weekStart}
            recap={overview.weekly}
          />
        </div>

        <GlassPanel className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-eyebrow">影片任務</p>
              <h3 className="mt-2 text-sm font-semibold">排程記錄</h3>
            </div>
            <Sparkles className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
          </div>

          <div className="mt-4 space-y-3">
            {overview.renderJobs.length ? (
              overview.renderJobs.map((job) => <RenderJobRow key={job.id} job={job} />)
            ) : (
              <p className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-xs leading-5 text-[var(--text-muted)]">
                尚未排程任何回顧影片任務。
              </p>
            )}
          </div>
        </GlassPanel>
      </div>

      {overview.errors.length ? (
        <p className="text-xs leading-5 text-red-300">
          {overview.errors[0]}
        </p>
      ) : null}

      {latest.length ? (
        <GlassPanel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-eyebrow">影片記憶</p>
              <h3 className="mt-2 text-sm font-semibold">最新回顧證據</h3>
            </div>
            <span className="chip chip-active">{latest.length} 份就緒</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {latest.map((recap) => (
              <div key={recap.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <p className="text-sm font-semibold">{recap.title}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <MiniMetric label="層級" value={recap.payload.metrics.completedLayers} />
                  <MiniMetric label="輸出" value={recap.payload.metrics.journalSentences} />
                  <MiniMetric label="修復" value={recap.payload.metrics.weaknessEvents} />
                </div>
                <div className="mt-3 space-y-2">
                  {recap.payload.highlights.slice(0, 2).map((highlight) => (
                    <p key={highlight} className="text-xs leading-5 text-[var(--text-muted)]">
                      {highlight}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      ) : null}
    </section>
  );
}

function RecapSlot({
  title,
  emptyDate,
  recap,
}: {
  title: string;
  emptyDate: string;
  recap: LearnerRecapVideoSummary | null;
}) {
  return (
    <GlassPanel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-eyebrow">{title}</p>
          <h3 className="mt-2 truncate text-base font-semibold">
            {recap?.title ?? emptyDate}
          </h3>
        </div>
        {recap ? <StatusChip status={recap.status} /> : <span className="chip">等待中</span>}
      </div>

      {recap ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <MiniMetric label="活躍" value={recap.payload.metrics.activeDays} />
            <MiniMetric label="卡片" value={recap.payload.metrics.newCards} />
            <MiniMetric label="能力" value={recap.payload.metrics.skillAverage ?? "-"} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={recap.outputs.handoffUrl}
              className="glass-panel-subtle inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-white/[0.09]"
            >
              <FileCode2 className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
              交接檔
            </a>
            <span className="chip">{recap.manifest.durationSeconds}s</span>
            <span className="chip">{recap.manifest.engineTargets.join(" / ")}</span>
          </div>
        </>
      ) : (
        <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
          排程這份回顧，建立可重用的影片清單。
        </p>
      )}
    </GlassPanel>
  );
}

function RenderJobRow({ job }: { job: LearnerRenderJobSummary }) {
  return (
    <a
      href={job.outputs.handoffUrl}
      className="glass-panel-subtle flex items-center justify-between gap-3 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.09]"
    >
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold">
          {jobTypeLabel(job.jobType)}
        </span>
        <span className="mt-1 block truncate text-[11px] text-[var(--text-muted)]">
          {job.engine} / {formatDate(job.renderRequestedAt ?? job.createdAt)}
        </span>
      </span>
      <StatusIcon status={job.status} />
    </a>
  );
}

function StatusChip({ status }: { status: LearnerRecapStatus }) {
  return (
    <span className="chip chip-active inline-flex items-center gap-1.5">
      <StatusIcon status={status} />
      {statusLabel(status)}
    </span>
  );
}

function StatusIcon({ status }: { status: LearnerRecapStatus }) {
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent-lime)]" aria-hidden="true" />;
  if (status === "failed" || status === "cancelled") return <AlertTriangle className="h-3.5 w-3.5 text-red-300" aria-hidden="true" />;
  if (status === "rendering") return <RotateCcw className="h-3.5 w-3.5 text-[var(--accent-sky)]" aria-hidden="true" />;
  return <Clock3 className="h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden="true" />;
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/10 px-2 py-2">
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="mt-1 text-[10px] uppercase text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

function statusLabel(status: LearnerRecapStatus) {
  if (status === "completed") return "完成";
  if (status === "rendering") return "生成中";
  if (status === "failed") return "失敗";
  if (status === "cancelled") return "已取消";
  return "已排程";
}

function jobTypeLabel(jobType: string) {
  if (jobType === "daily_recap") return "每日回顧";
  if (jobType === "weekly_recap") return "每週回顧";
  return jobType.replaceAll("_", " ");
}

function formatDate(value: string) {
  return value.slice(0, 10);
}
