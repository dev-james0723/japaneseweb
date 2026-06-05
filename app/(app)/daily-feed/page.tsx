import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  ExternalLink,
  GaugeCircle,
  Newspaper,
  PenLine,
  Pickaxe,
  Radio,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { AiFeedbackButton } from "@/components/AiFeedbackButton";
import { GlassPanel } from "@/components/GlassPanel";
import { DailyFeedPulse } from "@/components/DailyFeedPulse";
import { getTodayDailyPick } from "@/lib/cultural/queries";
import { todayDateString } from "@/lib/os/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DailyFeedInteractionControls,
  type DailyFeedQuizQuestion,
  PromoteCandidateButton,
  TrackedInteractionLink,
} from "./DailyFeedInteractionControls";
import { DailyFeedMotionStage } from "./DailyFeedMotionStage";
import {
  DailyFeedSourceManager,
  DismissCandidateButton,
  type SourceManagerSource,
} from "./DailyFeedSourceManager";

export const dynamic = "force-dynamic";

type DailyLessonRow = {
  id: string;
  lesson_date: string;
  status: "draft" | "ready" | "completed" | "archived";
  content_item_id: string | null;
  cultural_content_id: string | null;
  hook_zh: string | null;
  easy_summary_ja: string | null;
  original_snippet: string | null;
  key_vocab: unknown;
  key_grammar: unknown;
  sentence_mining: unknown;
  shadowing_line: string | null;
  output_mission: string | null;
  review_cards_created: boolean;
  metadata: unknown;
  created_at: string;
};

type ContentItemRow = {
  id: string;
  user_id: string | null;
  title: string;
  source_url: string;
  source_type: "news" | "youtube" | "podcast" | "article" | "manual";
  raw_excerpt: string | null;
  published_at: string | null;
  topic_tags: string[] | null;
  ai_summary_zh: string | null;
  ai_summary_ja: string | null;
  jlpt_estimate: string | null;
  interest_score: number | null;
  learning_value_score: number | null;
  novelty_score: number | null;
  safety_score: number | null;
  has_audio: boolean;
  has_transcript: boolean;
  approved_for_daily: boolean;
  metadata: unknown;
  created_at: string;
};

type SourceRow = {
  id: string;
  user_id: string | null;
  source_type: string;
  source_name: string;
  source_url: string;
  topic_tags: string[] | null;
  difficulty_bias: string | null;
  license_policy: string;
  fetch_frequency: string;
  active: boolean;
  last_fetched_at: string | null;
  metadata: unknown;
};

type CulturalRow = {
  id: string;
  title_ja: string;
  title_zh: string;
  difficulty_jlpt: string | null;
  estimated_minutes: number | null;
  ai_summary_zh: string | null;
};

type ContentInteractionRow = {
  interaction_type:
    | "view"
    | "open_source"
    | "read"
    | "lesson_start"
    | "lesson_complete"
    | "save"
    | "mine"
    | "add_vocab"
    | "shadow"
    | "output"
    | "discuss"
    | "quiz"
    | "dismiss";
  items_created: number | null;
  created_at: string;
  content_item_id: string | null;
  daily_lesson_id: string | null;
  cultural_content_id: string | null;
};

type InteractionStats = {
  total: number;
  opened: number;
  saved: number;
  mined: number;
  output: number;
  completed: number;
  itemsCreated: number;
  lastActive: string | null;
};

type LessonSectionRow = {
  daily_lesson_id: string;
  section_type:
    | "hook"
    | "easy_summary"
    | "original_snippet"
    | "sentence_mining"
    | "vocab_grammar"
    | "shadowing"
    | "output_mission"
    | "source_notes";
  title: string;
  body_ja: string | null;
  body_zh: string | null;
  sort_order: number;
  metadata: unknown;
};

type LessonSentenceRow = {
  daily_lesson_id: string;
  sentence_type: "mining" | "shadowing" | "output_model" | "example";
  sentence_ja: string;
  kana_reading: string | null;
  translation_zh: string | null;
  difficulty_jlpt: string | null;
  key_vocab: string[] | null;
  key_grammar: string[] | null;
  cloze_target: string | null;
  sort_order: number;
};

type LessonVocabRow = {
  daily_lesson_id: string;
  term: string;
  reading: string | null;
  meaning_zh: string | null;
  jlpt_level: string | null;
  example_sentence: string | null;
  sort_order: number;
};

type LessonGrammarRow = {
  daily_lesson_id: string;
  pattern: string;
  meaning_zh: string | null;
  construction: string | null;
  example_ja: string | null;
  jlpt_level: string | null;
  sort_order: number;
};

type DailyOutputPromptRow = {
  id: string;
  daily_lesson_id: string | null;
  prompt_text: string;
  status: "new" | "started" | "completed" | "skipped" | "archived";
  proof_reference: string | null;
  completed_at: string | null;
};

type LessonAssetBundle = {
  sections: LessonSectionRow[];
  sentences: LessonSentenceRow[];
  vocab: LessonVocabRow[];
  grammar: LessonGrammarRow[];
};

type LessonAssetMapResult = {
  map: Map<string, LessonAssetBundle>;
  setupMessage: string | null;
};

type DailyOutputPromptMapResult = {
  map: Map<string, DailyOutputPromptRow>;
  setupMessage: string | null;
};

const feedSelect =
  "id, user_id, title, source_url, source_type, raw_excerpt, published_at, topic_tags, ai_summary_zh, ai_summary_ja, jlpt_estimate, interest_score, learning_value_score, novelty_score, safety_score, has_audio, has_transcript, approved_for_daily, metadata, created_at";

