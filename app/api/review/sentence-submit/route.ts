import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { nextSchedule, type ReviewRating } from "@/lib/srs";
import { refreshSkillRadarSnapshot } from "@/lib/learning/skillRadar";
import { recordGrammarExposures } from "@/lib/learning/grammarMastery";
import { recordReviewEvent, reviewScheduleSnapshot } from "@/lib/learning/reviewEvents";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const Body = z.object({
  promptId: z.string().uuid(),
  isCorrect: z.boolean(),
  rating: z.enum(["again", "hard", "good", "easy"]).optional(),
  quizType: z.string().max(40).optional(),
  prompt: z.string().max(800).optional(),
  userAnswer: z.string().max(800).optional(),
  correctAnswer: z.string().max(800).optional(),
  speechTranscript: z.string().max(1000).optional().nullable(),
  shadowingDurationMs: z.number().int().min(0).max(600_000).optional().nullable(),
  speechFeedback: z.object({
    score: z.number().int().min(0).max(100).optional().nullable(),
    notes: z.array(z.string().max(180)).max(6).optional(),
    recognitionSupported: z.boolean().optional(),
  }).optional().nullable(),
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
    .select("review_count, correct_count, incorrect_count, ease_score, status, stability, difficulty, lapses, is_leech, key_grammar, sentence_ja, translation_zh, prompt_type, prompt, answer")
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

  let quizAttemptId: string | null = null;
  if (parsed.data.quizType) {
    const { data: quizAttempt, error: quizAttemptError } = await supabase.from("quiz_attempts").insert({
      user_id: user.id,
      quiz_type: parsed.data.quizType,
      prompt: parsed.data.prompt ?? null,
      user_answer: parsed.data.userAnswer ?? null,
      correct_answer: parsed.data.correctAnswer ?? null,
      is_correct: parsed.data.isCorrect,
    }).select("id").maybeSingle();
    if (quizAttemptError) console.error("[sentence review] quiz attempt:", quizAttemptError.message);
    quizAttemptId = quizAttempt?.id ?? null;
  }

  const rating = parsed.data.rating ?? (parsed.data.isCorrect ? "good" : "again");
  const grammarTags = normalizeGrammarTags(existing.key_grammar);
  if (grammarTags.length > 0) {
    const grammarExposure = await recordGrammarExposures({
      supabase,
      userId: user.id,
      exposures: grammarTags.map((pattern) => ({
        pattern,
        exposureType: "review",
        result: grammarExposureResult(rating, parsed.data.isCorrect, sched.is_leech),
        sourceSurface: parsed.data.quizType ? `sentence_review_${parsed.data.quizType}` : "sentence_review",
        sourceReference: parsed.data.promptId,
        sentenceReviewPromptId: parsed.data.promptId,
        evidenceText: parsed.data.correctAnswer || existing.sentence_ja,
        metadata: {
          rating,
          quiz_type: parsed.data.quizType ?? null,
          speech_transcript: parsed.data.speechTranscript ?? null,
          speech_feedback: parsed.data.speechFeedback ?? null,
          shadowing_duration_ms: parsed.data.shadowingDurationMs ?? null,
          status: sched.status,
          lapses: sched.lapses,
          review_count: sched.review_count,
          is_leech: sched.is_leech,
        },
      })),
    });
    if (grammarExposure.errors.length) {
      console.error("[sentence review] grammar exposure:", grammarExposure.errors.join(" / "));
    }
  }

  if (rating === "again" || rating === "hard" || sched.is_leech) {
    const severity = weaknessSeverity(rating, sched.is_leech);
    const { error: weaknessError } = await supabase.from("weakness_events").insert({
      user_id: user.id,
      source: "sentence_review",
      skill_area: sentenceSkillArea(parsed.data.quizType),
      severity,
      sentence_review_prompt_id: parsed.data.promptId,
      prompt: parsed.data.prompt ?? null,
      user_answer: parsed.data.userAnswer ?? null,
      correct_answer: parsed.data.correctAnswer ?? null,
      metadata: {
        rating,
        quiz_type: parsed.data.quizType ?? null,
        speech_transcript: parsed.data.speechTranscript ?? null,
        speech_feedback: parsed.data.speechFeedback ?? null,
        shadowing_duration_ms: parsed.data.shadowingDurationMs ?? null,
        grammar_tags: grammarTags,
        sentence_ja: existing.sentence_ja,
        translation_zh: existing.translation_zh,
        status: sched.status,
        lapses: sched.lapses,
        review_count: sched.review_count,
        is_leech: sched.is_leech,
      },
    });
    if (weaknessError) console.error("[sentence review] weakness event:", weaknessError.message);

    if (grammarTags.length > 0) {
      await recordGrammarWeaknesses(supabase, {
        userId: user.id,
        promptId: parsed.data.promptId,
        grammarTags,
        severity,
        prompt: parsed.data.prompt ?? null,
        userAnswer: parsed.data.userAnswer ?? null,
        correctAnswer: parsed.data.correctAnswer ?? null,
        sentenceJa: existing.sentence_ja,
        translationZh: existing.translation_zh,
      });
    }
  }

  const reviewEvent = await recordReviewEvent({
    supabase,
    userId: user.id,
    event: {
      targetType: "sentence",
      sourceType: parsed.data.quizType === "shadowing" ? "shadowing" : "sentence_review",
      sentenceReviewPromptId: parsed.data.promptId,
      quizAttemptId,
      quizType: parsed.data.quizType ?? existing.prompt_type ?? null,
      prompt: parsed.data.prompt ?? existing.prompt,
      userAnswer: parsed.data.userAnswer ?? null,
      correctAnswer: parsed.data.correctAnswer ?? existing.answer,
      isCorrect: parsed.data.isCorrect,
      rating,
      scheduleBefore: reviewScheduleSnapshot(existing),
      scheduleAfter: reviewScheduleSnapshot(sched),
      skillArea: sentenceSkillArea(parsed.data.quizType),
      metadata: {
        grammar_tags: grammarTags,
        sentence_ja: existing.sentence_ja,
        translation_zh: existing.translation_zh,
        prompt_type: existing.prompt_type,
        speech_transcript: parsed.data.speechTranscript ?? null,
        speech_feedback: parsed.data.speechFeedback ?? null,
        shadowing_duration_ms: parsed.data.shadowingDurationMs ?? null,
        status: sched.status,
        lapses: sched.lapses,
        review_count: sched.review_count,
        is_leech: sched.is_leech,
      },
    },
  });
  if (!reviewEvent.ok) console.error("[sentence review] review event:", reviewEvent.error);

  const skillRadar = await refreshSkillRadarSnapshot({ supabase, userId: user.id });
  if (skillRadar.errors.length) {
    console.error("[sentence review] skill radar:", skillRadar.errors.join(" / "));
  }

  return NextResponse.json({ ok: true, schedule: sched, skillRadar });
}

function sentenceSkillArea(quizType?: string): string {
  if (quizType === "cloze") return "sentence_cloze";
  if (quizType === "production") return "sentence_production";
  if (quizType === "listening") return "listening";
  if (quizType === "shadowing") return "shadowing";
  return "output";
}

function weaknessSeverity(rating: ReviewRating, isLeech: boolean): "hard" | "miss" | "leech" {
  if (isLeech) return "leech";
  if (rating === "hard") return "hard";
  return "miss";
}

function grammarExposureResult(rating: ReviewRating, isCorrect: boolean, isLeech: boolean) {
  if (isLeech) return "leech";
  if (isCorrect && (rating === "good" || rating === "easy")) return "correct";
  if (rating === "hard") return "hard";
  if (!isCorrect || rating === "again") return "miss";
  return "correct";
}

function normalizeGrammarTags(tags: string[] | null | undefined) {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 5),
    ),
  );
}

