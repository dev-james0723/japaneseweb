"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clapperboard,
  Download,
  FileCode2,
  Film,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  type LucideIcon,
  Sparkles,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CulturalMotionPreview } from "@/components/CulturalMotionPreview";
import { GlassPanel } from "@/components/GlassPanel";
import type { CulturalArticleRecapProps } from "@/lib/motion/culturalArticleRecapConfig";
import type {
  CulturalArticleMotionJobOutputs,
  CulturalArticleMotionJobStatus,
} from "@/lib/motion/culturalArticleMotionJobs";
import type { CulturalMotionIcon } from "@/lib/motion/culturalMotionAssets";

gsap.registerPlugin(useGSAP);

const artifactIcons: Record<CulturalMotionIcon, LucideIcon> = {
  film: Film,
  clapperboard: Clapperboard,
  image: ImageIcon,
  code: FileCode2,
};

type CulturalArticleMotionPanelProps = CulturalArticleRecapProps & {
  articleId: string;
  job?: {
    id: string;
    status: CulturalArticleMotionJobStatus;
    outputs: CulturalArticleMotionJobOutputs;
    errorMessage: string | null;
    renderRequestedAt: string | null;
    updatedAt: string;
  } | null;
};

export function CulturalArticleMotionPanel({
  articleId,
  job: initialJob,
  ...props
}: CulturalArticleMotionPanelProps) {
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const [job, setJob] = useState(initialJob ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { reduceMotion: "(prefers-reduced-motion: reduce)" },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion);
          gsap.set(".article-motion-item, .article-motion-meter, .article-motion-preview", {
            autoAlpha: 1,
          });
          gsap.set(".article-motion-rail-fill", {
            scaleX: 1,
            transformOrigin: "left center",
          });

          if (reduceMotion) return;

          const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
          tl.from(".article-motion-preview", {
            autoAlpha: 0,
            y: 18,
            scale: 0.985,
            duration: 0.48,
          })
            .fromTo(
              ".article-motion-rail-fill",
              { scaleX: 0, transformOrigin: "left center" },
              { scaleX: 1, duration: 0.58 },
              0.08,
            )
            .from(
              ".article-motion-meter",
              {
                autoAlpha: 0,
                scaleY: 0.2,
                transformOrigin: "bottom center",
                duration: 0.35,
                stagger: 0.04,
              },
              0.18,
            )
            .from(
              ".article-motion-item",
              {
                autoAlpha: 0,
                x: 14,
                duration: 0.36,
                stagger: 0.055,
              },
              0.28,
            )
            .to(
              ".article-motion-meter",
              {
                scaleY: (index) => [0.78, 1.12, 0.86, 1.22, 0.72][index] ?? 1,
                duration: 0.52,
                repeat: 2,
                yoyo: true,
                stagger: 0.035,
                ease: "sine.inOut",
              },
              0.76,
            );

          return () => tl.kill();
        },
      );

      return () => mm.revert();
    },
    { scope: scopeRef },
  );

  return (
    <div ref={scopeRef}>
      <GlassPanel className="overflow-hidden p-3">
        <div className="article-motion-preview">
          <CulturalMotionPreview {...props} />
        </div>

        <div className="mt-4 px-2 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-eyebrow">影片匯出</p>
              <h2 className="mt-2 text-sm font-semibold">文章影片素材包</h2>
            </div>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.045] text-[var(--accent-lime)]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="article-motion-rail-fill h-full bg-gradient-to-r from-[var(--accent-lime)] via-[var(--accent-sky)] to-[var(--accent-sakura)]" />
          </div>

          <div className="mt-4 grid h-12 grid-cols-5 items-end gap-1.5" aria-hidden="true">
            {[26, 38, 30, 44, 34].map((height, index) => (
              <div
                key={`${height}-${index}`}
                className="article-motion-meter rounded-t-sm bg-white/15 will-change-transform"
                style={{ height }}
              />
            ))}
          </div>

          <div className="article-motion-item mt-4 flex flex-wrap items-center gap-2">
            <StatusChip status={job?.status ?? null} />
            {job?.renderRequestedAt ? (
              <span className="text-[11px] text-[var(--text-muted)]">
                {new Date(job.renderRequestedAt).toLocaleString()}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-2">
            {articleMotionArtifacts(articleId, job?.outputs).map((artifact) => {
              const Icon = artifactIcons[artifact.icon];
              return (
                <a
                  key={artifact.id}
                  href={artifact.href}
                  className="article-motion-item glass-panel-subtle group flex items-center justify-between gap-3 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.09]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/10 text-[var(--accent-lime)] transition-transform duration-300 group-hover:scale-105">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">{artifact.shortTitle}</span>
                      <span className="mt-1 block truncate text-[11px] text-[var(--text-muted)]">
                        {artifact.meta}
                      </span>
                    </span>
                  </span>
                  <Download
                    className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent-lime)]"
                    aria-hidden="true"
                  />
                </a>
              );
            })}

            <button
              type="button"
              onClick={async () => {
                setPending(true);
                setError(null);
                try {
                  const res = await fetch(`/api/motion/cultural-article/${articleId}/render`, {
                    method: "POST",
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error ?? "影片生成請求失敗");
                  setJob({
                    id: json.job.id,
                    status: json.job.status,
                    outputs: json.job.outputs,
                    errorMessage: null,
                    renderRequestedAt: json.job.render_requested_at,
                    updatedAt: new Date().toISOString(),
                  });
                  router.refresh();
                } catch (requestError) {
                  setError(requestError instanceof Error ? requestError.message : "影片生成請求失敗");
                } finally {
                  setPending(false);
                }
              }}
              disabled={pending}
              className="article-motion-item glass-panel-subtle group flex items-center justify-center gap-2 p-3 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-lime)]" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
              )}
              {job ? "重新生成" : "排程影片"}
            </button>
            {error ? (
              <p className="article-motion-item text-xs leading-5 text-red-300">{error}</p>
            ) : null}
            {job?.errorMessage ? (
              <p className="article-motion-item text-xs leading-5 text-red-300">{job.errorMessage}</p>
            ) : null}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

