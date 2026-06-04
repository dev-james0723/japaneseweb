import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type CulturalCategory,
  isCulturalCategory,
  pickNextCategory,
} from "@/lib/cultural/categories";
import { geminiGenerateJson } from "@/lib/cultural/geminiJson";
import { getLanguageBlend, phaseToJlpt } from "@/lib/cultural/languageBlend";
import {
  generateCulturalArticlePrompt,
  generateTopicSuggestionPrompt,
} from "@/lib/cultural/prompts/generateCulturalArticlePrompt";
import {
  GeneratedCulturalArticleSchema,
  TopicSuggestionSchema,
  type GeneratedCulturalArticle,
} from "@/lib/cultural/schemas";
import { ensureCulturalPreferences } from "@/lib/cultural/preferences";
import { getCurrentSeason, SEASON_HINTS } from "@/lib/cultural/season";
import { stripInlineKanaReadings } from "@/lib/furigana";
import { cleanAiTextBlock } from "@/lib/text/cleanAiText";
import { generateCulturalArticleThumbnail } from "@/lib/cultural/generateThumbnail";
import { generateCantoneseLensIllustration } from "@/lib/cultural/generateSectionImage";

export type CulturalUserContext = {
  userId: string;
  phase: number;
  languageBlendOverride: string | null;
  preferredCategories: string[];
  avoidedCategories: string[];
  lastPushedCategory: string | null;
  rotateCategories: boolean;
};

type PrefsRow = {
  preferred_categories: string[] | null;
  avoided_categories: string[] | null;
  last_pushed_category: string | null;
  daily_push_category_rotation: boolean | null;
  language_blend_override: string | null;
};

function buildContext(userId: string, phase: number, prefs: PrefsRow | null): CulturalUserContext {
  return {
    userId,
    phase,
    languageBlendOverride: prefs?.language_blend_override ?? null,
    preferredCategories: prefs?.preferred_categories ?? [],
    avoidedCategories: prefs?.avoided_categories ?? [],
    lastPushedCategory: prefs?.last_pushed_category ?? null,
    rotateCategories: prefs?.daily_push_category_rotation ?? true,
  };
}

export async function fetchCulturalUserContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<CulturalUserContext> {
  const [settingsRes, prefsRes] = await Promise.all([
    supabase.from("user_os_settings").select("current_phase").eq("user_id", userId).maybeSingle(),
    supabase
      .from("cultural_preferences")
      .select(
        "preferred_categories, avoided_categories, last_pushed_category, daily_push_category_rotation, language_blend_override",
      )
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const phase = Math.min(6, Math.max(1, settingsRes.data?.current_phase ?? 1));
  if (!prefsRes.data) {
    await ensureCulturalPreferences(supabase, userId);
    const retry = await supabase
      .from("cultural_preferences")
      .select(
        "preferred_categories, avoided_categories, last_pushed_category, daily_push_category_rotation, language_blend_override",
      )
      .eq("user_id", userId)
      .single();
    if (retry.data) {
      return buildContext(userId, phase, retry.data);
    }
  }
  return buildContext(userId, phase, prefsRes.data);
}

export async function fetchRecentTopics(
  supabase: SupabaseClient,
  userId: string,
  limit = 14,
): Promise<string[]> {
  const { data } = await supabase
    .from("cultural_contents")
    .select("title_ja, title_zh")
    .eq("user_id", userId)
    .eq("content_type", "article")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).flatMap((r) => [r.title_ja, r.title_zh].filter(Boolean));
}

export async function suggestCulturalTopic(params: {
  category: CulturalCategory;
  phase: number;
  avoidTopics: string[];
}): Promise<{ topic: string; topic_zh: string }> {
  const season = getCurrentSeason();
  const raw = await geminiGenerateJson(
    generateTopicSuggestionPrompt({
      category: params.category,
      phase: params.phase,
      season,
      seasonHint: SEASON_HINTS[season],
      avoidTopics: params.avoidTopics,
    }),
    0.9,
  );
  const parsed = TopicSuggestionSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error("TOPIC_PARSE_FAILED");
  }
  return {
    topic: parsed.data.topic,
    topic_zh: parsed.data.topic_zh || parsed.data.topic,
  };
}

