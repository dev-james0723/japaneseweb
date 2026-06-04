import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  GraduationCap,
  ListChecks,
  Podcast,
  Radio,
  Route,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import {
  CULTURAL_CATEGORY_LABELS,
  isCulturalCategory,
} from "@/lib/cultural/categories";
import { getTodayDailyPick } from "@/lib/cultural/queries";
import { todayDateString } from "@/lib/os/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CulturalGenerateForm } from "./CulturalGenerateForm";

export const dynamic = "force-dynamic";

type RecentArticle = {
  id: string;
  title_ja: string;
  title_zh: string;
  category: string | null;
  difficulty_jlpt: string | null;
  estimated_minutes: number | null;
};

type CuratedChannel = {
  channel_name: string;
  category: string | null;
  recommended_jlpt: string | null;
};

type CuratedPodcast = {
  podcast_name: string;
  category: string | null;
  recommended_jlpt: string | null;
};

export default async function CulturalHubPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  const today = todayDateString();
  const [pick, channels, podcasts, recentArticles, settings] = await Promise.all([
    getTodayDailyPick(supabase, session.user.id),
    supabase.from("curated_channels").select("channel_name, category, recommended_jlpt").order("channel_name"),
    supabase.from("curated_podcasts").select("podcast_name, category, recommended_jlpt").order("podcast_name"),
    supabase
      .from("cultural_contents")
      .select("id, title_ja, title_zh, category, difficulty_jlpt, estimated_minutes")
      .eq("user_id", session.user.id)
      .eq("content_type", "article")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("user_os_settings").select("current_phase").eq("user_id", session.user.id).maybeSingle(),
  ]);

  const phase = Math.min(6, Math.max(1, settings.data?.current_phase ?? 1));
  const recent = (recentArticles.data ?? []) as RecentArticle[];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <GlassPanel className="p-6 md:p-7">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="section-eyebrow">文化沉浸</span>
            <span className="chip">Phase {phase}</span>
            <span className="chip">{today}</span>
          </div>
          <h1 className="heading-balance max-w-3xl text-2xl font-semibold leading-tight md:text-4xl">
            由 AI 日本語教授替你揀文化入口，再把故事拆成可記得住的日文。
          </h1>
          <p className="body-pretty mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            文化頁的核心不是叫你搜尋資料，而是每天給你一個有語言價值的場景：讀一段日文、拆幾個漢字、看香港視角，最後帶回複習系統。
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <LearningStep icon={BookOpen} label="讀故事" detail="日文與繁中並排" />
            <LearningStep icon={Brain} label="拆語感" detail="漢字、假名、關鍵句" />
            <LearningStep icon={Route} label="回到記憶" detail="詞彙與文法可複習" />
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold">今日教授推送</h2>
          </div>
          {pick ? (
            <div className="space-y-4">
              <div>
                <p className="font-jp text-lg font-semibold leading-relaxed">{pick.title_ja}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{pick.title_zh}</p>
              </div>
              {pick.ai_summary_zh ? (
                <p className="body-pretty border-l border-[var(--accent-lime)]/50 pl-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {pick.ai_summary_zh}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                <span className="chip">{formatCategory(pick.category)}</span>
                <span className="chip">{pick.difficulty_jlpt ?? "難度待定"}</span>
                <span className="chip">{pick.estimated_minutes ?? "?"} 分鐘</span>
              </div>
              <Link href={`/cultural/article/${pick.id}`} className="btn-primary text-sm">
                開始今日文化課
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="body-pretty text-sm leading-7 text-[var(--text-secondary)]">
                今日還未有推送。直接按下面的教授策展，系統會即時替你挑題並生成今日課。
              </p>
              <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-sm font-semibold">我會建議你由「語言歷史」或「生活小眾」開始。</p>
                <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                  對中文母語者來說，這兩類最容易把漢字、假名、語感與真實生活連起來。
                </p>
              </div>
            </div>
          )}
        </GlassPanel>
      </section>

      <GlassPanel className="p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
              <h2 className="text-base font-semibold">教授策展台</h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              題材可以留空；AI 會用你的學習階段、近期閱讀與季節自動挑一課。
            </p>
          </div>
        </div>
        <CulturalGenerateForm hasDailyPick={Boolean(pick)} />
      </GlassPanel>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)]">
        <GlassPanel className="p-5 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold">最近文化課</h2>
          </div>
          {recent.length > 0 ? (
            <div className="divide-y divide-white/10">
              {recent.map((article) => (
                <Link
                  key={article.id}
                  href={`/cultural/article/${article.id}`}
                  className="group block py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-jp text-sm font-semibold group-hover:text-[var(--accent-lime)]">
                        {article.title_ja}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                        {article.title_zh}
                      </p>
                    </div>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent-lime)]" aria-hidden="true" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                    <span>{formatCategory(article.category)}</span>
                    <span>{article.difficulty_jlpt ?? "難度待定"}</span>
                    <span>{article.estimated_minutes ?? "?"} 分鐘</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              完成第一課後，這裡會變成你的文化閱讀軌跡。
            </p>
          )}
        </GlassPanel>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          <ResourcePanel
            icon={Radio}
            title="可延伸觀看"
            resources={(channels.data ?? []) as CuratedChannel[]}
            getName={(item) => item.channel_name}
          />
          <ResourcePanel
            icon={Podcast}
            title="可延伸聆聽"
            resources={(podcasts.data ?? []) as CuratedPodcast[]}
            getName={(item) => item.podcast_name}
          />
        </div>
      </section>
    </div>
  );
}

function LearningStep({
  icon: Icon,
  label,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
      <Icon className="mb-3 h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}

function ResourcePanel<T extends { category: string | null; recommended_jlpt: string | null }>({
  icon: Icon,
  title,
  resources,
  getName,
}: {
  icon: LucideIcon;
  title: string;
  resources: T[];
  getName: (item: T) => string;
}) {
  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="divide-y divide-white/10">
        {resources.map((item) => (
          <div key={getName(item)} className="py-2.5 first:pt-0 last:pb-0">
            <p className="text-sm font-medium">{getName(item)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{item.recommended_jlpt ?? "難度待定"}</span>
              <span>{formatCategory(item.category)}</span>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

function formatCategory(category: string | null): string {
  if (category && isCulturalCategory(category)) {
    return CULTURAL_CATEGORY_LABELS[category].zh;
  }
  return "文化素材";
}
