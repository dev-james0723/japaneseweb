"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";
import { clampOSBuddyPosition, randomFreeRoamTarget } from "@/lib/os-buddy/os-buddy-free-roam";
import { OS_BUDDY_FREE_ROAM_CONFIG } from "@/lib/os-buddy/os-buddy-free-roam-config";
import { isOSBuddyShortcutIgnoredTarget } from "@/lib/os-buddy/os-buddy-shortcuts";
import { nextTapCount, type OSBuddyTap } from "@/lib/os-buddy/os-buddy-tap-resolver";
import { getOSBuddyBirthdayStatus } from "@/lib/os-buddy/os-buddy-birthday";
import { useOSBuddy } from "@/hooks/use-os-buddy";
import { useOSBuddyCompanion } from "@/hooks/use-os-buddy-companion";
import { useOSBuddyContextHints } from "@/hooks/use-os-buddy-context-hints";
import { useOSBuddyTimeMood } from "@/hooks/use-os-buddy-time-mood";
import { useUserIdleForOSBuddy } from "@/hooks/use-user-idle-for-os-buddy";
import { useOSBuddyActions, useOSBuddyStore } from "@/lib/os-buddy/os-buddy-store";
import type { OSBuddyPosition } from "@/lib/os-buddy/os-buddy-types";
import { OSBuddyBubble } from "./OSBuddyBubble";
import { OSBuddyFocusBadge } from "./OSBuddyFocusBadge";
import { OSBuddyGameOverlayHost } from "./games/OSBuddyGameOverlayHost";
import { OSBuddyMenu } from "./OSBuddyMenu";
import { OSBuddyPetPicker } from "./OSBuddyPetPicker";
import { OSBuddySprite } from "./OSBuddySprite";

const EDGE_GAP = 12;
const DRAG_THRESHOLD = 6;
const LONG_PRESS_MS = 600;
const TAP_GRACE_MS = 360;

