import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { nextSchedule } from "@/lib/srs";

const Body = z.object({
  vocabId: z.string().uuid(),
  deckId: z.string().uuid().optional().nullable(),
  isCorrect: z.boolean(),
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
    .select("review_count, correct_count, incorrect_count, ease_score, status")
    .eq("user_id", user.id)
    .eq("vocab_id", parsed.data.vocabId)
    .maybeSingle();

  const sched = nextSchedule(existing ?? null, parsed.data.isCorrect);

  const { error: reviewErr } = await supabase.from("reviews").upsert(
    {
      user_id: user.id,
      vocab_id: parsed.data.vocabId,
      deck_id: parsed.data.deckId ?? null,
      review_date: sched.review_date,
      next_review_date: sched.next_review_date,
      review_count: sched.review_count,
      correct_count: sched.correct_count,
      incorrect_count: sched.incorrect_count,
      ease_score: sched.ease_score,
      status: sched.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,vocab_id" },
  );
  if (reviewErr) {
    return NextResponse.json({ error: reviewErr.message }, { status: 500 });
  }

  if (parsed.data.quizType) {
    await supabase.from("quiz_attempts").insert({
      user_id: user.id,
      vocab_id: parsed.data.vocabId,
      deck_id: parsed.data.deckId ?? null,
      quiz_type: parsed.data.quizType,
      prompt: parsed.data.prompt ?? null,
      user_answer: parsed.data.userAnswer ?? null,
      correct_answer: parsed.data.correctAnswer ?? null,
      is_correct: parsed.data.isCorrect,
    });
  }

  return NextResponse.json({ ok: true, schedule: sched });
}
