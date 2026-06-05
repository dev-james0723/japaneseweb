"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  DEFAULT_OS_BUDDY_SHORTCUT_SETTINGS,
  formatShortcut,
  isShortcutAllowed,
  shortcutFromKeyboardEvent,
} from "@/lib/os-buddy/os-buddy-shortcuts";
import { useOSBuddyActions, useOSBuddyStore } from "@/lib/os-buddy/os-buddy-store";

export function OSBuddyShortcutSettings() {
  const settings = useOSBuddyStore((state) => state.shortcutSettings);
  const actions = useOSBuddyActions();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">桌面快捷鍵</div>
          <div className="text-xs text-[var(--text-muted)]">{formatShortcut(settings.desktopToggle)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn-ghost px-3 py-1.5 text-xs ${recording ? "border-[var(--accent-lime)]/50 text-[var(--accent-lime)]" : ""}`}
            onClick={() => {
              setRecording(true);
              setError(null);
            }}
          >
            {recording ? "按一組鍵…" : "錄製快捷鍵"}
          </button>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => actions.setShortcutSettings(DEFAULT_OS_BUDDY_SHORTCUT_SETTINGS)}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            重設
          </button>
        </div>
      </div>
      {recording ? (
        <div
          tabIndex={0}
          autoFocus
          className="rounded-xl border border-[var(--accent-lime)]/30 bg-[var(--accent-lime-bg)]/10 px-3 py-2 text-xs text-[var(--text-secondary)]"
          onKeyDown={(event) => {
            event.preventDefault();
            const shortcut = shortcutFromKeyboardEvent(event.nativeEvent);
            if (!isShortcutAllowed(shortcut)) {
              setError("呢組快捷鍵同瀏覽器或基本導覽衝突，請換一組。");
              return;
            }
            actions.setShortcutSettings({ ...settings, desktopToggle: shortcut });
            setRecording(false);
            setError(null);
          }}
        >
          直接按下新快捷鍵。無修飾鍵的單鍵會自動變成雙按。
        </div>
      ) : null}
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>手機兩指雙擊顯示/隱藏</span>
        <input
          type="checkbox"
          checked={settings.twoFingerDoubleTapEnabled}
          onChange={(event) => actions.setShortcutSettings({ ...settings, twoFingerDoubleTapEnabled: event.target.checked })}
          className="h-4 w-4 accent-[var(--accent-lime)]"
        />
      </label>
    </div>
  );
}
