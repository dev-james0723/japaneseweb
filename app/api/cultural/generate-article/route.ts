import { NextResponse } from "next/server";
import { CULTURAL_CATEGORIES } from "@/lib/cultural/categories";
import {
  fetchCulturalUserContext,
  generateCulturalArticle,
  resolveCategoryForUser,
  saveCulturalArticle,
} from "@/lib/cultural/generateArticle";
import { GenerateArticleRequestSchema } from "@/lib/cultural/schemas";
import { todayDateString } from "@/lib/os/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { postgrestUserMessage } from "@/lib/supabase/postgrestUserMessage";

export const runtime = "nodejs";
export const maxDuration = 120;

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

  let article;
  try {
    article = await generateCulturalArticle({
      topic,
      category,
      userPhase: ctx.phase,
      languageBlendOverride: ctx.languageBlendOverride,
    });
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

  let contentId: string | null = null;
  if (save) {
    try {
      const today = todayDateString();
      const { id } = await saveCulturalArticle(supabase, article, {
        userId: user.id,
        category,
        isDailyPick: as_daily_pick,
        dailyPickDate: as_daily_pick ? today : undefined,
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
    content_id: contentId,
  });
}

/** GET — category list for clients */
export async function GET() {
  return NextResponse.json({
    categories: CULTURAL_CATEGORIES,
  });
}
