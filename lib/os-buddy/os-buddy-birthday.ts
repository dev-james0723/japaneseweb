export type OSBuddyBirthdaySettings = {
  enabled: boolean;
  month: number | null;
  day: number | null;
  year: number | null;
  showAge: boolean;
  reminderEnabled: boolean;
  timezone: string | null;
  lastCelebratedOn: string | null;
  lastReminderOn: string | null;
};

export function normalizeOSBuddyBirthday(input: OSBuddyBirthdaySettings): OSBuddyBirthdaySettings {
  const currentYear = new Date().getFullYear();
  const month = input.month && input.month >= 1 && input.month <= 12 ? input.month : null;
  const maxDay = month ? daysInMonth(month, input.year ?? currentYear) : 31;
  const day = input.day && input.day >= 1 && input.day <= maxDay ? input.day : null;
  const year = input.year && input.year >= 1900 && input.year <= currentYear ? input.year : null;
  return { ...input, month, day, year };
}

export function getOSBuddyBirthdayStatus(settings: OSBuddyBirthdaySettings, now = new Date()) {
  if (!settings.enabled || !settings.month || !settings.day) return null;
  const today = dateKey(now);
  const birthdayThisYear = birthdayDateForYear(settings, now.getFullYear());
  const diffDays = Math.round((birthdayThisYear.getTime() - startOfDay(now).getTime()) / 86400000);
  const age = settings.year ? birthdayThisYear.getFullYear() - settings.year : undefined;
  if (diffDays === 0) return { type: "today" as const, dateKey: today, age };
  if (settings.reminderEnabled && diffDays > 0 && diffDays <= 7) {
    return { type: "upcoming" as const, dateKey: today, daysUntil: diffDays, age };
  }
  return null;
}

function birthdayDateForYear(settings: OSBuddyBirthdaySettings, year: number): Date {
  const month = settings.month ?? 1;
  const day = Math.min(settings.day ?? 1, daysInMonth(month, year));
  return new Date(year, month - 1, day);
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

