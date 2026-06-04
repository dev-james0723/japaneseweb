import type { SupabaseClient } from "@supabase/supabase-js";
import type { CulturalCategory } from "@/lib/cultural/categories";
import type { GeneratedCulturalArticle } from "@/lib/cultural/schemas";
import { stripInlineKanaReadings } from "@/lib/furigana";
import {
  buildCulturalArticleMotionHandoff,
  type CulturalArticleMotionHandoff,
} from "@/lib/motion/culturalArticleMotion";
import {
  buildFallbackArticleMotionManifest,
  generateArticleMotionManifest,
  parseCulturalArticleMotionManifest,
  type CulturalArticleMotionManifest,
} from "@/lib/motion/culturalArticleMotionManifest";
import type { Json } from "@/lib/supabase/database.types";
import { cleanAiTextBlock } from "@/lib/text/cleanAiText";

export type CulturalArticleMotionJobStatus = "queued" | "rendering" | "completed" | "failed";
export type CulturalArticleMotionEngine = "remotion" | "hyperframes";

export type CulturalArticleMotionJob = {
  id: string;
  articleId: string;
  engine: CulturalArticleMotionEngine;
  status: CulturalArticleMotionJobStatus;
  manifest: CulturalArticleMotionManifest;
  outputs: CulturalArticleMotionJobOutputs;
  errorMessage: string | null;
  renderRequestedAt: string | null;
  updatedAt: string;
};

export type CulturalArticleMotionJobOutputs = {
  provider: "handoff" | "remotion_lambda" | "vercel_sandbox";
  handoffUrl: string;
  message: string;
  remotion?: CulturalArticleMotionHandoff["remotion"];
  hyperframes?: CulturalArticleMotionHandoff["hyperframes"];
  files?: {
    remotionMp4?: string;
    remotionStill?: string;
    hyperframesMp4?: string;
    hyperframesStill?: string;
  };
};

type MotionJobRow = {
  id: string;
  article_id: string;
  engine: string;
  status: string;
  motion_manifest: Json;
  outputs: Json;
  error_message: string | null;
  render_requested_at: string | null;
  updated_at: string;
};

type CulturalContentMotionRow = {
  id: string;
  category: string;
  title_ja: string;
  title_zh: string;
  ai_summary_ja: string | null;
  ai_summary_zh: string | null;
  body_paragraphs: Json | null;
  body_ja: string | null;
  body_zh: string | null;
  difficulty_jlpt: string | null;
  estimated_minutes: number | null;
  key_vocab: Json;
  key_grammar: Json;
  cultural_notes: string | null;
  cantonese_lens: string | null;
};

export async function createCulturalArticleMotionJob(
  supabase: SupabaseClient,
  params: {
    userId: string;
    articleId: string;
    article: GeneratedCulturalArticle;
    category: CulturalCategory;
    engine?: CulturalArticleMotionEngine;
  },
): Promise<CulturalArticleMotionJob | null> {
  const engine = params.engine ?? "remotion";
  const manifest = await generateArticleMotionManifest({
    articleId: params.articleId,
    article: params.article,
    category: params.category,
  });
  const outputs = buildQueuedMotionOutputs(params.articleId, manifest);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("cultural_article_motion_jobs")
    .upsert(
      {
        user_id: params.userId,
        article_id: params.articleId,
        engine,
        status: "queued",
        motion_manifest: manifest as unknown as Json,
        outputs: outputs as unknown as Json,
        error_message: null,
        render_requested_at: now,
        started_at: null,
        completed_at: null,
      },
      { onConflict: "user_id,article_id,engine" },
    )
    .select("id, article_id, engine, status, motion_manifest, outputs, error_message, render_requested_at, updated_at")
    .single();

  if (error || !data) {
    console.error("[article motion] create job:", error?.message ?? "missing row");
    return null;
  }

  return motionJobFromRow(data, manifest);
}

export async function requestCulturalArticleMotionRender(
  supabase: SupabaseClient,
  params: {
    userId: string;
    articleId: string;
    article: GeneratedCulturalArticle;
    category: CulturalCategory | string;
  },
): Promise<CulturalArticleMotionJob | null> {
  const existing = await fetchLatestCulturalArticleMotionJob(supabase, {
    userId: params.userId,
    articleId: params.articleId,
    article: params.article,
    category: params.category,
  });
  const manifest =
    existing?.manifest ??
    buildFallbackArticleMotionManifest({
      articleId: params.articleId,
      article: params.article,
      category: params.category,
    });
  const outputs = buildQueuedMotionOutputs(params.articleId, manifest);
  const now = new Date().toISOString();

  if (!existing) {
    return createCulturalArticleMotionJob(supabase, {
      userId: params.userId,
      articleId: params.articleId,
      article: params.article,
      category: params.category as CulturalCategory,
    });
  }

  const { data, error } = await supabase
    .from("cultural_article_motion_jobs")
    .update({
      status: existing.status === "completed" ? "completed" : "queued",
      outputs: outputs as unknown as Json,
      render_requested_at: now,
      error_message: null,
    })
    .eq("id", existing.id)
    .eq("user_id", params.userId)
    .select("id, article_id, engine, status, motion_manifest, outputs, error_message, render_requested_at, updated_at")
    .single();

  if (error || !data) {
    console.error("[article motion] request render:", error?.message ?? "missing row");
    return null;
  }

  return motionJobFromRow(data, manifest);
}

