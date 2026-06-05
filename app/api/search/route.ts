import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
});

type SearchResult = {
  id: string;
  kind: "vocab" | "notebook" | "sentence" | "grammar" | "article" | "deck";
  label: string;
  description: string;
  href: string;
  meta?: string;
};

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "未登入。" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) return NextResponse.json({ results: [] });

  const term = normalizeSearchTerm(parsed.data.q);
  if (!term) return NextResponse.json({ results: [] });

  const like = `%${term}%`;
  const [
    vocab,
    notebookEntries,
    notebookFolders,
    sentences,
    grammar,
    articles,
    decks,
  ] = await Promise.allSettled([
    supabase
      .from("vocabulary_items")
      .select("id, deck_id, japanese, kana, meaning_zh, meaning_en, jlpt_level, cantonese_reading, common_mistake, notes, trilingual_mnemonic")
      .eq("user_id", user.id)
      .or(`japanese.ilike.${like},kana.ilike.${like},meaning_zh.ilike.${like},meaning_en.ilike.${like},cantonese_reading.ilike.${like},common_mistake.ilike.${like},notes.ilike.${like},trilingual_mnemonic.ilike.${like}`)
      .limit(6),
    supabase
      .from("notebook_entries")
      .select("id, kind, japanese, reading, meaning_zh, meaning_en, content, tags")
      .eq("user_id", user.id)
      .or(`japanese.ilike.${like},reading.ilike.${like},meaning_zh.ilike.${like},meaning_en.ilike.${like},content.ilike.${like}`)
      .limit(6),
    supabase
      .from("notebook_folders")
      .select("id, name, updated_at")
      .eq("user_id", user.id)
      .ilike("name", like)
      .limit(4),
    supabase
      .from("mined_sentences")
      .select("id, sentence_ja, kana_reading, translation_zh, difficulty_jlpt, source_title, key_vocab, key_grammar")
      .eq("user_id", user.id)
      .or(`sentence_ja.ilike.${like},kana_reading.ilike.${like},translation_zh.ilike.${like},source_title.ilike.${like}`)
      .limit(6),
    supabase
      .from("grammar_points")
      .select("id, pattern, jlpt_level, core_meaning, construction, common_mistake, mnemonic")
      .eq("user_id", user.id)
      .or(`pattern.ilike.${like},core_meaning.ilike.${like},construction.ilike.${like},common_mistake.ilike.${like},mnemonic.ilike.${like}`)
      .limit(6),
    supabase
      .from("cultural_contents")
      .select("id, title_ja, title_zh, difficulty_jlpt, content_type, ai_summary_zh")
      .or(`title_ja.ilike.${like},title_zh.ilike.${like},ai_summary_ja.ilike.${like},ai_summary_zh.ilike.${like}`)
      .limit(6),
    supabase
      .from("decks")
      .select("id, title, topic, source_type, deck_date")
      .eq("user_id", user.id)
      .or(`title.ilike.${like},topic.ilike.${like},raw_input.ilike.${like}`)
      .limit(6),
  ]);

  const results: SearchResult[] = [
    ...unwrap(vocab).map((row) => ({
      id: row.id,
      kind: "vocab" as const,
      label: row.japanese,
      description: compact([row.kana, row.cantonese_reading, row.meaning_zh ?? row.meaning_en, row.common_mistake, row.trilingual_mnemonic]),
      href: `/decks/${row.deck_id}`,
      meta: row.jlpt_level ?? "vocab",
    })),
    ...unwrap(sentences).map((row) => ({
      id: row.id,
      kind: "sentence" as const,
      label: row.sentence_ja,
      description: compact([row.kana_reading, row.translation_zh, ...stringArray(row.key_grammar), ...stringArray(row.key_vocab)]),
      href: "/mining",
      meta: row.difficulty_jlpt ?? row.source_title ?? "sentence",
    })),
    ...unwrap(grammar).map((row) => ({
      id: row.id,
      kind: "grammar" as const,
      label: row.pattern,
      description: compact([row.core_meaning, row.construction, row.common_mistake, row.mnemonic]),
      href: "/grammar",
      meta: row.jlpt_level ?? "grammar",
    })),
    ...unwrap(notebookEntries).map((row) => ({
      id: row.id,
      kind: "notebook" as const,
      label: row.japanese ?? row.content ?? "Notebook entry",
      description: compact([row.reading, row.meaning_zh ?? row.meaning_en, ...(row.tags ?? [])]),
      href: "/notebook",
      meta: row.kind ?? "notebook",
    })),
    ...unwrap(notebookFolders).map((row) => ({
      id: row.id,
      kind: "notebook" as const,
      label: row.name,
      description: "Notebook folder",
      href: "/notebook",
      meta: "folder",
    })),
    ...unwrap(articles).map((row) => ({
      id: row.id,
      kind: "article" as const,
      label: row.title_ja,
      description: compact([row.title_zh, row.ai_summary_zh]),
      href: `/cultural/article/${row.id}`,
      meta: row.difficulty_jlpt ?? row.content_type ?? "article",
    })),
    ...unwrap(decks).map((row) => ({
      id: row.id,
      kind: "deck" as const,
      label: row.title,
      description: compact([row.topic, row.source_type, row.deck_date]),
      href: `/decks/${row.id}`,
      meta: "deck",
    })),
  ]
    .filter((result) => result.label.trim().length > 0)
    .slice(0, 12);

  return NextResponse.json({ results });
}

function normalizeSearchTerm(value: string) {
  return value.replace(/[%(),]/g, " ").replace(/\s+/g, " ").trim();
}

function compact(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" · ")
    .slice(0, 180);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function unwrap<T>(
  result: PromiseSettledResult<{ data: T[] | null; error: { message: string } | null }>,
): T[] {
  if (result.status !== "fulfilled" || result.value.error) return [];
  return result.value.data ?? [];
}
