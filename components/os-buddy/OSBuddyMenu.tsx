"use client";

import { useEffect, useRef } from "react";
import { Cake, Gamepad2, Home, Palette, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { useOSBuddyActions, useOSBuddyStore } from "@/lib/os-buddy/os-buddy-store";
import type { OSBuddyMiniGame } from "@/lib/os-buddy/os-buddy-types";

const GAMES: { game: OSBuddyMiniGame; label: string }[] = [
  { game: "kana-catch", label: "玩假名接球" },
  { game: "focus-tap", label: "玩專注點擊" },
  { game: "study-desk-reset", label: "整理學習桌" },
  { game: "play-ball", label: "玩拋接球" },
];

export function OSBuddyMenu() {
  const menu = useOSBuddyStore((state) => state.menu);
  const name = useOSBuddyStore((state) => state.name);
  const birthdayEnabled = useOSBuddyStore((state) => state.birthdayEnabled);
  const actions = useOSBuddyActions();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu.open) return;
    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) actions.closeMenu();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") actions.closeMenu();
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [actions, menu.open]);

  if (!menu.open) return null;

  const left = Math.min(menu.x, Math.max(16, window.innerWidth - 236));
  const top = Math.min(menu.y, Math.max(16, window.innerHeight - 360));

  return (
    <div
      ref={ref}
      className="fixed z-[90] w-[220px] rounded-2xl border border-white/15 bg-[#171612]/95 p-2 text-sm text-white shadow-[0_24px_80px_rgba(0,0,0,0.48)] backdrop-blur-xl"
      style={{ left, top }}
      role="menu"
      data-os-buddy-shortcut-ignore="true"
    >
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">{name}</span>
        <button type="button" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/10" onClick={actions.closeMenu} aria-label="關閉">
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <MenuButton icon={Palette} label="更換學習夥伴" onClick={() => actions.setPickerOpen(true)} />
      <MenuButton
        icon={Pencil}
        label="重新命名"
        onClick={() => {
          const next = window.prompt("學習夥伴名稱", name);
          if (next != null) actions.setName(next);
          actions.closeMenu();
        }}
      />
      <MenuButton
        icon={Cake}
        label={birthdayEnabled ? "關閉生日模式" : "生日模式"}
        onClick={() => {
          actions.setBirthdaySettings({ birthdayEnabled: !birthdayEnabled });
          actions.closeMenu();
        }}
      />
      <MenuButton icon={Home} label="重設位置" onClick={() => { actions.resetPosition(); actions.closeMenu(); }} />
      <div className="my-1 h-px bg-white/10" />
      {GAMES.map((item) => (
        <MenuButton
          key={item.game}
          icon={item.game === "play-ball" ? Sparkles : Gamepad2}
          label={item.label}
          onClick={() => actions.setActiveGame(item.game)}
        />
      ))}
      <div className="my-1 h-px bg-white/10" />
      <MenuButton icon={Trash2} label="隱藏學習夥伴" danger onClick={() => { actions.setVisible(false); actions.closeMenu(); }} />
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/10 ${
        danger ? "text-[var(--danger)]" : "text-[var(--text-secondary)] hover:text-white"
      }`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
}
