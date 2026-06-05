"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_OS_BUDDY_SHORTCUT_SETTINGS } from "./os-buddy-shortcuts";
import { addOSBuddyBadge, incrementOSBuddyStat } from "./os-buddy-stats";
import type {
  OSBuddyBadge,
  OSBuddyBubble,
  OSBuddyBubbleType,
  OSBuddyFreeRoamIntensity,
  OSBuddyInteractionStats,
  OSBuddyMenuState,
  OSBuddyMiniGame,
  OSBuddyMood,
  OSBuddyPetId,
  OSBuddyPosition,
  OSBuddyShortcutSettings,
} from "./os-buddy-types";

const STORAGE_KEY = "japaneseweb:os-buddy:v1";

export type OSBuddyState = {
  hydrated: boolean;
  enabled: boolean;
  visible: boolean;
  petId: OSBuddyPetId;
  name: string;
  position: OSBuddyPosition;
  scale: number;
  mood: OSBuddyMood;
  bubble: OSBuddyBubble | null;
  menu: OSBuddyMenuState;
  pickerOpen: boolean;
  activeGame: OSBuddyMiniGame | null;
  walking: boolean;
  freeRoamEnabled: boolean;
  freeRoamIntensity: OSBuddyFreeRoamIntensity;
  freeRoamReturnHome: boolean;
  freeRoamNearHomeOnly: boolean;
  shortcutSettings: OSBuddyShortcutSettings;
  onboardingCompleted: boolean;
  birthdayEnabled: boolean;
  birthdayMonth: number | null;
  birthdayDay: number | null;
  birthdayYear: number | null;
  birthdayShowAge: boolean;
  birthdayReminderEnabled: boolean;
  birthdayTimezone: string | null;
  birthdayLastCelebratedOn: string | null;
  birthdayLastReminderOn: string | null;
  stats: OSBuddyInteractionStats;
  focusBadge: string | null;
  secretMode: boolean;
  lastBubbleAt: number;
  mutationId: number;
};

export type OSBuddyProfilePayload = Partial<{
  os_buddy_pet_id: string | null;
  os_buddy_name: string | null;
  os_buddy_enabled: boolean | null;
  os_buddy_position: OSBuddyPosition | null;
  os_buddy_onboarding_completed: boolean | null;
  os_buddy_interaction_stats: OSBuddyInteractionStats | null;
  os_buddy_unlocked_pets: OSBuddyPetId[] | null;
  os_buddy_birthday_enabled: boolean | null;
  os_buddy_birthday_month: number | null;
  os_buddy_birthday_day: number | null;
  os_buddy_birthday_year: number | null;
  os_buddy_birthday_show_age: boolean | null;
  os_buddy_birthday_reminder_enabled: boolean | null;
  os_buddy_birthday_timezone: string | null;
  os_buddy_birthday_last_celebrated_on: string | null;
  os_buddy_birthday_last_reminder_on: string | null;
  os_buddy_free_roam_enabled: boolean | null;
  os_buddy_free_roam_intensity: OSBuddyFreeRoamIntensity | null;
  os_buddy_free_roam_return_home: boolean | null;
  os_buddy_free_roam_near_home_only: boolean | null;
  os_buddy_shortcut_settings: OSBuddyShortcutSettings | null;
}>;

const initialState: OSBuddyState = {
  hydrated: false,
  enabled: true,
  visible: true,
  petId: "xiaoba",
  name: "Koto",
  position: { x: null, y: null, anchor: "bottom-right" },
  scale: 1,
  mood: "idle",
  bubble: null,
  menu: { open: false, x: 0, y: 0 },
  pickerOpen: false,
  activeGame: null,
  walking: false,
  freeRoamEnabled: false,
  freeRoamIntensity: "balanced",
  freeRoamReturnHome: true,
  freeRoamNearHomeOnly: true,
  shortcutSettings: DEFAULT_OS_BUDDY_SHORTCUT_SETTINGS,
  onboardingCompleted: false,
  birthdayEnabled: false,
  birthdayMonth: null,
  birthdayDay: null,
  birthdayYear: null,
  birthdayShowAge: false,
  birthdayReminderEnabled: true,
  birthdayTimezone: null,
  birthdayLastCelebratedOn: null,
  birthdayLastReminderOn: null,
  stats: {},
  focusBadge: null,
  secretMode: false,
  lastBubbleAt: 0,
  mutationId: 0,
};

