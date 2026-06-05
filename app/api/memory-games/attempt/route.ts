import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { refreshSkillRadarSnapshot } from "@/lib/learning/skillRadar";
import { recordGrammarExposures } from "@/lib/learning/grammarMastery";

const AttemptBody = z.object({
  gameType: z.enum([
    "kana_kanji_snap",
    "sentence_rebuild",
    "cloze_attack",
    "grammar_duel",
    "context_match",
    "mistake_doctor",
    "news_recall",
    "memory_palace",
    "conversation_next_line",
  ]),
  promptId: z.string().uuid().optional().nullable(),
  vocabId: z.string().uuid().optional().nullable(),
  prompt: z.string().min(1).max(1000),
  userAnswer: z.string().max(1000).optional().nullable(),
  correctAnswer: z.string().max(1000),
  isCorrect: z.boolean(),
  explanation: z.string().max(1000).optional().nullable(),
  responseTimeMs: z.number().int().min(0).max(1000 * 60 * 30).optional().nullable(),
  grammarTags: z.array(z.string().min(1).max(80)).max(8).optional().default([]),
  difficultyJlpt: z.enum(["N5", "N4", "N3", "N2", "N1"]).optional().nullable(),
});

const QUIZ_TYPE: Record<z.infer<typeof AttemptBody>["gameType"], string> = {
  kana_kanji_snap: "memory_kana_kanji_snap",
  sentence_rebuild: "memory_sentence_rebuild",
  cloze_attack: "memory_cloze_attack",
  grammar_duel: "memory_grammar_duel",
  context_match: "memory_context_match",
  mistake_doctor: "memory_mistake_doctor",
  news_recall: "memory_news_recall",
  memory_palace: "memory_palace",
  conversation_next_line: "memory_conversation_next_line",
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = AttemptBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "輸入錯誤" }, { status: 400 });
  }

  const quizType = QUIZ_TYPE[parsed.data.gameType];
  const { data: quizAttempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: user.id,
      quiz_type: quizType,
      prompt: parsed.data.prompt,
      vocab_id: parsed.data.vocabId ?? null,
      user_answer: parsed.data.userAnswer || null,
      correct_answer: parsed.data.correctAnswer,
      is_correct: parsed.data.isCorrect,
      explanation: parsed.data.explanation ?? null,
    })
    .select("id")
    .maybeSingle();

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  const { error: memoryAttemptError } = await supabase.from("memory_game_attempts").insert({
    user_id: user.id,
    game_type: parsed.data.gameType,
    sentence_review_prompt_id: parsed.data.promptId ?? null,
    quiz_attempt_id: (quizAttempt as { id?: string } | null)?.id ?? null,
    skill_area: skillAreaFor(parsed.data.gameType),
    difficulty_jlpt: parsed.data.difficultyJlpt ?? null,
    prompt: parsed.data.prompt,
    user_answer: parsed.data.userAnswer || null,
    correct_answer: parsed.data.correctAnswer,
    is_correct: parsed.data.isCorrect,
    response_time_ms: parsed.data.responseTimeMs ?? null,
    explanation: parsed.data.explanation ?? null,
    grammar_tags: normalizeTags(parsed.data.grammarTags),
    metadata: {
      quiz_type: quizType,
      prompt_id: parsed.data.promptId ?? null,
      vocab_id: parsed.data.vocabId ?? null,
    },
  });
  if (memoryAttemptError) {
    console.error("[memory-games] dedicated attempt:", memoryAttemptError.message);
  }

  const grammarTags = normalizeTags(parsed.data.grammarTags);
  if (grammarTags.length) {
    const grammarExposure = await recordGrammarExposures({
      supabase,
      userId: user.id,
      exposures: grammarTags.map((pattern) => ({
        pattern,
        jlptLevel: parsed.data.difficultyJlpt ?? null,
        exposureType: parsed.data.gameType === "grammar_duel" ? "contrast" : "review",
        result: parsed.data.isCorrect ? "correct" : "miss",
        sourceSurface: `memory_${parsed.data.gameType}`,
        sourceReference: (quizAttempt as { id?: string } | null)?.id ?? null,
        sentenceReviewPromptId: parsed.data.promptId ?? null,
        evidenceText: parsed.data.correctAnswer,
        metadata: {
          game_type: parsed.data.gameType,
          quiz_type: quizType,
          response_time_ms: parsed.data.responseTimeMs ?? null,
        },
      })),
    });
    if (grammarExposure.errors.length) {
      console.error("[memory-games] grammar exposure:", grammarExposure.errors.join(" / "));
    }
  }

  if (!parsed.data.isCorrect) {
    const weaknessSource = weaknessSourceFor(parsed.data.gameType, parsed.data.promptId, parsed.data.vocabId);
    const { error: weaknessError } = await supabase.from("weakness_events").insert({
      user_id: user.id,
      source: weaknessSource,
      skill_area: skillAreaFor(parsed.data.gameType),
      severity: "miss",
      vocab_id: weaknessSource === "review" ? parsed.data.vocabId : null,
      sentence_review_prompt_id: parsed.data.promptId ?? null,
      prompt: parsed.data.prompt,
      user_answer: parsed.data.userAnswer || null,
      correct_answer: parsed.data.correctAnswer,
      metadata: {
        game_type: parsed.data.gameType,
        quiz_type: quizType,
        explanation: parsed.data.explanation ?? null,
        response_time_ms: parsed.data.responseTimeMs ?? null,
        grammar_tags: grammarTags,
      },
    });
    if (weaknessError) console.error("[memory-games] weakness event:", weaknessError.message);
  }

  revalidatePath("/quizzes");
  revalidatePath("/repair");
  revalidatePath("/stats");

  const skillRadar = await refreshSkillRadarSnapshot({ supabase, userId: user.id });
  if (skillRadar.errors.length) {
    console.error("[memory-games] skill radar:", skillRadar.errors.join(" / "));
  }

  return NextResponse.json({ ok: true, skillRadar });
}

function skillAreaFor(gameType: z.infer<typeof AttemptBody>["gameType"]) {
  if (gameType === "kana_kanji_snap") return "vocab_recognition";
  if (gameType === "memory_palace") return "vocab_production";
  if (gameType === "cloze_attack") return "sentence_cloze";
  if (gameType === "grammar_duel") return "grammar";
  if (gameType === "mistake_doctor") return "output";
  if (gameType === "news_recall") return "output";
  if (gameType === "context_match" || gameType === "conversation_next_line") return "pragmatics";
  return "sentence_production";
}

function weaknessSourceFor(
  gameType: z.infer<typeof AttemptBody>["gameType"],
  promptId: string | null | undefined,
  vocabId: string | null | undefined,
) {
  if (gameType === "kana_kanji_snap" && vocabId) return "review";
  if (gameType === "mistake_doctor") return "grammar";
  if (gameType === "conversation_next_line") return "roleplay";
  if (promptId) return "sentence_review";
  return "weekly_review";
}

function normalizeTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).slice(0, 8);
}
