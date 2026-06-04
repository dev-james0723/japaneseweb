"use client";

import { useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clapperboard,
  Download,
  FileCode2,
  Film,
  Image as ImageIcon,
  type LucideIcon,
  Sparkles,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CulturalMotionPreview } from "@/components/CulturalMotionPreview";
import { GlassPanel } from "@/components/GlassPanel";
import type { CulturalArticleRecapProps } from "@/lib/motion/culturalArticleRecapConfig";
import type {
  CulturalArticleMotionJob,
  CulturalArticleMotionJobStatus,
} from "@/lib/motion/culturalArticleMotionJobs";
import {
  culturalMotionAssets,
  culturalMotionPipelineStatus,
  type CulturalMotionIcon,
} from "@/lib/motion/culturalMotionAssets";

gsap.registerPlugin(useGSAP);

const artifactIcons: Record<CulturalMotionIcon, LucideIcon> = {
  film: Film,
  clapperboard: Clapperboard,
  image: ImageIcon,
  code: FileCode2,
};

const remotionProps = {
  titleJa: "日本文化沉浸",
  titleZh: "一篇文章，幾個可帶走的日文觀察。",
  summaryZh: "讀一段文化故事，把漢字、假名、語感與香港視角連起來。",
  vocab: ["文化", "語感", "季節", "記憶"],
};

export function MotionLabShowcase({
  latest,
}: {
  latest?: {
    articleId: string;
    titleZh: string;
    props: CulturalArticleRecapProps;
    job: CulturalArticleMotionJob;
  } | null;
}) {
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const activeProps = latest?.props ?? remotionProps;
  const activeArtifacts = latest
    ? articleMotionArtifacts(latest.articleId, latest.job)
    : culturalMotionAssets.map((asset) => ({
        id: asset.id,
        title: asset.title,
        meta: asset.meta,
        href: asset.href,
        icon: asset.icon,
      }));
  const renderPreviews = latest ? articleRenderPreviews(latest.job) : [];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { reduceMotion: "(prefers-reduced-motion: reduce)" },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion);
          gsap.set(".motion-lab-item, .motion-lab-rail, .motion-lab-bar", {
            autoAlpha: 1,
          });
          gsap.set(".motion-lab-rail-fill", { scaleX: 1, transformOrigin: "left center" });

          if (reduceMotion) return;

          const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
          tl.from(".motion-lab-item", {
            autoAlpha: 0,
            y: 18,
            scale: 0.985,
            duration: 0.5,
            stagger: { each: 0.08, from: "start" },
          })
            .fromTo(
              ".motion-lab-rail-fill",
              { scaleX: 0, transformOrigin: "left center" },
              { scaleX: 1, duration: 0.72 },
              0.12,
            )
            .from(
              ".motion-lab-bar",
              {
                autoAlpha: 0,
                scaleY: 0.25,
                transformOrigin: "bottom center",
                duration: 0.42,
                stagger: { each: 0.045, from: "center" },
              },
              0.22,
            )
            .to(
              ".motion-lab-bar",
              {
                scaleY: (index) => [0.72, 1.08, 0.86, 1.18, 0.78, 1.02][index] ?? 1,
                duration: 0.64,
                repeat: 2,
                yoyo: true,
                stagger: { each: 0.04, from: "center" },
                ease: "sine.inOut",
              },
              0.72,
            );

          return () => tl.kill();
        },
      );

      return () => mm.revert();
    },
    { scope: scopeRef },
  );

  return (
    <div ref={scopeRef} className="space-y-5">
      <section className="motion-lab-item grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_360px]">
        <GlassPanel className="overflow-hidden p-3">
          <CulturalMotionPreview {...activeProps} />
        </GlassPanel>

        <GlassPanel className="relative min-h-[260px] overflow-hidden p-5">
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p className="section-eyebrow">Motion Lab</p>
              <h1 className="mt-3 text-2xl font-semibold leading-tight md:text-3xl">
                {latest?.titleZh ?? "文化課素材生成台"}
              </h1>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[var(--accent-lime)]">
              <Clapperboard className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <div className="motion-lab-rail relative z-10 mt-7 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="motion-lab-rail-fill h-full bg-gradient-to-r from-[var(--accent-lime)] via-[var(--accent-sky)] to-[var(--accent-sakura)]" />
          </div>

          <div className="relative z-10 mt-6 grid grid-cols-6 items-end gap-2" aria-hidden="true">
            {[46, 78, 54, 92, 62, 84].map((height, index) => (
              <div
                key={`${height}-${index}`}
                className="motion-lab-bar rounded-t-sm bg-white/15 will-change-transform"
                style={{ height }}
              />
            ))}
          </div>

          <div className="relative z-10 mt-6 flex flex-wrap gap-2">
            <span className="chip chip-active">Remotion</span>
            <span className="chip">GSAP</span>
            <span className="chip">Hyperframes</span>
            {latest ? <StatusChip status={latest.job.status} /> : null}
          </div>
        </GlassPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)]">
        <div className="grid gap-4 lg:grid-cols-2">
          {renderPreviews.length > 0 ? (
            renderPreviews.map((preview) => (
              <RenderPreview
                key={preview.id}
                title={preview.title}
                subtitle={preview.subtitle}
                src={preview.src}
                poster={preview.poster}
              />
            ))
          ) : (
            <GlassPanel className="motion-lab-item p-5">
              <p className="text-sm font-semibold">
                {latest ? "MP4 render queued" : "未有文章影片 job"}
              </p>
              <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                {latest
                  ? latest.job.outputs.message
                  : "生成文化文章後，這裡會顯示該文章的 motion manifest。"}
              </p>
              {latest ? (
                <a
                  href={latest.job.outputs.handoffUrl}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--accent-lime)]/35 hover:text-white"
                >
                  <FileCode2 className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
                  Render handoff
                </a>
              ) : null}
            </GlassPanel>
          )}
        </div>

        <div className="grid gap-3">
          {activeArtifacts.map((artifact) => {
            const Icon = artifactIcons[artifact.icon];
            return (
              <a
                key={artifact.id}
                href={artifact.href}
                className="motion-lab-item glass-panel-subtle group flex items-center justify-between gap-4 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.09]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/10 text-[var(--accent-lime)] transition-transform duration-300 group-hover:scale-105">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{artifact.title}</span>
                    <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">{artifact.meta}</span>
                  </span>
                </span>
                <Download className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent-lime)]" aria-hidden="true" />
              </a>
            );
          })}
        </div>
      </section>

      <GlassPanel className="motion-lab-item p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Pipeline status</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {culturalMotionPipelineStatus.map((status) => (
              <span key={status} className="chip chip-active">
                {status}
              </span>
            ))}
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="motion-lab-item p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="section-eyebrow">Manifest</p>
            <h2 className="mt-2 text-sm font-semibold">/api/motion/assets</h2>
          </div>
          <a
            href="/api/motion/assets"
            className="glass-panel-subtle inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.09]"
          >
            <FileCode2 className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            JSON
          </a>
        </div>
      </GlassPanel>
    </div>
  );
}

