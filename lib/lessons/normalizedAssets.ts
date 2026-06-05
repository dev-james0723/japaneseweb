import type { SupabaseClient } from "@supabase/supabase-js";
import type { CulturalCategory } from "@/lib/cultural/categories";
import type { GeneratedCulturalArticle } from "@/lib/cultural/schemas";

export type NormalizedDailyLessonAssetSummary = {
  sections: number;
  sentences: number;
  vocab: number;
  grammar: number;
};

type SyncDailyLessonAssetsInput = {
  supabase: SupabaseClient;
  userId: string;
  lessonId: string | null;
  culturalContentId: string;
  lessonDate: string;
  category: CulturalCategory;
  article: GeneratedCulturalArticle;
};

const EMPTY_SUMMARY: NormalizedDailyLessonAssetSummary = {
  sections: 0,
  sentences: 0,
  vocab: 0,
  grammar: 0,
};

export async function syncDailyLessonAssets({
  supabase,
  userId,
  lessonId,
  culturalContentId,
  lessonDate,
  category,
  article,
}: SyncDailyLessonAssetsInput): Promise<
  | { ok: true; summary: NormalizedDailyLessonAssetSummary; skipped?: boolean; reason?: string }
  | { ok: false; reason: string; summary: NormalizedDailyLessonAssetSummary }
