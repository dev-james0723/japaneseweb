import Link from "next/link";
import { redirect } from "next/navigation";
import { GlassPanel } from "@/components/GlassPanel";
import { CULTURAL_CATEGORY_LABELS, type CulturalCategory } from "@/lib/cultural/categories";
import { getTodayDailyPick } from "@/lib/cultural/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CulturalGenerateForm } from "./CulturalGenerateForm";

export const dynamic = "force-dynamic";

export default async function CulturalHubPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  const [pick, channels, podcasts] = await Promise.all([
    getTodayDailyPick(supabase, session.user.id),
    supabase.from("curated_channels").select("channel_name, category, recommended_jlpt").order("channel_name"),
    supabase.from("curated_podcasts").select("podcast_name, category, recommended_jlpt").order("podcast_name"),
  ]);

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h1 className="text-xl font-semibold">🌸 Cultural Media Hub</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          日本文化沉浸引擎 — 雙語文章、每日推送、之後接 YouTube／Podcast。
        </p>
      </GlassPanel>

      <GlassPanel className="p-5">
        <h2 className="text-sm font-semibold mb-2">📌 今日推送</h2>
        {pick ? (
          <div className="space-y-2">
            <p className="font-medium">{pick.title_ja}</p>
            <p className="text-sm text-[var(--text-secondary)]">{pick.title_zh}</p>
            {pick.ai_summary_zh ? (
              <p className="text-sm leading-relaxed">{pick.ai_summary_zh}</p>
            ) : null}
            <p className="text-xs text-[var(--text-secondary)]">
              {pick.content_type} · {pick.difficulty_jlpt ?? "—"} · {pick.estimated_minutes ?? "?"} 分鐘
            </p>
            <Link
              href={`/cultural/article/${pick.id}`}
              className="inline-block text-sm font-medium text-[var(--accent)] hover:underline"
            >
              閱讀全文 →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            今日尚未生成推送。可用下方搜尋即時生成，或等每日 cron（UTC 00:00）。
          </p>
        )}
      </GlassPanel>

      <GlassPanel className="p-5">
        <h2 className="text-sm font-semibold mb-3">🔍 即時生成文化文章</h2>
        <CulturalGenerateForm />
      </GlassPanel>

      <GlassPanel className="p-5">
        <h2 className="text-sm font-semibold mb-3">📚 分類</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CULTURAL_CATEGORY_LABELS) as CulturalCategory[]).map((key) => {
            const meta = CULTURAL_CATEGORY_LABELS[key];
            return (
              <span
                key={key}
                className="text-xs px-2.5 py-1 rounded-full bg-white/10 border border-white/15"
              >
                {meta.emoji} {meta.zh}
              </span>
            );
          })}
        </div>
      </GlassPanel>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassPanel className="p-5">
          <h2 className="text-sm font-semibold mb-2">📺 Curated Channels</h2>
          <ul className="text-sm space-y-1 text-[var(--text-secondary)]">
            {(channels.data ?? []).map((c) => (
              <li key={c.channel_name}>
                {c.channel_name} · {c.recommended_jlpt ?? "—"}
              </li>
            ))}
          </ul>
        </GlassPanel>
        <GlassPanel className="p-5">
          <h2 className="text-sm font-semibold mb-2">🎙️ Curated Podcasts</h2>
          <ul className="text-sm space-y-1 text-[var(--text-secondary)]">
            {(podcasts.data ?? []).map((p) => (
              <li key={p.podcast_name}>
                {p.podcast_name} · {p.recommended_jlpt ?? "—"}
              </li>
            ))}
          </ul>
        </GlassPanel>
      </div>
    </div>
  );
}
