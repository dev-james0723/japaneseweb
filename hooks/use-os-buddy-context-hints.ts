"use client";

import { useEffect } from "react";
import { hintForPathname } from "@/lib/os-buddy/os-buddy-context-hints";
import { useOSBuddyActions, useOSBuddyStore } from "@/lib/os-buddy/os-buddy-store";

const IDLE_HINT_DELAY_MS = 45000;
const PAUSE_AFTER_HINT_MS = 120000;
const RECENT_BUBBLE_GAP_MS = 20000;

export function useOSBuddyContextHints(pathname: string) {
  const actions = useOSBuddyActions();
  const blocked = useOSBuddyStore((state) =>
    !state.enabled ||
    !state.visible ||
    Boolean(state.bubble) ||
    state.menu.open ||
    state.pickerOpen ||
    Boolean(state.activeGame),
  );
  const lastBubbleAt = useOSBuddyStore((state) => state.lastBubbleAt);

  useEffect(() => {
    const message = hintForPathname(pathname);
    if (!message || blocked) return;
    let pauseTimer: number | null = null;
    const timer = window.setTimeout(() => {
      if (Date.now() - lastBubbleAt < RECENT_BUBBLE_GAP_MS) return;
      actions.showBubble({ message, kind: "context", durationMs: 4200 });
      pauseTimer = window.setTimeout(() => {}, PAUSE_AFTER_HINT_MS);
    }, IDLE_HINT_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      if (pauseTimer) window.clearTimeout(pauseTimer);
    };
  }, [actions, blocked, lastBubbleAt, pathname]);
}

