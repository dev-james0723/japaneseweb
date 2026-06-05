import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { nextSchedule, type ReviewRating } from "@/lib/srs";
import { refreshSkillRadarSnapshot } from "@/lib/learning/skillRadar";
import { recordReviewEvent, reviewScheduleSnapshot } from "@/lib/learning/reviewEvents";

const Body = z.object({
  vocabId: z.string().uuid(),
  deckId: z.string().uuid().optional().nullable(),
  isCorrect: z.boolean(),
  rating: z.enum(["again", "hard", "good", "easy"]).optional(),
  quizType: z.string().max(40).optional(),
  prompt: z.string().max(400).optional(),
  userAnswer: z.string().max(400).optional(),
  correctAnswer: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "輸入錯誤" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("reviews")
    .select("id, review_count, correct_count, incorrect_count, ease_score, status, stability, difficulty, lapses, is_leech, next_review_date, next_review_at, fsrs_state")
    .eq("user_id", user.id)
    .eq("vocab_id", parsed.data.vocabId)
    .maybeSingle();

  const sched = nextSchedule(existing ?? null, parsed.data.isCorrect, new Date(), parsed.data.rating);

  const { data: reviewRow, error: reviewErr } = await supabase.from("reviews").upsert(
    {
      user_id: user.id,
      vocab_id: parsed.data.vocabId,
      deck_id: parsed.data.deckId ?? null,
      review_date: sched.review_date,
      next_review_date: sched.next_review_date,
      next_review_at: sched.next_review_at,
      review_count: sched.review_count,
      correct_count: sched.correct_count,
      incorrect_count: sched.incorrect_count,
      ease_score: sched.ease_score,
      status: sched.status,
      stability: sched.stability,
      difficulty: sched.difficulty,
      lapses: sched.lapses,
      is_leech: sched.is_leech,
      fsrs_state: sched.fsrs_state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,vocab_id" },
  ).select("id").single();
  if (reviewErr) {
    return NextResponse.json({ error: reviewErr.message }, { status: 500 });
  }

  let quizAttemptId: string | null = null;
  if (parsed.data.quizType) {
    const { data: quizAttempt, error: quizAttemptError } = await supabase.from("quiz_attempts").insert({
      user_id: user.id,
      vocab_id: parsed.data.vocabId,
      deck_id: parsed.data.deckId ?? null,
      quiz_type: parsed.data.quizType,
      prompt: parsed.data.prompt ?? null,
      user_answer: parsed.data.userAnswer ?? null,
      correct_answer: parsed.data.correctAnswer ?? null,
      is_correct: parsed.data.isCorrect,
    }).select("id").maybeSingle();
    if (quizAttemptError) console.error("[review] quiz attempt:", quizAttemptError.message);
    quizAttemptId = quizAttempt?.id ?? null;
  }

  const rating = parsed.data.rating ?? (parsed.data.isCorrect ? "good" : "again");
  if (rating === "again" || rating === "hard" || sched.is_leech) {
    const { error: weaknessError } = await supabase.from("weakness_events").insert({
      user_id: user.id,
      source: "review",
      skill_area: vocabSkillArea(parsed.data.quizType),
      severity: weaknessSeverity(rating, sched.is_leech),
      vocab_id: parsed.data.vocabId,
      prompt: parsed.data.prompt ?? null,
      user_answer: parsed.data.userAnswer ?? null,
      correct_answer: parsed.data.correctAnswer ?? null,
      metadata: {
        deck_id: parsed.data.deckId ?? null,
        rating,
        status: sched.status,
        lapses: sched.lapses,
        review_count: sched.review_count,
        is_leech: sched.is_leech,
      },
    });
    if (weaknessError) console.error("[review] weakness event:", weaknessError.message);
  }

  const reviewEvent = await recordReviewEvent({
    supabase,
    userId: user.id,
    event: {
      targetType: "vocab",
      sourceType: "review_session",
      vocabId: parsed.data.vocabId,
      reviewId: reviewRow?.id ?? existing?.id ?? null,
      quizAttemptId,
      deckId: parsed.data.deckId ?? null,
      quizType: parsed.data.quizType ?? null,
      prompt: parsed.data.prompt ?? null,
      userAnswer: parsed.data.userAnswer ?? null,
      correctAnswer: parsed.data.correctAnswer ?? null,
      isCorrect: parsed.data.isCorrect,
      rating,
      scheduleBefore: reviewScheduleSnapshot(existing ?? null),
      scheduleAfter: reviewScheduleSnapshot(sched),
      skillArea: vocabSkillArea(parsed.data.quizType),
      metadata: {
        status: sched.status,
        lapses: sched.lapses,
        review_count: sched.review_count,
        is_leech: sched.is_leech,
        deck_id: parsed.data.deckId ?? null,
      },
    },
  });
  if (!reviewEvent.ok) console.error("[review] review event:", reviewEvent.error);

  const skillRadar = await refreshSkillRadarSnapshot({ supabase, userId: user.id });
  if (skillRadar.errors.length) {
    console.error("[review] skill radar:", skillRadar.errors.join(" / "));
  }

  return NextResponse.json({ ok: true, schedule: sched, skillRadar });
}

function vocabSkillArea(quizType?: string): string {
  if (quizType === "production") return "vocab_production";
  if (quizType === "listening") return "listening";
  return "vocab_recognition";
}

function weaknessSeverity(rating: ReviewRating, isLeech: boolean): "hard" | "miss" | "leech" {
  if (isLeech) return "leech";
  if (rating === "hard") return "hard";
  return "miss";
}
