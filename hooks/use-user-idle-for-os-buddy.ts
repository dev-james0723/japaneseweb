"use client";

import { useEffect, useRef } from "react";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";

export function useUserIdleForOSBuddy(idleMs = 180000) {
  const idleRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function markActive() {
      if (idleRef.current) {
        idleRef.current = false;
        emitOSBuddyEvent({ type: "user:return" });
      }
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        idleRef.current = true;
        emitOSBuddyEvent({ type: "user:idle" });
      }, idleMs);
    }

    const events = ["pointerdown", "pointermove", "keydown", "scroll", "visibilitychange"] as const;
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }));
    markActive();
    return () => {
      events.forEach((event) => window.removeEventListener(event, markActive));
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [idleMs]);
}