export async function fetchLatestCulturalArticleMotionJob(
  supabase: SupabaseClient,
  params: {
    userId: string;
    articleId: string;
    article: GeneratedCulturalArticle;
    category: CulturalCategory | string;
  },
): Promise<CulturalArticleMotionJob | null> {
  const fallback = buildFallbackArticleMotionManifest({
    articleId: params.articleId,
    article: params.article,
    category: params.category,
  });
  const { data, error } = await supabase
    .from("cultural_article_motion_jobs")
    .select("id, article_id, engine, status, motion_manifest, outputs, error_message, render_requested_at, updated_at")
    .eq("user_id", params.userId)
    .eq("article_id", params.articleId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return motionJobFromRow(data, fallback);
}

export async function fetchLatestUserCulturalArticleMotionJob(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  job: CulturalArticleMotionJob;
  article: GeneratedCulturalArticle;
  articleId: string;
  titleZh: string;
} | null> {
  const { data: jobRow, error } = await supabase
    .from("cultural_article_motion_jobs")
    .select("id, article_id, engine, status, motion_manifest, outputs, error_message, render_requested_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !jobRow) return null;

  const { data: articleRow } = await supabase
    .from("cultural_contents")
    .select(
      "id, category, title_ja, title_zh, ai_summary_ja, ai_summary_zh, body_paragraphs, body_ja, body_zh, difficulty_jlpt, estimated_minutes, key_vocab, key_grammar, cultural_notes, cantonese_lens",
    )
    .eq("id", jobRow.article_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!articleRow) return null;
  const article = culturalContentRowToGeneratedArticle(articleRow);
  const fallback = buildFallbackArticleMotionManifest({
    articleId: articleRow.id,
    article,
    category: articleRow.category,
  });

  return {
    job: motionJobFromRow(jobRow, fallback),
    article,
    articleId: articleRow.id,
    titleZh: cleanAiTextBlock(articleRow.title_zh),
  };
}

export function culturalContentRowToGeneratedArticle(
  row: CulturalContentMotionRow,
): GeneratedCulturalArticle {
  const paragraphs = parseParagraphs(row);
  return {
    title_ja: stripInlineKanaReadings(row.title_ja),
    title_zh: cleanAiTextBlock(row.title_zh),
    summary_ja: stripInlineKanaReadings(row.ai_summary_ja || row.title_ja),
    summary_zh: cleanAiTextBlock(row.ai_summary_zh || row.title_zh),
    estimated_minutes: row.estimated_minutes ?? 8,
    difficulty_jlpt: normalizeJlpt(row.difficulty_jlpt),
    body_paragraphs: paragraphs,
    cultural_notes: cleanAiTextBlock(row.cultural_notes || row.ai_summary_zh || row.title_zh),
    cantonese_lens: cleanAiTextBlock(row.cantonese_lens || ""),
    key_vocab: parseVocab(row.key_vocab),
    key_grammar: parseGrammar(row.key_grammar),
    surprising_fact: "",
  };
}

function motionJobFromRow(
  row: MotionJobRow,
  fallback: CulturalArticleMotionManifest,
): CulturalArticleMotionJob {
  return {
    id: row.id,
    articleId: row.article_id,
    engine: row.engine === "hyperframes" ? "hyperframes" : "remotion",
    status: normalizeStatus(row.status),
    manifest: parseCulturalArticleMotionManifest(row.motion_manifest, fallback),
    outputs: parseOutputs(row.outputs, row.article_id, fallback),
    errorMessage: row.error_message,
    renderRequestedAt: row.render_requested_at,
    updatedAt: row.updated_at,
  };
}

function buildQueuedMotionOutputs(
  articleId: string,
  manifest: CulturalArticleMotionManifest,
): CulturalArticleMotionJobOutputs {
  const handoff = buildCulturalArticleMotionHandoff({
    articleId,
    manifest,
  });
  return {
    provider: "handoff",
    handoffUrl: `/api/motion/cultural-article/${articleId}/handoff`,
    message:
      "Article-specific manifest is ready. Configure Remotion Lambda or Vercel Sandbox to render MP4 outputs in production.",
    remotion: handoff.remotion,
    hyperframes: handoff.hyperframes,
  };
}

function parseOutputs(
  value: Json,
  articleId: string,
  manifest: CulturalArticleMotionManifest,
): CulturalArticleMotionJobOutputs {
  const fallback = buildQueuedMotionOutputs(articleId, manifest);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  return {
    ...fallback,
    ...record,
    provider:
      record.provider === "remotion_lambda" || record.provider === "vercel_sandbox"
        ? record.provider
        : "handoff",
    handoffUrl:
      typeof record.handoffUrl === "string"
        ? record.handoffUrl
        : fallback.handoffUrl,
    message:
      typeof record.message === "string"
        ? record.message
        : fallback.message,
  } as CulturalArticleMotionJobOutputs;
}

function normalizeStatus(value: string): CulturalArticleMotionJobStatus {
  if (value === "rendering" || value === "completed" || value === "failed") return value;
  return "queued";
}

function normalizeJlpt(value: string | null): GeneratedCulturalArticle["difficulty_jlpt"] {
  if (value === "N5" || value === "N4" || value === "N3" || value === "N2" || value === "N1") {
    return value;
  }
  return "N4";
}

function parseParagraphs(row: CulturalContentMotionRow): GeneratedCulturalArticle["body_paragraphs"] {
  const value = row.body_paragraphs;
  if (Array.isArray(value)) {
    const parsed = value
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return null;
        const record = item as Record<string, unknown>;
        const ja = typeof record.ja === "string" ? stripInlineKanaReadings(record.ja) : "";
        const zh = typeof record.zh === "string" ? cleanAiTextBlock(record.zh) : "";
        if (!ja && !zh) return null;
        return { ja: ja || row.title_ja, zh: zh || row.title_zh, kana_ruby: "" };
      })
      .filter((item): item is GeneratedCulturalArticle["body_paragraphs"][number] => Boolean(item));
    if (parsed.length >= 2) return parsed;
  }

  return [
    {
      ja: stripInlineKanaReadings(row.body_ja || row.title_ja),
      zh: cleanAiTextBlock(row.body_zh || row.ai_summary_zh || row.title_zh),
      kana_ruby: "",
    },
    {
      ja: stripInlineKanaReadings(row.ai_summary_ja || row.title_ja),
      zh: cleanAiTextBlock(row.cultural_notes || row.title_zh),
      kana_ruby: "",
    },
  ];
}

