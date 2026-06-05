"use client";

export function OSBuddyFocusBadge({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <div className="pointer-events-none absolute -top-3 left-1/2 z-[1] -translate-x-1/2 rounded-full border border-[var(--accent-lime)]/30 bg-[#171612]/92 px-2.5 py-1 text-[10px] font-semibold text-[var(--accent-lime)] shadow-lg">
      {label}
    </div>
  );
}

