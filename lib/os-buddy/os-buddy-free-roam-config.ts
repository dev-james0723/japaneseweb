import type { OSBuddyFreeRoamIntensity } from "./os-buddy-types";

export type OSBuddyFreeRoamConfig = {
  idleDelayMs: number;
  sessionMinMs: number;
  sessionMaxMs: number;
  cooldownMinMs: number;
  cooldownMaxMs: number;
  maxSessionsPerHour: number;
  desktopRadiusPx: number;
  mobileRadiusPx: number;
  speedMin: number;
  speedMax: number;
};

export const OS_BUDDY_FREE_ROAM_CONFIG: Record<OSBuddyFreeRoamIntensity, OSBuddyFreeRoamConfig> = {
  subtle: {
    idleDelayMs: 90000,
    sessionMinMs: 8000,
    sessionMaxMs: 12000,
    cooldownMinMs: 480000,
    cooldownMaxMs: 720000,
    maxSessionsPerHour: 3,
    desktopRadiusPx: 160,
    mobileRadiusPx: 96,
    speedMin: 28,
    speedMax: 40,
  },
  balanced: {
    idleDelayMs: 60000,
    sessionMinMs: 12000,
    sessionMaxMs: 20000,
    cooldownMinMs: 240000,
    cooldownMaxMs: 420000,
    maxSessionsPerHour: 6,
    desktopRadiusPx: 220,
    mobileRadiusPx: 120,
    speedMin: 35,
    speedMax: 55,
  },
  lively: {
    idleDelayMs: 45000,
    sessionMinMs: 20000,
    sessionMaxMs: 35000,
    cooldownMinMs: 120000,
    cooldownMaxMs: 240000,
    maxSessionsPerHour: 10,
    desktopRadiusPx: 300,
    mobileRadiusPx: 160,
    speedMin: 45,
    speedMax: 70,
  },
};