let state = initialState;
const listeners = new Set<() => void>();
let bubbleTimer: number | null = null;
let moodTimer: number | null = null;
let secretTimer: number | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function patchState(patch: Partial<OSBuddyState>, markDirty = true) {
  state = {
    ...state,
    ...patch,
    mutationId: markDirty ? state.mutationId + 1 : state.mutationId,
  };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOSBuddyState() {
  return state;
}

export function useOSBuddyStore<T>(selector: (state: OSBuddyState) => T): T {
  const snapshot = useSyncExternalStore(subscribe, getOSBuddyState, () => initialState);
  return selector(snapshot);
}

export const osBuddyActions = {
  hydrateFromStorage() {
    if (typeof window === "undefined" || state.hydrated) return;
    const parsed = readStoredState();
    patchState({ ...(parsed ?? {}), hydrated: true }, false);
  },
  applyProfile(profile: OSBuddyProfilePayload | null) {
    if (!profile) return;
    patchState(profileToState(profile), false);
  },
  setEnabled(enabled: boolean) {
    patchState({ enabled, visible: enabled ? state.visible : false });
  },
  setVisible(visible: boolean) {
    patchState({ visible });
  },
  toggleVisible() {
    patchState({ visible: !state.visible });
  },
  setPetId(petId: OSBuddyPetId) {
    patchState({ petId });
  },
  setName(name: string) {
    patchState({ name: name.slice(0, 24) || "Koto" });
  },
  setPosition(position: OSBuddyPosition) {
    patchState({ position });
  },
  resetPosition() {
    patchState({ position: { x: null, y: null, anchor: "bottom-right" }, scale: 1, walking: false });
  },
  moveBy(dx: number, dy: number) {
    const current = state.position;
    const fallback = defaultPixelPosition();
    patchState({
      position: {
        x: (current.x ?? fallback.x) + dx,
        y: (current.y ?? fallback.y) + dy,
        anchor: "custom",
      },
    });
  },
  setScale(scale: number) {
    patchState({ scale: Math.min(Math.max(scale, 1), 12) });
  },
  setMood(mood: OSBuddyMood, durationMs?: number) {
    if (moodTimer) window.clearTimeout(moodTimer);
    patchState({ mood });
    if (durationMs && typeof window !== "undefined") {
      moodTimer = window.setTimeout(() => {
        patchState({ mood: "idle" }, false);
        moodTimer = null;
      }, durationMs);
    }
  },
  showBubble(input: {
    message: string;
    kind?: OSBuddyBubbleType;
    durationMs?: number;
    companionKind?: OSBuddyBubble["companionKind"];
    cta?: OSBuddyBubble["cta"];
  }) {
    if (bubbleTimer) window.clearTimeout(bubbleTimer);
    const bubble: OSBuddyBubble = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message: input.message,
      kind: input.kind ?? "system",
      durationMs: input.durationMs ?? (input.cta ? 6200 : 3200),
      companionKind: input.companionKind,
      cta: input.cta ?? null,
      createdAt: Date.now(),
    };
    patchState({ bubble, lastBubbleAt: Date.now() });
    if (typeof window !== "undefined") {
      bubbleTimer = window.setTimeout(() => {
        if (state.bubble?.id === bubble.id) patchState({ bubble: null }, false);
        bubbleTimer = null;
      }, bubble.durationMs);
    }
  },
  closeBubble() {
    if (bubbleTimer) window.clearTimeout(bubbleTimer);
    bubbleTimer = null;
    patchState({ bubble: null }, false);
  },
  openMenu(x: number, y: number) {
    patchState({ menu: { open: true, x, y }, pickerOpen: false }, false);
  },
  closeMenu() {
    patchState({ menu: { ...state.menu, open: false } }, false);
  },
  setPickerOpen(pickerOpen: boolean) {
    patchState({ pickerOpen }, false);
  },
  setActiveGame(activeGame: OSBuddyMiniGame | null) {
    patchState({ activeGame, menu: { ...state.menu, open: false }, pickerOpen: false }, false);
  },
  setWalking(walking: boolean) {
    patchState({ walking });
  },
  setFreeRoamSettings(input: Partial<Pick<OSBuddyState, "freeRoamEnabled" | "freeRoamIntensity" | "freeRoamReturnHome" | "freeRoamNearHomeOnly">>) {
    patchState(input);
  },
  setShortcutSettings(shortcutSettings: OSBuddyShortcutSettings) {
    patchState({ shortcutSettings });
  },
  setBirthdaySettings(input: Partial<Pick<OSBuddyState, "birthdayEnabled" | "birthdayMonth" | "birthdayDay" | "birthdayYear" | "birthdayShowAge" | "birthdayReminderEnabled">>) {
    patchState(input);
  },
  setFocusBadge(focusBadge: string | null) {
    patchState({ focusBadge }, false);
  },
  incrementInteraction(key: "clicks" | "drags" | "gamesPlayed", amount = 1) {
    patchState({ stats: incrementOSBuddyStat(state.stats, key, amount) });
  },
  addBadge(badge: OSBuddyBadge) {
    patchState({ stats: addOSBuddyBadge(state.stats, badge) });
  },
  activateSecretMode() {
    if (secretTimer) window.clearTimeout(secretTimer);
    patchState({
      secretMode: true,
      stats: addOSBuddyBadge(state.stats, "secret-pixel-mode"),
      mood: "celebrating",
    });
    if (typeof window !== "undefined") {
      secretTimer = window.setTimeout(() => {
        patchState({ secretMode: false, mood: "idle" }, false);
        secretTimer = null;
      }, 8000);
    }
  },
  closeTransient() {
    patchState({
      bubble: null,
      menu: { ...state.menu, open: false },
      pickerOpen: false,
      activeGame: null,
      walking: false,
      focusBadge: null,
    }, false);
  },
};

