import type { CulturalCategory } from "@/lib/cultural/categories";
import type { CulturalSectionImageResult } from "@/lib/cultural/generateSectionImage";
import type { GeneratedCulturalArticle } from "@/lib/cultural/schemas";

export type CulturalArticleVisualKind = "online" | "generated";
export type CulturalArticleVisualPlacement = "after_paragraph" | "cultural_notes" | "cantonese_lens";
export type CulturalArticleVisualLayout = "wide" | "inset" | "portrait" | "grid";

export type CulturalArticleVisual = {
  id: string;
  kind: CulturalArticleVisualKind;
  placement: CulturalArticleVisualPlacement;
  paragraph_index: number | null;
  layout: CulturalArticleVisualLayout;
  image_url: string;
  thumbnail_url: string | null;
  source_url: string | null;
  source_name: string | null;
  credit: string | null;
  license: string | null;
  alt: string;
  caption_zh: string;
  query: string | null;
};

type OnlineVisualPlan = {
  placement: CulturalArticleVisualPlacement;
  paragraphIndex: number | null;
  layout: CulturalArticleVisualLayout;
  caption: string;
  queries: string[];
};

type CommonsCandidate = {
  title: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  sourceUrl: string;
  credit: string | null;
  license: string | null;
};

const CATEGORY_COMMONS_QUERIES: Record<CulturalCategory, string[]> = {
  history_festivals: [
    "Japanese matsuri festival lanterns",
    "Japanese festival food stalls yatai",
    "Yukata summer festival Japan",
    "Japanese fireworks festival",
  ],
  language_history: [
    "Japanese calligraphy brush kanji",
    "Japanese kana calligraphy",
    "Japanese classroom kanji",
    "old Japanese manuscript kana",
  ],
  pop_culture: [
    "Tokyo street culture Japan",
    "Akihabara street Japan",
    "Japanese pop culture street",
    "Tokyo city night culture",
  ],
  traditional_arts: [
    "Japanese tea ceremony",
    "Japanese kimono textile",
    "Japanese craft tools",
    "Japanese traditional arts",
  ],
  regional_culture: [
    "Japanese regional street",
    "Japanese local festival",
    "Japan regional food",
    "Japanese train regional town",
  ],
  news_current: [
    "Tokyo city daily life",
    "Japan convenience store",
    "Japanese newspaper city",
    "Tokyo street contemporary Japan",
  ],
  lifestyle_niche: [
    "Japanese cafe interior",
    "Japanese neighborhood street",
    "Japanese daily life",
    "Japan kissaten cafe",
  ],
};

export async function buildCulturalArticleVisuals(params: {
  article: GeneratedCulturalArticle;
  category: CulturalCategory;
  cantoneseLensImage: CulturalSectionImageResult | null;
}): Promise<CulturalArticleVisual[]> {
  const plans = buildOnlineVisualPlans(params.article, params.category);
  const online = await resolveOnlineVisuals(plans);
  const generated = buildGeneratedVisuals(params.article, params.cantoneseLensImage);

  return [...online, ...generated].slice(0, 6);
}

export function parseCulturalArticleVisuals(value: unknown): CulturalArticleVisual[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeVisual).filter((item): item is CulturalArticleVisual => Boolean(item));
}

function buildOnlineVisualPlans(
  article: GeneratedCulturalArticle,
  category: CulturalCategory,
): OnlineVisualPlan[] {
  const categoryQueries = CATEGORY_COMMONS_QUERIES[category];
  const topicQueries = [
    `${article.title_ja} Japan`,
    `${article.title_zh} Japan`,
    `${article.title_ja} 日本`,
  ];
  const keywordQueries = article.key_vocab
    .map((item) => `${item.word} Japan`)
    .filter((query) => query.trim().length > 6);

  const paragraphPlans = article.body_paragraphs.slice(0, 3).map((paragraph, index) => ({
    placement: "after_paragraph" as const,
    paragraphIndex: index,
    layout: index === 0 ? "wide" as const : "inset" as const,
    caption: index === 0 ? "文章主題相關的真實場景。" : "幫你把段落內容連到現實畫面。",
    queries: compact([
      topicQueries[index],
      keywordQueries[index],
      paragraph.ja.slice(0, 48),
      categoryQueries[index],
      categoryQueries[0],
    ]),
  }));

  const notesPlan: OnlineVisualPlan = {
    placement: "cultural_notes",
    paragraphIndex: null,
    layout: "grid",
    caption: "文化筆記配圖，用真實照片補足背景感。",
    queries: compact([
      keywordQueries[3],
      categoryQueries[3],
      categoryQueries[1],
      article.title_ja,
    ]),
  };

  return [...paragraphPlans, notesPlan];
}

