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
import {
  buildCulturalArticleVisuals,
  type CulturalArticleVisual,
} from "@/lib/cultural/articleVisuals";
import { createCulturalArticleMotionJob } from "@/lib/motion/culturalArticleMotionJobs";
import { buildSentenceReviewPrompts } from "@/lib/sentenceReview";
import { recordGrammarExposures } from "@/lib/learning/grammarMastery";
import {
  syncDailyLessonAssets,
  type NormalizedDailyLessonAssetSummary,
} from "@/lib/lessons/normalizedAssets";
import {
  syncDailyOutputPrompt,
  type DailyOutputPromptSummary,
} from "@/lib/output/dailyOutputPrompts";

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
    articleVisuals?: CulturalArticleVisual[];
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
    article_visuals: params.articleVisuals ?? [],
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
    articleVisuals?: CulturalArticleVisual[];
  },
): Promise<{ id: string }> {
  const row = articleToContentRow(article, params);
  let { data, error } = await supabase
    .from("cultural_contents")
    .insert(row)
    .select("id")
    .single();

  if (error && /article_visuals|schema cache|PGRST204/i.test(error.message + error.code)) {
    const fallbackRow = { ...row };
    delete (fallbackRow as Partial<typeof row>).article_visuals;
    const retry = await supabase
      .from("cultural_contents")
      .insert(fallbackRow)
      .select("id")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  if (!data) throw new Error("CULTURAL_ARTICLE_INSERT_MISSING_ID");
  return { id: data.id as string };
}

export async function saveDailyLessonFromCulturalArticle(
  supabase: SupabaseClient,
  article: GeneratedCulturalArticle,
  params: {
    userId: string;
    culturalContentId: string;
    contentItemId?: string | null;
    lessonDate: string;
    category: CulturalCategory;
    sourceUrl?: string | null;
    sourceTitle?: string | null;
    forceReviewAssetRefresh?: boolean;
  },
): Promise<
  | { ok: true; lessonId: string | null; assets?: DailyLessonSaveSummary; warning?: string }
  | { ok: false; reason: string }
> {
  const firstParagraph = article.body_paragraphs[0];
  const sentenceMining = article.body_paragraphs.slice(0, 3).map((paragraph) => ({
    sentence_ja: paragraph.ja,
    kana_reading: paragraph.kana_ruby || null,
    translation_zh: paragraph.zh,
  }));

  const { data, error } = await supabase
    .from("daily_lessons")
    .upsert(
      {
        user_id: params.userId,
        lesson_date: params.lessonDate,
        content_item_id: params.contentItemId ?? null,
        cultural_content_id: params.culturalContentId,
        status: "ready",
        hook_zh: `今日用「${article.title_zh}」練 ${article.difficulty_jlpt} input。`,
        easy_summary_ja: article.summary_ja,
        original_snippet: firstParagraph?.ja ?? article.title_ja,
        key_vocab: article.key_vocab,
        key_grammar: article.key_grammar,
        sentence_mining: sentenceMining,
        shadowing_line: firstJapaneseSentence(firstParagraph?.ja ?? article.title_ja),
        output_mission: `用日文寫或講 1-2 句：${article.title_zh} 同你生活有咩關係？`,
        metadata: {
          category: params.category,
          generated_from: "cultural_article",
          content_item_id: params.contentItemId ?? null,
          source_url: params.sourceUrl ?? null,
          source_title: params.sourceTitle ?? null,
        },
      },
      { onConflict: "user_id,lesson_date" },
    )
    .select("id, review_cards_created")
    .maybeSingle();

  if (error) return { ok: false, reason: error.message };
  const lessonId = (data?.id as string | undefined) ?? null;
  const lessonAssets = await syncDailyLessonAssets({
    supabase,
    userId: params.userId,
    lessonId,
    culturalContentId: params.culturalContentId,
    lessonDate: params.lessonDate,
    category: params.category,
    article,
  });
  if (!lessonAssets.ok) {
    return { ok: true, lessonId, warning: "lesson assets:" + lessonAssets.reason };
  }
  const outputPrompt = await syncDailyOutputPrompt({
    supabase,
    userId: params.userId,
    promptDate: params.lessonDate,
    promptText: `用日文寫或講 1-2 句：${article.title_zh} 同你生活有咩關係？`,
    dailyLessonId: lessonId,
    culturalContentId: params.culturalContentId,
    contentItemId: params.contentItemId ?? null,
    inputHook: `今日用「${article.title_zh}」練 ${article.difficulty_jlpt} input。`,
    targetJlpt: article.difficulty_jlpt,
    grammarFocus: article.key_grammar.map((grammar) => grammar.pattern),
    vocabFocus: article.key_vocab.map((vocab) => vocab.word),
    sourceSurface: "daily_lesson_cultural_article",
    metadata: {
      category: params.category,
      article_title_ja: article.title_ja,
      article_title_zh: article.title_zh,
      content_item_id: params.contentItemId ?? null,
      source_url: params.sourceUrl ?? null,
      source_title: params.sourceTitle ?? null,
    },
  });
  if (!outputPrompt.ok) {
    return { ok: true, lessonId, warning: "output prompt:" + outputPrompt.reason };
  }

  if (data?.review_cards_created && !params.forceReviewAssetRefresh) {
    await updateDailyLessonAssetMetadata(supabase, {
      userId: params.userId,
      lessonDate: params.lessonDate,
      category: params.category,
      reviewCardsCreated: true,
      lessonAssets: lessonAssets.summary,
      outputPrompt: outputPrompt.summary,
      reviewAssets: { minedSentences: 0, reviewPrompts: 0, vocabItems: 0, grammarPoints: 0 },
      contentItemId: params.contentItemId ?? null,
      sourceUrl: params.sourceUrl ?? null,
      sourceTitle: params.sourceTitle ?? null,
    });
    return {
      ok: true,
      lessonId,
      assets: {
        lessonAssets: lessonAssets.summary,
        outputPrompt: outputPrompt.summary,
        reviewAssets: { minedSentences: 0, reviewPrompts: 0, vocabItems: 0, grammarPoints: 0 },
      },
    };
  }

  const assets = await createDailyLessonReviewAssets(supabase, article, { ...params, lessonId });
  if (!assets.ok) {
    return { ok: true, lessonId, warning: assets.reason };
  }

  await updateDailyLessonAssetMetadata(supabase, {
    userId: params.userId,
    lessonDate: params.lessonDate,
    category: params.category,
    reviewCardsCreated: true,
    lessonAssets: lessonAssets.summary,
    outputPrompt: outputPrompt.summary,
    reviewAssets: assets.summary,
    contentItemId: params.contentItemId ?? null,
    sourceUrl: params.sourceUrl ?? null,
    sourceTitle: params.sourceTitle ?? null,
  });

  return {
    ok: true,
    lessonId,
    assets: {
      lessonAssets: lessonAssets.summary,
      outputPrompt: outputPrompt.summary,
      reviewAssets: assets.summary,
    },
  };
}

type DailyLessonAssetSummary = {
  minedSentences: number;
  reviewPrompts: number;
  vocabItems: number;
  grammarPoints: number;
};

type DailyLessonSaveSummary = {
  lessonAssets: NormalizedDailyLessonAssetSummary;
  outputPrompt: DailyOutputPromptSummary;
  reviewAssets: DailyLessonAssetSummary;
};

async function updateDailyLessonAssetMetadata(
  supabase: SupabaseClient,
  params: {
    userId: string;
    lessonDate: string;
    category: CulturalCategory;
    reviewCardsCreated: boolean;
    lessonAssets: NormalizedDailyLessonAssetSummary;
    outputPrompt: DailyOutputPromptSummary;
    reviewAssets: DailyLessonAssetSummary;
    contentItemId?: string | null;
    sourceUrl?: string | null;
    sourceTitle?: string | null;
  },
) {
  await supabase
    .from("daily_lessons")
    .update({
      review_cards_created: params.reviewCardsCreated,
      metadata: {
        category: params.category,
        generated_from: "cultural_article",
        content_item_id: params.contentItemId ?? null,
        source_url: params.sourceUrl ?? null,
        source_title: params.sourceTitle ?? null,
        lesson_assets: params.lessonAssets,
        output_prompt: params.outputPrompt,
        review_assets: params.reviewAssets,
      },
    })
    .eq("user_id", params.userId)
    .eq("lesson_date", params.lessonDate);
}

async function createDailyLessonReviewAssets(
  supabase: SupabaseClient,
  article: GeneratedCulturalArticle,
  params: {
    userId: string;
    culturalContentId: string;
    lessonDate: string;
    category: CulturalCategory;
    lessonId?: string | null;
  },
): Promise<{ ok: true; summary: DailyLessonAssetSummary } | { ok: false; reason: string }> {
  const sourcePath = `/cultural/article/${params.culturalContentId}`;
  const sourceTitle = article.title_zh || article.title_ja;
  const sentences = article.body_paragraphs
    .slice(0, 3)
    .map((paragraph) => ({
      user_id: params.userId,
      source_type: "cultural_article",
      source_url: sourcePath,
      source_title: sourceTitle,
      sentence_ja: firstJapaneseSentence(paragraph.ja),
      kana_reading: paragraph.kana_ruby || null,
      translation_zh: paragraph.zh,
      difficulty_jlpt: article.difficulty_jlpt,
      key_vocab: article.key_vocab.map((vocab) => vocab.word).filter((word) => paragraph.ja.includes(word)).slice(0, 5),
      key_grammar: article.key_grammar.map((grammar) => grammar.pattern).filter((pattern) => paragraph.ja.includes(pattern)).slice(0, 3),
      cloze_target: firstMatchingToken(
        paragraph.ja,
        article.key_vocab.map((vocab) => vocab.word),
      ),
    }))
    .filter((sentence) => sentence.sentence_ja.length > 0);

  let minedSentences = 0;
  let reviewPrompts = 0;
  if (sentences.length > 0) {
    const { data: savedSentences, error: sentenceError } = await supabase
      .from("mined_sentences")
      .insert(sentences)
      .select("id, user_id, sentence_ja, kana_reading, translation_zh, difficulty_jlpt, key_vocab, key_grammar, cloze_target");

    if (sentenceError) return { ok: false, reason: "mined_sentences:" + sentenceError.message };

    minedSentences = savedSentences?.length ?? 0;
    const prompts = (savedSentences ?? []).flatMap((sentence) => buildSentenceReviewPrompts(sentence));
    if (prompts.length > 0) {
      const { error: promptError } = await supabase.from("sentence_review_prompts").insert(prompts);
      if (promptError) return { ok: false, reason: "sentence_review_prompts:" + promptError.message };
      reviewPrompts = prompts.length;
    }
  }

  const [vocabItems, grammarPoints] = await Promise.all([
    createDailyLessonVocabDeck(supabase, article, params, sourcePath),
    createDailyLessonGrammarPoints(supabase, article, params, sourcePath),
  ]);

  const grammarPatterns = article.key_grammar
    .map((grammar) => grammar.pattern.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (grammarPatterns.length) {
    const grammarExposure = await recordGrammarExposures({
      supabase,
      userId: params.userId,
      exposures: grammarPatterns.map((pattern) => {
        const grammar = article.key_grammar.find((item) => item.pattern.trim() === pattern);
        return {
          pattern,
          jlptLevel: normalizeJlpt(article.difficulty_jlpt),
          exposureType: "notice",
          result: "seen",
          sourceSurface: "daily_lesson_cultural_article",
          sourceReference: sourcePath,
          dailyLessonId: params.lessonId ?? null,
          evidenceText: grammar?.example_ja ?? article.summary_ja ?? article.title_ja,
          metadata: {
            article_id: params.culturalContentId,
            lesson_date: params.lessonDate,
            category: params.category,
            meaning_zh: grammar?.meaning_zh ?? null,
          },
        };
      }),
    });
    if (grammarExposure.errors.length) {
      console.error("[daily lesson] grammar exposure:", grammarExposure.errors.join(" / "));
    }
  }

  return {
    ok: true,
    summary: {
      minedSentences,
      reviewPrompts,
      vocabItems,
      grammarPoints,
    },
  };
}

async function createDailyLessonVocabDeck(
  supabase: SupabaseClient,
  article: GeneratedCulturalArticle,
  params: {
    userId: string;
    lessonDate: string;
  },
  sourcePath: string,
) {
  const vocab = article.key_vocab.slice(0, 8);
  if (!vocab.length) return 0;

  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .insert({
      user_id: params.userId,
      title: `Daily Feed · ${params.lessonDate}`,
      topic: article.title_zh || article.title_ja,
      source_type: "ai_generated",
      raw_input: article.title_ja,
    })
    .select("id")
    .single();
  if (deckError || !deck) {
    console.error("[daily lesson] vocab deck:", deckError?.message ?? "missing deck");
    return 0;
  }

  const rows = vocab.map((item) => ({
    user_id: params.userId,
    deck_id: deck.id,
    japanese: item.word,
    kana: item.kana || null,
    meaning_zh: item.meaning_zh,
    jlpt_level: normalizeJlpt(item.jlpt_level),
    source_type: "cultural_article",
    source_reference: sourcePath,
    notes: item.example_sentence || null,
  }));

  const { data: savedVocab, error: vocabError } = await supabase
    .from("vocabulary_items")
    .insert(rows)
    .select("id, deck_id");
  if (vocabError) {
    console.error("[daily lesson] vocab items:", vocabError.message);
    return 0;
  }

  const reviewRows = (savedVocab ?? []).map((item) => ({
    user_id: params.userId,
    vocab_id: item.id,
    deck_id: item.deck_id,
    next_review_date: params.lessonDate,
    review_date: null,
    status: "new",
  }));
  if (reviewRows.length) {
    const { error: reviewError } = await supabase.from("reviews").insert(reviewRows);
    if (reviewError) console.error("[daily lesson] vocab reviews:", reviewError.message);
  }

  return savedVocab?.length ?? 0;
}

async function createDailyLessonGrammarPoints(
  supabase: SupabaseClient,
  article: GeneratedCulturalArticle,
  params: {
    userId: string;
  },
  sourcePath: string,
) {
  const grammar = article.key_grammar.slice(0, 4);
  if (!grammar.length) return 0;
  const patterns = grammar.map((item) => item.pattern);

  const { data: existing } = await supabase
    .from("grammar_points")
    .select("pattern")
    .eq("user_id", params.userId)
    .in("pattern", patterns);
  const existingPatterns = new Set((existing ?? []).map((item) => item.pattern));
  const rows = grammar
    .filter((item) => !existingPatterns.has(item.pattern))
    .map((item) => ({
      user_id: params.userId,
      pattern: item.pattern,
      core_meaning: item.meaning_zh,
      examples: [{ ja: item.example_ja, zh: item.meaning_zh }],
      source_type: "cultural_article",
      source_reference: sourcePath,
    }));

  if (!rows.length) return 0;
  const { data, error } = await supabase.from("grammar_points").insert(rows).select("id");
  if (error) {
    console.error("[daily lesson] grammar points:", error.message);
    return 0;
  }
  return data?.length ?? 0;
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
  const articleVisuals = await buildCulturalArticleVisuals({
    article,
    category,
    cantoneseLensImage,
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
    articleVisuals,
  });

  await createCulturalArticleMotionJob(supabase, {
    userId,
    articleId: id,
    article,
    category,
  });

  const lesson = await saveDailyLessonFromCulturalArticle(supabase, article, {
    userId,
    culturalContentId: id,
    lessonDate: today,
    category,
  });
  if (!lesson.ok && !/does not exist|schema cache|PGRST205/i.test(lesson.reason)) {
    console.error("[daily cultural pick] daily lesson:", lesson.reason);
  }
  if (lesson.ok && lesson.warning) {
    console.error("[daily cultural pick] review assets:", lesson.warning);
  }

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

function firstJapaneseSentence(value: string) {
  const match = value.match(/^.+?[。！？]/u);
  return match?.[0] ?? value;
}

function firstMatchingToken(sentence: string, tokens: string[]) {
  return tokens.find((token) => token && sentence.includes(token)) ?? null;
}

function normalizeJlpt(value: string | undefined) {
  if (value === "N5" || value === "N4" || value === "N3" || value === "N2" || value === "N1") {
    return value;
  }
  return null;
}