> {
  if (!lessonId) {
    return { ok: true, skipped: true, reason: "daily lesson id missing", summary: EMPTY_SUMMARY };
  }

  const sourcePath = `/cultural/article/${culturalContentId}`;
  const firstParagraph = article.body_paragraphs[0] ?? null;
  const sentenceRows = dedupeBy(
    [
      ...article.body_paragraphs.slice(0, 4).map((paragraph, index) => {
        const sentence = firstJapaneseSentence(paragraph.ja);
        return {
          user_id: userId,
          daily_lesson_id: lessonId,
          sentence_type: "mining",
          sentence_ja: sentence,
          kana_reading: paragraph.kana_ruby || null,
          translation_zh: paragraph.zh,
          difficulty_jlpt: normalizeJlpt(article.difficulty_jlpt),
          key_vocab: article.key_vocab
            .map((vocab) => vocab.word)
            .filter((word) => word && paragraph.ja.includes(word))
            .slice(0, 5),
          key_grammar: article.key_grammar
            .map((grammar) => grammar.pattern)
            .filter((pattern) => pattern && paragraph.ja.includes(pattern))
            .slice(0, 3),
          cloze_target: firstMatchingToken(
            paragraph.ja,
            article.key_vocab.map((vocab) => vocab.word),
          ),
          sort_order: index,
          metadata: {
            source_reference: sourcePath,
            paragraph_index: index,
            lesson_date: lessonDate,
            category,
          },
        };
      }),
      {
        user_id: userId,
        daily_lesson_id: lessonId,
        sentence_type: "shadowing",
        sentence_ja: firstJapaneseSentence(firstParagraph?.ja ?? article.summary_ja),
        kana_reading: firstParagraph?.kana_ruby || null,
        translation_zh: firstParagraph?.zh ?? article.summary_zh,
        difficulty_jlpt: normalizeJlpt(article.difficulty_jlpt),
        key_vocab: [],
        key_grammar: [],
        cloze_target: null,
        sort_order: 100,
        metadata: {
          source_reference: sourcePath,
          lesson_date: lessonDate,
          category,
        },
      },
    ].filter((row) => row.sentence_ja.trim().length > 0),
    (row) => `${row.sentence_type}:${row.sentence_ja}`,
  );

  const sections = [
    {
      user_id: userId,
      daily_lesson_id: lessonId,
      section_type: "hook",
      title: "Hook",
      body_ja: article.title_ja,
      body_zh: `今日用「${article.title_zh}」練 ${article.difficulty_jlpt} input。`,
      sort_order: 0,
      metadata: baseMetadata(sourcePath, lessonDate, category, culturalContentId),
    },
    {
      user_id: userId,
      daily_lesson_id: lessonId,
      section_type: "easy_summary",
      title: "Easy Japanese",
      body_ja: article.summary_ja,
      body_zh: article.summary_zh,
      sort_order: 10,
      metadata: baseMetadata(sourcePath, lessonDate, category, culturalContentId),
    },
    {
      user_id: userId,
      daily_lesson_id: lessonId,
      section_type: "original_snippet",
      title: "Original snippet",
      body_ja: firstParagraph?.ja ?? article.title_ja,
      body_zh: firstParagraph?.zh ?? article.title_zh,
      sort_order: 20,
      metadata: baseMetadata(sourcePath, lessonDate, category, culturalContentId),
    },
    {
      user_id: userId,
      daily_lesson_id: lessonId,
      section_type: "sentence_mining",
      title: "Sentence mining",
      body_ja: sentenceRows
        .filter((row) => row.sentence_type === "mining")
        .map((row) => row.sentence_ja)
        .join("\n"),
      body_zh: sentenceRows
        .filter((row) => row.sentence_type === "mining")
        .map((row) => row.translation_zh)
        .filter(Boolean)
        .join("\n"),
      sort_order: 30,
      metadata: {
        ...baseMetadata(sourcePath, lessonDate, category, culturalContentId),
        sentence_count: sentenceRows.filter((row) => row.sentence_type === "mining").length,
      },
    },
    {
      user_id: userId,
      daily_lesson_id: lessonId,
      section_type: "vocab_grammar",
      title: "Vocab and grammar",
      body_ja: [
        article.key_vocab.map((vocab) => vocab.word).join(" / "),
        article.key_grammar.map((grammar) => grammar.pattern).join(" / "),
      ].filter(Boolean).join("\n"),
      body_zh: [
        article.key_vocab.map((vocab) => `${vocab.word}: ${vocab.meaning_zh}`).join("\n"),
        article.key_grammar.map((grammar) => `${grammar.pattern}: ${grammar.meaning_zh}`).join("\n"),
      ].filter(Boolean).join("\n\n"),
      sort_order: 40,
      metadata: {
        ...baseMetadata(sourcePath, lessonDate, category, culturalContentId),
        vocab_count: article.key_vocab.length,
        grammar_count: article.key_grammar.length,
      },
    },
    {
      user_id: userId,
      daily_lesson_id: lessonId,
      section_type: "shadowing",
      title: "Shadowing",
      body_ja: firstJapaneseSentence(firstParagraph?.ja ?? article.summary_ja),
      body_zh: firstParagraph?.zh ?? article.summary_zh,
      sort_order: 50,
      metadata: baseMetadata(sourcePath, lessonDate, category, culturalContentId),
    },
    {
      user_id: userId,
      daily_lesson_id: lessonId,
      section_type: "output_mission",
      title: "Output mission",
      body_ja: null,
      body_zh: `用日文寫或講 1-2 句：${article.title_zh} 同你生活有咩關係？`,
      sort_order: 60,
      metadata: baseMetadata(sourcePath, lessonDate, category, culturalContentId),
    },
    {
      user_id: userId,
      daily_lesson_id: lessonId,
      section_type: "source_notes",
      title: "Source notes",
      body_ja: article.cultural_notes,
      body_zh: article.cantonese_lens || article.surprising_fact || article.summary_zh,
      sort_order: 70,
      metadata: {
        ...baseMetadata(sourcePath, lessonDate, category, culturalContentId),
        generated_from: "cultural_article",
      },
    },
  ];

  const vocabRows = dedupeBy(
    article.key_vocab.slice(0, 12).map((item, index) => ({
      user_id: userId,
      daily_lesson_id: lessonId,
      term: item.word,
      reading: item.kana || null,
      meaning_zh: item.meaning_zh,
      jlpt_level: normalizeJlpt(item.jlpt_level),
      example_sentence: item.example_sentence || null,
      sort_order: index,
      metadata: baseMetadata(sourcePath, lessonDate, category, culturalContentId),
    })),
    (row) => row.term,
  );

  const grammarRows = dedupeBy(
    article.key_grammar.slice(0, 8).map((item, index) => ({
      user_id: userId,
      daily_lesson_id: lessonId,
      pattern: item.pattern,
      meaning_zh: item.meaning_zh,
      construction: null,
      example_ja: item.example_ja,
      jlpt_level: normalizeJlpt(article.difficulty_jlpt),
      sort_order: index,
      metadata: baseMetadata(sourcePath, lessonDate, category, culturalContentId),
    })),
    (row) => row.pattern,
  );

  const deleteResult = await deleteExistingLessonAssets(supabase, lessonId, userId);
  if (!deleteResult.ok) return deleteResult;

  if (sections.length) {
    const { error } = await supabase.from("daily_lesson_sections").insert(sections);
    const failure = lessonAssetInsertFailure("daily_lesson_sections", error);
    if (failure) return failure;
  }

  if (sentenceRows.length) {
    const { error } = await supabase.from("lesson_sentences").insert(sentenceRows);
    const failure = lessonAssetInsertFailure("lesson_sentences", error);
    if (failure) return failure;
  }

  if (vocabRows.length) {
    const { error } = await supabase.from("lesson_vocab").insert(vocabRows);
    const failure = lessonAssetInsertFailure("lesson_vocab", error);
    if (failure) return failure;
  }

  if (grammarRows.length) {
    const { error } = await supabase.from("lesson_grammar").insert(grammarRows);
    const failure = lessonAssetInsertFailure("lesson_grammar", error);
    if (failure) return failure;
  }

  return {
    ok: true,
    summary: {
      sections: sections.length,
      sentences: sentenceRows.length,
      vocab: vocabRows.length,
      grammar: grammarRows.length,
    },
  };
}