export async function generateCulturalArticle(params: {
  topic: string;
  category: CulturalCategory;
  userPhase: number;
  languageBlendOverride?: string | null;
}): Promise<GeneratedCulturalArticle> {
  const blend = getLanguageBlend(params.userPhase, params.languageBlendOverride);
  const raw = await geminiGenerateJson(
    generateCulturalArticlePrompt({
      topic: params.topic,
      category: params.category,
      userPhase: params.userPhase,
      blend,
    }),
    0.75,
  );
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("ARTICLE_JSON_PARSE_FAILED");
  }
  const parsed = GeneratedCulturalArticleSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("ARTICLE_SCHEMA_INVALID:" + parsed.error.issues[0]?.message);
  }
  return normalizeGeneratedCulturalArticle(parsed.data);
}

function normalizeGeneratedCulturalArticle(
  article: GeneratedCulturalArticle,
): GeneratedCulturalArticle {
  return {
    ...article,
    title_ja: stripInlineKanaReadings(article.title_ja),
    summary_ja: stripInlineKanaReadings(article.summary_ja),
    cultural_notes: cleanAiTextBlock(article.cultural_notes),
    cantonese_lens: cleanAiTextBlock(article.cantonese_lens),
    surprising_fact: cleanAiTextBlock(article.surprising_fact),
    body_paragraphs: article.body_paragraphs.map((paragraph) => ({
      ...paragraph,
      ja: stripInlineKanaReadings(paragraph.ja),
      zh: cleanAiTextBlock(paragraph.zh),
      kana_ruby: paragraph.kana_ruby ? stripInlineKanaReadings(paragraph.kana_ruby) : "",
    })),
    key_vocab: article.key_vocab.map((vocab) => ({
      ...vocab,
      word: stripInlineKanaReadings(vocab.word),
      example_sentence: stripInlineKanaReadings(vocab.example_sentence ?? ""),
    })),
    key_grammar: article.key_grammar.map((grammar) => ({
      ...grammar,
      example_ja: stripInlineKanaReadings(grammar.example_ja),
      meaning_zh: cleanAiTextBlock(grammar.meaning_zh),
    })),
  };
}

export function articleToContentRow(
  article: GeneratedCulturalArticle,
  params: {
    userId: string;
    category: CulturalCategory;
    isDailyPick?: boolean;
    dailyPickDate?: string;
    thumbnailUrl?: string | null;
    cantoneseLensImageUrl?: string | null;
    cantoneseLensImagePrompt?: string | null;
  },
) {
  const notes = article.surprising_fact
    ? `${article.cultural_notes}\n\n✨ ${article.surprising_fact}`
    : article.cultural_notes;
  const bodyJa = article.body_paragraphs.map((p) => p.ja).join("\n\n");
  const bodyZh = article.body_paragraphs.map((p) => p.zh).join("\n\n");

  return {
    user_id: params.userId,
    content_type: "article" as const,
    category: params.category,
    title_ja: article.title_ja,
    title_zh: article.title_zh,
    difficulty_jlpt: article.difficulty_jlpt,
    estimated_minutes: article.estimated_minutes,
    body_ja: bodyJa,
    body_zh: bodyZh,
    body_paragraphs: article.body_paragraphs,
    ai_summary_ja: article.summary_ja,
    ai_summary_zh: article.summary_zh,
    key_vocab: article.key_vocab,
    key_grammar: article.key_grammar,
    cultural_notes: notes,
    cantonese_lens: article.cantonese_lens,
    cantonese_lens_image_url: params.cantoneseLensImageUrl ?? null,
    cantonese_lens_image_prompt: params.cantoneseLensImagePrompt ?? null,
    thumbnail_url: params.thumbnailUrl ?? null,
    is_daily_pick: params.isDailyPick ?? false,
    daily_pick_date: params.dailyPickDate ?? null,
  };
}

