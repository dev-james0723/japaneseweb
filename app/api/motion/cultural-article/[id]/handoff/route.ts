import { NextResponse } from "next/server";
import { buildCulturalArticleMotionHandoff } from "@/lib/motion/culturalArticleMotion";
import {
  culturalContentRowToGeneratedArticle,
  fetchLatestCulturalArticleMotionJob,
} from "@/lib/motion/culturalArticleMotionJobs";
import { buildFallbackArticleMotionManifest } from "@/lib/motion/culturalArticleMotionManifest";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from("cultural_contents")
    .select(
      "id, user_id, category, title_ja, title_zh, ai_summary_ja, ai_summary_zh, body_paragraphs, body_ja, body_zh, difficulty_jlpt, estimated_minutes, key_vocab, key_grammar, cultural_notes, cantonese_lens",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row || (row.user_id && row.user_id !== session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const article = culturalContentRowToGeneratedArticle(row);
  const job = await fetchLatestCulturalArticleMotionJob(supabase, {
    userId: session.user.id,
    articleId: row.id,
    article,
    category: row.category,
  });
  const manifest =
    job?.manifest ??
    buildFallbackArticleMotionManifest({
      articleId: row.id,
      article,
      category: row.category,
    });

  return NextResponse.json({
    job: job
      ? {
          id: job.id,
          status: job.status,
          render_requested_at: job.renderRequestedAt,
          updated_at: job.updatedAt,
          outputs: job.outputs,
        }
      : null,
    manifest,
    handoff: buildCulturalArticleMotionHandoff({
      articleId: row.id,
      manifest,
    }),
  });
}
