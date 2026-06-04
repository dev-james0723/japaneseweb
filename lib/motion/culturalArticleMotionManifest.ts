import { z } from "zod";
import type { CulturalCategory } from "@/lib/cultural/categories";
import { geminiGenerateJson } from "@/lib/cultural/geminiJson";
import type { GeneratedCulturalArticle } from "@/lib/cultural/schemas";
import { stripInlineKanaReadings } from "@/lib/furigana";
import { cleanAiTextBlock } from "@/lib/text/cleanAiText";

const GENERIC_VISUALS = [
  "random Japanese landmarks",
  "Mt Fuji",
  "sakura",
  "sushi",
  "anime",
  "neon Tokyo",
  "generic temple",
  "train station",
];

const MotionSceneSchema = z.object({
  duration_sec: z.number().min(1).max(5).default(2.4),
  headline: z.string().trim().min(1).max(80),
  on_screen_text: z.string().trim().min(1).max(140),
  visual_prompt: z.string().trim().min(1).max(700),
  motion_direction: z.string().trim().min(1).max(360),
  article_evidence: z.string().trim().min(1).max(360),
  audio_or_sfx: z.string().trim().max(180).default("soft paper sweep, subtle UI pulse"),
});

export const CulturalArticleMotionManifestSchema = z.object({
  article_id: z.string().trim().optional().default(""),
  video_title: z.string().trim().min(1).max(120),
  specificity_keywords: z.array(z.string().trim().min(1).max(40)).min(3).max(12),
  forbidden_generic_visuals: z.array(z.string().trim().min(1).max(80)).min(3).max(12),
  style: z.object({
    mood: z.string().trim().min(1).max(100),
    palette: z.array(z.string().trim().min(1).max(40)).min(3).max(6),
    motion_language: z.string().trim().min(1).max(220),
  }),
  scenes: z.array(MotionSceneSchema).min(2).max(4),
  thumbnail_prompt: z.string().trim().min(1).max(700),
  validation: z.object({
    why_this_is_article_specific: z.string().trim().min(1).max(500),
    generic_japan_risk: z.enum(["low", "medium", "high"]),
  }),
});

export type CulturalArticleMotionManifest = z.infer<typeof CulturalArticleMotionManifestSchema>;
export type CulturalArticleMotionScene = CulturalArticleMotionManifest["scenes"][number];

export async function generateArticleMotionManifest(params: {
  articleId: string;
  article: GeneratedCulturalArticle;
  category: CulturalCategory;
}): Promise<CulturalArticleMotionManifest> {
  const fallback = buildFallbackArticleMotionManifest(params);
  try {
    const raw = await geminiGenerateJson(
      buildArticleMotionManifestPrompt(params),
      0.35,
    );
    const parsed = CulturalArticleMotionManifestSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return fallback;

    const normalized = normalizeMotionManifest(parsed.data, fallback);
    return manifestHasArticleSpecificity(normalized)
      ? normalized
      : fallback;
  } catch {
    return fallback;
  }
}

export function parseCulturalArticleMotionManifest(
  value: unknown,
  fallback: CulturalArticleMotionManifest,
): CulturalArticleMotionManifest {
  const parsed = CulturalArticleMotionManifestSchema.safeParse(value);
  if (!parsed.success) return fallback;
  return normalizeMotionManifest(parsed.data, fallback);
}