function parseVocab(value: Json): GeneratedCulturalArticle["key_vocab"] {
  if (!Array.isArray(value)) return fallbackVocab();
  const vocab = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const word = typeof record.word === "string" ? stripInlineKanaReadings(record.word) : "";
      if (!word) return null;
      return {
        word,
        kana: typeof record.kana === "string" ? record.kana : "",
        meaning_zh: typeof record.meaning_zh === "string" ? record.meaning_zh : "文章關鍵詞",
        jlpt_level: typeof record.jlpt_level === "string" ? record.jlpt_level : "",
        example_sentence:
          typeof record.example_sentence === "string"
            ? stripInlineKanaReadings(record.example_sentence)
            : "",
      };
    })
    .filter((item): item is GeneratedCulturalArticle["key_vocab"][number] => Boolean(item));
  return vocab.length >= 3 ? vocab : [...vocab, ...fallbackVocab()].slice(0, 3);
}

function parseGrammar(value: Json): GeneratedCulturalArticle["key_grammar"] {
  if (!Array.isArray(value)) return fallbackGrammar();
  const grammar = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const pattern = typeof record.pattern === "string" ? record.pattern : "";
      if (!pattern) return null;
      return {
        pattern,
        meaning_zh:
          typeof record.meaning_zh === "string"
            ? cleanAiTextBlock(record.meaning_zh)
            : "文章中的文法抓手",
        example_ja:
          typeof record.example_ja === "string"
            ? stripInlineKanaReadings(record.example_ja)
            : pattern,
      };
    })
    .filter((item): item is GeneratedCulturalArticle["key_grammar"][number] => Boolean(item));
  return grammar.length ? grammar : fallbackGrammar();
}

function fallbackVocab(): GeneratedCulturalArticle["key_vocab"] {
  return [
    { word: "観察", kana: "かんさつ", meaning_zh: "觀察", jlpt_level: "N3", example_sentence: "" },
    { word: "習慣", kana: "しゅうかん", meaning_zh: "習慣", jlpt_level: "N4", example_sentence: "" },
    { word: "背景", kana: "はいけい", meaning_zh: "背景", jlpt_level: "N3", example_sentence: "" },
  ];
}

function fallbackGrammar(): GeneratedCulturalArticle["key_grammar"] {
  return [
    {
      pattern: "〜について",
      meaning_zh: "關於某個主題",
      example_ja: "この文化について考えます。",
    },
  ];
}