function StatusChip({ status }: { status: CulturalArticleMotionJobStatus | null }) {
  const label =
    status === "completed"
      ? "已完成"
      : status === "rendering"
        ? "生成中"
        : status === "failed"
          ? "失敗"
          : status === "queued"
            ? "已排程"
            : "未排程";
  const Icon =
    status === "completed" ? CheckCircle2 : status === "failed" ? AlertTriangle : Clapperboard;
  return (
    <span className="chip chip-active inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function articleMotionArtifacts(
  articleId: string,
  outputs?: CulturalArticleMotionJobOutputs | null,
) {
  const files = outputs?.files;
  return [
    ...(files?.remotionMp4
      ? [{
          id: "remotion-mp4",
          shortTitle: "Remotion MP4",
          icon: "film" as const,
          href: files.remotionMp4,
          meta: "文章專屬 MP4",
        }]
      : []),
    ...(files?.remotionStill
      ? [{
          id: "remotion-still",
          shortTitle: "Remotion 靜態圖",
          icon: "image" as const,
          href: files.remotionStill,
          meta: "文章專屬封面",
        }]
      : []),
    ...(files?.hyperframesMp4
      ? [{
          id: "hyperframes-mp4",
          shortTitle: "HyperFrames MP4",
          icon: "clapperboard" as const,
          href: files.hyperframesMp4,
          meta: "文章專屬 GSAP 影片",
        }]
      : []),
    {
      id: "render-handoff",
      shortTitle: "生成交接檔",
      icon: "code" as const,
      href: outputs?.handoffUrl || `/api/motion/cultural-article/${articleId}/handoff`,
      meta: "清單與生成指令",
    },
  ];
}
