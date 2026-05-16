import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/ai/openai";
import { generateStorylineGroupImage } from "@/lib/vocabularyMemory/generateStorylineImage";

export const runtime = "nodejs";
export const maxDuration = 120;

const RequestSchema = z.object({
  groupId: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ error: "尚未設定 OPENAI_API_KEY。" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "輸入錯誤" }, { status: 400 });
  }

  const { data: group } = await supabase
    .from("vocabulary_storyline_groups")
    .select(
      "id, session_id, image_prompt, title_traditional_chinese, storyline_japanese, storyline_traditional_chinese, words",
    )
    .eq("id", parsed.data.groupId)
    .maybeSingle();

  if (!group) {
    return NextResponse.json({ error: "找不到故事線群組。" }, { status: 404 });
  }

  const words = (group.words ?? []) as Array<{
    word: string;
    reading?: string | null;
    meaningTraditionalChinese?: string | null;
    visualAnchor?: string | null;
  }>;

  const { data: vs } = await supabase
    .from("vocabulary_sessions")
    .select("user_id, id")
    .eq("id", group.session_id)
    .maybeSingle();

  if (!vs || vs.user_id !== user.id) {
    return NextResponse.json({ error: "無權限。" }, { status: 403 });
  }

  const sessionId = vs.id;
  const fullStored = (group.image_prompt as string) ?? "";
  const plannerEnglish = plannerEnglishFromStoredImagePrompt(fullStored);

  await supabase
    .from("vocabulary_storyline_groups")
    .update({
      generation_status: "generating",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", group.id);

  const img = await generateStorylineGroupImage({
    openai,
    userId: user.id,
    sessionId,
    groupId: group.id,
    storyline: {
      titleTraditionalChinese: group.title_traditional_chinese,
      storylineJapanese: group.storyline_japanese,
      storylineTraditionalChinese: group.storyline_traditional_chinese,
      words,
      plannerImagePromptEnglish: plannerEnglish,
    },
  });

  if (img.ok) {
    await supabase
      .from("vocabulary_storyline_groups")
      .update({
        generation_status: "completed",
        image_url: img.imageUrl,
        storage_path: img.storagePath,
        model: img.model,
        image_prompt: img.prompt,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", group.id);
    return NextResponse.json({ ok: true, imageUrl: img.imageUrl });
  }

  await supabase
    .from("vocabulary_storyline_groups")
    .update({
      generation_status: "failed",
      error_message: img.error,
      updated_at: new Date().toISOString(),
    })
    .eq("id", group.id);

  return NextResponse.json({ ok: false, error: img.error }, { status: 502 });
}

function extractBetween(text: string, start: string, end: string): string {
  const i = text.indexOf(start);
  if (i === -1) return "";
  const j = text.indexOf(end, i + start.length);
  const slice = j === -1 ? text.slice(i + start.length) : text.slice(i + start.length, j);
  return slice.trim();
}

/**
 * After a successful run, `image_prompt` holds the full structured prompt. Extract the planner English
 * block for regeneration. Legacy rows store only the short planner string (no "ADDITIONAL SCENE DIRECTION").
 */
function plannerEnglishFromStoredImagePrompt(stored: string): string {
  const s = stored.trim();
  if (!s) {
    return "Emphasize vivid, memorable depiction of all vocabulary in one coherent scene.";
  }
  const marker =
    "ADDITIONAL SCENE DIRECTION (English — from vocabulary planner; follow closely)";
  if (!s.includes(marker)) {
    return s;
  }
  const inner = extractBetween(s, marker, "IMAGE REQUIREMENTS").trim();
  if (inner) return inner;
  return "Emphasize vivid, memorable depiction of all vocabulary in one coherent scene.";
}