export function buildFallbackArticleMotionManifest({
  articleId,
  article,
  category,
}: {
  articleId: string;
  article: GeneratedCulturalArticle;
  category: CulturalCategory | string;
}): CulturalArticleMotionManifest {
  const titleJa = stripInlineKanaReadings(article.title_ja);
  const titleZh = cleanAiTextBlock(article.title_zh);
  const paragraphs = article.body_paragraphs.slice(0, 3);
  const keywords = articleKeywords(article, category);
  const firstEvidence = cleanAiTextBlock(paragraphs[0]?.zh || article.summary_zh);
  const secondEvidence = cleanAiTextBlock(paragraphs[1]?.zh || article.cultural_notes);
  const vocabText = article.key_vocab
    .slice(0, 3)
    .map((item) => `${stripInlineKanaReadings(item.word)}=${item.meaning_zh}`)
    .join(" / ");
  const grammarText = article.key_grammar
    .slice(0, 2)
    .map((item) => `${item.pattern}: ${cleanAiTextBlock(item.meaning_zh)}`)
    .join(" / ");

  return {
    article_id: articleId,
    video_title: `${titleZh || titleJa} · cultural motion recap`,
    specificity_keywords: keywords,
    forbidden_generic_visuals: GENERIC_VISUALS,
    style: {
      mood: "focused cultural explainer for a Japanese learner in Hong Kong",
      palette: ["charcoal black", "matcha lime", "soft sky blue", "sakura pink"],
      motion_language: "quiet editorial motion, evidence cards, phrase highlights, subtle timeline pulses",
    },
    scenes: [
      {
        duration_sec: 2.3,
        headline: titleZh || titleJa,
        on_screen_text: cleanAiTextBlock(article.summary_zh || article.summary_ja).slice(0, 120),
        visual_prompt: articleVisualPrompt({
          titleJa,
          titleZh,
          detail: firstEvidence,
          keywords,
        }),
        motion_direction: "Open with the exact article title, then reveal one evidence line and two keyword chips.",
        article_evidence: firstEvidence.slice(0, 300),
        audio_or_sfx: "soft paper reveal, low interface pulse",
      },
      {
        duration_sec: 2.5,
        headline: "文化場景",
        on_screen_text: secondEvidence.slice(0, 120),
        visual_prompt: articleVisualPrompt({
          titleJa,
          titleZh,
          detail: secondEvidence,
          keywords,
        }),
        motion_direction: "Slide a section card into view and highlight the article-specific cultural detail.",
        article_evidence: secondEvidence.slice(0, 300),
        audio_or_sfx: "subtle room tone, card sweep",
      },
      {
        duration_sec: 2.6,
        headline: "語言抓手",
        on_screen_text: [vocabText, grammarText].filter(Boolean).join(" / ").slice(0, 130),
        visual_prompt: articleVisualPrompt({
          titleJa,
          titleZh,
          detail: `${vocabText} ${grammarText}`,
          keywords,
        }),
        motion_direction: "Stack vocabulary and grammar chips from the actual article, no generic Japanese culture symbols.",
        article_evidence: [vocabText, grammarText].filter(Boolean).join(" / ").slice(0, 300),
        audio_or_sfx: "small highlight ticks",
      },
    ],
    thumbnail_prompt: articleVisualPrompt({
      titleJa,
      titleZh,
      detail: firstEvidence,
      keywords,
    }),
    validation: {
      why_this_is_article_specific: `Uses title "${titleZh || titleJa}", article evidence, and keywords: ${keywords.join(", ")}.`,
      generic_japan_risk: "low",
    },
  };
}

function buildArticleMotionManifestPrompt({
  articleId,
  article,
  category,
}: {
  articleId: string;
  article: GeneratedCulturalArticle;
  category: CulturalCategory;
}) {
  const articlePayload = {
    id: articleId,
    category,
    title_ja: stripInlineKanaReadings(article.title_ja),
    title_zh: cleanAiTextBlock(article.title_zh),
    summary_ja: stripInlineKanaReadings(article.summary_ja),
    summary_zh: cleanAiTextBlock(article.summary_zh),
    body_paragraphs: article.body_paragraphs.map((paragraph) => ({
      ja: stripInlineKanaReadings(paragraph.ja),
      zh: cleanAiTextBlock(paragraph.zh),
    })),
    cultural_notes: cleanAiTextBlock(article.cultural_notes),
    cantonese_lens: cleanAiTextBlock(article.cantonese_lens),
    key_vocab: article.key_vocab.map((item) => ({
      word: stripInlineKanaReadings(item.word),
      meaning_zh: item.meaning_zh,
      example_sentence: stripInlineKanaReadings(item.example_sentence || ""),
    })),
    key_grammar: article.key_grammar.map((item) => ({
      pattern: item.pattern,
      meaning_zh: cleanAiTextBlock(item.meaning_zh),
      example_ja: stripInlineKanaReadings(item.example_ja),
    })),
    surprising_fact: cleanAiTextBlock(article.surprising_fact),
  };

  return `You are creating a short cultural immersion motion video for ONE specific Japanese article.

Use ONLY the article payload below. Do not make a generic Japanese culture video.
Every scene must visibly connect to the article title, article sections, cultural details, vocabulary, grammar, or examples.

INPUT ARTICLE:
${JSON.stringify(articlePayload, null, 2)}

Create a 6-10 second motion video plan.

Hard rules:
- The video must be about this exact article, not "Japan" in general.
- Do not use generic visuals like random temples, Mt Fuji, sushi, anime, neon Tokyo, cherry blossoms, or train stations unless the article explicitly mentions them.
- Each scene must include at least one article-specific detail and quote/paraphrase an article evidence line.
- Use the article title as the main title card.
- Use 2-4 section-specific visual moments from the article.
- Include Japanese text from the article only when it appears in the source.
- Include Cantonese/Traditional Chinese learning context where useful.
- Output strict JSON only, no markdown.

Return exactly:
{
  "article_id": "${articleId}",
  "video_title": string,
  "specificity_keywords": string[],
  "forbidden_generic_visuals": string[],
  "style": {
    "mood": string,
    "palette": string[],
    "motion_language": string
  },
  "scenes": [
    {
      "duration_sec": number,
      "headline": string,
      "on_screen_text": string,
      "visual_prompt": string,
      "motion_direction": string,
      "article_evidence": string,
      "audio_or_sfx": string
    }
  ],
  "thumbnail_prompt": string,
  "validation": {
    "why_this_is_article_specific": string,
    "generic_japan_risk": "low" | "medium" | "high"
  }
}`;
}

