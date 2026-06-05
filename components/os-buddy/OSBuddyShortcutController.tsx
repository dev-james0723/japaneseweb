"use client";

import { useEffect, useRef } from "react";
import { useOSBuddy } from "@/hooks/use-os-buddy";
import {
  isOSBuddyShortcutIgnoredTarget,
  shortcutMatches,
} from "@/lib/os-buddy/os-buddy-shortcuts";
import { useOSBuddyActions, useOSBuddyStore } from "@/lib/os-buddy/os-buddy-store";

const DOUBLE_PRESS_MS = 500;
const TWO_FINGER_DOUBLE_TAP_MS = 350;
const TWO_FINGER_MOVE_MAX = 32;
const TWO_FINGER_CENTER_MAX = 72;

export function OSBuddyShortcutController() {
  useOSBuddy();
  const settings = useOSBuddyStore((state) => state.shortcutSettings);
  const enabled = useOSBuddyStore((state) => state.enabled);
  const actions = useOSBuddyActions();
  const keyPressRef = useRef<{ at: number; count: number }>({ at: 0, count: 0 });
  const touchRef = useRef<{ startAt: number; startCenter: { x: number; y: number } | null; lastTapAt: number; lastCenter: { x: number; y: number } | null }>({
    startAt: 0,
    startCenter: null,
    lastTapAt: 0,
    lastCenter: null,
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!enabled || isOSBuddyShortcutIgnoredTarget(event.target)) return;
      if (!shortcutMatches(event, settings.desktopToggle)) return;
      event.preventDefault();
      const now = Date.now();
      const nextCount = now - keyPressRef.current.at <= DOUBLE_PRESS_MS ? keyPressRef.current.count + 1 : 1;
      keyPressRef.current = { at: now, count: nextCount };
      if (nextCount >= settings.desktopToggle.pressCount) {
        keyPressRef.current = { at: 0, count: 0 };
        actions.toggleVisible();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, enabled, settings.desktopToggle]);

  useEffect(() => {
    if (!settings.twoFingerDoubleTapEnabled || !enabled) return;
    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 2 || isOSBuddyShortcutIgnoredTarget(event.target)) return;
      touchRef.current.startAt = Date.now();
      touchRef.current.startCenter = centerOfTouches(event.touches);
    }
    function onTouchEnd(event: TouchEvent) {
      const start = touchRef.current.startCenter;
      if (!start || Date.now() - touchRef.current.startAt > 260) return;
      const changed = event.changedTouches.length >= 1 ? centerOfTouches(event.changedTouches) : start;
      if (distance(start, changed) > TWO_FINGER_MOVE_MAX) return;
      const now = Date.now();
      if (
        touchRef.current.lastCenter &&
        now - touchRef.current.lastTapAt <= TWO_FINGER_DOUBLE_TAP_MS &&
        distance(changed, touchRef.current.lastCenter) <= TWO_FINGER_CENTER_MAX
      ) {
        actions.toggleVisible();
        touchRef.current.lastTapAt = 0;
        touchRef.current.lastCenter = null;
      } else {
        touchRef.current.lastTapAt = now;
        touchRef.current.lastCenter = changed;
      }
    }
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [actions, enabled, settings.twoFingerDoubleTapEnabled]);

  return null;
}

function centerOfTouches(touches: TouchList): { x: number; y: number } {
  const values = Array.from(touches);
  const sum = values.reduce((acc, touch) => ({ x: acc.x + touch.clientX, y: acc.y + touch.clientY }), { x: 0, y: 0 });
  return { x: sum.x / values.length, y: sum.y / values.length };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