async function recordGrammarWeaknesses(
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    promptId: string;
    grammarTags: string[];
    severity: "hard" | "miss" | "leech";
    prompt: string | null;
    userAnswer: string | null;
    correctAnswer: string | null;
    sentenceJa: string;
    translationZh: string | null;
  },
) {
  const commonMistake = buildGrammarCommonMistake(input);
  const { error: eventError } = await supabase.from("weakness_events").insert(
    input.grammarTags.map((pattern) => ({
      user_id: input.userId,
      source: "grammar",
      skill_area: "grammar",
      severity: input.severity,
      sentence_review_prompt_id: input.promptId,
      prompt: input.prompt,
      user_answer: input.userAnswer,
      correct_answer: input.correctAnswer,
      metadata: {
        pattern,
        sentence_ja: input.sentenceJa,
        translation_zh: input.translationZh,
        source: "sentence_review",
      },
    })),
  );
  if (eventError) console.error("[sentence review] grammar weakness events:", eventError.message);

  const { data: existingPoints, error: pointLoadError } = await supabase
    .from("grammar_points")
    .select("id, pattern, active_stage, common_mistake")
    .eq("user_id", input.userId)
    .in("pattern", input.grammarTags);
  if (pointLoadError) {
    console.error("[sentence review] grammar point load:", pointLoadError.message);
    return;
  }

  const existingByPattern = new Map((existingPoints ?? []).map((point) => [point.pattern, point]));
  const now = new Date().toISOString();

  await Promise.all(
    (existingPoints ?? []).map((point) =>
      supabase
        .from("grammar_points")
        .update({
          active_stage: Math.min(point.active_stage ?? 2, 2),
          common_mistake: point.common_mistake || commonMistake,
          updated_at: now,
        })
        .eq("user_id", input.userId)
        .eq("id", point.id),
    ),
  );

  const missingRows = input.grammarTags
    .filter((pattern) => !existingByPattern.has(pattern))
    .map((pattern) => ({
      user_id: input.userId,
      pattern,
      core_meaning: "Review 入面暴露出的文法弱點。",
      common_mistake: commonMistake,
      examples: [
        {
          sentence_ja: input.sentenceJa,
          translation_zh: input.translationZh,
          prompt: input.prompt,
          correct_answer: input.correctAnswer,
        },
      ],
      active_stage: 1,
      source_type: "sentence_review_weakness",
      source_reference: input.promptId,
    }));

  if (missingRows.length > 0) {
    const { error: insertError } = await supabase.from("grammar_points").insert(missingRows);
    if (insertError) console.error("[sentence review] grammar point insert:", insertError.message);
  }
}

function buildGrammarCommonMistake(input: {
  prompt: string | null;
  correctAnswer: string | null;
  sentenceJa: string;
}) {
  const answer = input.correctAnswer || input.sentenceJa;
  if (!input.prompt) return `Review miss: ${answer}`;
  return `Review miss: ${input.prompt} → ${answer}`;
}
