export type OSBuddyTap = {
  x: number;
  y: number;
  at: number;
};

export function distanceBetweenTaps(a: OSBuddyTap, b: OSBuddyTap): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function nextTapCount(taps: OSBuddyTap[], tap: OSBuddyTap, maxGapMs = 320, maxDistancePx = 24): OSBuddyTap[] {
  const recent = taps.filter((item) => tap.at - item.at <= maxGapMs && distanceBetweenTaps(item, tap) <= maxDistancePx);
  return [...recent, tap];
}

