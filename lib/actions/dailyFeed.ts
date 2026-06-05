"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CulturalCategory } from "@/lib/cultural/categories";
import {
  clearExistingDailyPick,
  fetchCulturalUserContext,
  generateCulturalArticle,
  saveCulturalArticle,
  saveDailyLessonFromCulturalArticle,
} from "@/lib/cultural/generateArticle";
import { todayDateString } from "@/lib/os/types";
import { recordContentInteractionForUser } from "@/lib/actions/contentInteractions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PromoteCandidateSchema = z.object({
  contentItemId: z.string().uuid(),
});

const AddContentSourceSchema = z.object({
  sourceType: z.enum(["rss", "podcast", "news_api", "youtube", "manual"]),
  sourceName: z.string().trim().min(2, "請填 source name。").max(120, "Source name 太長。"),
  sourceUrl: z.string().trim().url("請填有效 source URL。").max(600, "Source URL 太長。").refine(isHttpUrl, {
    message: "Source URL 只支援 http / https。",
  }),
  language: z.enum(["ja", "en", "mixed"]),
  topicTags: z.string().max(240, "Tags 太長。").optional(),
  difficultyBias: z.enum(["", "N5", "N4", "N3", "N2", "N1"]),
  licensePolicy: z.enum(["metadata_only", "excerpt_allowed", "full_allowed"]),
  fetchFrequency: z.enum(["daily", "weekly", "manual"]),
});

const AddManualCandidateSchema = z.object({
  title: z.string().trim().min(3, "請填 candidate title。").max(220, "Title 太長。"),
  sourceUrl: z.string().trim().url("請填有效 canonical source URL。").max(600, "Source URL 太長。").refine(isHttpUrl, {
    message: "Source URL 只支援 http / https。",
  }),
  sourceType: z.enum(["news", "youtube", "podcast", "article", "manual"]),
  rawExcerpt: z.string().trim().max(500, "Excerpt 最多 500 字。").optional(),
  summaryZh: z.string().trim().max(500, "Summary 最多 500 字。").optional(),
  language: z.enum(["ja", "en", "mixed"]),
  topicTags: z.string().max(240, "Tags 太長。").optional(),
  jlptEstimate: z.enum(["", "N5", "N4", "N3", "N2", "N1"]),
});

const OwnedSourceSchema = z.object({
  sourceId: z.string().uuid(),
});

const OwnedCandidateSchema = z.object({
  contentItemId: z.string().uuid(),
});

export type DailyFeedMutationState =
  | { ok: true; message: string }
  | { error: string }
  | null;

type ContentItemForPromotion = {
  id: string;
  user_id: string | null;
  title: string;
  source_url: string;
  source_type: "news" | "youtube" | "podcast" | "article" | "manual";
  raw_excerpt: string | null;
  ai_summary_zh: string | null;
  ai_summary_ja: string | null;
  jlpt_estimate: string | null;
  topic_tags: string[] | null;
  approved_for_daily: boolean;
};

