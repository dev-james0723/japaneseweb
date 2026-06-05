"use client";

import { X } from "lucide-react";
import { OSBuddySprite } from "./OSBuddySprite";
import { OS_BUDDY_PETS } from "@/lib/os-buddy/os-buddy-pets";
import { useOSBuddyActions, useOSBuddyStore } from "@/lib/os-buddy/os-buddy-store";

export function OSBuddyPetPicker() {
  const open = useOSBuddyStore((state) => state.pickerOpen);
  const petId = useOSBuddyStore((state) => state.petId);
  const name = useOSBuddyStore((state) => state.name);
  const actions = useOSBuddyActions();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/35 px-4 backdrop-blur-sm"
      data-os-buddy-shortcut-ignore="true"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) actions.setPickerOpen(false);
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#171612]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="section-eyebrow mb-1">學習夥伴</p>
            <h2 className="text-base font-semibold">更換學習夥伴</h2>
          </div>
          <button type="button" onClick={() => actions.setPickerOpen(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10" aria-label="關閉">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {OS_BUDDY_PETS.map((pet) => (
            <button
              key={pet.id}
              type="button"
              onClick={() => {
                actions.setPetId(pet.id);
                actions.setPickerOpen(false);
              }}
              className={`rounded-xl border p-3 text-left transition-colors ${
                petId === pet.id
                  ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)]/20"
                  : "border-white/10 bg-white/[0.035] hover:bg-white/[0.07]"
              }`}
            >
              <div className="mb-2 flex justify-center">
                <OSBuddySprite petId={pet.id} mood="idle" name={name} size={58} />
              </div>
              <div className="text-sm font-semibold">{pet.name}</div>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{pet.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
