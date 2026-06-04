import { redirect } from "next/navigation";
import { MotionLabShowcase } from "@/components/MotionLabShowcase";
import { buildCulturalArticleRecapProps } from "@/lib/motion/culturalArticleMotion";
import { fetchLatestUserCulturalArticleMotionJob } from "@/lib/motion/culturalArticleMotionJobs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MotionLabPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  const latest = await fetchLatestUserCulturalArticleMotionJob(supabase, session.user.id);
  return (
    <MotionLabShowcase
      latest={latest
        ? {
            articleId: latest.articleId,
            titleZh: latest.titleZh,
            props: buildCulturalArticleRecapProps({
              titleJa: latest.article.title_ja,
              titleZh: latest.article.title_zh,
              summaryZh: latest.article.summary_zh,
              vocab: latest.article.key_vocab.map((item) => item.word),
              manifest: latest.job.manifest,
            }),
            job: latest.job,
          }
        : null}
    />
  );
}