export function OSBuddyDock() {
  useOSBuddy();
  const pathname = usePathname();
  const requestLine = useOSBuddyCompanion();
  const actions = useOSBuddyActions();
  const state = useOSBuddyStore((snapshot) => snapshot);
  const [viewport, setViewport] = useState({ width: 1024, height: 768, mobile: false });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    dragging: boolean;
  } | null>(null);
  const longPressRef = useRef<number | null>(null);
  const tapsRef = useRef<OSBuddyTap[]>([]);
  const tapTimerRef = useRef<number | null>(null);
  const clickTimesRef = useRef<number[]>([]);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const birthdayEmittedRef = useRef<Set<string>>(new Set());

  useOSBuddyContextHints(pathname);
  useOSBuddyTimeMood();
  useUserIdleForOSBuddy();

  const spriteSize = (viewport.mobile ? 58 : 74) * state.scale;
  const basePosition = useMemo(() => {
    const x = state.position.x ?? viewport.width - spriteSize - 24;
    const y = state.position.y ?? viewport.height - spriteSize - 24;
    return clampToViewport({ x, y, anchor: state.position.x == null ? "bottom-right" : "custom" }, spriteSize, viewport);
  }, [spriteSize, state.position, viewport]);

  useEffect(() => {
    function onResize() {
      setViewport({ width: window.innerWidth, height: window.innerHeight, mobile: window.innerWidth < 768 });
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    actions.closeTransient();
  }, [actions, pathname]);

  useEffect(() => {
    const status = getOSBuddyBirthdayStatus({
      enabled: state.birthdayEnabled,
      month: state.birthdayMonth,
      day: state.birthdayDay,
      year: state.birthdayYear,
      showAge: state.birthdayShowAge,
      reminderEnabled: state.birthdayReminderEnabled,
      timezone: state.birthdayTimezone,
      lastCelebratedOn: state.birthdayLastCelebratedOn,
      lastReminderOn: state.birthdayLastReminderOn,
    });
    const birthdayKey = status ? `${status.type}:${status.dateKey}` : null;
    if (!status || (birthdayKey && birthdayEmittedRef.current.has(birthdayKey))) return;
    if (birthdayKey) birthdayEmittedRef.current.add(birthdayKey);
    if (status.type === "today" && state.birthdayLastCelebratedOn !== status.dateKey) {
      emitOSBuddyEvent({ type: "birthday:today", age: status.age });
    } else if (status.type === "upcoming" && state.birthdayLastReminderOn !== status.dateKey) {
      emitOSBuddyEvent({ type: "birthday:upcoming", daysUntil: status.daysUntil, age: status.age });
    }
  }, [
    state.birthdayDay,
    state.birthdayEnabled,
    state.birthdayLastCelebratedOn,
    state.birthdayLastReminderOn,
    state.birthdayMonth,
    state.birthdayReminderEnabled,
    state.birthdayShowAge,
    state.birthdayTimezone,
    state.birthdayYear,
  ]);

  useEffect(() => {
    if (!state.walking) return;
    function onPointerMove(event: PointerEvent) {
      actions.setPosition(clampOSBuddyPosition({ x: event.clientX - spriteSize / 2, y: event.clientY - spriteSize / 2, anchor: "custom" }, spriteSize));
    }
    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  });

  useEffect(() => {
    if (
      !state.freeRoamEnabled ||
      state.menu.open ||
      state.activeGame ||
      state.bubble ||
      state.mood !== "idle" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const config = OS_BUDDY_FREE_ROAM_CONFIG[state.freeRoamIntensity];
    const home = currentPosition();
    const timer = window.setTimeout(() => {
      emitOSBuddyEvent({ type: "buddy:free-roam:start" });
      actions.setPosition(randomFreeRoamTarget(home, state.freeRoamIntensity));
      const sessionMs = config.sessionMinMs + Math.random() * (config.sessionMaxMs - config.sessionMinMs);
      window.setTimeout(() => {
        if (state.freeRoamReturnHome) actions.setPosition(home);
        emitOSBuddyEvent({ type: "buddy:free-roam:end", reason: "session-complete" });
      }, sessionMs);
    }, config.idleDelayMs);
    return () => window.clearTimeout(timer);
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!state.enabled || !state.visible || isOSBuddyShortcutIgnoredTarget(event.target)) return;
      if (event.key === "+" || event.key === "=") {
        actions.setScale(state.scale + 0.16);
      } else if (event.key === "-" || event.key === "_") {
        actions.setScale(state.scale - 0.16);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, state.enabled, state.scale, state.visible]);

  if (!state.enabled || !state.visible) {
    return (
      <>
        <OSBuddyMenu />
        <OSBuddyPetPicker />
        <OSBuddyGameOverlayHost />
      </>
    );
  }

  function currentPosition(): OSBuddyPosition {
    return basePosition;
  }

  function clearLongPress() {
    if (longPressRef.current) window.clearTimeout(longPressRef.current);
    longPressRef.current = null;
  }

  async function triggerClick() {
    emitOSBuddyEvent({ type: "buddy:clicked" });
    actions.incrementInteraction("clicks");
    const now = Date.now();
    clickTimesRef.current = [...clickTimesRef.current.filter((time) => now - time <= 5000), now];
    if (clickTimesRef.current.length >= 7) {
      clickTimesRef.current = [];
      actions.activateSecretMode();
      actions.showBubble({ message: "隱藏像素模式解鎖。", kind: "success", durationMs: 5200 });
      return;
    }
    const line = await requestLine(pathname);
    actions.showBubble({
      message: line.message,
      kind: "user-triggered",
      companionKind: line.kind,
      cta: line.cta ?? null,
      durationMs: line.cta ? 6200 : 4200,
    });
  }

  function resolveTap(tap: OSBuddyTap) {
    tapsRef.current = nextTapCount(tapsRef.current, tap);
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    tapTimerRef.current = window.setTimeout(() => {
      const count = tapsRef.current.length;
      tapsRef.current = [];
      if (count <= 1) {
        void triggerClick();
      } else if (count === 2) {
        const next = !state.walking;
        actions.setWalking(next);
        emitOSBuddyEvent(next ? { type: "buddy:walk:start" } : { type: "buddy:walk:end" });
        actions.showBubble({ message: next ? "行走模式開咗。移動滑鼠帶我散步。" : "返到原位，繼續開機。", kind: "system" });
      } else if (count === 3) {
        actions.setActiveGame("play-ball");
      } else {
        actions.showBubble({ message: "AirPilot 之後再開。先完成今日一層。", kind: "system" });
      }
    }, TAP_GRACE_MS);
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    clearLongPress();
    const pos = currentPosition();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pos.x ?? 0,
      originY: pos.y ?? 0,
      dragging: false,
    };
    longPressRef.current = window.setTimeout(() => {
      emitOSBuddyEvent({ type: "buddy:longpress" });
      actions.openMenu(event.clientX, event.clientY);
      dragRef.current = null;
    }, LONG_PRESS_MS);
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      drag.dragging = true;
      clearLongPress();
      emitOSBuddyEvent({ type: "buddy:drag:start" });
    }
    if (drag.dragging) {
      actions.setMood(dx < 0 ? "dragging-left" : "dragging-right");
      actions.setPosition(clampToViewport({ x: drag.originX + dx, y: drag.originY + dy, anchor: "custom" }, spriteSize, viewport));
    }
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    clearLongPress();
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.dragging) {
      actions.setMood("idle");
      actions.incrementInteraction("drags");
      emitOSBuddyEvent({ type: "buddy:drag:end" });
      return;
    }
    resolveTap({ x: event.clientX, y: event.clientY, at: Date.now() });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void triggerClick();
    } else if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      const amount = event.shiftKey ? 48 : 16;
      actions.moveBy(
        event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0,
        event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0,
      );
    } else if (event.key.toLowerCase() === "m") {
      event.preventDefault();
      actions.openMenu(basePosition.x ?? 0, basePosition.y ?? 0);
    } else if (event.key === "Escape") {
      actions.closeTransient();
    }
  }

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2) {
      pinchRef.current = { distance: touchDistance(event.touches), scale: state.scale };
    }
  }

  function onTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2 || !pinchRef.current) return;
    const next = pinchRef.current.scale * (touchDistance(event.touches) / pinchRef.current.distance);
    actions.setScale(next);
  }

  return (
    <>
      <div
        className={`os-buddy-dock fixed z-[70] ${state.freeRoamEnabled ? "os-buddy-dock--free-roaming" : ""}`}
        style={{ left: basePosition.x ?? 0, top: basePosition.y ?? 0, width: spriteSize, height: spriteSize }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        {state.bubble ? (
          <OSBuddyBubble
            bubble={state.bubble}
            dockX={basePosition.x ?? 0}
            onClose={actions.closeBubble}
            onCta={() => {
              if (state.bubble?.cta) actions.setActiveGame(state.bubble.cta.game);
            }}
          />
        ) : null}
        <OSBuddyFocusBadge label={state.focusBadge} />
        <button
          type="button"
          className="relative grid h-full w-full place-items-center rounded-2xl"
          aria-label={`${state.name} OS Buddy`}
          aria-haspopup="menu"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            clearLongPress();
            dragRef.current = null;
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            actions.openMenu(event.clientX, event.clientY);
          }}
          onKeyDown={onKeyDown}
        >
          <OSBuddySprite
            petId={state.petId}
            mood={state.mood}
            name={state.name}
            birthday={state.birthdayEnabled}
            secret={state.secretMode}
            size={viewport.mobile ? 58 : 74}
          />
        </button>
      </div>
      <OSBuddyMenu />
      <OSBuddyPetPicker />
      <OSBuddyGameOverlayHost />
    </>
  );
}

function clampToViewport(position: OSBuddyPosition, size: number, viewport: { width: number; height: number }): OSBuddyPosition {
  if (position.x == null || position.y == null) return position;
  return {
    x: Math.min(Math.max(position.x, EDGE_GAP), viewport.width - size - EDGE_GAP),
    y: Math.min(Math.max(position.y, EDGE_GAP), viewport.height - size - EDGE_GAP),
    anchor: "custom",
  };
}

function touchDistance(touches: { [index: number]: { clientX: number; clientY: number } | undefined }) {
  const [a, b] = [touches[0], touches[1]];
  if (!a || !b) return 1;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