export default async function DailyFeedPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = todayDateString();
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const [lessonsResult, candidatesResult, sourcesResult, interactionsResult, dailyPick] = await Promise.all([
    supabase
      .from("daily_lessons")
      .select(
        "id, lesson_date, status, content_item_id, cultural_content_id, hook_zh, easy_summary_ja, original_snippet, key_vocab, key_grammar, sentence_mining, shadowing_line, output_mission, review_cards_created, metadata, created_at",
      )
      .eq("user_id", user.id)
      .order("lesson_date", { ascending: false })
      .limit(7),
    supabase
      .from("content_items")
      .select(feedSelect)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .eq("approved_for_daily", true)
      .order("learning_value_score", { ascending: false, nullsFirst: false })
      .order("interest_score", { ascending: false, nullsFirst: false })
      .limit(18),
    supabase
      .from("content_sources")
      .select("id, user_id, source_type, source_name, source_url, topic_tags, difficulty_bias, license_policy, fetch_frequency, active, last_fetched_at, metadata")
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .eq("active", true)
      .order("source_type", { ascending: true })
      .limit(12),
    supabase
      .from("content_user_interactions")
      .select("interaction_type, items_created, created_at, content_item_id, daily_lesson_id, cultural_content_id")
      .eq("user_id", user.id)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(80),
    getTodayDailyPick(supabase, user.id).catch(() => null),
  ]);

  const setupError = [lessonsResult.error, candidatesResult.error, sourcesResult.error].find((error) =>
    isMissingDailyFeedTable(error),
  );
  const setupMessage = setupError ? errorMessage(setupError) : null;
  const interactionSetupMessage =
    interactionsResult.error && isMissingContentInteractionTable(interactionsResult.error)
      ? errorMessage(interactionsResult.error)
      : null;
  const lessons = (setupError ? [] : (lessonsResult.data ?? [])) as DailyLessonRow[];
  const candidates = (setupError ? [] : (candidatesResult.data ?? [])) as ContentItemRow[];
  const sources = (setupError ? [] : (sourcesResult.data ?? [])) as SourceRow[];
  const interactions = (interactionSetupMessage ? [] : (interactionsResult.data ?? [])) as ContentInteractionRow[];
  const culturalIds = lessons.map((lesson) => lesson.cultural_content_id).filter((id): id is string => Boolean(id));
  const contentIds = lessons.map((lesson) => lesson.content_item_id).filter((id): id is string => Boolean(id));

  const lessonIds = lessons.map((lesson) => lesson.id);
  const [culturalMap, lessonContentMap, lessonAssetsResult, outputPromptsResult] = await Promise.all([
    fetchCulturalMap(supabase, user.id, culturalIds),
    fetchContentMap(supabase, user.id, contentIds),
    fetchLessonAssetMap(supabase, user.id, lessonIds),
    fetchDailyOutputPromptMap(supabase, user.id, lessonIds),
  ]);

  const todayLesson = lessons.find((lesson) => lesson.lesson_date === today) ?? lessons[0] ?? null;
  const todayCultural = todayLesson?.cultural_content_id ? culturalMap.get(todayLesson.cultural_content_id) ?? null : null;
  const todayContent = todayLesson?.content_item_id ? lessonContentMap.get(todayLesson.content_item_id) ?? null : null;
  const todayAssets = todayLesson ? lessonAssetsResult.map.get(todayLesson.id) ?? emptyLessonAssets() : null;
  const todayOutputPrompt = todayLesson ? outputPromptsResult.map.get(todayLesson.id) ?? null : null;
  const activeCandidateCount = candidates.filter((item) => score(item) >= 70).length;
  const audioCount = candidates.filter((item) => item.has_audio || item.has_transcript).length;
  const interactionStats = buildInteractionStats(interactions);

  return (
    <DailyFeedMotionStage>
      <GlassPanel className="p-5 md:p-7" data-feed-hero data-feed-panel>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <p className="section-eyebrow mb-2" data-feed-hero-copy>AI 每日輸入 · {today}</p>
            <h1 className="text-2xl font-semibold leading-tight md:text-4xl" data-feed-hero-copy>今日輸入指揮台</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]" data-feed-hero-copy>
              將文化內容、RSS／Podcast 摘要資料、句子採礦、跟讀同輸出任務排成一條學習流水線。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <MetricChip label="課包" value={todayLesson ? statusLabel(todayLesson.status) : "待命"} active={Boolean(todayLesson)} />
              <MetricChip label="候選" value={String(candidates.length)} />
              <MetricChip label="高價值" value={String(activeCandidateCount)} />
              <MetricChip label="音訊／文字" value={String(audioCount)} />
              <MetricChip label="輸入紀錄" value={String(interactionStats.total)} />
              <MetricChip label="已採礦" value={String(interactionStats.mined)} />
              <MetricChip label="結構化" value={todayAssets ? String(assetTotal(todayAssets)) : "0"} />
              <MetricChip label="輸出提示" value={statusLabel(todayOutputPrompt?.status ?? "fallback")} />
            </div>
          </div>
          <div data-feed-pulse>
            <DailyFeedPulse active={Boolean(todayLesson || dailyPick)} modeLabel={todayLesson ? "課包已準備" : "掃描素材"} />
          </div>
        </div>
      </GlassPanel>

      {setupMessage ? <DailyFeedSetupNotice message={setupMessage} /> : null}

      {todayLesson ? (
        <TodayLessonPanel
          lesson={todayLesson}
          cultural={todayCultural}
          content={todayContent}
          assets={todayAssets}
          assetSetupMessage={lessonAssetsResult.setupMessage}
          outputPrompt={todayOutputPrompt}
          outputPromptSetupMessage={outputPromptsResult.setupMessage}
        />
      ) : (
        <EmptyTodayPanel hasDailyPick={Boolean(dailyPick)} />
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <CandidateQueue candidates={candidates} />
        <SourceHealth
          sources={sources}
          lessons={lessons}
          culturalMap={culturalMap}
          contentMap={lessonContentMap}
          interactionStats={interactionStats}
          interactionSetupMessage={interactionSetupMessage}
        />
      </div>
    </DailyFeedMotionStage>
  );
}

