import { XMLParser } from "fast-xml-parser";
import type { SupabaseClient } from "@supabase/supabase-js";

type ContentSourceRow = {
  id: string;
  user_id: string | null;
  source_type: "rss" | "news_api" | "youtube" | "manual" | "podcast";
  source_name: string;
  source_url: string;
  language: "ja" | "en" | "mixed";
  topic_tags: string[] | null;
  difficulty_bias: string | null;
  license_policy: "metadata_only" | "excerpt_allowed" | "full_allowed";
  metadata: Record<string, unknown> | null;
};

type FeedEntry = {
  title: string;
  link: string;
  excerpt: string | null;
  publishedAt: string | null;
  guid: string | null;
  metadata?: Record<string, unknown> | null;
};

type IngestSourceResult = {
  source_id: string;
  source_name: string;
  status: "inserted" | "skipped" | "error";
  fetched: number;
  inserted: number;
  reason?: string;
};

export type FeedIngestResult = {
  processed: number;
  inserted: number;
  results: IngestSourceResult[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
  cdataPropName: "__cdata",
});

export async function ingestDailyFeedSources(
  supabase: SupabaseClient,
  opts: { limitSources?: number; limitItemsPerSource?: number } = {},
): Promise<FeedIngestResult> {
  const limitSources = opts.limitSources ?? 20;
  const limitItemsPerSource = opts.limitItemsPerSource ?? 8;
  const { data: sources, error } = await supabase
    .from("content_sources")
    .select("id, user_id, source_type, source_name, source_url, language, topic_tags, difficulty_bias, license_policy, metadata")
    .eq("active", true)
    .in("source_type", ["rss", "podcast", "news_api", "youtube", "manual"])
    .limit(limitSources);

  if (error) throw error;

  const results: IngestSourceResult[] = [];
  for (const source of (sources ?? []) as ContentSourceRow[]) {
    const result = await ingestOneSource(supabase, source, limitItemsPerSource);
    results.push(result);
  }

  return {
    processed: results.length,
    inserted: results.reduce((sum, result) => sum + result.inserted, 0),
    results,
  };
}

