import { OS_BUDDY_FREE_ROAM_CONFIG } from "./os-buddy-free-roam-config";
import type { OSBuddyFreeRoamIntensity, OSBuddyPosition } from "./os-buddy-types";

export function clampOSBuddyPosition(position: OSBuddyPosition, size = 76, edge = 12): OSBuddyPosition {
  if (typeof window === "undefined" || position.x == null || position.y == null) return position;
  return {
    ...position,
    x: Math.min(Math.max(position.x, edge), window.innerWidth - size - edge),
    y: Math.min(Math.max(position.y, edge), window.innerHeight - size - edge),
    anchor: "custom",
  };
}

export function randomFreeRoamTarget(home: OSBuddyPosition, intensity: OSBuddyFreeRoamIntensity): OSBuddyPosition {
  const config = OS_BUDDY_FREE_ROAM_CONFIG[intensity];
  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  const radius = mobile ? config.mobileRadiusPx : config.desktopRadiusPx;
  const angle = Math.random() * Math.PI * 2;
  const distance = radius * (0.32 + Math.random() * 0.68);
  return clampOSBuddyPosition({
    x: (home.x ?? 0) + Math.cos(angle) * distance,
    y: (home.y ?? 0) + Math.sin(angle) * distance,
    anchor: "custom",
  });
}

