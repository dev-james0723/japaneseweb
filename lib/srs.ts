/**
 * Simple spaced-repetition scheduler.
 * Intervals: D0, D1, D3, D7, D14, D30, D60.
 *
 * Correct answers advance to the next interval; incorrect answers reset to D1.
 */

const INTERVALS = [0, 1, 3, 7, 14, 30, 60] as const;

export function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type ReviewState = {
  review_count: number;
  correct_count: number;
  incorrect_count: number;
  ease_score: number | null;
  status: string | null;
};

export function nextSchedule(
  prev: ReviewState | null,
  isCorrect: boolean,
  now: Date = new Date(),
): {
  next_review_date: string;
  review_date: string;
  review_count: number;
  correct_count: number;
  incorrect_count: number;
  status: "new" | "learning" | "reviewing" | "weak" | "mastered";
  ease_score: number;
} {
  const reviewCount = (prev?.review_count ?? 0) + 1;
  const correctCount = (prev?.correct_count ?? 0) + (isCorrect ? 1 : 0);
  const incorrectCount = (prev?.incorrect_count ?? 0) + (isCorrect ? 0 : 1);

  let intervalIdx: number;
  if (!isCorrect) {
    intervalIdx = 1; // reset to D1
  } else {
    // Successful streak advances the bucket; cap at last interval.
    const prevIdx = Math.min(prev?.review_count ?? 0, INTERVALS.length - 1);
    intervalIdx = Math.min(prevIdx + 1, INTERVALS.length - 1);
  }
  const days = INTERVALS[intervalIdx];

  const status: "new" | "learning" | "reviewing" | "weak" | "mastered" =
    correctCount >= 5 && incorrectCount === 0
      ? "mastered"
      : incorrectCount >= 2 && incorrectCount > correctCount
        ? "weak"
        : reviewCount <= 2
          ? "learning"
          : "reviewing";

  return {
    next_review_date: addDays(now, days),
    review_date: now.toISOString().slice(0, 10),
    review_count: reviewCount,
    correct_count: correctCount,
    incorrect_count: incorrectCount,
    status,
    ease_score: clamp((prev?.ease_score ?? 2.5) + (isCorrect ? 0.1 : -0.2), 1.3, 3.0),
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
