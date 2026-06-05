import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReviewRating, ReviewState } from "@/lib/srs";

export type ReviewEventTargetType =
  | "vocab"
  | "sentence"
  | "grammar"
  | "roleplay_pattern"
  | "output_repair";

export type ReviewEventSourceType =
  | "review_session"
  | "sentence_review"
  | "shadowing"
  | "memory_game"
  | "weekly_quiz"
  | "quick_output"
  | "roleplay"
  | "manual";

export type ReviewEventInput = {
  targetType: ReviewEventTargetType;
  sourceType?: ReviewEventSourceType;
  vocabId?: string | null;
  reviewId?: string | null;
  sentenceReviewPromptId?: string | null;
  quizAttemptId?: string | null;
  deckId?: string | null;
  quizType?: string | null;
  prompt?: string | null;
  userAnswer?: string | null;
  correctAnswer?: string | null;
  isCorrect: boolean;
  rating: ReviewRating;
  scheduleBefore?: Record<string, unknown>;
  scheduleAfter?: Record<string, unknown>;
  skillArea?: string | null;
  latencyMs?: number | null;
  metadata?: Record<string, unknown>;
};

export type ReviewEventSummary = {
  available: boolean;
  days: number;
  total: number;
  correct: number;
  accuracy: number | null;
  weakSignals: number;
  latestAt: string | null;
  buckets: ReviewEventBucket[];
  error?: string;
};

export type ReviewEventBucket = {
  targetType: ReviewEventTargetType;
  label: string;
  total: number;
  correct: number;
  accuracy: number | null;
  weakSignals: number;
  ratings: Record<ReviewRating, number>;
  latestAt: string | null;
};

type ReviewEventRow = {
  target_type: ReviewEventTargetType;
  is_correct: boolean;
  rating: ReviewRating;
  skill_area: string | null;
  reviewed_at: string;
};

type ScheduleSnapshotInput = (ReviewState & {
  next_review_date?: string | null;
  next_review_at?: string | null;
  review_date?: string | null;
  fsrs_state?: unknown;
}) | null;

const TARGET_LABELS: Record<ReviewEventTargetType, string> = {
  vocab: "Vocabulary",
  sentence: "Sentence prompts",
  grammar: "Grammar",
  roleplay_pattern: "Roleplay patterns",
  output_repair: "Output repairs",
};

export async function recordReviewEvent({
  supabase,
  userId,
  event,
}: {
  supabase: SupabaseClient;
  userId: string;
  event: ReviewEventInput;
}) {
  const { error } = await supabase.from("review_events").insert({
    user_id: userId,
    target_type: event.targetType,
    source_type: event.sourceType ?? "review_session",
    vocab_id: event.vocabId ?? null,
    review_id: event.reviewId ?? null,
    sentence_review_prompt_id: event.sentenceReviewPromptId ?? null,
    quiz_attempt_id: event.quizAttemptId ?? null,
    deck_id: event.deckId ?? null,
    quiz_type: event.quizType ?? null,
    prompt: trimNullable(event.prompt, 1200),
    user_answer: trimNullable(event.userAnswer, 1200),
    correct_answer: trimNullable(event.correctAnswer, 1200),
    is_correct: event.isCorrect,
    rating: event.rating,
    schedule_before: event.scheduleBefore ?? {},
    schedule_after: event.scheduleAfter ?? {},
    skill_area: event.skillArea ?? null,
    latency_ms: event.latencyMs ?? null,
    metadata: event.metadata ?? {},
  });

  if (!error) return { ok: true as const, recorded: true as const };
  if (isMissingReviewEventsSchemaError(error)) {
    return { ok: true as const, recorded: false as const, skipped: true as const };
  }

  return { ok: false as const, recorded: false as const, error: error.message };
}

export async function fetchReviewEventSummary({
  supabase,
  userId,
  days = 14,
}: {
  supabase: SupabaseClient;
  userId: string;
  days?: number;
}): Promise<ReviewEventSummary> {
  const safeDays = Math.max(1, Math.min(90, days));
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (safeDays - 1));
  since.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("review_events")
    .select("target_type, is_correct, rating, skill_area, reviewed_at")
    .eq("user_id", userId)
    .gte("reviewed_at", since.toISOString())
    .order("reviewed_at", { ascending: false })
    .limit(500);

  if (error) {
    return emptySummary({
      available: false,
      days: safeDays,
      error: isMissingReviewEventsSchemaError(error) ? undefined : error.message,
    });
  }

  return buildSummary((data ?? []) as ReviewEventRow[], safeDays);
}

export function reviewScheduleSnapshot(state: ScheduleSnapshotInput): Record<string, unknown> {
  if (!state) return {};
  return {
    review_count: state.review_count,
    correct_count: state.correct_count,
    incorrect_count: state.incorrect_count,
    ease_score: state.ease_score,
    status: state.status,
    stability: state.stability ?? null,
    difficulty: state.difficulty ?? null,
    lapses: state.lapses ?? null,
    is_leech: state.is_leech ?? null,
    review_date: state.review_date ?? null,
    next_review_date: state.next_review_date ?? null,
    next_review_at: state.next_review_at ?? null,
    fsrs_state: state.fsrs_state ?? null,
  };
}

export function isMissingReviewEventsSchemaError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.code === "PGRST204" ||
    (message.includes("review_events") && (
      message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("could not find")
    ))
  );
}

function buildSummary(rows: ReviewEventRow[], days: number): ReviewEventSummary {
  const buckets = new Map<ReviewEventTargetType, ReviewEventBucket>();

  for (const row of rows) {
    const targetType = row.target_type;
    const bucket = buckets.get(targetType) ?? makeBucket(targetType);
    bucket.total += 1;
    bucket.correct += row.is_correct ? 1 : 0;
    bucket.weakSignals += row.rating === "again" || row.rating === "hard" ? 1 : 0;
    bucket.ratings[row.rating] += 1;
    bucket.latestAt = latestIso(bucket.latestAt, row.reviewed_at);
    buckets.set(targetType, bucket);
  }

  const bucketList = Array.from(buckets.values())
    .map((bucket) => ({
      ...bucket,
      accuracy: percentage(bucket.correct, bucket.total),
    }))
    .sort((a, b) => b.total - a.total);
  const total = rows.length;
  const correct = rows.filter((row) => row.is_correct).length;

  return {
    available: true,
    days,
    total,
    correct,
    accuracy: percentage(correct, total),
    weakSignals: rows.filter((row) => row.rating === "again" || row.rating === "hard").length,
    latestAt: rows[0]?.reviewed_at ?? null,
    buckets: bucketList,
  };
}

function makeBucket(targetType: ReviewEventTargetType): ReviewEventBucket {
  return {
    targetType,
    label: TARGET_LABELS[targetType],
    total: 0,
    correct: 0,
    accuracy: null,
    weakSignals: 0,
    ratings: { again: 0, hard: 0, good: 0, easy: 0 },
    latestAt: null,
  };
}

function emptySummary({
  available,
  days,
  error,
}: {
  available: boolean;
  days: number;
  error?: string;
}): ReviewEventSummary {
  return {
    available,
    days,
    total: 0,
    correct: 0,
    accuracy: null,
    weakSignals: 0,
    latestAt: null,
    buckets: [],
    error,
  };
}

function percentage(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
}

function latestIso(left: string | null, right: string) {
  if (!left) return right;
  return left >= right ? left : right;
}

function trimNullable(value: string | null | undefined, maxLength: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}
