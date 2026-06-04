import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cultural/cronAuth";
import {
  culturalContentRowToGeneratedArticle,
  requestCulturalArticleMotionRender,
} from "@/lib/motion/culturalArticleMotionJobs";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const serverClient = await createSupabaseServerClient();
  const {
    data: { session },
  } = await serverClient.auth.getSession();

  const cronAuthorized = !session?.user && authorizeCronRequest(req);
  let supabase = serverClient;
  if (cronAuthorized) {
    try {
      supabase = createSupabaseServiceClient();
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Service client unavailable" },
        { status: 503 },
      );
    }
  }

  if (!session?.user && !cronAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from("cultural_contents")
    .select(
      "id, user_id, category, title_ja, title_zh, ai_summary_ja, ai_summary_zh, body_paragraphs, body_ja, body_zh, difficulty_jlpt, estimated_minutes, key_vocab, key_grammar, cultural_notes, cantonese_lens",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row?.user_id) return NextResponse.json({ error: "Article not found" }, { status: 404 });
  if (session?.user && row.user_id !== session.user.id) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const article = culturalContentRowToGeneratedArticle(row);
  const job = await requestCulturalArticleMotionRender(supabase, {
    userId: row.user_id,
    articleId: row.id,
    article,
    category: row.category,
  });

  if (!job) {
    return NextResponse.json(
      { error: "Unable to create article motion render job." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    job: {
      id: job.id,
      status: job.status,
      render_requested_at: job.renderRequestedAt,
      outputs: job.outputs,
    },
    manifest: job.manifest,
  });
}
