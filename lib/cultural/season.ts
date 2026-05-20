export type JapanSeason = "spring" | "summer" | "autumn" | "winter";

export function getCurrentSeason(date: Date = new Date()): JapanSeason {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

export const SEASON_HINTS: Record<JapanSeason, string> = {
  spring: "櫻花、入學、畢業、花見、端午前",
  summer: "夏日祭、煙火、お盆、海邊、風鈴",
  autumn: "紅葉、運動會、收穫祭、讀書週",
  winter: "正月、鏡餅、雪祭、年越し、除夜鐘",
};
