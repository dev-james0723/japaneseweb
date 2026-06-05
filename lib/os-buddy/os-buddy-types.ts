import type { BootLayer, DailyMode } from "@/lib/os/types";

export type OSBuddyPetId = "xiaoba" | "doge";

export type OSBuddyAnimationState =
  | "idle"
  | "waiting"
  | "waving"
  | "jumping"
  | "failed"
  | "review"
  | "running"
  | "running-left"
  | "running-right";

export type OSBuddyMood =
  | "idle"
  | "thinking"
  | "creating"
  | "reading"
  | "success"
  | "error"
  | "sleepy"
  | "playful"
  | "focused"
  | "celebrating"
  | "dragging-left"
  | "dragging-right";

export type OSBuddyPosition = {
  x: number | null;
  y: number | null;
  anchor: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "custom";
};

export type OSBuddyBubbleType =
  | "user-triggered"
  | "system"
  | "context"
  | "success"
  | "error"
  | "game"
  | "birthday";

export type OSBuddyCompanionKind =
  | "boot"
  | "review"
  | "deck"
  | "grammar"
  | "mining"
  | "journal"
  | "roleplay"
  | "tts"
  | "streak"
  | "settings"
  | "game"
  | "fallback";

export type OSBuddyMiniGame = "kana-catch" | "focus-tap" | "study-desk-reset" | "play-ball";

export type OSBuddyBadge =
  | "secret-pixel-mode"
  | "first-game"
  | "fast-hands"
  | "clean-desk"
  | "birthday-celebrated";

export type OSBuddyInteractionStats = {
  clicks?: number;
  drags?: number;
  gamesPlayed?: number;
  lastInteractionAt?: string;
  badges?: OSBuddyBadge[];
};

export type OSBuddyShortcut = {
  key: string;
  code: string;
  label: string;
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
  pressCount: number;
};

export type OSBuddyShortcutSettings = {
  desktopToggle: OSBuddyShortcut;
  twoFingerDoubleTapEnabled: boolean;
};

export type OSBuddyFreeRoamIntensity = "subtle" | "balanced" | "lively";

export type OSBuddyBubble = {
  id: string;
  message: string;
  kind: OSBuddyBubbleType;
  companionKind?: OSBuddyCompanionKind;
  durationMs: number;
  cta?: { label: string; game: OSBuddyMiniGame } | null;
  createdAt: number;
};

export type OSBuddyMenuState = {
  open: boolean;
  x: number;
  y: number;
};

export type OSBuddyJapaneseContext = {
  displayName: string | null;
  today: string;
  pathname: string;
  os: {
    currentPhase: number;
    phaseName: string;
    dailyMode: DailyMode;
    targetJlpt: string;
    bootCompletion: number;
    nextIncompleteLayer: BootLayer | null;
    completedLayers: string[];
  };
  review: {
    dueCount: number;
    weakCount: number;
    sentencePromptCount: number;
    lastRating?: "again" | "hard" | "good" | "easy" | null;
  };
  decks: {
    recentTitles: string[];
    weeklyNewVocab: number;
    weeklyQuota: number;
  };
  learning: {
    recentMinedSentences: string[];
    recentJournalSnippets: string[];
    recentGrammar: string[];
    talkMeMinutesThisWeek: number;
  };
  preferences: {
    showRomaji: boolean;
    preferredVoice: string;
    defaultJlptLevel: string;
  };
  games: OSBuddyMiniGame[];
};

export type OSBuddyCompanionResponse = {
  message: string;
  kind: OSBuddyCompanionKind;
  source: "ai" | "local" | "fallback";
  cta?: { label: string; game: OSBuddyMiniGame } | null;
};

export type OSBuddyEvent =
  | { type: "boot:start"; mode: DailyMode }
  | { type: "boot:layer:complete"; layer: BootLayer }
  | { type: "boot:layer:uncomplete"; layer: BootLayer }
  | { type: "review:start"; count: number }
  | { type: "review:rating"; rating: "again" | "hard" | "good" | "easy" }
  | { type: "review:complete"; remembered: number; total: number }
  | { type: "deck:create:start"; mode?: "manual" | "ocr" | "ai" }
  | { type: "deck:create:success"; title?: string }
  | { type: "deck:create:error"; error?: string }
  | { type: "vocab:save:start"; text?: string }
  | { type: "vocab:save:success"; text?: string }
  | { type: "vocab:save:error"; error?: string }
  | { type: "selection:inspect:start"; text?: string }
  | { type: "selection:inspect:success"; text?: string }
  | { type: "selection:inspect:error"; error?: string }
  | { type: "tts:play"; text?: string }
  | { type: "tts:error"; error?: string }
  | { type: "mining:save"; sentence?: string }
  | { type: "journal:correct:start" }
  | { type: "journal:correct:success" }
  | { type: "journal:correct:error"; error?: string }
  | { type: "roleplay:start" }
  | { type: "roleplay:complete" }
  | { type: "talk-me:logged"; minutes?: number }
  | { type: "grammar:add"; pattern?: string }
  | { type: "streak:milestone"; count: number }
  | { type: "focus:start"; durationMinutes?: number }
  | { type: "focus:pause" }
  | { type: "focus:resume" }
  | { type: "focus:complete" }
  | { type: "user:idle" }
  | { type: "user:return" }
  | { type: "buddy:clicked" }
  | { type: "buddy:drag:start" }
  | { type: "buddy:drag:end" }
  | { type: "buddy:longpress" }
  | { type: "buddy:walk:start" }
  | { type: "buddy:walk:return" }
  | { type: "buddy:walk:end" }
  | { type: "buddy:free-roam:start" }
  | { type: "buddy:free-roam:end"; reason?: string }
  | { type: "game:start"; game: OSBuddyMiniGame }
  | { type: "game:complete"; game: OSBuddyMiniGame; score?: number }
  | { type: "birthday:today"; age?: number }
  | { type: "birthday:upcoming"; daysUntil: number; age?: number }
  | { type: "birthday:set" }
  | { type: "birthday:clear" };

