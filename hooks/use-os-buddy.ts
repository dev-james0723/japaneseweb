"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { subscribeToOSBuddyEvents } from "@/lib/os-buddy/os-buddy-events";
import { handleOSBuddyReaction } from "@/lib/os-buddy/os-buddy-reactions";
import {
  getOSBuddyProfileUpdate,
  getOSBuddyState,
  osBuddyActions,
  persistOSBuddyToStorage,
  useOSBuddyActions,
  useOSBuddyStore,
  type OSBuddyProfilePayload,
} from "@/lib/os-buddy/os-buddy-store";

const PROFILE_COLUMNS = `
  os_buddy_pet_id,
  os_buddy_name,
  os_buddy_enabled,
  os_buddy_position,
  os_buddy_onboarding_completed,
  os_buddy_interaction_stats,
  os_buddy_unlocked_pets,
  os_buddy_birthday_enabled,
  os_buddy_birthday_month,
  os_buddy_birthday_day,
  os_buddy_birthday_year,
  os_buddy_birthday_show_age,
  os_buddy_birthday_reminder_enabled,
  os_buddy_birthday_timezone,
  os_buddy_birthday_last_celebrated_on,
  os_buddy_birthday_last_reminder_on,
  os_buddy_free_roam_enabled,
  os_buddy_free_roam_intensity,
  os_buddy_free_roam_return_home,
  os_buddy_free_roam_near_home_only,
  os_buddy_shortcut_settings
`;

let bridgeSubscribers = 0;
let bridgeCleanup: (() => void) | null = null;

export function useOSBuddy() {
  const actions = useOSBuddyActions();
  const mutationId = useOSBuddyStore((state) => state.mutationId);
  const userIdRef = useRef<string | null>(null);
  const loadedProfileRef = useRef(false);

  useEffect(() => {
    actions.hydrateFromStorage();
  }, [actions]);

  useEffect(() => {
    bridgeSubscribers += 1;
    if (!bridgeCleanup) {
      bridgeCleanup = subscribeToOSBuddyEvents((event) => handleOSBuddyReaction(event, osBuddyActions));
    }
    return () => {
      bridgeSubscribers -= 1;
      if (bridgeSubscribers <= 0) {
        bridgeCleanup?.();
        bridgeCleanup = null;
        bridgeSubscribers = 0;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userResult } = await supabase.auth.getUser();
        const userId = userResult.user?.id ?? null;
        userIdRef.current = userId;
        if (!userId) return;
        const { data, error } = await supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("id", userId)
          .maybeSingle();
        if (!cancelled && !error && data) {
          actions.applyProfile(data as OSBuddyProfilePayload);
        }
      } catch {
        // Missing env or migration should fall back to localStorage.
      } finally {
        loadedProfileRef.current = true;
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [actions]);

  useEffect(() => {
    persistOSBuddyToStorage();
    if (!loadedProfileRef.current || !userIdRef.current) return;
    const mutationSnapshot = getOSBuddyState().mutationId;
    const timer = window.setTimeout(async () => {
      if (getOSBuddyState().mutationId !== mutationSnapshot) return;
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.from("profiles").update(getOSBuddyProfileUpdate()).eq("id", userIdRef.current);
      } catch {
        persistOSBuddyToStorage();
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [mutationId]);
}