export function useOSBuddyActions() {
  return osBuddyActions;
}

export function persistOSBuddyToStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeStateForStorage(state)));
  } catch {
    // Local fallback is best-effort; never let it break the UI.
  }
}

export function getOSBuddyProfileUpdate(): OSBuddyProfilePayload {
  return {
    os_buddy_pet_id: state.petId,
    os_buddy_name: state.name,
    os_buddy_enabled: state.enabled,
    os_buddy_position: state.position,
    os_buddy_onboarding_completed: state.onboardingCompleted,
    os_buddy_interaction_stats: state.stats,
    os_buddy_unlocked_pets: ["xiaoba", "doge"],
    os_buddy_birthday_enabled: state.birthdayEnabled,
    os_buddy_birthday_month: state.birthdayMonth,
    os_buddy_birthday_day: state.birthdayDay,
    os_buddy_birthday_year: state.birthdayYear,
    os_buddy_birthday_show_age: state.birthdayShowAge,
    os_buddy_birthday_reminder_enabled: state.birthdayReminderEnabled,
    os_buddy_birthday_timezone: state.birthdayTimezone,
    os_buddy_birthday_last_celebrated_on: state.birthdayLastCelebratedOn,
    os_buddy_birthday_last_reminder_on: state.birthdayLastReminderOn,
    os_buddy_free_roam_enabled: state.freeRoamEnabled,
    os_buddy_free_roam_intensity: state.freeRoamIntensity,
    os_buddy_free_roam_return_home: state.freeRoamReturnHome,
    os_buddy_free_roam_near_home_only: state.freeRoamNearHomeOnly,
    os_buddy_shortcut_settings: state.shortcutSettings,
  };
}