function lessonAssetInsertFailure(table: string, error: unknown) {
  if (!error) return null;
  if (isMissingLessonAssetSchemaError(error)) {
    return { ok: true as const, skipped: true as const, reason: "normalized lesson asset schema not applied", summary: EMPTY_SUMMARY };
  }
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  return { ok: false as const, reason: `${table}: ${message}`, summary: EMPTY_SUMMARY };
}

async function deleteExistingLessonAssets(
  supabase: SupabaseClient,
  lessonId: string,
  userId: string,
): Promise<
  | { ok: true }
  | { ok: false; reason: string; summary: NormalizedDailyLessonAssetSummary }
> {
  const tables = ["daily_lesson_sections", "lesson_sentences", "lesson_vocab", "lesson_grammar"];
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("daily_lesson_id", lessonId)
      .eq("user_id", userId);
    if (error) {
      if (isMissingLessonAssetSchemaError(error)) {
        return { ok: true };
      }
      return { ok: false, reason: `${table}: ${error.message}`, summary: EMPTY_SUMMARY };
    }
  }
  return { ok: true };
}

function baseMetadata(
  sourceReference: string,
  lessonDate: string,
  category: CulturalCategory,
  culturalContentId: string,
) {
  return {
    source_reference: sourceReference,
    lesson_date: lessonDate,
    category,
    cultural_content_id: culturalContentId,
  };
}

function dedupeBy<T>(rows: T[], keyFor: (row: T) => string) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = keyFor(row).trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function firstJapaneseSentence(value: string) {
  const match = value.match(/^.+?[。！？]/u);
  return match?.[0]?.trim() ?? value.trim();
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

function isMissingLessonAssetSchemaError(error: unknown) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  return /does not exist|schema cache|PGRST205|42P01|daily_lesson_sections|lesson_sentences|lesson_vocab|lesson_grammar/i.test(message);
}