async function ingestOneSource(
  supabase: SupabaseClient,
  source: ContentSourceRow,
  limitItems: number,
): Promise<IngestSourceResult> {
  try {
    const readiness = connectorReadiness(source);
    if (!readiness.ok) {
      return finalizeIngestResult(supabase, source, {
        source_id: source.id,
        source_name: source.source_name,
        status: "skipped",
        fetched: 0,
        inserted: 0,
        reason: readiness.reason,
      });
    }

    const entries = await fetchEntriesForSource(source, limitItems);
    if (!entries.length) {
      return finalizeIngestResult(supabase, source, {
        source_id: source.id,
        source_name: source.source_name,
        status: "skipped",
        fetched: 0,
        inserted: 0,
        reason: "no_entries",
      });
    }

    const existingUrls = await fetchExistingItemUrls(
      supabase,
      entries.map((entry) => entry.link),
      source.user_id,
    );

    const rows = entries
      .filter((entry) => !existingUrls.has(entry.link))
      .map((entry) => buildContentItemRow(source, entry));

    let inserted = 0;
    if (rows.length) {
      const { data, error } = await supabase
        .from("content_items")
        .insert(rows)
        .select("id");
      if (error) throw error;
      inserted = data?.length ?? rows.length;
    }

    return finalizeIngestResult(supabase, source, {
      source_id: source.id,
      source_name: source.source_name,
      status: inserted > 0 ? "inserted" : "skipped",
      fetched: entries.length,
      inserted,
      reason: inserted > 0 ? undefined : "all_entries_exist",
    });
  } catch (error: unknown) {
    return finalizeIngestResult(supabase, source, {
      source_id: source.id,
      source_name: source.source_name,
      status: "error",
      fetched: 0,
      inserted: 0,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

async function finalizeIngestResult(
  supabase: SupabaseClient,
  source: ContentSourceRow,
  result: IngestSourceResult,
): Promise<IngestSourceResult> {
  await persistSourceIngestTelemetry(supabase, source, result).catch(() => undefined);
  return result;
}

async function persistSourceIngestTelemetry(
  supabase: SupabaseClient,
  source: ContentSourceRow,
  result: IngestSourceResult,
) {
  const at = new Date().toISOString();
  const metadata = source.metadata ?? {};
  const previousTotals = record(metadata.ingest_totals);
  const totals = {
    attempts: numberValue(previousTotals?.attempts) + 1,
    inserted_runs: numberValue(previousTotals?.inserted_runs) + (result.status === "inserted" ? 1 : 0),
    skipped_runs: numberValue(previousTotals?.skipped_runs) + (result.status === "skipped" ? 1 : 0),
    error_runs: numberValue(previousTotals?.error_runs) + (result.status === "error" ? 1 : 0),
    inserted_items: numberValue(previousTotals?.inserted_items) + result.inserted,
    fetched_items: numberValue(previousTotals?.fetched_items) + result.fetched,
  };

  await supabase
    .from("content_sources")
    .update({
      last_fetched_at: at,
      metadata: {
        ...metadata,
        last_ingest: {
          status: result.status,
          fetched: result.fetched,
          inserted: result.inserted,
          reason: result.reason ?? null,
          at,
        },
        ingest_totals: totals,
      },
    })
    .eq("id", source.id);
}

function connectorReadiness(source: ContentSourceRow): { ok: true } | { ok: false; reason: string } {
  if (source.source_type === "manual") return { ok: false, reason: "manual_sources_are_user_submitted" };
  if (source.source_type === "news_api" && !newsApiKey()) return { ok: false, reason: "NEWSAPI_API_KEY_NOT_SET" };
  if (source.source_type === "youtube" && !youtubeApiKey()) return { ok: false, reason: "YOUTUBE_API_KEY_NOT_SET" };
  return { ok: true };
}

async function fetchEntriesForSource(source: ContentSourceRow, limit: number): Promise<FeedEntry[]> {
  if (source.source_type === "news_api") return fetchNewsApiEntries(source, limit);
  if (source.source_type === "youtube") return fetchYouTubeEntries(source, limit);
  return fetchFeedEntries(source.source_url, limit);
}

async function fetchFeedEntries(url: string, limit: number): Promise<FeedEntry[]> {
  const response = await fetch(url, {
    headers: {
      accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
      "user-agent": "JapanDailyLearner/2.0 (+metadata-only feed ingestion)",
    },
    next: { revalidate: 0 },
  });
  if (!response.ok) throw new Error(`feed_fetch_${response.status}`);

  const text = await response.text();
  const parsed = parser.parse(text) as Record<string, unknown>;
  const entries = extractEntries(parsed);
  return entries.slice(0, limit);
}

async function fetchNewsApiEntries(source: ContentSourceRow, limit: number): Promise<FeedEntry[]> {
  const key = newsApiKey();
  if (!key) throw new Error("NEWSAPI_API_KEY_NOT_SET");

  const response = await fetch(buildNewsApiUrl(source, limit), {
    headers: {
      accept: "application/json",
      "user-agent": "JapanDailyLearner/2.0 (+metadata-only news ingestion)",
      "x-api-key": key,
    },
    next: { revalidate: 0 },
  });
  if (!response.ok) throw new Error(`newsapi_fetch_${response.status}`);

  const payload = record(await response.json());
  if (!payload) return [];
  if (payload.status === "error") {
    const code = textValue(payload.code) || "error";
    const message = textValue(payload.message) || "NewsAPI request failed";
    throw new Error(`newsapi_${code}: ${message}`);
  }

  return asArray(payload.articles)
    .map(newsApiArticleToEntry)
    .filter(isUsefulEntry)
    .slice(0, limit);
}

async function fetchYouTubeEntries(source: ContentSourceRow, limit: number): Promise<FeedEntry[]> {
  const key = youtubeApiKey();
  if (!key) throw new Error("YOUTUBE_API_KEY_NOT_SET");

  const response = await fetch(buildYouTubeSearchUrl(source, limit), {
    headers: {
      accept: "application/json",
      "user-agent": "JapanDailyLearner/2.0 (+metadata-only youtube ingestion)",
    },
    next: { revalidate: 0 },
  });
  if (!response.ok) throw new Error(`youtube_fetch_${response.status}`);

  const payload = record(await response.json());
  if (!payload) return [];
  if (payload.error) {
    const error = record(payload.error);
    const message = textValue(error?.message) || "YouTube request failed";
    throw new Error(`youtube_error: ${message}`);
  }

  return asArray(payload.items)
    .map(youtubeSearchItemToEntry)
    .filter(isUsefulEntry)
    .slice(0, limit);
}

function extractEntries(parsed: Record<string, unknown>): FeedEntry[] {
  const rss = record(parsed.rss);
  const channel = record(rss?.channel);
  const rssItems = asArray(channel?.item);
  if (rssItems.length) return rssItems.map(feedEntryFromRssItem).filter(isUsefulEntry);

  const feed = record(parsed.feed);
  const atomEntries = asArray(feed?.entry);
  return atomEntries.map(feedEntryFromAtomEntry).filter(isUsefulEntry);
}

function feedEntryFromRssItem(value: unknown): FeedEntry {
  const item = record(value);
  return {
    title: textValue(item?.title),
    link: normalizeLink(item?.link),
    excerpt: summarizeExcerpt(item?.description ?? item?.["content:encoded"] ?? item?.summary),
    publishedAt: normalizeDate(textValue(item?.pubDate || item?.published || item?.updated)),
    guid: textValue(item?.guid) || null,
  };
}

function feedEntryFromAtomEntry(value: unknown): FeedEntry {
  const entry = record(value);
  return {
    title: textValue(entry?.title),
    link: normalizeLink(entry?.link),
    excerpt: summarizeExcerpt(entry?.summary ?? entry?.content),
    publishedAt: normalizeDate(textValue(entry?.published || entry?.updated)),
    guid: textValue(entry?.id) || null,
  };
}

function newsApiArticleToEntry(value: unknown): FeedEntry {
  const article = record(value);
  const source = record(article?.source);
  return {
    title: textValue(article?.title),
    link: textValue(article?.url),
    excerpt: summarizeExcerpt(article?.description),
    publishedAt: normalizeDate(textValue(article?.publishedAt)),
    guid: textValue(article?.url) || null,
    metadata: {
      connector: "newsapi_top_headlines",
      source_id: textValue(source?.id) || null,
      source_name: textValue(source?.name) || null,
      author: textValue(article?.author) || null,
      image_url: textValue(article?.urlToImage) || null,
    },
  };
}

function youtubeSearchItemToEntry(value: unknown): FeedEntry {
  const item = record(value);
  const id = record(item?.id);
  const snippet = record(item?.snippet);
  const thumbnails = record(snippet?.thumbnails);
  const thumbnail = record(thumbnails?.medium) ?? record(thumbnails?.high) ?? record(thumbnails?.default);
  const videoId = textValue(id?.videoId);
  return {
    title: textValue(snippet?.title),
    link: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "",
    excerpt: summarizeExcerpt(snippet?.description),
    publishedAt: normalizeDate(textValue(snippet?.publishedAt)),
    guid: videoId || null,
    metadata: {
      connector: "youtube_search",
      video_id: videoId || null,
      channel_id: textValue(snippet?.channelId) || null,
      channel_title: textValue(snippet?.channelTitle) || null,
      thumbnail_url: textValue(thumbnail?.url) || null,
    },
  };
}

function isUsefulEntry(entry: FeedEntry) {
  return Boolean(entry.title && entry.link);
}

async function fetchExistingItemUrls(
  supabase: SupabaseClient,
  urls: string[],
  userId: string | null,
) {
  if (!urls.length) return new Set<string>();
  let query = supabase
    .from("content_items")
    .select("source_url")
    .in("source_url", urls);
  query = userId ? query.eq("user_id", userId) : query.is("user_id", null);
  const { data } = await query;
  return new Set((data ?? []).map((row: { source_url: string }) => row.source_url));
}

function buildContentItemRow(source: ContentSourceRow, entry: FeedEntry) {
  const scores = scoreFeedEntry(source, entry);
  return {
    source_id: source.id,
    user_id: source.user_id,
    title: entry.title,
    source_url: entry.link,
    source_type: contentItemType(source),
    raw_excerpt: entry.excerpt,
    published_at: entry.publishedAt,
    language: source.language,
    topic_tags: source.topic_tags ?? [],
    jlpt_estimate: normalizeJlpt(source.difficulty_bias),
    interest_score: scores.interest,
    learning_value_score: scores.learning,
    novelty_score: scores.novelty,
    safety_score: scores.safety,
    has_audio: source.source_type === "podcast" || source.source_type === "youtube",
    has_transcript: Boolean(source.metadata?.has_transcript || source.metadata?.has_jp_subs),
    approved_for_daily: scores.safety >= 65 && scores.learning >= 45,
    metadata: {
      source_name: source.source_name,
      source_license_policy: source.license_policy,
      guid: entry.guid,
      ...(entry.metadata ?? {}),
      ingested_at: new Date().toISOString(),
    },
  };
}

function contentItemType(source: ContentSourceRow) {
  if (source.source_type === "podcast") return "podcast";
  if (source.source_type === "youtube") return "youtube";
  if (source.source_type === "manual") return "manual";
  if (source.source_type === "rss" || source.source_type === "news_api") return "news";
  return "article";
}

function buildNewsApiUrl(source: ContentSourceRow, limit: number) {
  const endpoint = new URL("https://newsapi.org/v2/top-headlines");
  const sourceUrl = safeUrl(source.source_url);
  const sourceParams = sourceUrl?.hostname === "newsapi.org" ? sourceUrl.searchParams : null;
  copySearchParams(sourceParams, endpoint.searchParams, ["q", "country", "category", "sources"]);
  const metadata = source.metadata ?? {};
  setParamIfMissing(endpoint.searchParams, "q", stringMetadata(metadata, "query"));
  setParamIfMissing(endpoint.searchParams, "country", stringMetadata(metadata, "country"));
  setParamIfMissing(endpoint.searchParams, "category", stringMetadata(metadata, "category"));
  setParamIfMissing(endpoint.searchParams, "sources", stringMetadata(metadata, "sources"));

  if (!hasAnyParam(endpoint.searchParams, ["q", "country", "category", "sources"])) {
    endpoint.searchParams.set("q", source.topic_tags?.length ? source.topic_tags.slice(0, 3).join(" OR ") : "Japan OR Japanese");
  }

  endpoint.searchParams.set("pageSize", String(Math.min(Math.max(limit, 1), 50)));
  return endpoint;
}

function buildYouTubeSearchUrl(source: ContentSourceRow, limit: number) {
  const endpoint = new URL("https://www.googleapis.com/youtube/v3/search");
  const metadata = source.metadata ?? {};
  const channelId = youtubeChannelId(source);
  endpoint.searchParams.set("part", "snippet");
  endpoint.searchParams.set("type", "video");
  endpoint.searchParams.set("maxResults", String(Math.min(Math.max(limit, 1), 50)));
  endpoint.searchParams.set("order", "date");
  endpoint.searchParams.set("safeSearch", "strict");
  endpoint.searchParams.set("regionCode", stringMetadata(metadata, "region_code") || "JP");
  endpoint.searchParams.set("relevanceLanguage", source.language === "en" ? "en" : "ja");
  endpoint.searchParams.set("key", youtubeApiKey() ?? "");
  if (channelId) {
    endpoint.searchParams.set("channelId", channelId);
  } else {
    endpoint.searchParams.set("q", stringMetadata(metadata, "query") || source.topic_tags?.slice(0, 3).join(" ") || source.source_name);
  }
  return endpoint;
}

function scoreFeedEntry(source: ContentSourceRow, entry: FeedEntry) {
  const title = entry.title.toLowerCase();
  const excerpt = (entry.excerpt ?? "").toLowerCase();
  const text = `${title} ${excerpt}`;
  const sensitive = /(事件|事故|死亡|殺|戦争|災害|地震|crime|murder|war|disaster)/i.test(text);
  const learningHints = /(日本|文化|言葉|生活|社会|旅行|食|歴史|japan|japanese|culture|language)/i.test(text);
  const tagMatch = (source.topic_tags ?? []).some((tag) => text.includes(tag.toLowerCase()));
  return {
    interest: clampScore(50 + (tagMatch ? 20 : 0) + (source.user_id ? 10 : 0)),
    learning: clampScore(45 + (learningHints ? 20 : 0) + (entry.excerpt ? 10 : 0)),
    novelty: clampScore(entry.publishedAt ? 85 : 65),
    safety: clampScore(sensitive ? 45 : 85),
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  const obj = record(value);
  if (!obj) return "";
  if (typeof obj.__cdata === "string") return obj.__cdata.trim();
  if (typeof obj["#text"] === "string") return obj["#text"].trim();
  return "";
}

function normalizeLink(value: unknown): string {
  if (typeof value === "string") return value.trim();
  const obj = record(value);
  if (!obj) return "";
  const href = obj["@_href"];
  return typeof href === "string" ? href.trim() : textValue(value);
}

function copySearchParams(from: URLSearchParams | null, to: URLSearchParams, keys: string[]) {
  if (!from) return;
  for (const key of keys) {
    const value = from.get(key);
    if (value) to.set(key, value);
  }
}

function setParamIfMissing(params: URLSearchParams, key: string, value: string) {
  if (!params.has(key) && value) params.set(key, value);
}

function hasAnyParam(params: URLSearchParams, keys: string[]) {
  return keys.some((key) => Boolean(params.get(key)));
}

function safeUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function stringMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

function youtubeChannelId(source: ContentSourceRow) {
  const fromMetadata = stringMetadata(source.metadata ?? {}, "channel_id");
  if (fromMetadata) return fromMetadata;
  const url = safeUrl(source.source_url);
  if (!url) return "";
  const match = url.pathname.match(/\/channel\/([^/?#]+)/);
  return match?.[1] ?? "";
}

function newsApiKey() {
  return process.env.NEWSAPI_API_KEY || process.env.NEWS_API_KEY || "";
}

function youtubeApiKey() {
  return process.env.YOUTUBE_API_KEY || "";
}

function summarizeExcerpt(value: unknown): string | null {
  const text = stripTags(textValue(value)).replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > 500 ? `${text.slice(0, 497)}...` : text;
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function normalizeDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeJlpt(value: string | null) {
  if (value === "N5" || value === "N4" || value === "N3" || value === "N2" || value === "N1") return value;
  return null;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
