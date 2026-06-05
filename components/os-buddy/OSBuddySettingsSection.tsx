"use client";

import { RotateCcw } from "lucide-react";
import { useOSBuddy } from "@/hooks/use-os-buddy";
import { OSBuddySprite } from "./OSBuddySprite";
import { OSBuddyShortcutSettings } from "./OSBuddyShortcutSettings";
import { OS_BUDDY_PETS } from "@/lib/os-buddy/os-buddy-pets";
import { useOSBuddyActions, useOSBuddyStore } from "@/lib/os-buddy/os-buddy-store";
import type { OSBuddyFreeRoamIntensity } from "@/lib/os-buddy/os-buddy-types";

export function OSBuddySettingsSection() {
  useOSBuddy();
  const state = useOSBuddyStore((snapshot) => snapshot);
  const actions = useOSBuddyActions();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold">學習夥伴</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            一個細小學習夥伴，跟住你每日開機、複習、採句同輸出節奏。
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
          <OSBuddySprite petId={state.petId} mood={state.mood} name={state.name} size={58} />
          <div className="min-w-0">
            <div className="text-sm font-semibold">{state.name}</div>
            <div className="text-xs text-[var(--text-muted)]">{state.petId}</div>
          </div>
        </div>
      </div>

      <SettingRow label="啟用學習夥伴">
        <Switch checked={state.enabled} onChange={actions.setEnabled} />
      </SettingRow>

      <SettingRow label="名稱" hint="最多 24 個字。">
        <input
          value={state.name}
          maxLength={24}
          onChange={(event) => actions.setName(event.target.value)}
          className="glass-input w-full"
          placeholder="Koto"
        />
      </SettingRow>

      <SettingRow label="夥伴">
        <div className="grid gap-2 sm:grid-cols-2">
          {OS_BUDDY_PETS.map((pet) => (
            <button
              key={pet.id}
              type="button"
              onClick={() => actions.setPetId(pet.id)}
              className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                state.petId === pet.id
                  ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
                  : "border-white/10 bg-white/[0.035] text-[var(--text-secondary)] hover:bg-white/[0.07]"
              }`}
            >
              <span className="block text-sm font-semibold">{pet.name}</span>
              <span className="mt-1 block text-xs leading-5">{pet.description}</span>
            </button>
          ))}
        </div>
      </SettingRow>

      <SettingRow label="位置">
        <button type="button" className="btn-ghost text-sm" onClick={actions.resetPosition}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          重設位置
        </button>
      </SettingRow>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <h3 className="mb-3 text-sm font-semibold">自由走動</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>閒置時自由走動</span>
              <Switch checked={state.freeRoamEnabled} onChange={(freeRoamEnabled) => actions.setFreeRoamSettings({ freeRoamEnabled })} />
            </label>
            <select
              value={state.freeRoamIntensity}
              onChange={(event) => actions.setFreeRoamSettings({ freeRoamIntensity: event.target.value as OSBuddyFreeRoamIntensity })}
              className="glass-input w-full text-sm"
            >
              <option value="subtle">低調</option>
              <option value="balanced">平衡</option>
              <option value="lively">活潑</option>
            </select>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>走完回家</span>
              <input type="checkbox" checked={state.freeRoamReturnHome} onChange={(event) => actions.setFreeRoamSettings({ freeRoamReturnHome: event.target.checked })} className="h-4 w-4 accent-[var(--accent-lime)]" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>只留喺附近</span>
              <input type="checkbox" checked={state.freeRoamNearHomeOnly} onChange={(event) => actions.setFreeRoamSettings({ freeRoamNearHomeOnly: event.target.checked })} className="h-4 w-4 accent-[var(--accent-lime)]" />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <h3 className="mb-3 text-sm font-semibold">生日模式</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>啟用生日模式</span>
              <Switch checked={state.birthdayEnabled} onChange={(birthdayEnabled) => actions.setBirthdaySettings({ birthdayEnabled })} />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <NumberInput label="月" value={state.birthdayMonth} min={1} max={12} onChange={(birthdayMonth) => actions.setBirthdaySettings({ birthdayMonth })} />
              <NumberInput label="日" value={state.birthdayDay} min={1} max={31} onChange={(birthdayDay) => actions.setBirthdaySettings({ birthdayDay })} />
              <NumberInput label="年" value={state.birthdayYear} min={1900} max={new Date().getFullYear()} onChange={(birthdayYear) => actions.setBirthdaySettings({ birthdayYear })} />
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>顯示年齡</span>
              <input type="checkbox" checked={state.birthdayShowAge} onChange={(event) => actions.setBirthdaySettings({ birthdayShowAge: event.target.checked })} className="h-4 w-4 accent-[var(--accent-lime)]" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>提前提醒</span>
              <input type="checkbox" checked={state.birthdayReminderEnabled} onChange={(event) => actions.setBirthdaySettings({ birthdayReminderEnabled: event.target.checked })} className="h-4 w-4 accent-[var(--accent-lime)]" />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <h3 className="mb-3 text-sm font-semibold">快捷鍵</h3>
        <OSBuddyShortcutSettings />
      </div>
    </div>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-start md:justify-between">
      <div className="md:max-w-[260px]">
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{hint}</div> : null}
      </div>
      <div className="md:w-full md:max-w-xl">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-[var(--accent-lime)]" : "bg-white/15"}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="space-y-1 text-xs text-[var(--text-muted)]">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(event) => {
          const next = event.target.value ? Number(event.target.value) : null;
          onChange(next == null ? null : Math.min(Math.max(next, min), max));
        }}
        className="glass-input w-full px-2 py-2 text-sm"
      />
    </label>
  );
}