function TodayLessonPanel({
  lesson,
  cultural,
  content,
  assets,
  assetSetupMessage,
  outputPrompt,
  outputPromptSetupMessage,
}: {
  lesson: DailyLessonRow;
  cultural: CulturalRow | null;
  content: ContentItemRow | null;
  assets: LessonAssetBundle | null;
  assetSetupMessage: string | null;
  outputPrompt: DailyOutputPromptRow | null;
  outputPromptSetupMessage: string | null;
}) {
  const vocab = assets?.vocab.length
    ? assets.vocab.slice(0, 8).map((item) => ({
        term: item.term,
        reading: item.reading,
        meaning_zh: item.meaning_zh,
        jlpt_level: item.jlpt_level,
        example_sentence: item.example_sentence,
      }))
    : recordsFromJson(lesson.key_vocab).slice(0, 6);
  const grammar = assets?.grammar.length
    ? assets.grammar.slice(0, 6).map((item) => ({
        pattern: item.pattern,
        meaning_zh: item.meaning_zh,
        construction: item.construction,
        example_ja: item.example_ja,
        jlpt_level: item.jlpt_level,
      }))
    : recordsFromJson(lesson.key_grammar).slice(0, 4);
  const normalizedSentences = assets?.sentences
    .filter((sentence) => sentence.sentence_type === "mining")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((sentence) => ({
      sentence_ja: sentence.sentence_ja,
      kana_reading: sentence.kana_reading,
      translation_zh: sentence.translation_zh,
      difficulty_jlpt: sentence.difficulty_jlpt,
      cloze_target: sentence.cloze_target,
    })) ?? [];
  const sentences = normalizedSentences.length ? normalizedSentences : recordsFromJson(lesson.sentence_mining).slice(0, 4);
  const easySummarySection = sectionByType(assets, "easy_summary");
  const originalSnippetSection = sectionByType(assets, "original_snippet");
  const shadowingSection = sectionByType(assets, "shadowing");
  const outputSection = sectionByType(assets, "output_mission");
  const title = cultural?.title_ja ?? content?.title ?? "今日課包";
  const summary = lesson.hook_zh ?? cultural?.ai_summary_zh ?? content?.ai_summary_zh ?? "今日輸入已準備好，可以直接進入複習、採礦或輸出。";
  const articleHref = cultural ? `/cultural/article/${cultural.id}` : null;
  const firstMiningSentence = sentences[0] ?? null;
  const mineText = firstMiningSentence ? stringField(firstMiningSentence, ["sentence_ja", "ja"]) : "";
  const mineReading = firstMiningSentence ? stringField(firstMiningSentence, ["kana_reading", "reading", "kana"]) : "";
  const mineMeaning = firstMiningSentence ? stringField(firstMiningSentence, ["translation_zh", "meaning_zh", "zh"]) : "";
  const quizQuestions = buildDailyFeedQuizQuestions({ vocab, grammar, sentences });

  return (
    <GlassPanel className="p-5 md:p-6" data-feed-panel>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="section-eyebrow mb-2">今日課包</p>
          <h2 className="font-jp text-2xl font-semibold leading-snug">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="chip">AI 建議</span>
            <AiFeedbackButton
              sourceSurface="daily_feed"
              targetType="daily_lesson"
              targetId={lesson.id}
              aiOutput={[
                title,
                summary,
                easySummarySection?.body_ja || lesson.easy_summary_ja,
                originalSnippetSection?.body_ja || lesson.original_snippet,
                outputSection?.body_zh || lesson.output_mission,
              ].filter(Boolean).join("\n\n").slice(0, 1200)}
              metadata={{
                lesson_date: lesson.lesson_date,
                content_item_id: lesson.content_item_id,
                cultural_content_id: lesson.cultural_content_id,
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip chip-active">{statusLabel(lesson.status)}</span>
          <span className="chip">{lesson.review_cards_created ? "複習卡已建立" : "複習卡待建立"}</span>
          <span className="chip">{assetSetupMessage ? "結構化素材待建立" : `${assetTotal(assets)} 筆結構化資料`}</span>
          <span className={outputPrompt?.status === "completed" ? "chip chip-active" : "chip"}>
            輸出：{statusLabel(outputPrompt?.status ?? "fallback")}
          </span>
        </div>
      </div>

      <StructuredAssetPanel assets={assets} setupMessage={assetSetupMessage} />
      <DailyOutputPromptPanel prompt={outputPrompt} setupMessage={outputPromptSetupMessage} fallbackMission={lesson.output_mission} />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <LessonBlock icon={BookOpen} title="簡易日文">
            <p className="font-jp text-sm leading-7">{easySummarySection?.body_ja || lesson.easy_summary_ja || cultural?.title_zh || content?.ai_summary_ja || "未有簡易摘要。"}</p>
          </LessonBlock>
          <LessonBlock icon={Sparkles} title="原文片段">
            <p className="font-jp text-sm leading-7">{originalSnippetSection?.body_ja || lesson.original_snippet || content?.raw_excerpt || "未有原文片段。"}</p>
          </LessonBlock>
          <LessonBlock icon={Volume2} title="跟讀句">
            <p className="font-jp text-lg leading-8">{shadowingSection?.body_ja || lesson.shadowing_line || "今日未設定跟讀句。"}</p>
          </LessonBlock>
        </div>

        <div className="space-y-4">
          <LessonBlock icon={Pickaxe} title="句子採礦">
            <div className="space-y-2">
              {sentences.length ? sentences.map((item, index) => (
                <MiniSentence key={`${stringField(item, ["sentence_ja", "ja"])}-${index}`} item={item} />
              )) : <p className="text-sm text-[var(--text-secondary)]">未抽出句子。</p>}
            </div>
          </LessonBlock>
          <LessonBlock icon={GaugeCircle} title="單字／文法">
            <div className="flex flex-wrap gap-1.5">
              {vocab.map((item, index) => (
                <span key={`${stringField(item, ["term", "word", "japanese", "ja"])}-${index}`} className="chip font-jp text-[10px]">
                  {stringField(item, ["term", "word", "japanese", "ja"]) || "單字"}
                </span>
              ))}
              {grammar.map((item, index) => (
                <span key={`${stringField(item, ["pattern", "grammar", "ja"])}-${index}`} className="chip chip-active font-jp text-[10px]">
                  {stringField(item, ["pattern", "grammar", "ja"]) || "文法"}
                </span>
              ))}
              {!vocab.length && !grammar.length ? <span className="text-sm text-[var(--text-secondary)]">未有單字／文法。</span> : null}
            </div>
          </LessonBlock>
          <LessonBlock icon={PenLine} title="輸出任務">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{outputSection?.body_zh || lesson.output_mission || "用今日輸入寫一句可用日文。"}</p>
          </LessonBlock>
        </div>
      </div>

      <DailyFeedInteractionControls
        lessonId={lesson.id}
        contentItemId={lesson.content_item_id}
        culturalContentId={lesson.cultural_content_id}
        articleHref={articleHref}
        sourceUrl={content?.source_url ?? null}
        lessonTitle={title}
        lessonSummary={summary}
        mineText={mineText}
        mineReading={mineReading}
        mineMeaning={mineMeaning}
        quizQuestions={quizQuestions}
        completed={lesson.status === "completed"}
      />
    </GlassPanel>
  );
}

function EmptyTodayPanel({ hasDailyPick }: { hasDailyPick: boolean }) {
  return (
    <GlassPanel className="p-5 md:p-6" data-feed-panel>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="section-eyebrow mb-2">今日課包</p>
          <h2 className="text-xl font-semibold">今日未有每日輸入課包</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            {hasDailyPick
              ? "已有文化每日精選，可以入去補齊課包。"
              : "先生成今日文化輸入，或者跑每日輸入擷取，令候選素材入隊。"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/cultural" className="btn-primary text-sm">
            生成今日輸入
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/mining" className="btn-ghost text-sm">手動採礦</Link>
        </div>
      </div>
    </GlassPanel>
  );
}

function CandidateQueue({ candidates }: { candidates: ContentItemRow[] }) {
  return (
    <GlassPanel className="p-5 md:p-6" data-feed-panel>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
            <p className="section-eyebrow mb-2">已核准候選</p>
            <h2 className="text-lg font-semibold">下一批可用素材</h2>
          </div>
        <span className="chip">{candidates.length} 項</span>
      </div>
      <div className="space-y-3">
        {candidates.length ? candidates.map((item) => (
          <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4" data-feed-card>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted)]">
              <span className="chip">{sourceTypeLabel(item.source_type)}</span>
              <span className={item.user_id ? "chip chip-active" : "chip"}>{item.user_id ? "自建" : "精選"}</span>
              {item.jlpt_estimate ? <span className="chip">{item.jlpt_estimate}</span> : null}
              <span>{dateLabel(item.published_at ?? item.created_at)}</span>
            </div>
            <h3 className="text-sm font-semibold leading-6">{item.title}</h3>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--text-secondary)]">
              {item.ai_summary_zh || item.raw_excerpt || "此素材只有摘要資料；開始學習前請先打開原始來源。"}
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              <ScorePill label="興趣" value={item.interest_score} />
              <ScorePill label="學習" value={item.learning_value_score} />
              <ScorePill label="新鮮" value={item.novelty_score} />
              <ScorePill label="安全" value={item.safety_score} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <PromoteCandidateButton contentItemId={item.id} />
              <TrackedInteractionLink
                refs={{ contentItemId: item.id }}
                href={item.source_url}
                interactionType="open_source"
                sourceSurface="daily_feed_candidate"
                metadata={{ title: item.title, source_type: item.source_type }}
                external
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                來源
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </TrackedInteractionLink>
              <TrackedInteractionLink
                refs={{ contentItemId: item.id }}
                href="/mining"
                interactionType="mine"
                sourceSurface="daily_feed_candidate"
                metadata={{ title: item.title, intent: "manual_mine_candidate" }}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                手動採礦
                <Pickaxe className="h-3.5 w-3.5" aria-hidden="true" />
              </TrackedInteractionLink>
              {item.user_id ? <DismissCandidateButton contentItemId={item.id} /> : null}
            </div>
          </article>
        )) : (
          <div className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-[var(--text-secondary)]">
            未有已核准候選。請執行排程 `/api/cron/daily-feed-ingest`，或先用文化沉浸生成今日內容。
          </div>
        )}
      </div>
    </GlassPanel>
  );
}

function SourceHealth({
  sources,
  lessons,
  culturalMap,
  contentMap,
  interactionStats,
  interactionSetupMessage,
}: {
  sources: SourceRow[];
  lessons: DailyLessonRow[];
  culturalMap: Map<string, CulturalRow>;
  contentMap: Map<string, ContentItemRow>;
  interactionStats: InteractionStats;
  interactionSetupMessage: string | null;
}) {
  const reliability = sourceReliability(sources);
  return (
    <div className="space-y-6">
      <ContentEvidencePanel stats={interactionStats} setupMessage={interactionSetupMessage} />
      <DailyFeedSourceManager sources={sources as SourceManagerSource[]} />

      <GlassPanel className="p-5 md:p-6" data-feed-panel>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="section-eyebrow mb-2">來源狀態</p>
            <h2 className="text-lg font-semibold">輸入來源</h2>
          </div>
          <span className="chip">{sources.length} 個啟用</span>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-2">
          <SourceMetric label="嘗試" value={String(reliability.attempts)} />
          <SourceMetric label="錯誤" value={String(reliability.errors)} danger={reliability.errors > 0} />
          <SourceMetric label="失敗率" value={reliability.failureRate == null ? "—" : `${reliability.failureRate}%`} danger={(reliability.failureRate ?? 0) > 20} />
        </div>
        <div className="space-y-2">
          {sources.length ? sources.map((source) => {
            const telemetry = sourceTelemetry(source.metadata);
            return (
              <a
                key={source.id}
                href={source.source_url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-white/10 bg-white/[0.025] p-3 transition hover:border-[var(--accent-lime)]/35"
                data-feed-card
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {source.source_type === "podcast" ? <Radio className="h-3.5 w-3.5" /> : <Newspaper className="h-3.5 w-3.5" />}
                      {source.source_type}
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold">{source.source_name}</p>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                      {source.last_fetched_at ? `上次擷取：${dateLabel(source.last_fetched_at)}` : "尚未擷取"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={source.user_id ? "chip chip-active px-2 py-0.5 text-[10px]" : "chip px-2 py-0.5 text-[10px]"}>
                        {source.user_id ? "自建" : "系統"}
                      </span>
                      <span className="chip px-2 py-0.5 text-[10px]">{licensePolicyLabel(source.license_policy)}</span>
                      <span className={sourceStatusClass(telemetry.status)}>
                        {sourceStatusLabel(telemetry.status)}
                      </span>
                      <span className="chip px-2 py-0.5 text-[10px]">
                        失敗 {telemetry.failureRate == null ? "—" : `${telemetry.failureRate}%`}
                      </span>
                    </div>
                    {telemetry.reason ? (
                      <p className="mt-2 truncate text-[11px] text-[var(--text-muted)]">{telemetry.reason}</p>
                    ) : null}
                  </div>
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--accent-lime)]" aria-hidden="true" />
                </div>
              </a>
            );
          }) : (
            <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-[var(--text-secondary)]">
              未有啟用來源。資料庫遷移會由精選 Podcast／頻道建立只含摘要資料的來源。
            </p>
          )}
        </div>
      </GlassPanel>

      <GlassPanel className="p-5 md:p-6" data-feed-panel>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="section-eyebrow mb-2">近期課包</p>
            <h2 className="text-lg font-semibold">最近課程</h2>
          </div>
          <span className="chip">{lessons.length}/7</span>
        </div>
        <div className="space-y-2">
          {lessons.length ? lessons.map((lesson) => {
            const cultural = lesson.cultural_content_id ? culturalMap.get(lesson.cultural_content_id) : null;
            const content = lesson.content_item_id ? contentMap.get(lesson.content_item_id) : null;
            return (
              <div key={lesson.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-3" data-feed-card>
                <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                  <span>{lesson.lesson_date}</span>
                  {lesson.review_cards_created ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent-lime)]" /> : <Clock3 className="h-3.5 w-3.5" />}
                </div>
                <p className="text-sm font-semibold leading-5">{cultural?.title_ja ?? content?.title ?? lesson.hook_zh ?? "課包"}</p>
              </div>
            );
          }) : (
            <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-[var(--text-secondary)]">
              未有課包紀錄。
            </p>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}

function SourceMetric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/10 p-2" data-feed-card>
      <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
      <div className={danger ? "mt-1 text-sm font-semibold tabular-nums text-[var(--danger)]" : "mt-1 text-sm font-semibold tabular-nums text-[var(--accent-lime)]"}>
        {value}
      </div>
    </div>
  );
}

function ContentEvidencePanel({ stats, setupMessage }: { stats: InteractionStats; setupMessage: string | null }) {
  return (
    <GlassPanel className="p-5 md:p-6" data-feed-panel>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="section-eyebrow mb-2">輸入證據</p>
          <h2 className="text-lg font-semibold">14 日內容使用</h2>
        </div>
        <span className="chip">{stats.lastActive ? dateLabel(stats.lastActive) : "未有事件"}</span>
      </div>
      {setupMessage ? (
        <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm leading-6 text-[var(--text-secondary)]">
          互動證據資料庫遷移尚未套用；每日輸入可以照用，但暫時未能統計內容使用。資料庫回應：{setupMessage}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <ScorePill label="打開／閱讀" value={stats.opened} />
          <ScorePill label="儲存" value={stats.saved} />
          <ScorePill label="採礦" value={stats.mined} />
          <ScorePill label="輸出" value={stats.output} />
          <ScorePill label="完成" value={stats.completed} />
          <ScorePill label="建立" value={stats.itemsCreated} />
        </div>
      )}
    </GlassPanel>
  );
}

function StructuredAssetPanel({
  assets,
  setupMessage,
}: {
  assets: LessonAssetBundle | null;
  setupMessage: string | null;
}) {
  return (
    <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.025] p-4" data-feed-card>
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="section-eyebrow mb-1">結構化素材</p>
          <h3 className="text-sm font-semibold">可查詢課包記憶</h3>
        </div>
        <span className="chip">{assetTotal(assets)} 筆</span>
      </div>
      {setupMessage ? (
        <p className="text-xs leading-5 text-[var(--text-secondary)]">
          標準化課包素材資料庫遷移尚未套用；今日課包會先用備用資料。資料庫回應：{setupMessage}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <ScorePill label="段落" value={assets?.sections.length ?? 0} />
          <ScorePill label="句子" value={assets?.sentences.length ?? 0} />
          <ScorePill label="單字" value={assets?.vocab.length ?? 0} />
          <ScorePill label="文法" value={assets?.grammar.length ?? 0} />
        </div>
      )}
    </div>
  );
}

