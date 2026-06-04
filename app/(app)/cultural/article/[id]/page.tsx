import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  ExternalLink,
  FileText,
  GraduationCap,
  Headphones,
  ImageIcon,
  Languages,
  Lightbulb,
  Quote,
  Search,
  Youtube,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { FuriganaText } from "@/components/FuriganaText";
import { JapaneseSentence } from "@/components/JapaneseSentence";
import { KanaKanjiBridge } from "@/components/KanaKanjiBridge";
import { QuickSaveButton } from "@/components/QuickSaveButton";
import type { GeneratedCulturalArticle } from "@/lib/cultural/schemas";
import { stripInlineKanaReadings } from "@/lib/furigana";
import { cleanAiTextBlock } from "@/lib/text/cleanAiText";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Paragraph = { ja: string; zh: string; kana_ruby?: string };
type Channel = {
  channel_id: string;
  channel_name: string;
  recommended_jlpt: string | null;
  description: string | null;
};
type Podcast = {
  podcast_name: string;
  rss_url: string;
  recommended_jlpt: string | null;
  description: string | null;
};
type Resource = {
  type: "article" | "video" | "podcast" | "search";
  title: string;
  description: string;
  href: string;
};

export default async function CulturalArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  const { data: row, error } = await supabase
    .from("cultural_contents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) notFound();
  if (row.user_id && row.user_id !== session.user.id) notFound();

  const [channels, podcasts] = await Promise.all([
    supabase
      .from("curated_channels")
      .select("channel_id, channel_name, recommended_jlpt, description")
      .eq("category", row.category)
      .limit(3),
    supabase
      .from("curated_podcasts")
      .select("podcast_name, rss_url, recommended_jlpt, description")
      .eq("category", row.category)
      .limit(3),
  ]);

  const titleJa = stripInlineKanaReadings(row.title_ja);
  const titleZh = cleanAiTextBlock(row.title_zh);
  const summaryZh = cleanAiTextBlock(row.ai_summary_zh);
  const culturalNotes = cleanAiTextBlock(row.cultural_notes);
  const cantoneseLens = cleanAiTextBlock(row.cantonese_lens);
  const cantoneseLensImageUrl = row.cantonese_lens_image_url?.trim() || null;
  const paragraphs = ((row.body_paragraphs as Paragraph[] | null) ?? []).map((paragraph) => ({
    ...paragraph,
    ja: stripInlineKanaReadings(paragraph.ja),
    zh: cleanAiTextBlock(paragraph.zh),
  }));
  const keyVocab = ((row.key_vocab as GeneratedCulturalArticle["key_vocab"]) ?? []).map((vocab) => ({
    ...vocab,
    word: stripInlineKanaReadings(vocab.word),
    example_sentence: stripInlineKanaReadings(vocab.example_sentence ?? ""),
  }));
  const keyGrammar = ((row.key_grammar as GeneratedCulturalArticle["key_grammar"]) ?? []).map((grammar) => ({
    ...grammar,
    meaning_zh: cleanAiTextBlock(grammar.meaning_zh),
    example_ja: stripInlineKanaReadings(grammar.example_ja),
  }));
  const resources = buildResourcePack({
    titleJa,
    titleZh,
    channels: (channels.data ?? []) as Channel[],
    podcasts: (podcasts.data ?? []) as Podcast[],
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/cultural" className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        返回文化沉浸
      </Link>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <GlassPanel className="p-6 md:p-7">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="chip">{row.difficulty_jlpt ?? "難度待定"}</span>
            <span className="chip">{row.estimated_minutes ?? "?"} 分鐘</span>
            <span className="chip">文化閱讀</span>
          </div>
          <h1 className="heading-balance font-jp text-2xl font-semibold leading-relaxed md:text-4xl">
            <FuriganaText text={titleJa} inline size="lg" className="text-2xl md:text-4xl" />
          </h1>
          <p className="mt-4 text-lg text-[var(--text-secondary)]">{titleZh}</p>
          {summaryZh ? (
            <p className="body-pretty mt-5 max-w-3xl border-l border-[var(--accent-lime)]/50 pl-4 text-sm leading-7 text-[var(--text-secondary)]">
              {summaryZh}
            </p>
          ) : null}
        </GlassPanel>

        <GlassPanel className="overflow-hidden p-0">
          {row.thumbnail_url ? (
            <div
              className="min-h-[280px] bg-cover bg-center xl:min-h-full"
              style={{ backgroundImage: `url(${row.thumbnail_url})` }}
              role="img"
              aria-label={`${titleZh} 漫畫風格縮圖`}
            />
          ) : (
            <div className="flex min-h-[280px] flex-col justify-between bg-white/[0.045] p-5">
              <ImageIcon className="h-7 w-7 text-[var(--accent-lime)]" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">漫畫縮圖會在新文章生成時自動建立</p>
                <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                  這篇是舊文章，所以未必已經有 thumbnail_url。
                </p>
              </div>
            </div>
          )}
        </GlassPanel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,760px)_minmax(300px,1fr)]">
        <article className="space-y-4">
          {paragraphs.map((paragraph, index) => (
            <GlassPanel key={`${paragraph.ja}-${index}`} className="p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>段落 {index + 1}</span>
                </div>
                <QuickSaveButton
                  text={paragraph.ja}
                  meaningZh={paragraph.zh}
                  context={titleZh}
                  tags={["cultural-article", "sentence"]}
                />
              </div>
              <JapaneseSentence text={paragraph.ja} size="md" speakerSize="sm" preWrap />
              <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-7 text-[var(--text-secondary)]">
                {paragraph.zh}
              </p>
            </GlassPanel>
          ))}
        </article>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <GlassPanel className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Brain className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
              <h2 className="text-sm font-semibold">讀完要帶走的東西</h2>
            </div>
            <div className="space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              <p>找出一個日本文化觀察。</p>
              <p>挑三個漢字詞，用假名讀一次。</p>
              <p>Highlight 任意字詞，即刻 save / inspect。</p>
            </div>
          </GlassPanel>

          {cantoneseLens ? (
            <GlassPanel className="overflow-hidden p-0">
              {cantoneseLensImageUrl ? (
                <div
                  className="aspect-[4/5] border-b border-white/10 bg-cover bg-center"
                  style={{ backgroundImage: `url(${cantoneseLensImageUrl})` }}
                  role="img"
                  aria-label={`${titleZh} 的香港視角插畫`}
                />
              ) : null}
              <div className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Quote className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
                  <h2 className="text-sm font-semibold">香港視角</h2>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                  {cantoneseLens}
                </p>
              </div>
            </GlassPanel>
          ) : null}
        </aside>
      </section>

      {culturalNotes ? (
        <GlassPanel className="p-5 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold">文化筆記</h2>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
            {culturalNotes}
          </p>
        </GlassPanel>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {keyVocab.length > 0 ? (
          <GlassPanel className="p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Languages className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
              <h2 className="text-sm font-semibold">關鍵詞讀音橋</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {keyVocab.map((vocab, index) => (
                <div key={`${vocab.word}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-jp text-base font-semibold">{vocab.word}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {vocab.jlpt_level || "JLPT"} · {vocab.meaning_zh}
                      </p>
                    </div>
                    <QuickSaveButton
                      text={vocab.word}
                      reading={vocab.kana}
                      meaningZh={vocab.meaning_zh}
                      context={vocab.example_sentence}
                      tags={["cultural-vocab"]}
                      className="shrink-0"
                    />
                  </div>
                  <KanaKanjiBridge
                    japanese={vocab.word}
                    kana={vocab.kana}
                    meaning={vocab.meaning_zh}
                    compact
                  />
                  {vocab.example_sentence ? (
                    <div className="mt-3 border-t border-white/10 pt-3">
                      <JapaneseSentence text={vocab.example_sentence} size="xs" speakerSize="sm" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </GlassPanel>
        ) : null}

        {keyGrammar.length > 0 ? (
          <GlassPanel className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
              <h2 className="text-sm font-semibold">文法抓手</h2>
            </div>
            <div className="divide-y divide-white/10">
              {keyGrammar.map((grammar, index) => (
                <div key={`${grammar.pattern}-${index}`} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-jp text-sm font-semibold">{grammar.pattern}</p>
                  <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
                    {grammar.meaning_zh}
                  </p>
                  <div className="mt-2">
                    <JapaneseSentence text={grammar.example_ja} size="xs" speakerSize="sm" />
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        ) : null}
      </section>

      <GlassPanel className="p-5 md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
          <h2 className="text-sm font-semibold">延伸 Resources</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource) => (
            <a
              key={`${resource.type}-${resource.title}`}
              href={resource.href}
              target="_blank"
              rel="noreferrer"
              className="group rounded-xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-[var(--accent-lime)]/35 hover:bg-white/[0.07]"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <ResourceIcon type={resource.type} />
                <ExternalLink className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--accent-lime)]" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold">{resource.title}</p>
              <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">{resource.description}</p>
            </a>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}

function buildResourcePack({
  titleJa,
  titleZh,
  channels,
  podcasts,
}: {
  titleJa: string;
  titleZh: string;
  channels: Channel[];
  podcasts: Podcast[];
}): Resource[] {
  const query = stripInlineKanaReadings(titleJa || titleZh);
  const resources: Resource[] = [
    {
      type: "article",
      title: "文章搜尋",
      description: "用日文題名搜尋相關文化解說與背景資料。",
      href: `https://www.google.com/search?q=${encodeURIComponent(`${query} 日本文化 解説`)}`,
    },
    {
      type: "video",
      title: "YouTube 相關影片",
      description: "找日文講解、vlog、紀錄片或可理解輸入素材。",
      href: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} 日本語`)}`,
    },
    {
      type: "podcast",
      title: "Podcast 搜尋",
      description: "找可聽的延伸素材，適合通勤時做沉浸輸入。",
      href: `https://open.spotify.com/search/${encodeURIComponent(query)}`,
    },
  ];

  channels.forEach((channel) => {
    resources.push({
      type: "video",
      title: channel.channel_name,
      description: `${channel.recommended_jlpt ?? "難度待定"} · ${channel.description ?? "相關 YouTube channel"}`,
      href: `https://www.youtube.com/channel/${channel.channel_id}`,
    });
  });

  podcasts.forEach((podcast) => {
    resources.push({
      type: "podcast",
      title: podcast.podcast_name,
      description: `${podcast.recommended_jlpt ?? "難度待定"} · ${podcast.description ?? "相關 podcast"}`,
      href: podcast.rss_url,
    });
  });

  return resources.slice(0, 9);
}

function ResourceIcon({ type }: { type: Resource["type"] }) {
  if (type === "video") return <Youtube className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />;
  if (type === "podcast") return <Headphones className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />;
  if (type === "article") return <FileText className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />;
  return <Search className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />;
}