export async function addContentSourceAction(
  _prev: DailyFeedMutationState,
  formData: FormData,
): Promise<DailyFeedMutationState> {
  const parsed = AddContentSourceSchema.safeParse({
    sourceType: formString(formData, "source_type"),
    sourceName: formString(formData, "source_name"),
    sourceUrl: formString(formData, "source_url"),
    language: formString(formData, "language") || "ja",
    topicTags: formString(formData, "topic_tags"),
    difficultyBias: formString(formData, "difficulty_bias"),
    licensePolicy: formString(formData, "license_policy") || "metadata_only",
    fetchFrequency: formString(formData, "fetch_frequency") || "weekly",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Source 格式錯誤。" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未登入。" };

  const data = parsed.data;
  const { error } = await supabase.from("content_sources").insert({
    user_id: user.id,
    source_type: data.sourceType,
    source_name: data.sourceName,
    source_url: data.sourceUrl,
    language: data.language,
    topic_tags: splitTags(data.topicTags),
    difficulty_bias: data.difficultyBias || null,
    license_policy: data.licensePolicy,
    fetch_frequency: data.fetchFrequency,
    active: true,
    metadata: {
      submitted_from: "input_source_manager",
      connector_status: data.sourceType === "manual" ? "metadata_only" : "feed_ingest_ready",
    },
  });

  if (error) {
    return { error: dailyFeedMutationError(error, "呢個 source URL 已經存在。") };
  }

  revalidateDailyFeedPaths();
  return { ok: true, message: "Source 已加入 input pipeline。" };
}

export async function addManualContentCandidateAction(
  _prev: DailyFeedMutationState,
  formData: FormData,
): Promise<DailyFeedMutationState> {
  const parsed = AddManualCandidateSchema.safeParse({
    title: formString(formData, "title"),
    sourceUrl: formString(formData, "source_url"),
    sourceType: formString(formData, "source_type") || "article",
    rawExcerpt: formString(formData, "raw_excerpt"),
    summaryZh: formString(formData, "summary_zh"),
    language: formString(formData, "language") || "ja",
    topicTags: formString(formData, "topic_tags"),
    jlptEstimate: formString(formData, "jlpt_estimate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Candidate 格式錯誤。" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未登入。" };

  const data = parsed.data;
  const topicTags = splitTags(data.topicTags);
  const scores = scoreManualCandidate({
    title: data.title,
    excerpt: data.rawExcerpt ?? "",
    summary: data.summaryZh ?? "",
    topicTags,
  });
  const approved = scores.safety >= 65 && scores.learning >= 45;

  const { error } = await supabase.from("content_items").insert({
    user_id: user.id,
    source_id: null,
    title: data.title,
    source_url: data.sourceUrl,
    source_type: data.sourceType,
    raw_excerpt: data.rawExcerpt || null,
    language: data.language,
    topic_tags: topicTags,
    ai_summary_zh: data.summaryZh || null,
    ai_summary_ja: null,
    jlpt_estimate: data.jlptEstimate || null,
    interest_score: scores.interest,
    learning_value_score: scores.learning,
    novelty_score: scores.novelty,
    safety_score: scores.safety,
    has_audio: data.sourceType === "podcast" || data.sourceType === "youtube",
    has_transcript: data.sourceType === "article" || data.sourceType === "manual",
    approved_for_daily: approved,
    rejection_reason: approved ? null : "manual_candidate_safety_gate",
    metadata: {
      source_name: "Manual candidate",
      source_license_policy: data.rawExcerpt ? "excerpt_allowed" : "metadata_only",
      submitted_from: "input_source_manager",
    },
  });

  if (error) {
    return { error: dailyFeedMutationError(error, "呢個 candidate URL 已經存在。") };
  }

  revalidateDailyFeedPaths();
  return {
    ok: true,
    message: approved ? "Candidate 已加入今日素材隊列。" : "Candidate 已保存；safety gate 暫時未放入 Daily Feed。",
  };
}

export async function deactivateContentSourceAction(input: z.input<typeof OwnedSourceSchema>) {
  const parsed = OwnedSourceSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Source 格式錯誤。" };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未登入。" };

  const { data, error } = await supabase
    .from("content_sources")
    .update({ active: false })
    .eq("id", parsed.data.sourceId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false as const, error: dailyFeedMutationError(error, "Source 更新失敗。") };
  if (!data) return { ok: false as const, error: "只可以停用自己加入的 source。" };

  revalidateDailyFeedPaths();
  return { ok: true as const };
}

export async function dismissContentCandidateAction(input: z.input<typeof OwnedCandidateSchema>) {
  const parsed = OwnedCandidateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Candidate 格式錯誤。" };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未登入。" };

  const { data, error } = await supabase
    .from("content_items")
    .update({
      approved_for_daily: false,
      rejection_reason: "dismissed_by_user",
    })
    .eq("id", parsed.data.contentItemId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false as const, error: dailyFeedMutationError(error, "Candidate 更新失敗。") };
  if (!data) return { ok: false as const, error: "只可以移除自己加入的 candidate。" };

  revalidateDailyFeedPaths();
  return { ok: true as const };
}

export async function promoteDailyFeedCandidateAction(input: z.input<typeof PromoteCandidateSchema>) {
  const parsed = PromoteCandidateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "候選素材格式錯誤。" };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未登入。" };

  const { data: item, error: itemError } = await supabase
    .from("content_items")
    .select("id, user_id, title, source_url, source_type, raw_excerpt, ai_summary_zh, ai_summary_ja, jlpt_estimate, topic_tags, approved_for_daily")
    .eq("id", parsed.data.contentItemId)
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .maybeSingle();

  if (itemError) return { ok: false as const, error: "讀取候選素材失敗：" + itemError.message };
  if (!item) return { ok: false as const, error: "找不到可用候選素材。" };

  const candidate = item as ContentItemForPromotion;
  if (!candidate.approved_for_daily) {
    return { ok: false as const, error: "這個素材未通過 Daily Feed safety / learning value gate。" };
  }

  try {
    const today = todayDateString();
    const { data: existingLesson, error: existingLessonError } = await supabase
      .from("daily_lessons")
      .select("id, content_item_id, review_cards_created")
      .eq("user_id", user.id)
      .eq("lesson_date", today)
      .maybeSingle();

    if (existingLessonError && !isMissingDailyLessonSchemaError(existingLessonError)) {
      return { ok: false as const, error: "讀取今日 lesson 失敗：" + existingLessonError.message };
    }

    if (existingLesson?.content_item_id === candidate.id && existingLesson.review_cards_created) {
      revalidatePath("/daily-feed");
      return {
        ok: true as const,
        lessonId: existingLesson.id as string,
        culturalContentId: null,
        warning: null,
      };
    }

    const ctx = await fetchCulturalUserContext(supabase, user.id);
    const category = categoryForCandidate(candidate);
    const article = await generateCulturalArticle({
      topic: buildCandidateLessonTopic(candidate),
      category,
      userPhase: ctx.phase,
      languageBlendOverride: ctx.languageBlendOverride,
    });

    await clearExistingDailyPick(supabase, user.id, today);
    const { id: culturalContentId } = await saveCulturalArticle(supabase, article, {
      userId: user.id,
      category,
      isDailyPick: true,
      dailyPickDate: today,
    });

    const lesson = await saveDailyLessonFromCulturalArticle(supabase, article, {
      userId: user.id,
      culturalContentId,
      contentItemId: candidate.id,
      lessonDate: today,
      category,
      sourceUrl: candidate.source_url,
      sourceTitle: candidate.title,
      forceReviewAssetRefresh: Boolean(existingLesson?.review_cards_created),
    });

    if (!lesson.ok) {
      return { ok: false as const, error: "建立 Daily Feed lesson 失敗：" + lesson.reason };
    }

    await recordContentInteractionForUser({
      supabase,
      userId: user.id,
      input: {
        contentItemId: candidate.id,
        culturalContentId,
        dailyLessonId: lesson.lessonId,
        interactionType: "lesson_start",
        sourceSurface: "daily_feed_candidate_promote",
        itemsCreated: countCreatedAssets(lesson.assets),
        deepLink: "/daily-feed",
        metadata: {
          promoted_from: "approved_candidate",
          source_title: candidate.title,
          source_url: candidate.source_url,
          source_type: candidate.source_type,
          warning: lesson.warning ?? null,
        },
      },
    });

    revalidatePath("/daily-feed");
    revalidatePath("/dashboard");
    revalidatePath("/review");
    revalidatePath("/shadowing");
    revalidatePath("/stats");

    return {
      ok: true as const,
      lessonId: lesson.lessonId,
      culturalContentId,
      warning: lesson.warning ?? null,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: candidatePromotionError(error),
    };
  }
}

function buildCandidateLessonTopic(item: ContentItemForPromotion) {
  const summary = item.ai_summary_ja || item.raw_excerpt || item.ai_summary_zh || "";
  return [
    `Daily Feed candidate: ${item.title}`,
    summary ? `Allowed excerpt or summary: ${summary}` : null,
    `Canonical source link: ${item.source_url}`,
    "Create a Japanese learning lesson from the title and allowed metadata only. Do not imply access to the full original article.",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 1200);
}

function categoryForCandidate(item: ContentItemForPromotion): CulturalCategory {
  const text = `${item.source_type} ${(item.topic_tags ?? []).join(" ")} ${item.title}`.toLowerCase();
  if (/anime|manga|music|j-pop|game|映画|アニメ|音楽/.test(text)) return "pop_culture";
  if (/language|語|漢字|方言|敬語/.test(text)) return "language_history";
  if (/festival|history|歴史|祭/.test(text)) return "history_festivals";
  if (/art|tea|craft|伝統|茶道|工芸/.test(text)) return "traditional_arts";
  if (/travel|region|local|地域|旅行|観光/.test(text)) return "regional_culture";
  if (/food|life|lifestyle|生活|食|店|カフェ/.test(text)) return "lifestyle_niche";
  return "news_current";
}

function countCreatedAssets(value: unknown) {
  const assets = asRecord(value);
  const reviewAssets = asRecord(assets?.reviewAssets);
  const lessonAssets = asRecord(assets?.lessonAssets);
  const outputPrompt = asRecord(assets?.outputPrompt);
  const values = [
    reviewAssets?.minedSentences,
    reviewAssets?.reviewPrompts,
    reviewAssets?.vocabItems,
    reviewAssets?.grammarPoints,
    lessonAssets?.sections,
    lessonAssets?.sentences,
    lessonAssets?.vocab,
    lessonAssets?.grammar,
    outputPrompt?.createdOrUpdated,
  ];
  let total = 0;
  for (const item of values) {
    if (typeof item === "number") total += item;
  }
  return total;
}

function candidatePromotionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "GEMINI_API_KEY_NOT_SET") {
    return "尚未設定 GEMINI_API_KEY，未能把候選素材升級成 Daily Feed lesson。";
  }
  return "候選素材升級失敗：" + message;
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function splitTags(value: string | null | undefined) {
  return Array.from(
    new Set(
      String(value ?? "")
        .split(/[,，\n]/)
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean)
        .slice(0, 8),
    ),
  );
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function scoreManualCandidate({
  title,
  excerpt,
  summary,
  topicTags,
}: {
  title: string;
  excerpt: string;
  summary: string;
  topicTags: string[];
}) {
  const text = `${title} ${excerpt} ${summary}`.toLowerCase();
  const sensitive = /(事件|事故|死亡|殺|戦争|災害|地震|crime|murder|war|disaster)/i.test(text);
  const learningHints = /(日本|文化|言葉|生活|社会|旅行|食|歴史|文法|語彙|japan|japanese|culture|language)/i.test(text);
  return {
    interest: clampScore(62 + Math.min(topicTags.length * 5, 20)),
    learning: clampScore(48 + (learningHints ? 18 : 0) + (excerpt || summary ? 10 : 0)),
    novelty: 82,
    safety: clampScore(sensitive ? 45 : 84),
  };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function revalidateDailyFeedPaths() {
  revalidatePath("/daily-feed");
  revalidatePath("/input");
  revalidatePath("/dashboard");
}

function dailyFeedMutationError(error: unknown, duplicateMessage: string) {
  const message = errorMessage(error);
  if (/23505|duplicate|unique/i.test(message)) return duplicateMessage;
  if (/does not exist|schema cache|PGRST205|42P01|content_sources|content_items/i.test(message)) {
    return "Daily Feed 資料表尚未建立。請先套用 migration 20260604095242_daily_feed_pipeline.sql。";
  }
  return message;
}

function isMissingDailyLessonSchemaError(error: unknown) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  return /does not exist|schema cache|PGRST205|42P01|daily_lessons/i.test(message);
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