export async function saveCulturalArticle(
  supabase: SupabaseClient,
  article: GeneratedCulturalArticle,
  params: {
    userId: string;
    category: CulturalCategory;
    isDailyPick?: boolean;
    dailyPickDate?: string;
    thumbnailUrl?: string | null;
    cantoneseLensImageUrl?: string | null;
    cantoneseLensImagePrompt?: string | null;
  },
): Promise<{ id: string }> {
  const row = articleToContentRow(article, params);
  const { data, error } = await supabase
    .from("cultural_contents")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function clearExistingDailyPick(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<void> {
  await supabase
    .from("cultural_contents")
    .update({ is_daily_pick: false })
    .eq("user_id", userId)
    .eq("daily_pick_date", date)
    .eq("is_daily_pick", true);
}

export async function userHasDailyPickForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("cultural_contents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("daily_pick_date", date)
    .eq("is_daily_pick", true);
  return (count ?? 0) > 0;
}

export function resolveCategoryForUser(
  ctx: CulturalUserContext,
  explicit?: string,
): CulturalCategory {
  if (explicit && isCulturalCategory(explicit)) return explicit;
  return pickNextCategory({
    preferred: ctx.preferredCategories,
    avoided: ctx.avoidedCategories,
    lastPushed: ctx.lastPushedCategory,
    rotate: ctx.rotateCategories,
  });
}

export async function runDailyCulturalPickForUser(
  supabase: SupabaseClient,
  userId: string,
  today: string,
): Promise<{ ok: true; contentId: string; topic: string } | { ok: false; reason: string }> {
  const has = await userHasDailyPickForDate(supabase, userId, today);
  if (has) return { ok: false, reason: "already_has_pick" };

  const ctx = await fetchCulturalUserContext(supabase, userId);
  const category = resolveCategoryForUser(ctx);
  const avoidTopics = await fetchRecentTopics(supabase, userId);

  let topic: string;
  try {
    const suggestion = await suggestCulturalTopic({
      category,
      phase: ctx.phase,
      avoidTopics,
    });
    topic = suggestion.topic;
  } catch {
    topic = `${CATEGORY_FALLBACK_TOPIC[category]}（${today}）`;
  }

  const thumbnailPromise = generateCulturalArticleThumbnail({
    userId,
    topic,
    category,
  });

  let article: GeneratedCulturalArticle;
  let thumbnailUrl: string | null = null;
  try {
    [article, thumbnailUrl] = await Promise.all([
      generateCulturalArticle({
        topic,
        category,
        userPhase: ctx.phase,
        languageBlendOverride: ctx.languageBlendOverride,
      }),
      thumbnailPromise,
    ]);
  } catch (e) {
    return { ok: false, reason: String(e instanceof Error ? e.message : e) };
  }

  if (!article.difficulty_jlpt) {
    article = { ...article, difficulty_jlpt: phaseToJlpt(ctx.phase) };
  }

  const cantoneseLensImage = await generateCantoneseLensIllustration({
    userId,
    article,
    category,
  });

  await clearExistingDailyPick(supabase, userId, today);
  const { id } = await saveCulturalArticle(supabase, article, {
    userId,
    category,
    isDailyPick: true,
    dailyPickDate: today,
    thumbnailUrl,
    cantoneseLensImageUrl: cantoneseLensImage?.imageUrl ?? null,
    cantoneseLensImagePrompt: cantoneseLensImage?.prompt ?? null,
  });

  await supabase
    .from("cultural_preferences")
    .update({ last_pushed_category: category, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return { ok: true, contentId: id, topic: article.title_zh };
}

const CATEGORY_FALLBACK_TOPIC: Record<CulturalCategory, string> = {
  history_festivals: "日本の伝統祭り",
  language_history: "漢字が日本に伝わった経緯",
  pop_culture: "日本のコンビニ文化",
  traditional_arts: "茶道の基本",
  regional_culture: "関西と関東の違い",
  news_current: "日本の季節行事",
  lifestyle_niche: "日本の喫茶店文化",
};
