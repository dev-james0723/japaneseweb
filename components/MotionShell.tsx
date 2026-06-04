"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function MotionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      if (shouldReduceMotion || !scopeRef.current) return;
      const targets = Array.from(
        scopeRef.current.querySelectorAll<HTMLElement>(
          ".motion-stagger, .glass-panel, .glass-panel-subtle",
        ),
      ).slice(0, 36);

      gsap.from(targets, {
        autoAlpha: 0,
        y: 12,
        scale: 0.992,
        duration: 0.42,
        ease: "power2.out",
        stagger: { each: 0.035, from: "start" },
        clearProps: "transform,opacity,visibility",
      });
    },
    { dependencies: [pathname, shouldReduceMotion], scope: scopeRef },
  );

  return (
    <motion.div
      key={pathname}
      ref={scopeRef}
      className="motion-page"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}
