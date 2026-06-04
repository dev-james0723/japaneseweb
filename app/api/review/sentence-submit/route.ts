import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { nextSchedule } from "@/lib/srs";

const Body = z.object({
  promptId: z.string().uuid(),
  isCorrect: z.boolean(),
  rating: z.enum(["again", "hard", "good", "easy"]).optional(),
  quizType: z.string().max(40).optional(),
  prompt: z.string().max(800).optional(),
  userAnswer: z.string().max(800).optional(),
  correctAnswer: z.string().max(800).optional(),
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

  const { data: existing, error: loadError } = await supabase
    .from("sentence_review_prompts")
    .select("review_count, correct_count, incorrect_count, ease_score, status, stability, difficulty, lapses, is_leech")
    .eq("user_id", user.id)
    .eq("id", parsed.data.promptId)
    .maybeSingle();

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "找不到複習卡" }, { status: 404 });

  const sched = nextSchedule(existing, parsed.data.isCorrect, new Date(), parsed.data.rating);

  const { error: reviewErr } = await supabase
    .from("sentence_review_prompts")
    .update({
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
    })
    .eq("user_id", user.id)
    .eq("id", parsed.data.promptId);

  if (reviewErr) return NextResponse.json({ error: reviewErr.message }, { status: 500 });

  if (parsed.data.quizType) {
    await supabase.from("quiz_attempts").insert({
      user_id: user.id,
      quiz_type: parsed.data.quizType,
      prompt: parsed.data.prompt ?? null,
      user_answer: parsed.data.userAnswer ?? null,
      correct_answer: parsed.data.correctAnswer ?? null,
      is_correct: parsed.data.isCorrect,
    });
  }

  return NextResponse.json({ ok: true, schedule: sched });
}
