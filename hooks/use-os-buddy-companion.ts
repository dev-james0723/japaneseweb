"use client";

import { useCallback } from "react";
import { buildLocalOSBuddyLine, fallbackOSBuddyContext } from "@/lib/os-buddy/os-buddy-companion";
import { OSBuddyCompanionResponseSchema } from "@/lib/os-buddy/os-buddy-companion-schema";
import type { OSBuddyCompanionKind, OSBuddyCompanionResponse } from "@/lib/os-buddy/os-buddy-types";

export function useOSBuddyCompanion() {
  return useCallback(async (pathname: string, kind?: OSBuddyCompanionKind): Promise<OSBuddyCompanionResponse> => {
    const fallback = buildLocalOSBuddyLine(fallbackOSBuddyContext(pathname), kind);
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 12000);
      const response = await fetch("/api/os-buddy/companion-line", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pathname, kind }),
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (!response.ok) return fallback;
      const parsed = OSBuddyCompanionResponseSchema.safeParse(await response.json());
      return parsed.success ? parsed.data : fallback;
    } catch {
      return fallback;
    }
  }, []);
}

