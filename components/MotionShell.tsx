"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function MotionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const root = scopeRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add({ reduceMotion: "(prefers-reduced-motion: reduce)" }, (context) => {
        const reduceMotion = Boolean(context.conditions?.reduceMotion);
        const targets = Array.from(
          root.querySelectorAll<HTMLElement>(
            ".motion-stagger, .glass-panel, .glass-panel-subtle",
          ),
        )
          .filter((target) => !target.closest("[data-feed-motion-stage]"))
          .slice(0, 32);
        const allTargets = [root, ...targets];

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

        tl.fromTo(
          root,
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.34 },
          0,
        );

        if (targets.length) {
          tl.from(
            targets,
            {
              autoAlpha: 0,
              y: 16,
              scale: 0.992,
              duration: 0.48,
              stagger: { each: 0.035, from: "start" },
            },
            0.08,
          );
        }

        return () => tl.kill();
      });

      return () => mm.revert();
    },
    { dependencies: [pathname], scope: scopeRef, revertOnUpdate: true },
  );

  return (
    <div
      key={pathname}
      ref={scopeRef}
      className="motion-page"
    >
      {children}
    </div>
  );
}
