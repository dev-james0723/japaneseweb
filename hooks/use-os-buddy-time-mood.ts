"use client";

import { useEffect } from "react";
import { useOSBuddyActions, useOSBuddyStore } from "@/lib/os-buddy/os-buddy-store";

const STORAGE_KEY = "japaneseweb:os-buddy:last-time-line";
const FIRST_DELAY_MS = 90000;
const INTERVAL_MS = 300000;
const COOLDOWN_MS = 21600000;

export function useOSBuddyTimeMood() {
  const actions = useOSBuddyActions();
  const blocked = useOSBuddyStore((state) =>
    !state.enabled ||
    !state.visible ||
    Boolean(state.bubble) ||
    state.menu.open ||
    Boolean(state.activeGame) ||
    state.mood === "focused",
  );

  useEffect(() => {
    function tick() {
      if (blocked) return;
      const last = Number(window.localStorage.getItem(STORAGE_KEY) ?? "0");
      if (Date.now() - last < COOLDOWN_MS) return;
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 12) {
        actions.showBubble({ message: "今日用一句日文開機。", kind: "context" });
      } else if (hour >= 18 && hour < 23) {
        actions.showBubble({ message: "收尾一層，今日就完整。", kind: "context" });
      } else if (hour >= 23 || hour < 6) {
        actions.setMood("sleepy");
        actions.showBubble({ message: "夜深了，保底一張就好。", kind: "context" });
      } else {
        return;
      }
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }

    const first = window.setTimeout(tick, FIRST_DELAY_MS);
    const interval = window.setInterval(tick, INTERVAL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [actions, blocked]);
}