function StatusChip({ status }: { status: CulturalArticleMotionJobStatus }) {
  const Icon =
    status === "completed" ? CheckCircle2 : status === "failed" ? AlertTriangle : Clapperboard;
  const label =
    status === "completed"
      ? "Completed"
      : status === "rendering"
        ? "Rendering"
        : status === "failed"
          ? "Failed"
          : "Queued";
  return (
    <span className="chip chip-active inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function articleRenderPreviews(job: CulturalArticleMotionJob) {
  const files = job.outputs.files;
  if (!files?.remotionMp4 && !files?.hyperframesMp4) return [];
  return [
    ...(files.remotionMp4
      ? [{
          id: "remotion-preview",
          title: "Remotion render",
          subtitle: "Article-specific MP4",
          src: files.remotionMp4,
          poster: files.remotionStill ?? "",
        }]
      : []),
    ...(files.hyperframesMp4
      ? [{
          id: "hyperframes-preview",
          title: "Hyperframes render",
          subtitle: "Article-specific GSAP render",
          src: files.hyperframesMp4,
          poster: files.hyperframesStill ?? "",
        }]
      : []),
  ];
}

function articleMotionArtifacts(articleId: string, job: CulturalArticleMotionJob) {
  const files = job.outputs.files;
  return [
    ...(files?.remotionMp4
      ? [{
          id: "remotion-mp4",
          title: "Remotion MP4",
          meta: "Article-specific render",
          href: files.remotionMp4,
          icon: "film" as const,
        }]
      : []),
    ...(files?.hyperframesMp4
      ? [{
          id: "hyperframes-mp4",
          title: "Hyperframes MP4",
          meta: "Article-specific render",
          href: files.hyperframesMp4,
          icon: "clapperboard" as const,
        }]
      : []),
    {
      id: "handoff",
      title: "Render handoff",
      meta: "Manifest + commands",
      href: job.outputs.handoffUrl || `/api/motion/cultural-article/${articleId}/handoff`,
      icon: "code" as const,
    },
  ];
}

function RenderPreview({
  title,
  subtitle,
  src,
  poster,
}: {
  title: string;
  subtitle: string;
  src: string;
  poster: string;
}) {
  return (
    <GlassPanel className="motion-lab-item overflow-hidden p-0">
      <video
        className="aspect-video w-full bg-black"
        controls
        preload="metadata"
        poster={poster}
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className="border-t border-white/10 p-4">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p>
      </div>
    </GlassPanel>
  );
}
