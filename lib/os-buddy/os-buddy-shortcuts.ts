import type { OSBuddyShortcut, OSBuddyShortcutSettings } from "./os-buddy-types";

export const DEFAULT_OS_BUDDY_SHORTCUT_SETTINGS: OSBuddyShortcutSettings = {
  desktopToggle: {
    key: " ",
    code: "Space",
    label: "Space",
    modifiers: { ctrl: false, alt: false, shift: false, meta: false },
    pressCount: 2,
  },
  twoFingerDoubleTapEnabled: true,
};

const DISALLOWED_BARE_CODES = new Set([
  "Escape",
  "Tab",
  "Enter",
  "Backspace",
  "Delete",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

const RESERVED_WITH_PRIMARY = new Set([
  "KeyD",
  "KeyF",
  "KeyL",
  "KeyN",
  "KeyP",
  "KeyQ",
  "KeyR",
  "KeyS",
  "KeyT",
  "KeyW",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Digit6",
  "Digit7",
  "Digit8",
  "Digit9",
  "Digit0",
]);

export function isOSBuddyShortcutIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, button, a, [role='button'], [role='menu'], [role='tab'], [role='dialog'], [contenteditable='true'], [data-os-buddy-shortcut-ignore]",
    ),
  );
}

export function shortcutFromKeyboardEvent(event: KeyboardEvent): OSBuddyShortcut {
  const hasModifier = event.ctrlKey || event.altKey || event.shiftKey || event.metaKey;
  return {
    key: event.key,
    code: event.code,
    label: labelForKey(event),
    modifiers: {
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey,
    },
    pressCount: hasModifier ? 1 : 2,
  };
}

export function isShortcutAllowed(shortcut: OSBuddyShortcut): boolean {
  const hasModifier =
    shortcut.modifiers.ctrl || shortcut.modifiers.alt || shortcut.modifiers.shift || shortcut.modifiers.meta;
  if (!hasModifier && DISALLOWED_BARE_CODES.has(shortcut.code)) return false;
  if ((shortcut.modifiers.ctrl || shortcut.modifiers.meta) && RESERVED_WITH_PRIMARY.has(shortcut.code)) return false;
  return true;
}

export function shortcutMatches(event: KeyboardEvent, shortcut: OSBuddyShortcut): boolean {
  return (
    event.code === shortcut.code &&
    event.ctrlKey === shortcut.modifiers.ctrl &&
    event.altKey === shortcut.modifiers.alt &&
    event.shiftKey === shortcut.modifiers.shift &&
    event.metaKey === shortcut.modifiers.meta
  );
}

export function formatShortcut(shortcut: OSBuddyShortcut): string {
  const parts = [
    shortcut.modifiers.meta ? "Cmd" : null,
    shortcut.modifiers.ctrl ? "Ctrl" : null,
    shortcut.modifiers.alt ? "Alt" : null,
    shortcut.modifiers.shift ? "Shift" : null,
    shortcut.label,
  ].filter(Boolean);
  return `${parts.join(" + ")}${shortcut.pressCount > 1 ? ` x${shortcut.pressCount}` : ""}`;
}

function labelForKey(event: KeyboardEvent) {
  if (event.code === "Space") return "Space";
  if (event.key.length === 1) return event.key.toUpperCase();
  return event.key;
}

