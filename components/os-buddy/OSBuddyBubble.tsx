"use client";

import { X } from "lucide-react";
import type { OSBuddyBubble as OSBuddyBubbleData } from "@/lib/os-buddy/os-buddy-types";

export function OSBuddyBubble({
  bubble,
  dockX,
  onClose,
  onCta,
}: {
  bubble: OSBuddyBubbleData;
  dockX: number;
  onClose: () => void;
  onCta: () => void;
}) {
  const alignLeft = typeof window !== "undefined" ? dockX > window.innerWidth / 2 : true;

  return (
    <div
      role="status"
      aria-live="polite"
      data-kind={bubble.kind}
      className={`os-buddy-pixel-bubble ${alignLeft ? "os-buddy-pixel-bubble--left" : "os-buddy-pixel-bubble--right"}`}
    >
      <button type="button" className="os-buddy-pixel-bubble-close" onClick={onClose} aria-label="關閉提示">
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
      <p className="os-buddy-pixel-bubble-text">{bubble.message}</p>
      {bubble.cta ? (
        <button type="button" className="os-buddy-pixel-bubble-cta" onClick={onCta}>
          {bubble.cta.label}
        </button>
      ) : null}
    </div>
  );
}