function DailyOutputPromptPanel({
  prompt,
  setupMessage,
  fallbackMission,
}: {
  prompt: DailyOutputPromptRow | null;
  setupMessage: string | null;
  fallbackMission: string | null;
}) {
  const status = prompt?.status ?? "fallback";
  return (
    <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.025] p-4" data-feed-card>
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="section-eyebrow mb-1">輸出提示</p>
          <h3 className="text-sm font-semibold">今日輸出證據</h3>
        </div>
        <span className={status === "completed" ? "chip chip-active" : "chip"}>{statusLabel(status)}</span>
      </div>
      {setupMessage ? (
        <p className="text-xs leading-5 text-[var(--text-secondary)]">
          每日輸出提示資料庫遷移尚未套用；今日會先用課包輸出任務備用資料。資料庫回應：{setupMessage}
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {prompt?.prompt_text ?? fallbackMission ?? "用今日輸入寫或講一句日文。"}
          </p>
          {prompt?.proof_reference ? (
            <div className="rounded-lg border border-[var(--accent-lime)]/20 bg-[var(--accent-lime-bg)]/20 p-3 text-xs leading-5 text-[var(--text-secondary)]">
              證據：{prompt.proof_reference}
              {prompt.completed_at ? ` · ${dateLabel(prompt.completed_at)}` : ""}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function LessonBlock({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4" data-feed-card>
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
        <Icon className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
        {title}
      </div>
      {children}
    </section>
  );
}

function MiniSentence({ item }: { item: Record<string, unknown> }) {
  return (
    <div className="rounded-lg bg-black/15 p-3" data-feed-card>
      <p className="font-jp text-sm leading-6">{stringField(item, ["sentence_ja", "ja"]) || "未命名句子"}</p>
      {stringField(item, ["kana_reading", "reading"]) ? (
        <p className="font-jp text-[11px] text-[var(--text-muted)]">{stringField(item, ["kana_reading", "reading"])}</p>
      ) : null}
      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{stringField(item, ["translation_zh", "zh", "meaning_zh"])}</p>
    </div>
  );
}

function DailyFeedSetupNotice({ message }: { message: string }) {
  return (
    <GlassPanel className="p-4 md:p-5" data-feed-panel>
      <p className="section-eyebrow mb-2">資料表提示</p>
      <h2 className="text-base font-semibold">每日輸入資料表尚未套用到目前資料庫</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
        頁面會先用文化沉浸／手動採礦備用資料。要啟用 RSS／Podcast 候選隊列，請套用
        `20260604095242_daily_feed_pipeline.sql`。資料庫回應：{message}
      </p>
    </GlassPanel>
  );
}

function MetricChip({ label, value, active = false }: { label: string; value: string; active?: boolean }) {
  return (
    <span className={active ? "chip chip-active" : "chip"} data-feed-metric>
      {label}: {value}
    </span>
  );
}

function ScorePill({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/10 p-2">
      <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums text-[var(--accent-lime)]">{value ?? "—"}</div>
    </div>
  );
}

function statusLabel(status: string | null | undefined) {
  if (status === "ready") return "已準備";
  if (status === "completed") return "已完成";
  if (status === "archived") return "已封存";
  if (status === "fallback") return "備用";
  if (status === "pending") return "待處理";
  return "草稿";
}

function sourceTypeLabel(type: ContentItemRow["source_type"]) {
  if (type === "podcast") return "Podcast";
  if (type === "youtube") return "YouTube";
  if (type === "news") return "新聞";
  if (type === "article") return "文章";
  return "手動";
}

function licensePolicyLabel(policy: string) {
  if (policy === "metadata_only") return "只用摘要資料";
  if (policy === "excerpt_allowed") return "可用摘錄";
  if (policy === "full_allowed") return "可用全文";
  return policy.replace(/_/g, " ");
}

function score(item: ContentItemRow) {
  return Math.max(item.learning_value_score ?? 0, item.interest_score ?? 0);
}

function buildInteractionStats(rows: ContentInteractionRow[]): InteractionStats {
  const counts = new Map<ContentInteractionRow["interaction_type"], number>();
  let itemsCreated = 0;

  rows.forEach((row) => {
    counts.set(row.interaction_type, (counts.get(row.interaction_type) ?? 0) + 1);
    itemsCreated += row.items_created ?? 0;
  });

  return {
    total: rows.length,
    opened:
      (counts.get("open_source") ?? 0) +
      (counts.get("read") ?? 0) +
      (counts.get("lesson_start") ?? 0) +
      (counts.get("view") ?? 0),
    saved: (counts.get("save") ?? 0) + (counts.get("add_vocab") ?? 0),
    mined: counts.get("mine") ?? 0,
    output: counts.get("output") ?? 0,
    completed: counts.get("lesson_complete") ?? 0,
    itemsCreated,
    lastActive: rows[0]?.created_at ?? null,
  };
}

function emptyLessonAssets(): LessonAssetBundle {
  return {
    sections: [],
    sentences: [],
    vocab: [],
    grammar: [],
  };
}

function assetTotal(assets: LessonAssetBundle | null) {
  if (!assets) return 0;
  return assets.sections.length + assets.sentences.length + assets.vocab.length + assets.grammar.length;
}

function buildDailyFeedQuizQuestions({
  vocab,
  grammar,
  sentences,
}: {
  vocab: Record<string, unknown>[];
  grammar: Record<string, unknown>[];
  sentences: Record<string, unknown>[];
}): DailyFeedQuizQuestion[] {
  const vocabMeanings = uniqueStrings(vocab.map((item) => stringField(item, ["meaning_zh", "meaning", "zh"])));
  const vocabQuestions = vocab
    .map<DailyFeedQuizQuestion | null>((item) => {
      const term = stringField(item, ["term", "word", "japanese", "ja"]);
      const meaning = stringField(item, ["meaning_zh", "meaning", "zh"]);
      if (!term || !meaning) return null;
      const choices = buildChoices(meaning, vocabMeanings);
      return {
        kind: "vocab" as const,
        prompt: `${term} 的意思係？`,
        answer: meaning,
        choices,
        explanation: `${term}${stringField(item, ["reading", "kana"]) ? `（${stringField(item, ["reading", "kana"])}）` : ""}：${meaning}`,
      };
    })
    .filter((item): item is DailyFeedQuizQuestion => Boolean(item))
    .slice(0, 2);

  const grammarMeanings = uniqueStrings(grammar.map((item) => stringField(item, ["meaning_zh", "core_meaning", "meaning"])));
  const grammarQuestions = grammar
    .map<DailyFeedQuizQuestion | null>((item) => {
      const pattern = stringField(item, ["pattern", "grammar", "ja"]);
      const meaning = stringField(item, ["meaning_zh", "core_meaning", "meaning"]);
      if (!pattern || !meaning) return null;
      const choices = buildChoices(meaning, grammarMeanings.length >= 2 ? grammarMeanings : [...grammarMeanings, ...vocabMeanings]);
      return {
        kind: "grammar" as const,
        prompt: `${pattern} 喺今日內容入面表示咩？`,
        answer: meaning,
        choices,
        explanation: stringField(item, ["example_ja"])
          ? `${pattern}: ${meaning}｜${stringField(item, ["example_ja"])}`
          : `${pattern}: ${meaning}`,
      };
    })
    .filter((item): item is DailyFeedQuizQuestion => Boolean(item))
    .slice(0, 2);

  const sentenceQuestions = sentences
    .map<DailyFeedQuizQuestion | null>((item) => {
      const sentence = stringField(item, ["sentence_ja", "ja"]);
      const translation = stringField(item, ["translation_zh", "meaning_zh", "zh"]);
      const clozeTarget = stringField(item, ["cloze_target", "target"]);
      if (!sentence || !translation) return null;
      const target = clozeTarget || firstJapaneseChunk(sentence);
      const prompt = target ? sentence.replace(target, "＿＿＿") : sentence;
      return {
        kind: "sentence" as const,
        prompt,
        answer: target || translation,
        choices: buildChoices(target || translation, uniqueStrings([target, translation, ...vocab.map((v) => stringField(v, ["term", "word", "japanese", "ja"]))])),
        explanation: `${sentence}｜${translation}`,
      };
    })
    .filter((item): item is DailyFeedQuizQuestion => Boolean(item))
    .slice(0, 2);

  return [...vocabQuestions, ...grammarQuestions, ...sentenceQuestions].slice(0, 5);
}

function buildChoices(answer: string, pool: string[]) {
  const distractors = pool.filter((item) => item && item !== answer).slice(0, 3);
  const fallback = ["意思接近，但語境不同", "只適合口語", "不是今日用法"];
  const choices = uniqueStrings([answer, ...distractors, ...fallback]).slice(0, 4);
  return rotateChoices(choices, answer);
}

function rotateChoices(choices: string[], answer: string) {
  if (choices.length <= 1) return choices;
  const answerIndex = choices.indexOf(answer);
  if (answerIndex < 0) return choices;
  const targetIndex = Math.min(choices.length - 1, answer.length % choices.length);
  const next = [...choices];
  [next[answerIndex], next[targetIndex]] = [next[targetIndex], next[answerIndex]];
  return next;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function firstJapaneseChunk(sentence: string) {
  return sentence.match(/[一-龯ぁ-んァ-ン]{2,8}/)?.[0] ?? "";
}

function sectionByType(
  assets: LessonAssetBundle | null,
  type: LessonSectionRow["section_type"],
) {
  return assets?.sections.find((section) => section.section_type === type) ?? null;
}

function recordsFromJson(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function stringField(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function dateLabel(value: string | null) {
  if (!value) return "未有日期";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-Hant-HK", { month: "short", day: "numeric" });
}

function sourceReliability(sources: SourceRow[]) {
  const totals = sources.map((source) => sourceTelemetry(source.metadata));
  const attempts = totals.reduce((sum, item) => sum + item.attempts, 0);
  const errors = totals.reduce((sum, item) => sum + item.errors, 0);
  return {
    attempts,
    errors,
    failureRate: attempts > 0 ? Math.round((errors / attempts) * 100) : null,
  };
}

function sourceTelemetry(metadata: unknown) {
  const root = asRecord(metadata);
  const last = asRecord(root?.last_ingest);
  const totals = asRecord(root?.ingest_totals);
  const status = sourceStatus(stringField(last ?? {}, ["status"]));
  const attempts = numberField(totals, "attempts");
  const errors = numberField(totals, "error_runs");
  return {
    status,
    attempts,
    errors,
    failureRate: attempts > 0 ? Math.round((errors / attempts) * 100) : null,
    reason: stringField(last ?? {}, ["reason"]),
  };
}

function sourceStatus(value: string): "inserted" | "skipped" | "error" | "idle" {
  if (value === "inserted" || value === "skipped" || value === "error") return value;
  return "idle";
}

function sourceStatusLabel(status: ReturnType<typeof sourceStatus>) {
  if (status === "inserted") return "已新增";
  if (status === "skipped") return "已略過";
  if (status === "error") return "錯誤";
  return "閒置";
}

function sourceStatusClass(status: ReturnType<typeof sourceStatus>) {
  if (status === "inserted") return "chip chip-active px-2 py-0.5 text-[10px]";
  if (status === "error") return "chip px-2 py-0.5 text-[10px] text-[var(--danger)]";
  return "chip px-2 py-0.5 text-[10px]";
}

function numberField(item: Record<string, unknown> | null, key: string) {
  const value = item?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isMissingDailyFeedTable(error: unknown) {
  if (!error) return false;
  return /does not exist|schema cache|PGRST205|42P01|content_sources|content_items|daily_lessons/i.test(errorMessage(error));
}

function isMissingContentInteractionTable(error: unknown) {
  if (!error) return false;
  return /does not exist|schema cache|PGRST205|42P01|content_user_interactions/i.test(errorMessage(error));
}

function isMissingLessonAssetTable(error: unknown) {
  if (!error) return false;
  return /does not exist|schema cache|PGRST205|42P01|daily_lesson_sections|lesson_sentences|lesson_vocab|lesson_grammar/i.test(errorMessage(error));
}

function isMissingDailyOutputPromptTable(error: unknown) {
  if (!error) return false;
  return /does not exist|schema cache|PGRST205|42P01|daily_output_prompts/i.test(errorMessage(error));
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  const record = asRecord(error);
  if (!record) return String(error);
  return ["message", "details", "hint", "code"]
    .map((key) => record[key])
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");
}

async function fetchCulturalMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  ids: string[],
) {
  if (!ids.length) return new Map<string, CulturalRow>();
  const { data } = await supabase
    .from("cultural_contents")
    .select("id, title_ja, title_zh, difficulty_jlpt, estimated_minutes, ai_summary_zh")
    .eq("user_id", userId)
    .in("id", Array.from(new Set(ids)));
  return new Map(((data ?? []) as CulturalRow[]).map((item) => [item.id, item]));
}

async function fetchContentMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  ids: string[],
) {
  if (!ids.length) return new Map<string, ContentItemRow>();
  const { data } = await supabase
    .from("content_items")
    .select(feedSelect)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .in("id", Array.from(new Set(ids)));
  return new Map(((data ?? []) as ContentItemRow[]).map((item) => [item.id, item]));
}

async function fetchLessonAssetMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  ids: string[],
): Promise<LessonAssetMapResult> {
  const uniqueIds = Array.from(new Set(ids));
  const map = new Map(uniqueIds.map((id) => [id, emptyLessonAssets()]));
  if (!uniqueIds.length) return { map, setupMessage: null };

  const [sectionsResult, sentencesResult, vocabResult, grammarResult] = await Promise.all([
    supabase
      .from("daily_lesson_sections")
      .select("daily_lesson_id, section_type, title, body_ja, body_zh, sort_order, metadata")
      .eq("user_id", userId)
      .in("daily_lesson_id", uniqueIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("lesson_sentences")
      .select("daily_lesson_id, sentence_type, sentence_ja, kana_reading, translation_zh, difficulty_jlpt, key_vocab, key_grammar, cloze_target, sort_order")
      .eq("user_id", userId)
      .in("daily_lesson_id", uniqueIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("lesson_vocab")
      .select("daily_lesson_id, term, reading, meaning_zh, jlpt_level, example_sentence, sort_order")
      .eq("user_id", userId)
      .in("daily_lesson_id", uniqueIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("lesson_grammar")
      .select("daily_lesson_id, pattern, meaning_zh, construction, example_ja, jlpt_level, sort_order")
      .eq("user_id", userId)
      .in("daily_lesson_id", uniqueIds)
      .order("sort_order", { ascending: true }),
  ]);

  const errors = [sectionsResult.error, sentencesResult.error, vocabResult.error, grammarResult.error].filter(Boolean);
  const missingError = errors.find((error) => isMissingLessonAssetTable(error));
  if (missingError) return { map, setupMessage: errorMessage(missingError) };
  if (errors[0]) return { map, setupMessage: errorMessage(errors[0]) };

  for (const row of (sectionsResult.data ?? []) as LessonSectionRow[]) {
    const bundle = map.get(row.daily_lesson_id);
    if (bundle) bundle.sections.push(row);
  }
  for (const row of (sentencesResult.data ?? []) as LessonSentenceRow[]) {
    const bundle = map.get(row.daily_lesson_id);
    if (bundle) bundle.sentences.push(row);
  }
  for (const row of (vocabResult.data ?? []) as LessonVocabRow[]) {
    const bundle = map.get(row.daily_lesson_id);
    if (bundle) bundle.vocab.push(row);
  }
  for (const row of (grammarResult.data ?? []) as LessonGrammarRow[]) {
    const bundle = map.get(row.daily_lesson_id);
    if (bundle) bundle.grammar.push(row);
  }

  return { map, setupMessage: null };
}

async function fetchDailyOutputPromptMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  ids: string[],
): Promise<DailyOutputPromptMapResult> {
  const uniqueIds = Array.from(new Set(ids));
  const map = new Map<string, DailyOutputPromptRow>();
  if (!uniqueIds.length) return { map, setupMessage: null };

  const { data, error } = await supabase
    .from("daily_output_prompts")
    .select("id, daily_lesson_id, prompt_text, status, proof_reference, completed_at")
    .eq("user_id", userId)
    .in("daily_lesson_id", uniqueIds)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingDailyOutputPromptTable(error)) return { map, setupMessage: errorMessage(error) };
    return { map, setupMessage: errorMessage(error) };
  }

  for (const row of (data ?? []) as DailyOutputPromptRow[]) {
    if (!row.daily_lesson_id || map.has(row.daily_lesson_id)) continue;
    map.set(row.daily_lesson_id, row);
  }

  return { map, setupMessage: null };
}
