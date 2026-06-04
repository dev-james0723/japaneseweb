/**
 * Adaptive spaced-repetition scheduler.
 *
 * This keeps the legacy date bucket fields intact while also filling the
 * FSRS-ready review columns that were added in the Japanese OS foundation
 * migration: stability, difficulty, lapses, next_review_at, and is_leech.
 */

const STARTING_STABILITY = 0.6;
const STARTING_DIFFICULTY = 5.4;
const MAX_INTERVAL_DAYS = 180;

export function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addDaysAtCurrentTime(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export type ReviewRating = "again" | "hard" | "good" | "easy";

export type ReviewState = {
  review_count: number;
  correct_count: number;
  incorrect_count: number;
  ease_score: number | null;
  status: string | null;
  stability?: number | null;
  difficulty?: number | null;
  lapses?: number | null;
  is_leech?: boolean | null;
};

export function nextSchedule(
  prev: ReviewState | null,
  isCorrect: boolean,
  now: Date = new Date(),
  explicitRating?: ReviewRating,
): {
  next_review_date: string;
  next_review_at: string;
  review_date: string;
  review_count: number;
  correct_count: number;
  incorrect_count: number;
  status: "new" | "learning" | "reviewing" | "weak" | "mastered";
  ease_score: number;
  stability: number;
  difficulty: number;
  lapses: number;
  is_leech: boolean;
  fsrs_state: {
    scheduler: "adaptive-fsrs-lite-v1";
    rating: ReviewRating;
    interval_days: number;
    previous_stability: number;
    previous_difficulty: number;
  };
} {
  const rating = normalizeRating(isCorrect, explicitRating);
  const remembered = rating !== "again";
  const reviewCount = (prev?.review_count ?? 0) + 1;
  const correctCount = (prev?.correct_count ?? 0) + (remembered ? 1 : 0);
  const incorrectCount = (prev?.incorrect_count ?? 0) + (remembered ? 0 : 1);
  const previousStability = clamp(
    prev?.stability ?? inferStabilityFromLegacyCount(prev?.review_count ?? 0),
    0.2,
    MAX_INTERVAL_DAYS,
  );
  const previousDifficulty = clamp(
    prev?.difficulty ?? inferDifficultyFromEase(prev?.ease_score ?? null),
    1,
    10,
  );
  const lapses = (prev?.lapses ?? 0) + (rating === "again" ? 1 : 0);
  const difficulty = nextDifficulty(previousDifficulty, rating);
  const stability = nextStability(previousStability, difficulty, rating, reviewCount);
  const days = intervalDays(stability, difficulty, rating);
  const isLeech = lapses >= 3 || (incorrectCount >= 3 && incorrectCount >= correctCount);

  const status: "new" | "learning" | "reviewing" | "weak" | "mastered" =
    isLeech || rating === "again"
      ? "weak"
      : correctCount >= 7 && lapses === 0 && stability >= 30
      ? "mastered"
      : reviewCount <= 2
        ? "learning"
        : "reviewing";

  return {
    next_review_date: addDays(now, days),
    next_review_at: addDaysAtCurrentTime(now, days),
    review_date: now.toISOString().slice(0, 10),
    review_count: reviewCount,
    correct_count: correctCount,
    incorrect_count: incorrectCount,
    status,
    ease_score: clamp(
      (prev?.ease_score ?? 2.5) + ({ again: -0.35, hard: -0.08, good: 0.08, easy: 0.18 }[rating]),
      1.3,
      3.0,
    ),
    stability,
    difficulty,
    lapses,
    is_leech: isLeech,
    fsrs_state: {
      scheduler: "adaptive-fsrs-lite-v1",
      rating,
      interval_days: days,
      previous_stability: round(previousStability),
      previous_difficulty: round(previousDifficulty),
    },
  };
}

function normalizeRating(isCorrect: boolean, rating?: ReviewRating): ReviewRating {
  if (!isCorrect) return "again";
  return rating ?? "good";
}

function inferStabilityFromLegacyCount(reviewCount: number): number {
  if (reviewCount <= 0) return STARTING_STABILITY;
  return Math.min(STARTING_STABILITY * 2 ** Math.min(reviewCount, 6), 45);
}

function inferDifficultyFromEase(ease: number | null): number {
  if (ease == null) return STARTING_DIFFICULTY;
  return clamp(8.2 - ease * 1.2, 2, 9);
}

function nextDifficulty(previousDifficulty: number, rating: ReviewRating): number {
  const delta = {
    again: 0.85,
    hard: 0.35,
    good: -0.12,
    easy: -0.42,
  }[rating];
  return round(clamp(previousDifficulty + delta, 1, 10));
}

function nextStability(
  previousStability: number,
  difficulty: number,
  rating: ReviewRating,
  reviewCount: number,
): number {
  if (rating === "again") {
    return round(clamp(previousStability * 0.45, 0.25, 7));
  }

  const difficultyDrag = clamp((11 - difficulty) / 7, 0.45, 1.35);
  const firstReviewBonus = reviewCount <= 1 ? 0.9 : 0;
  const growth = {
    hard: 1.2,
    good: 2.05,
    easy: 2.85,
  }[rating] * difficultyDrag;

  return round(
    clamp(previousStability * growth + firstReviewBonus + (rating === "easy" ? 1.1 : 0.45), 0.5, MAX_INTERVAL_DAYS),
  );
}

function intervalDays(stability: number, difficulty: number, rating: ReviewRating): number {
  if (rating === "again") return 0;
  const modifier = {
    hard: 0.55,
    good: 1,
    easy: 1.45,
  }[rating];
  const difficultyPenalty = clamp((11 - difficulty) / 8, 0.55, 1.15);
  return Math.max(1, Math.min(MAX_INTERVAL_DAYS, Math.round(stability * modifier * difficultyPenalty)));
}

function round(v: number) {
  return Math.round(v * 100) / 100;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
