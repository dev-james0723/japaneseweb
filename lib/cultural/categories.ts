export const CULTURAL_CATEGORIES = [
  "history_festivals",
  "language_history",
  "pop_culture",
  "traditional_arts",
  "regional_culture",
  "news_current",
  "lifestyle_niche",
] as const;

export type CulturalCategory = (typeof CULTURAL_CATEGORIES)[number];

export const CULTURAL_CATEGORY_LABELS: Record<CulturalCategory, { zh: string; emoji: string }> = {
  history_festivals: { zh: "歷史／祭典", emoji: "⛩️" },
  language_history: { zh: "語言歷史", emoji: "文" },
  pop_culture: { zh: "流行文化", emoji: "📱" },
  traditional_arts: { zh: "傳統藝術", emoji: "🍵" },
  regional_culture: { zh: "地域文化", emoji: "🗾" },
  news_current: { zh: "新聞時事", emoji: "📰" },
  lifestyle_niche: { zh: "生活小眾", emoji: "☕" },
};

export function isCulturalCategory(value: string): value is CulturalCategory {
  return (CULTURAL_CATEGORIES as readonly string[]).includes(value);
}

export function pickNextCategory(params: {
  preferred: string[];
  avoided: string[];
  lastPushed: string | null;
  rotate: boolean;
}): CulturalCategory {
  const { preferred, avoided, lastPushed, rotate } = params;
  let pool: CulturalCategory[] =
    preferred.length > 0
      ? preferred.filter(isCulturalCategory)
      : [...CULTURAL_CATEGORIES];
  pool = pool.filter((c) => !avoided.includes(c));
  if (pool.length === 0) pool = [...CULTURAL_CATEGORIES];

  if (!rotate || !lastPushed || !isCulturalCategory(lastPushed)) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const idx = pool.indexOf(lastPushed);
  const next = idx === -1 ? pool[0] : pool[(idx + 1) % pool.length];
  return next;
}
