import type { OSBuddyEvent } from "./os-buddy-types";

export const OS_BUDDY_EVENT_NAME = "japaneseweb:os-buddy-event";

export function emitOSBuddyEvent(event: OSBuddyEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<OSBuddyEvent>(OS_BUDDY_EVENT_NAME, { detail: event }));
}

export function subscribeToOSBuddyEvents(listener: (event: OSBuddyEvent) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (evt: Event) => {
    listener((evt as CustomEvent<OSBuddyEvent>).detail);
  };
  window.addEventListener(OS_BUDDY_EVENT_NAME, handler);
  return () => window.removeEventListener(OS_BUDDY_EVENT_NAME, handler);
}

