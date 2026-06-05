"use client";

import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Brain, MessageCircle, Sparkles } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const steps: { label: string; detail: string; icon: LucideIcon; color: string }[] = [
  { label: "輸入", detail: "読む", icon: BookOpen, color: "text-[var(--accent-lime)]" },
  { label: "採礦", detail: "拾う", icon: Sparkles, color: "text-[var(--accent-sky)]" },
  { label: "回想", detail: "使う", icon: Brain, color: "text-[var(--accent-sakura)]" },
];

const barHeights = [42, 68, 52, 82, 58, 74, 48, 64];

export function DailyFeedPulse({
  active,
  modeLabel,
}: {
  active: boolean;
  modeLabel: string;
}) {
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { reduceMotion: "(prefers-reduced-motion: reduce)" },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion);

          gsap.set(".feed-pulse-copy, .feed-pulse-node, .feed-pulse-bar", {
            autoAlpha: 1,
          });
          gsap.set(".feed-pulse-line", { scaleX: 1, transformOrigin: "left center" });

          if (reduceMotion) return;

          const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
          tl.from(".feed-pulse-copy", { autoAlpha: 0, y: 14, duration: 0.42 }, 0)
            .from(
              ".feed-pulse-node",
              {
                autoAlpha: 0,
                y: 16,
                scale: 0.96,
                duration: 0.46,
                stagger: { each: 0.08, from: "start" },
              },
              0.08,
            )
            .fromTo(
              ".feed-pulse-line",
              { scaleX: 0, transformOrigin: "left center" },
              { scaleX: 1, duration: 0.72 },
              0.18,
            )
            .from(
              ".feed-pulse-bar",
              {
                autoAlpha: 0,
                scaleY: 0.28,
                transformOrigin: "bottom center",
                duration: 0.38,
                stagger: { each: 0.045, from: "center" },
              },
              0.28,
            );

          if (active) {
            tl.to(
              ".feed-pulse-scan",
              {
                xPercent: 118,
                duration: 1.85,
                repeat: 2,
                yoyo: true,
                ease: "sine.inOut",
              },
              0.42,
            ).to(
              ".feed-pulse-bar",
              {
                scaleY: (index) => [0.66, 1.08, 0.82, 1.18, 0.74, 1.02, 0.88, 1.12][index] ?? 1,
                duration: 0.58,
                repeat: 3,
                yoyo: true,
                stagger: { each: 0.04, from: "center" },
                ease: "sine.inOut",
              },
              0.55,
            );
          }

          return () => tl.kill();
        },
      );

      return () => mm.revert();
    },
    { dependencies: [active, modeLabel], scope: scopeRef, revertOnUpdate: true },
  );

  return (
    <div
      ref={scopeRef}
      className="relative min-h-[230px] overflow-hidden rounded-xl border border-white/10 bg-black/15 p-4"
    >
      <div className="feed-pulse-copy relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="section-eyebrow">輸入訊號</p>
          <div className="mt-2 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[var(--accent-lime)]" aria-hidden="true" />
            <p className="text-lg font-semibold">{active ? "就緒" : "待命"}</p>
          </div>
        </div>
        <span className="chip chip-active">{modeLabel}</span>
      </div>

      <div className="relative z-10 mt-7">
        <div className="absolute left-7 right-7 top-8 h-px overflow-hidden bg-white/10">
          <div className="feed-pulse-line h-full bg-gradient-to-r from-[var(--accent-lime)] via-[var(--accent-sky)] to-[var(--accent-sakura)]" />
          <div className="feed-pulse-scan absolute -top-1 left-0 h-3 w-20 rounded-full bg-white/45" />
        </div>
        <div className="relative grid grid-cols-3 gap-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="feed-pulse-node will-change-transform">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-[#11100d] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Icon className={`h-5 w-5 ${step.color}`} aria-hidden="true" />
                </div>
                <div className="mt-3 text-center">
                  <p className="text-xs font-semibold">{step.label}</p>
                  <p className="mt-1 font-jp text-[11px] text-[var(--text-muted)]">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute inset-x-4 bottom-4 flex h-12 items-end gap-1.5" aria-hidden="true">
        {barHeights.map((height, index) => (
          <div
            key={`${height}-${index}`}
            className="feed-pulse-bar flex-1 rounded-t-sm bg-white/15 will-change-transform"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}