function normalizeMotionManifest(
  manifest: CulturalArticleMotionManifest,
  fallback: CulturalArticleMotionManifest,
): CulturalArticleMotionManifest {
  const keywords = uniqueStrings([
    ...manifest.specificity_keywords,
    ...fallback.specificity_keywords,
  ]).slice(0, 12);
  const scenes = manifest.scenes.map((scene, index) => {
    const fallbackScene = fallback.scenes[index] ?? fallback.scenes[0];
    const keywordHint = keywords.slice(0, 4).join(", ");
    const evidence = cleanAiTextBlock(scene.article_evidence || fallbackScene.article_evidence);
    const visualPrompt = scene.visual_prompt.includes(keywords[0] ?? "")
      ? scene.visual_prompt
      : `${scene.visual_prompt} Article-specific anchors: ${keywordHint}. Evidence: ${evidence}`;
    return {
      ...scene,
      article_evidence: evidence,
      visual_prompt: visualPrompt,
    };
  });

  return {
    ...manifest,
    article_id: manifest.article_id || fallback.article_id,
    specificity_keywords: keywords.length >= 3 ? keywords : fallback.specificity_keywords,
    forbidden_generic_visuals: uniqueStrings([
      ...manifest.forbidden_generic_visuals,
      ...GENERIC_VISUALS,
    ]).slice(0, 12),
    scenes: scenes.length >= 2 ? scenes : fallback.scenes,
  };
}

function manifestHasArticleSpecificity(manifest: CulturalArticleMotionManifest) {
  if (manifest.validation.generic_japan_risk === "high") return false;
  const keywords = manifest.specificity_keywords.map((keyword) => keyword.toLowerCase());
  return manifest.scenes.every((scene) => {
    const haystack = `${scene.headline} ${scene.on_screen_text} ${scene.visual_prompt} ${scene.article_evidence}`.toLowerCase();
    return scene.article_evidence.length >= 8 && keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
  });
}

function articleKeywords(article: GeneratedCulturalArticle, category: CulturalCategory | string) {
  const candidates = uniqueStrings([
    ...splitTitle(article.title_ja),
    ...splitTitle(article.title_zh),
    ...article.key_vocab.map((item) => stripInlineKanaReadings(item.word)),
    ...article.key_grammar.map((item) => item.pattern),
    String(category),
  ]);
  const specific = candidates.filter((item) => !/^(日本|文化|日文|語感|記憶|季節|今日|文章)$/u.test(item));
  return uniqueStrings([
    ...specific,
    article.title_zh,
    stripInlineKanaReadings(article.title_ja),
    String(category),
  ]).slice(0, 10);
}

function splitTitle(value: string) {
  return stripInlineKanaReadings(value)
    .split(/[\s,，、。・:：/｜|「」『』（）()]+/u)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 4);
}

function articleVisualPrompt({
  titleJa,
  titleZh,
  detail,
  keywords,
}: {
  titleJa: string;
  titleZh: string;
  detail: string;
  keywords: string[];
}) {
  return [
    `Premium cultural explainer visual for the exact article "${titleZh || titleJa}".`,
    `Depict this article detail: ${detail}`,
    `Visible anchors: ${keywords.slice(0, 5).join(", ")}.`,
    `Avoid generic Japanese imagery unless named by the article: ${GENERIC_VISUALS.join(", ")}.`,
    "Leave readable negative space for text overlays.",
  ].join(" ");
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}