async function resolveOnlineVisuals(plans: OnlineVisualPlan[]): Promise<CulturalArticleVisual[]> {
  const seen = new Set<string>();
  const visuals: CulturalArticleVisual[] = [];

  for (const plan of plans) {
    const candidate = await findCommonsCandidate(plan.queries, seen);
    if (!candidate) continue;
    seen.add(candidate.imageUrl);
    visuals.push({
      id: `online-${visuals.length + 1}`,
      kind: "online",
      placement: plan.placement,
      paragraph_index: plan.paragraphIndex,
      layout: plan.layout,
      image_url: candidate.imageUrl,
      thumbnail_url: candidate.thumbnailUrl,
      source_url: candidate.sourceUrl,
      source_name: "Wikimedia Commons",
      credit: candidate.credit,
      license: candidate.license,
      alt: cleanCommonsTitle(candidate.title),
      caption_zh: plan.caption,
      query: plan.queries[0] ?? null,
    });
  }

  return visuals;
}

async function findCommonsCandidate(
  queries: string[],
  seenUrls: Set<string>,
): Promise<CommonsCandidate | null> {
  for (const query of queries) {
    const candidates = await searchCommonsImages(query);
    const fresh = candidates.find((candidate) => !seenUrls.has(candidate.imageUrl));
    if (fresh) return fresh;
  }
  return null;
}

async function searchCommonsImages(query: string): Promise<CommonsCandidate[]> {
  const search = query.trim();
  if (!search) return [];

  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "6",
    gsrsearch: search,
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "1600",
    format: "json",
    origin: "*",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "JapanDailyLearner/1.0 article-visual-planner",
      },
    });
    if (!res.ok) return [];
    const json = await res.json() as {
      query?: {
        pages?: Record<string, {
          title?: string;
          imageinfo?: Array<{
            url?: string;
            thumburl?: string;
            mime?: string;
            descriptionurl?: string;
            extmetadata?: Record<string, { value?: string }>;
          }>;
        }>;
      };
    };

    return Object.values(json.query?.pages ?? {})
      .map((page) => {
        const info = page.imageinfo?.[0];
        if (!info?.url || !info.mime?.startsWith("image/")) return null;
        if (/\.(svg|gif)$/i.test(info.url)) return null;
        const metadata = info.extmetadata ?? {};
        return {
          title: page.title ?? "Wikimedia Commons image",
          imageUrl: info.url,
          thumbnailUrl: info.thumburl ?? null,
          sourceUrl: info.descriptionurl ?? "https://commons.wikimedia.org/",
          credit: htmlToText(metadata.Artist?.value ?? metadata.Credit?.value ?? ""),
          license: htmlToText(metadata.LicenseShortName?.value ?? metadata.UsageTerms?.value ?? ""),
        } satisfies CommonsCandidate;
      })
      .filter((item): item is CommonsCandidate => Boolean(item));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function buildGeneratedVisuals(
  article: GeneratedCulturalArticle,
  cantoneseLensImage: CulturalSectionImageResult | null,
): CulturalArticleVisual[] {
  if (!cantoneseLensImage) return [];
  return [
    {
      id: "generated-cantonese-lens",
      kind: "generated",
      placement: "cantonese_lens",
      paragraph_index: null,
      layout: "portrait",
      image_url: cantoneseLensImage.imageUrl,
      thumbnail_url: null,
      source_url: null,
      source_name: "AI-generated",
      credit: null,
      license: null,
      alt: `${article.title_zh || article.title_ja} 的香港視角插畫`,
      caption_zh: "AI-generated Hong Kong lens illustration.",
      query: null,
    },
  ];
}

function normalizeVisual(value: unknown): CulturalArticleVisual | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const imageUrl = stringValue(row.image_url);
  if (!imageUrl) return null;
  const placement = placementValue(row.placement);
  const kind = row.kind === "generated" ? "generated" : "online";
  return {
    id: stringValue(row.id) || `${kind}-${imageUrl}`,
    kind,
    placement,
    paragraph_index: typeof row.paragraph_index === "number" ? row.paragraph_index : null,
    layout: layoutValue(row.layout),
    image_url: imageUrl,
    thumbnail_url: stringValue(row.thumbnail_url) || null,
    source_url: stringValue(row.source_url) || null,
    source_name: stringValue(row.source_name) || null,
    credit: stringValue(row.credit) || null,
    license: stringValue(row.license) || null,
    alt: stringValue(row.alt) || "article visual",
    caption_zh: stringValue(row.caption_zh) || "",
    query: stringValue(row.query) || null,
  };
}

function placementValue(value: unknown): CulturalArticleVisualPlacement {
  if (value === "cultural_notes" || value === "cantonese_lens") return value;
  return "after_paragraph";
}

function layoutValue(value: unknown): CulturalArticleVisualLayout {
  if (value === "inset" || value === "portrait" || value === "grid") return value;
  return "wide";
}

function cleanCommonsTitle(value: string) {
  return value.replace(/^File:/i, "").replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
}

function htmlToText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180) || null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function compact(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
}
