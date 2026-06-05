import { NextResponse } from "next/server";
import { z } from "zod";
import { recordContentInteractionForUser } from "@/lib/actions/contentInteractions";
import { buildSentenceReviewPrompts } from "@/lib/sentenceReview";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({
  text: z.string().trim().min(1).max(800),
  reading: z.string().trim().max(400).optional().default(""),
  meaning_zh: z.string().trim().max(1200).optional().default(""),
  context: z.string().trim().max(1200).optional().default(""),
  source_title: z.string().trim().max(220).optional().default(""),
  source_path: z.string().trim().max(500).optional().default(""),
  source_surface: z.string().trim().max(80).optional().default(""),
  daily_lesson_id: z.string().uuid().optional().nullable(),
  content_item_id: z.string().uuid().optional().nullable(),
  cultural_content_id: z.string().uuid().optional().nullable(),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登入。" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "輸入錯誤：" + parsed.error.issues[0]?.message }, { status: 400 });
  }

  const text = parsed.data.text;
  const sourcePath = parsed.data.source_path;
  const isShortExpression = text.length <= 16;
  const sourceType = sourcePath.startsWith("/cultural/article/") ? "article" : "manual";
  const sourceTitle = parsed.data.source_title || parsed.data.context.slice(0, 180) || null;

  const { data: saved, error } = await supabase
    .from("mined_sentences")
    .insert({
      user_id: user.id,
      source_type: sourceType,
      source_url: sourcePath || null,
      source_title: sourceTitle,
      sentence_ja: text,
      kana_reading: parsed.data.reading || null,
      translation_zh: parsed.data.meaning_zh || "待補充",
      difficulty_jlpt: null,
      key_vocab: isShortExpression ? [text] : [],
      key_grammar: [],
      cloze_target: isShortExpression ? text : null,
    })
    .select("id, user_id, sentence_ja, kana_reading, translation_zh, difficulty_jlpt, key_vocab, key_grammar, cloze_target")
    .single();

  if (error || !saved) {
    return NextResponse.json({ error: "採礦失敗：" + (error?.message ?? "未知") }, { status: 500 });
  }

  const prompts = buildSentenceReviewPrompts(saved);
  let warning: string | null = null;
  if (prompts.length) {
    const { error: promptError } = await supabase.from("sentence_review_prompts").insert(prompts);
    if (promptError) warning = "已採礦，但複習卡建立失敗：" + promptError.message;
  }

  await recordContentInteractionForUser({
    supabase,
    userId: user.id,
    input: {
      interactionType: "mine",
      sourceSurface: parsed.data.source_surface || (sourceType === "article" ? "selection_article" : "selection_inspector"),
      deepLink: sourcePath || "/mining",
      dailyLessonId: parsed.data.daily_lesson_id ?? null,
      contentItemId: parsed.data.content_item_id ?? null,
      culturalContentId: parsed.data.cultural_content_id ?? null,
      itemsCreated: 1 + (warning ? 0 : prompts.length),
      metadata: {
        mined_sentence_id: saved.id,
        source_type: sourceType,
        review_prompts: warning ? 0 : prompts.length,
        warning,
        text_length: text.length,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    mined_sentence_id: saved.id,
    review_prompts: warning ? 0 : prompts.length,
    warning,
  });
}
