"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

function scopedNodes(root: HTMLElement, selector: string, limit = 48) {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).slice(0, limit);
}

export function DailyFeedMotionStage({ children }: { children: ReactNode }) {
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const root = scopeRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add({ reduceMotion: "(prefers-reduced-motion: reduce)" }, (context) => {
        const reduceMotion = Boolean(context.conditions?.reduceMotion);
        const hero = scopedNodes(root, "[data-feed-hero]", 1);
        const heroCopy = scopedNodes(root, "[data-feed-hero-copy]", 4);
        const metrics = scopedNodes(root, "[data-feed-metric]", 20);
        const pulse = scopedNodes(root, "[data-feed-pulse]", 1);
        const panels = scopedNodes(root, "[data-feed-panel]", 14);
        const cards = scopedNodes(root, "[data-feed-card]", 28);
        const actions = scopedNodes(root, "[data-feed-action]", 16);
        const allTargets = [
          ...hero,
          ...heroCopy,
          ...metrics,
          ...pulse,
          ...panels,
          ...cards,
          ...actions,
        ];

        if (reduceMotion) {
          gsap.set(allTargets, {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            clearProps: "transform,opacity,visibility,willChange",
          });
          return;
        }

        gsap.set(allTargets, { willChange: "transform, opacity" });

        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
          onComplete: () => {
            gsap.set(allTargets, {
              clearProps: "transform,opacity,visibility,willChange",
            });
          },
        });

        tl.from(
          hero,
          {
            autoAlpha: 0,
            y: 22,
            scale: 0.986,
            duration: 0.58,
          },
          0,
        )
          .from(
            heroCopy,
            {
              autoAlpha: 0,
              y: 16,
              duration: 0.46,
              stagger: { each: 0.055, from: "start" },
            },
            0.08,
          )
          .from(
            metrics,
            {
              autoAlpha: 0,
              y: 10,
              scale: 0.955,
              duration: 0.34,
              stagger: { each: 0.035, from: "start" },
            },
            0.18,
          )
          .from(
            pulse,
            {
              autoAlpha: 0,
              x: 18,
              scale: 0.98,
              duration: 0.52,
            },
            0.2,
          )
          .from(
            panels,
            {
              autoAlpha: 0,
              y: 18,
              scale: 0.992,
              duration: 0.46,
              stagger: { each: 0.055, from: "start" },
            },
            0.34,
          )
          .from(
            cards,
            {
              autoAlpha: 0,
              y: 12,
              scale: 0.994,
              duration: 0.34,
              stagger: { each: 0.026, from: "start" },
            },
            0.44,
          )
          .from(
            actions,
            {
              autoAlpha: 0,
              y: 8,
              scale: 0.97,
              duration: 0.28,
              stagger: { each: 0.025, from: "start" },
            },
            0.5,
          );

        return () => tl.kill();
      });

      return () => mm.revert();
    },
    { scope: scopeRef },
  );

  return (
    <div ref={scopeRef} data-feed-motion-stage className="space-y-6">
      {children}
    </div>
  );
}
