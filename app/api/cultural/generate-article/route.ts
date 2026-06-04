import { NextResponse } from "next/server";
import {
  CULTURAL_CATEGORIES,
  CULTURAL_CATEGORY_LABELS,
} from "@/lib/cultural/categories";
import {
  clearExistingDailyPick,
  fetchRecentTopics,
  fetchCulturalUserContext,
  generateCulturalArticle,
  resolveCategoryForUser,
  saveCulturalArticle,
  suggestCulturalTopic,
} from "@/lib/cultural/generateArticle";
import { generateCulturalArticleThumbnail } from "@/lib/cultural/generateThumbnail";
import { generateCantoneseLensIllustration } from "@/lib/cultural/generateSectionImage";
import {
  GenerateArticleRequestSchema,
  type GeneratedCulturalArticle,
} from "@/lib/cultural/schemas";
import { todayDateString } from "@/lib/os/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { postgrestUserMessage } from "@/lib/supabase/postgrestUserMessage";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = GenerateArticleRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "輸入錯誤：" + parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const { topic, category: categoryInput, save, as_daily_pick } = parsed.data;

  const ctx = await fetchCulturalUserContext(supabase, user.id);

  const category = resolveCategoryForUser(ctx, categoryInput);
  let resolvedTopic = topic;
  let aiPickedTopic = false;

  if (!resolvedTopic) {
    aiPickedTopic = true;
    const avoidTopics = await fetchRecentTopics(supabase, user.id);
    try {
      const suggestion = await suggestCulturalTopic({
        category,
        phase: ctx.phase,
        avoidTopics,
      });
      resolvedTopic = suggestion.topic;
    } catch {
      resolvedTopic = `今日的${CULTURAL_CATEGORY_LABELS[category].zh}觀察`;
    }
  }

  const thumbnailPromise = generateCulturalArticleThumbnail({
    userId: user.id,
    topic: resolvedTopic,
    category,
  });

  let article: GeneratedCulturalArticle;
  let thumbnailUrl: string | null = null;
  try {
    [article, thumbnailUrl] = await Promise.all([
      generateCulturalArticle({
        topic: resolvedTopic,
        category,
        userPhase: ctx.phase,
        languageBlendOverride: ctx.languageBlendOverride,
      }),
      thumbnailPromise,
    ]);
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    if (err === "GEMINI_API_KEY_NOT_SET") {
      return NextResponse.json(
        {
          error:
            "尚未設定 GEMINI_API_KEY。請在 .env.local 或 Vercel 設定後重新部署。",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "文化文章生成失敗：" + err },
      { status: 502 },
    );
  }

  const cantoneseLensImage = await generateCantoneseLensIllustration({
    userId: user.id,
    article,
    category,
  });

  let contentId: string | null = null;
  if (save) {
    try {
      const today = todayDateString();
      if (as_daily_pick) {
        await clearExistingDailyPick(supabase, user.id, today);
      }
      const { id } = await saveCulturalArticle(supabase, article, {
        userId: user.id,
        category,
        isDailyPick: as_daily_pick,
        dailyPickDate: as_daily_pick ? today : undefined,
        thumbnailUrl,
        cantoneseLensImageUrl: cantoneseLensImage?.imageUrl ?? null,
        cantoneseLensImagePrompt: cantoneseLensImage?.prompt ?? null,
      });
      contentId = id;
      if (as_daily_pick) {
        await supabase
          .from("cultural_preferences")
          .update({
            last_pushed_category: category,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      }
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string };
      const msg = postgrestUserMessage(err as Parameters<typeof postgrestUserMessage>[0]);
      if (/does not exist|schema cache|PGRST205/i.test(msg + (err.code ?? ""))) {
        return NextResponse.json(
          {
            error:
              "文化內容資料表尚未建立。請先執行 supabase migration 0007_cultural_media_hub.sql（npm run db:apply）。",
            article,
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: msg, article }, { status: 500 });
    }
  }

  return NextResponse.json({
    article,
    category,
    phase: ctx.phase,
    topic: resolvedTopic,
    ai_picked_topic: aiPickedTopic,
    thumbnail_url: thumbnailUrl,
    cantonese_lens_image: cantoneseLensImage,
    content_id: contentId,
  });
}

/** GET — category list for clients */
export async function GET() {
  return NextResponse.json({
    categories: CULTURAL_CATEGORIES,
  });
}
