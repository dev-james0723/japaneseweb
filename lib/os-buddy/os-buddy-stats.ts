import type { OSBuddyBadge, OSBuddyInteractionStats } from "./os-buddy-types";

export function addOSBuddyBadge(stats: OSBuddyInteractionStats, badge: OSBuddyBadge): OSBuddyInteractionStats {
  const badges = new Set(stats.badges ?? []);
  badges.add(badge);
  return { ...stats, badges: Array.from(badges) };
}

export function incrementOSBuddyStat(
  stats: OSBuddyInteractionStats,
  key: "clicks" | "drags" | "gamesPlayed",
  amount = 1,
): OSBuddyInteractionStats {
  return {
    ...stats,
    [key]: (stats[key] ?? 0) + amount,
    lastInteractionAt: new Date().toISOString(),
  };
}