function readStoredState(): Partial<OSBuddyState> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<OSBuddyState>;
  } catch {
    return null;
  }
}

function serializeStateForStorage(current: OSBuddyState): Partial<OSBuddyState> {
  return {
    enabled: current.enabled,
    visible: current.visible,
    petId: current.petId,
    name: current.name,
    position: current.position,
    scale: current.scale,
    freeRoamEnabled: current.freeRoamEnabled,
    freeRoamIntensity: current.freeRoamIntensity,
    freeRoamReturnHome: current.freeRoamReturnHome,
    freeRoamNearHomeOnly: current.freeRoamNearHomeOnly,
    shortcutSettings: current.shortcutSettings,
    onboardingCompleted: current.onboardingCompleted,
    birthdayEnabled: current.birthdayEnabled,
    birthdayMonth: current.birthdayMonth,
    birthdayDay: current.birthdayDay,
    birthdayYear: current.birthdayYear,
    birthdayShowAge: current.birthdayShowAge,
    birthdayReminderEnabled: current.birthdayReminderEnabled,
    birthdayTimezone: current.birthdayTimezone,
    birthdayLastCelebratedOn: current.birthdayLastCelebratedOn,
    birthdayLastReminderOn: current.birthdayLastReminderOn,
    stats: current.stats,
  };
}

function profileToState(profile: OSBuddyProfilePayload): Partial<OSBuddyState> {
  return {
    petId: profile.os_buddy_pet_id === "doge" ? "doge" : "xiaoba",
    name: profile.os_buddy_name?.slice(0, 24) || state.name,
    enabled: profile.os_buddy_enabled ?? state.enabled,
    position: profile.os_buddy_position ?? state.position,
    onboardingCompleted: profile.os_buddy_onboarding_completed ?? state.onboardingCompleted,
    stats: profile.os_buddy_interaction_stats ?? state.stats,
    birthdayEnabled: profile.os_buddy_birthday_enabled ?? state.birthdayEnabled,
    birthdayMonth: profile.os_buddy_birthday_month ?? state.birthdayMonth,
    birthdayDay: profile.os_buddy_birthday_day ?? state.birthdayDay,
    birthdayYear: profile.os_buddy_birthday_year ?? state.birthdayYear,
    birthdayShowAge: profile.os_buddy_birthday_show_age ?? state.birthdayShowAge,
    birthdayReminderEnabled: profile.os_buddy_birthday_reminder_enabled ?? state.birthdayReminderEnabled,
    birthdayTimezone: profile.os_buddy_birthday_timezone ?? state.birthdayTimezone,
    birthdayLastCelebratedOn: profile.os_buddy_birthday_last_celebrated_on ?? state.birthdayLastCelebratedOn,
    birthdayLastReminderOn: profile.os_buddy_birthday_last_reminder_on ?? state.birthdayLastReminderOn,
    freeRoamEnabled: profile.os_buddy_free_roam_enabled ?? state.freeRoamEnabled,
    freeRoamIntensity: profile.os_buddy_free_roam_intensity ?? state.freeRoamIntensity,
    freeRoamReturnHome: profile.os_buddy_free_roam_return_home ?? state.freeRoamReturnHome,
    freeRoamNearHomeOnly: profile.os_buddy_free_roam_near_home_only ?? state.freeRoamNearHomeOnly,
    shortcutSettings: profile.os_buddy_shortcut_settings ?? state.shortcutSettings,
  };
}

function defaultPixelPosition() {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return { x: window.innerWidth - 96, y: window.innerHeight - 112 };
}

