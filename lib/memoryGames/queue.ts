import type { SupabaseClient } from "@supabase/supabase-js";
import { todayDateString } from "@/lib/os/types";

export type MemorySentencePromptRow = {
  id: string;
  prompt_type: string;
  prompt: string;
  answer: string;
  sentence_ja: string;
  kana_reading: string | null;
  translation_zh: string | null;
  difficulty_jlpt: string | null;
  key_vocab: string[] | null;
  key_grammar: string[] | null;
  status: string | null;
  is_leech: boolean | null;
  lapses: number | null;
  next_review_date: string | null;
  updated_at: string | null;
};

export type MemoryVocabularyRow = {
  id: string;
  japanese: string;
  kanji: string | null;
  kana: string | null;
  meaning_zh: string | null;
  meaning_en: string | null;
  jlpt_level: string | null;
  register_label: string | null;
  part_of_speech: string | null;
  updated_at: string | null;
  created_at: string | null;
};

export type KanaKanjiSnapGameCard = {
  id: string;
  vocabId: string;
  surface: string;
  reading: string;
  meaning: string;
  readingChoices: string[];
  meaningChoices: string[];
  jlptLevel: string | null;
  registerLabel: string | null;
  partOfSpeech: string | null;
  hasKanji: boolean;
};

export type SentenceRebuildGameCard = {
  id: string;
  promptId: string;
  sentenceJa: string;
  translationZh: string | null;
  kanaReading: string | null;
  difficultyJlpt: string | null;
  keyGrammar: string[];
  chunks: string[];
  scrambledChunks: string[];
  isLeech: boolean;
  status: string | null;
};

export type ClozeAttackGameCard = {
  id: string;
  promptId: string;
  prompt: string;
  answer: string;
  sentenceJa: string;
  translationZh: string | null;
  keyGrammar: string[];
  isLeech: boolean;
};

export type GrammarDuelGameCard = {
  id: string;
  promptId: string;
  sentenceJa: string;
  translationZh: string | null;
  correct: string;
  choices: string[];
  explanation: string;
  isLeech: boolean;
};

export type ContextMatchChoice = {
  id: string;
  sentenceJa: string;
  translationZh: string | null;
};

export type ContextMatchGameCard = {
  id: string;
  promptId: string;
  vocab: string;
  sentenceJa: string;
  translationZh: string | null;
  difficultyJlpt: string | null;
  keyGrammar: string[];
  choices: ContextMatchChoice[];
  explanation: string;
  isLeech: boolean;
};

export type MistakeDoctorGameCard = {
  id: string;
  sourceId: string;
  sourceLabel: string;
  skillArea: string;
  severity: string;
  original: string;
  corrected: string;
  explanationZh: string | null;
};

export type MemoryDailyLessonRow = {
  id: string;
  lesson_date: string;
  status: string;
  hook_zh: string | null;
  easy_summary_ja: string | null;
  original_snippet: string | null;
  shadowing_line: string | null;
  output_mission: string | null;
  created_at: string | null;
};

export type MemoryLessonSentenceRow = {
  id: string;
  daily_lesson_id: string;
  sentence_type: string;
  sentence_ja: string;
  translation_zh: string | null;
  difficulty_jlpt: string | null;
  key_vocab: string[] | null;
  key_grammar: string[] | null;
  sort_order: number | null;
};

export type NewsRecallGameCard = {
  id: string;
  dailyLessonId: string;
  lessonDate: string;
  hookZh: string | null;
  summaryJa: string | null;
  originalSnippet: string | null;
  outputMission: string | null;
  modelSentence: string;
  modelTranslationZh: string | null;
  difficultyJlpt: string | null;
  keyVocab: string[];
  keyGrammar: string[];
  explanation: string;
};

export type MemoryVocabularySessionRow = {
  id: string;
  deck_id: string;
  created_at: string | null;
};

export type MemoryStorylineGroupRow = {
  id: string;
  session_id: string;
  group_index: number;
  title_traditional_chinese: string;
  storyline_japanese: string;
  storyline_traditional_chinese: string;
  words: unknown;
  image_url: string | null;
  generation_status: string;
  created_at: string | null;
};

export type MemoryPalaceWord = {
  word: string;
  reading: string | null;
  meaningZh: string | null;
  visualAnchor: string | null;
};

export type MemoryPalaceGameCard = {
  id: string;
  groupId: string;
  titleZh: string;
  storylineJa: string;
  storylineZh: string;
  imageUrl: string | null;
  generationStatus: string;
  words: MemoryPalaceWord[];
  requiredRecallCount: number;
  explanation: string;
};

export type MemoryRoleplaySessionRow = {
  id: string;
  scenario: string;
  partner_role: string;
  persona_id: string | null;
  difficulty: string | null;
  started_at: string | null;
};

export type MemoryRoleplayTurnRow = {
  id: string;
  session_id: string;
  speaker: string;
  text_ja: string;
  translation_zh: string | null;
  created_at: string | null;
};

export type MemoryRoleplayCorrectionRow = {
  id: string;
  session_id: string;
  turn_id: string | null;
  original: string;
  corrected: string;
  explanation_zh: string | null;
  created_at: string | null;
};

export type ConversationNextLineChoice = {
  id: string;
  textJa: string;
  translationZh: string | null;
};

export type ConversationNextLineGameCard = {
  id: string;
  sessionId: string;
  turnId: string;
  scenario: string;
  partnerRole: string;
  personaLabel: string;
  difficultyJlpt: string | null;
  partnerLine: string;
  partnerTranslationZh: string | null;
  previousUserLine: string | null;
  correct: string;
  correctTranslationZh: string | null;
  choices: ConversationNextLineChoice[];
  explanation: string;
};

export type MemoryBossFight = {
  label: string;
  count: number;
  detail: string;
  severityScore: number;
};

export type MemoryGameContext = {
  kanaKanjiSnap: KanaKanjiSnapGameCard[];
  sentenceRebuild: SentenceRebuildGameCard[];
  clozeAttack: ClozeAttackGameCard[];
  grammarDuel: GrammarDuelGameCard[];
  contextMatch: ContextMatchGameCard[];
  mistakeDoctor: MistakeDoctorGameCard[];
  newsRecall: NewsRecallGameCard[];
  memoryPalace: MemoryPalaceGameCard[];
  conversationNextLine: ConversationNextLineGameCard[];
  bossFight: MemoryBossFight | null;
  stats: {
    snapCards: number;
    sentencePrompts: number;
    duePrompts: number;
    grammarTagged: number;
    contextMatchCards: number;
    mistakeDoctorCards: number;
    newsRecallCards: number;
    memoryPalaceCards: number;
    conversationNextLineCards: number;
    leechPrompts: number;
    gameAttempts7d: number;
    gameAccuracy7d: number | null;
    averageResponseMs7d: number | null;
    hardestGame7d: string | null;
  };
  errors: string[];
};

type WeaknessRow = {
  id: string;
  skill_area: string;
  severity: string;
  source: string;
  prompt: string | null;
  user_answer: string | null;
  correct_answer: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type AttemptRow = {
  is_correct: boolean | null;
  game_type?: string | null;
  response_time_ms?: number | null;
};

export async function fetchMemoryGameContext(
  supabase: SupabaseClient,
  userId: string,
  today = todayDateString(),
): Promise<MemoryGameContext> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    dueResult,
    recentResult,
    vocabResult,
    dailyLessonsResult,
    vocabularySessionsResult,
    roleplaySessionsResult,
    roleplayCorrectionsResult,
    weaknessResult,
    attemptResult,
  ] = await Promise.all([
    supabase
      .from("sentence_review_prompts")
      .select(promptSelect)
      .eq("user_id", userId)
      .lte("next_review_date", today)
      .order("is_leech", { ascending: false })
      .order("next_review_date", { ascending: true })
      .limit(36),
    supabase
      .from("sentence_review_prompts")
      .select(promptSelect)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(36),
    supabase
      .from("vocabulary_items")
      .select(vocabSelect)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(48),
    supabase
      .from("daily_lessons")
      .select(dailyLessonSelect)
      .eq("user_id", userId)
      .order("lesson_date", { ascending: false })
      .limit(8),
    supabase
      .from("vocabulary_sessions")
      .select(vocabularySessionSelect)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("roleplay_sessions")
      .select(roleplaySessionSelect)
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(12),
    supabase
      .from("roleplay_corrections")
      .select(roleplayCorrectionSelect)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("weakness_events")
      .select("id, skill_area, severity, source, prompt, user_answer, correct_answer, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("memory_game_attempts")
      .select("game_type, is_correct, response_time_ms")
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo.toISOString()),
  ]);

  const roleplaySessions = roleplaySessionsResult.error
    ? []
    : ((roleplaySessionsResult.data ?? []) as unknown as MemoryRoleplaySessionRow[]);
  const roleplaySessionIds = roleplaySessions.map((session) => session.id);
  const dailyLessons = dailyLessonsResult.error
    ? []
    : ((dailyLessonsResult.data ?? []) as unknown as MemoryDailyLessonRow[]);
  const dailyLessonIds = dailyLessons.map((lesson) => lesson.id);
  const vocabularySessions = vocabularySessionsResult.error
    ? []
    : ((vocabularySessionsResult.data ?? []) as unknown as MemoryVocabularySessionRow[]);
  const vocabularySessionIds = vocabularySessions.map((session) => session.id);
  const [roleplayTurnsResult, lessonSentencesResult, storylineGroupsResult] = await Promise.all([
    roleplaySessionIds.length
      ? supabase
          .from("roleplay_turns")
          .select(roleplayTurnSelect)
          .eq("user_id", userId)
          .in("session_id", roleplaySessionIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null },
    dailyLessonIds.length
      ? supabase
          .from("lesson_sentences")
          .select(lessonSentenceSelect)
          .eq("user_id", userId)
          .in("daily_lesson_id", dailyLessonIds)
          .order("sort_order", { ascending: true })
      : { data: [], error: null },
    vocabularySessionIds.length
      ? supabase
          .from("vocabulary_storyline_groups")
          .select(storylineGroupSelect)
          .in("session_id", vocabularySessionIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null },
  ]);

  const dueRows = dueResult.error ? [] : ((dueResult.data ?? []) as unknown as MemorySentencePromptRow[]);
  const recentRows = recentResult.error ? [] : ((recentResult.data ?? []) as unknown as MemorySentencePromptRow[]);
  const prompts = uniqueById([...dueRows, ...recentRows]).slice(0, 48);
  const vocabRows = vocabResult.error ? [] : ((vocabResult.data ?? []) as unknown as MemoryVocabularyRow[]);
  const lessonSentences = lessonSentencesResult.error
    ? []
    : ((lessonSentencesResult.data ?? []) as unknown as MemoryLessonSentenceRow[]);
  const storylineGroups = storylineGroupsResult.error
    ? []
    : ((storylineGroupsResult.data ?? []) as unknown as MemoryStorylineGroupRow[]);
  const roleplayCorrections = roleplayCorrectionsResult.error
    ? []
    : ((roleplayCorrectionsResult.data ?? []) as unknown as MemoryRoleplayCorrectionRow[]);
  const roleplayTurns = roleplayTurnsResult.error ? [] : ((roleplayTurnsResult.data ?? []) as unknown as MemoryRoleplayTurnRow[]);
  const weaknessRows = weaknessResult.error ? [] : ((weaknessResult.data ?? []) as WeaknessRow[]);
  const attempts = attemptResult.error ? [] : ((attemptResult.data ?? []) as AttemptRow[]);
  const correctAttempts = attempts.filter((attempt) => attempt.is_correct).length;
  const responseTimes = attempts
    .map((attempt) => attempt.response_time_ms)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const grammarTags = collectGrammarTags(prompts, weaknessRows);
  const snapRows = vocabRows.filter(hasKanaKanjiSnapSignal);
  const kanaKanjiSnap = snapRows
    .slice(0, 8)
    .map((row, index) => buildKanaKanjiSnapCard(row, snapRows, index))
    .filter((card): card is KanaKanjiSnapGameCard => Boolean(card));
  const contextMatchPrompts = prompts.filter(hasContextMatchSignal);
  const sentenceRebuild = prompts
    .filter((prompt) => prompt.sentence_ja.trim().length >= 6)
    .slice(0, 8)
    .map(buildSentenceRebuildCard);
  const clozeAttack = prompts
    .filter((prompt) => prompt.prompt_type === "cloze" || prompt.prompt.includes("＿"))
    .slice(0, 8)
    .map(buildClozeAttackCard);
  const grammarDuel = prompts
    .filter((prompt) => (prompt.key_grammar?.length ?? 0) > 0)
    .slice(0, 8)
    .map((prompt, index) => buildGrammarDuelCard(prompt, grammarTags, index));
  const contextMatch = contextMatchPrompts
    .slice(0, 8)
    .map((prompt, index) => buildContextMatchCard(prompt, contextMatchPrompts, index))
    .filter((card): card is ContextMatchGameCard => Boolean(card));
  const mistakeDoctor = buildMistakeDoctorCards(weaknessRows, roleplayCorrections).slice(0, 8);
  const newsRecall = buildNewsRecallCards(dailyLessons, lessonSentences).slice(0, 8);
  const memoryPalace = buildMemoryPalaceCards(storylineGroups).slice(0, 8);
  const conversationNextLine = buildConversationNextLineCards(roleplaySessions, roleplayTurns).slice(0, 8);

  return {
    kanaKanjiSnap,
    sentenceRebuild,
    clozeAttack,
    grammarDuel,
    contextMatch,
    mistakeDoctor,
    newsRecall,
    memoryPalace,
    conversationNextLine,
    bossFight: buildBossFight(weaknessRows, prompts),
    stats: {
      snapCards: kanaKanjiSnap.length,
      sentencePrompts: prompts.length,
      duePrompts: dueRows.length,
      grammarTagged: prompts.filter((prompt) => (prompt.key_grammar?.length ?? 0) > 0).length,
      contextMatchCards: contextMatch.length,
      mistakeDoctorCards: mistakeDoctor.length,
      newsRecallCards: newsRecall.length,
      memoryPalaceCards: memoryPalace.length,
      conversationNextLineCards: conversationNextLine.length,
      leechPrompts: prompts.filter((prompt) => prompt.is_leech).length,
      gameAttempts7d: attempts.length,
      gameAccuracy7d: attempts.length ? Math.round((correctAttempts / attempts.length) * 100) : null,
      averageResponseMs7d: responseTimes.length
        ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
        : null,
      hardestGame7d: hardestGame(attempts),
    },
    errors: [
      dueResult.error?.message,
      recentResult.error?.message,
      vocabResult.error?.message,
      dailyLessonsResult.error?.message,
      vocabularySessionsResult.error?.message,
      roleplaySessionsResult.error?.message,
      roleplayCorrectionsResult.error?.message,
      roleplayTurnsResult.error?.message,
      lessonSentencesResult.error?.message,
      storylineGroupsResult.error?.message,
      weaknessResult.error?.message,
      attemptResult.error?.message,
    ].filter((message): message is string => Boolean(message)),
  };
}

function hasKanaKanjiSnapSignal(row: MemoryVocabularyRow) {
  return Boolean(
    row.japanese.trim()
    && (row.kana?.trim() || row.kanji?.trim())
    && (row.meaning_zh?.trim() || row.meaning_en?.trim()),
  );
}

function hasContextMatchSignal(prompt: MemorySentencePromptRow) {
  return compact(prompt.key_vocab).length > 0 && prompt.sentence_ja.trim().length >= 4;
}

function hardestGame(attempts: AttemptRow[]) {
  const byGame = new Map<string, { total: number; misses: number }>();
  for (const attempt of attempts) {
    const gameType = attempt.game_type ?? "memory_game";
    const row = byGame.get(gameType) ?? { total: 0, misses: 0 };
    row.total += 1;
    if (!attempt.is_correct) row.misses += 1;
    byGame.set(gameType, row);
  }
  const [label, stats] = [...byGame.entries()]
    .filter(([, value]) => value.total >= 2)
    .sort((a, b) => (b[1].misses / b[1].total) - (a[1].misses / a[1].total))[0] ?? [];
  if (!label || !stats) return null;
  return `${label.replace(/_/g, " ")} · ${Math.round((stats.misses / stats.total) * 100)}% miss`;
}

const promptSelect = [
  "id",
  "prompt_type",
  "prompt",
  "answer",
  "sentence_ja",
  "kana_reading",
  "translation_zh",
  "difficulty_jlpt",
  "key_vocab",
  "key_grammar",
  "status",
  "is_leech",
  "lapses",
  "next_review_date",
  "updated_at",
].join(", ");

const vocabSelect = [
  "id",
  "japanese",
  "kanji",
  "kana",
  "meaning_zh",
  "meaning_en",
  "jlpt_level",
  "register_label",
  "part_of_speech",
  "updated_at",
  "created_at",
].join(", ");

const dailyLessonSelect = [
  "id",
  "lesson_date",
  "status",
  "hook_zh",
  "easy_summary_ja",
  "original_snippet",
  "shadowing_line",
  "output_mission",
  "created_at",
].join(", ");

const lessonSentenceSelect = [
  "id",
  "daily_lesson_id",
  "sentence_type",
  "sentence_ja",
  "translation_zh",
  "difficulty_jlpt",
  "key_vocab",
  "key_grammar",
  "sort_order",
].join(", ");

const vocabularySessionSelect = [
  "id",
  "deck_id",
  "created_at",
].join(", ");

const storylineGroupSelect = [
  "id",
  "session_id",
  "group_index",
  "title_traditional_chinese",
  "storyline_japanese",
  "storyline_traditional_chinese",
  "words",
  "image_url",
  "generation_status",
  "created_at",
].join(", ");

const roleplaySessionSelect = [
  "id",
  "scenario",
  "partner_role",
  "persona_id",
  "difficulty",
  "started_at",
].join(", ");

const roleplayTurnSelect = [
  "id",
  "session_id",
  "speaker",
  "text_ja",
  "translation_zh",
  "created_at",
].join(", ");

const roleplayCorrectionSelect = [
  "id",
  "session_id",
  "turn_id",
  "original",
  "corrected",
  "explanation_zh",
  "created_at",
].join(", ");

function buildKanaKanjiSnapCard(
  row: MemoryVocabularyRow,
  pool: MemoryVocabularyRow[],
  index: number,
): KanaKanjiSnapGameCard | null {
  const surface = row.kanji?.trim() || row.japanese.trim();
  const reading = row.kana?.trim() || row.japanese.trim();
  const meaning = row.meaning_zh?.trim() || row.meaning_en?.trim() || "";
  if (!surface || !reading || !meaning) return null;

  const readingChoices = buildChoiceSet({
    correct: reading,
    distractors: pool
      .filter((item) => item.id !== row.id)
      .map((item) => item.kana?.trim() || item.japanese.trim()),
    seed: `${row.id}-reading`,
    offset: index,
  });
  const meaningChoices = buildChoiceSet({
    correct: meaning,
    distractors: pool
      .filter((item) => item.id !== row.id)
      .map((item) => item.meaning_zh?.trim() || item.meaning_en?.trim() || ""),
    seed: `${row.id}-meaning`,
    offset: index,
  });

  if (readingChoices.length < 2 || meaningChoices.length < 2) return null;

  return {
    id: `snap-${row.id}`,
    vocabId: row.id,
    surface,
    reading,
    meaning,
    readingChoices,
    meaningChoices,
    jlptLevel: row.jlpt_level,
    registerLabel: row.register_label,
    partOfSpeech: row.part_of_speech,
    hasKanji: containsKanji(surface),
  };
}

function buildSentenceRebuildCard(prompt: MemorySentencePromptRow): SentenceRebuildGameCard {
  const chunks = tokenizeSentence(prompt.sentence_ja);
  return {
    id: `rebuild-${prompt.id}`,
    promptId: prompt.id,
    sentenceJa: prompt.sentence_ja,
    translationZh: prompt.translation_zh,
    kanaReading: prompt.kana_reading,
    difficultyJlpt: prompt.difficulty_jlpt,
    keyGrammar: compact(prompt.key_grammar),
    chunks,
    scrambledChunks: deterministicShuffle(chunks, prompt.id),
    isLeech: Boolean(prompt.is_leech),
    status: prompt.status,
  };
}

function buildClozeAttackCard(prompt: MemorySentencePromptRow): ClozeAttackGameCard {
  return {
    id: `cloze-${prompt.id}`,
    promptId: prompt.id,
    prompt: prompt.prompt,
    answer: prompt.answer,
    sentenceJa: prompt.sentence_ja,
    translationZh: prompt.translation_zh,
    keyGrammar: compact(prompt.key_grammar),
    isLeech: Boolean(prompt.is_leech),
  };
}

function buildGrammarDuelCard(
  prompt: MemorySentencePromptRow,
  grammarTags: string[],
  index: number,
): GrammarDuelGameCard {
  const correct = compact(prompt.key_grammar)[0] ?? "文法";
  const distractors = grammarTags.filter((tag) => tag !== correct);
  const choices = deterministicShuffle(
    [correct, ...distractors.slice(index, index + 3), ...distractors.slice(0, 3)].slice(0, 4),
    `${prompt.id}-grammar`,
  );

  return {
    id: `grammar-${prompt.id}`,
    promptId: prompt.id,
    sentenceJa: prompt.sentence_ja,
    translationZh: prompt.translation_zh,
    correct,
    choices: choices.length >= 2 ? choices : [correct, "助詞", "時制", "敬語"].filter((item, itemIndex, all) => all.indexOf(item) === itemIndex),
    explanation: prompt.translation_zh
      ? `這句意思是「${prompt.translation_zh}」，重點是分辨 ${correct} 的用法。`
      : `留意句中 ${correct} 的功能，再同其他相近 pattern 對比。`,
    isLeech: Boolean(prompt.is_leech),
  };
}

function buildContextMatchCard(
  prompt: MemorySentencePromptRow,
  pool: MemorySentencePromptRow[],
  index: number,
): ContextMatchGameCard | null {
  const vocab = compact(prompt.key_vocab);
  const correctChoice = buildContextChoice(prompt);
  const choiceById = new Map(pool.map((row) => [row.id, buildContextChoice(row)]));
  const distractorIds = deterministicShuffle(
    pool
      .filter((row) => row.id !== prompt.id && row.sentence_ja.trim() !== prompt.sentence_ja.trim())
      .map((row) => row.id),
    `${prompt.id}-context-pool`,
  ).slice(0, 3);
  const choices = deterministicShuffle([prompt.id, ...distractorIds], `${prompt.id}-context`)
    .map((id) => (id === prompt.id ? correctChoice : choiceById.get(id)))
    .filter((choice): choice is ContextMatchChoice => Boolean(choice));

  if (choices.length < 2) return null;

  const focus = vocab[index % vocab.length] ?? vocab[0];
  return {
    id: `context-${prompt.id}`,
    promptId: prompt.id,
    vocab: focus,
    sentenceJa: prompt.sentence_ja,
    translationZh: prompt.translation_zh,
    difficultyJlpt: prompt.difficulty_jlpt,
    keyGrammar: compact(prompt.key_grammar),
    choices,
    explanation: prompt.translation_zh
      ? `「${focus}」喺呢個情境入面最自然：${prompt.translation_zh}`
      : `「${focus}」要同原句場景配對，重點係 usage，而唔係孤立背意思。`,
    isLeech: Boolean(prompt.is_leech),
  };
}

function buildContextChoice(prompt: MemorySentencePromptRow): ContextMatchChoice {
  return {
    id: prompt.id,
    sentenceJa: prompt.sentence_ja,
    translationZh: prompt.translation_zh,
  };
}

function buildMistakeDoctorCards(
  weaknessRows: WeaknessRow[],
  roleplayCorrections: MemoryRoleplayCorrectionRow[],
): MistakeDoctorGameCard[] {
  return uniqueMistakeCards([
    ...weaknessRows
      .map(buildMistakeDoctorFromWeakness)
      .filter((card): card is MistakeDoctorGameCard => Boolean(card)),
    ...roleplayCorrections
      .map(buildMistakeDoctorFromRoleplayCorrection)
      .filter((card): card is MistakeDoctorGameCard => Boolean(card)),
  ]);
}

function buildMistakeDoctorFromWeakness(row: WeaknessRow): MistakeDoctorGameCard | null {
  if (stringMeta(row.metadata, "game_type") === "mistake_doctor") return null;

  const repairPrompt = repairCardText(row.metadata, "prompt");
  const repairAnswer = repairCardText(row.metadata, "answer");
  const original = cleanRepairPrompt(row.user_answer || row.prompt || repairPrompt || "");
  const corrected = (row.correct_answer || repairAnswer || "").trim();
  const sourceIsOutput = ["journal", "roleplay", "grammar", "self_talk"].includes(row.source)
    || Boolean(repairPrompt && repairAnswer);

  if (!sourceIsOutput || !isUsableCorrection(original, corrected)) return null;

  return {
    id: `mistake-weakness-${row.id}`,
    sourceId: row.id,
    sourceLabel: sourceLabel(row.source),
    skillArea: row.skill_area,
    severity: row.severity,
    original,
    corrected,
    explanationZh: stringMeta(row.metadata, "explanation_zh"),
  };
}

function buildMistakeDoctorFromRoleplayCorrection(row: MemoryRoleplayCorrectionRow): MistakeDoctorGameCard | null {
  const original = row.original.trim();
  const corrected = row.corrected.trim();
  if (!isUsableCorrection(original, corrected)) return null;

  return {
    id: `mistake-roleplay-${row.id}`,
    sourceId: row.id,
    sourceLabel: "Roleplay",
    skillArea: "pragmatics",
    severity: "miss",
    original,
    corrected,
    explanationZh: row.explanation_zh,
  };
}

function uniqueMistakeCards(cards: MistakeDoctorGameCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = `${normalizeComparable(card.original)}->${normalizeComparable(card.corrected)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isUsableCorrection(original: string, corrected: string) {
  return original.length >= 2
    && corrected.length >= 2
    && normalizeComparable(original) !== normalizeComparable(corrected)
    && !original.startsWith("Mistake Doctor:");
}

function cleanRepairPrompt(value: string) {
  return value.trim().replace(/^改正[:：]\s*/, "");
}

function repairCardText(metadata: Record<string, unknown> | null, key: "prompt" | "answer") {
  const repairCard = metadata?.repair_card;
  if (!repairCard || typeof repairCard !== "object" || Array.isArray(repairCard)) return null;
  const value = (repairCard as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    journal: "Journal",
    roleplay: "Roleplay",
    grammar: "Grammar Doctor",
    self_talk: "Self-talk",
  };
  return labels[source] ?? source.replace(/_/g, " ");
}

function buildNewsRecallCards(
  lessons: MemoryDailyLessonRow[],
  sentences: MemoryLessonSentenceRow[],
): NewsRecallGameCard[] {
  const sentencesByLesson = new Map<string, MemoryLessonSentenceRow[]>();
  for (const sentence of sentences) {
    if (!sentence.sentence_ja.trim()) continue;
    const list = sentencesByLesson.get(sentence.daily_lesson_id) ?? [];
    list.push(sentence);
    sentencesByLesson.set(sentence.daily_lesson_id, list);
  }

  return lessons
    .map((lesson) => {
      const lessonSentences = (sentencesByLesson.get(lesson.id) ?? [])
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      return buildNewsRecallCard(lesson, lessonSentences);
    })
    .filter((card): card is NewsRecallGameCard => Boolean(card));
}

function buildNewsRecallCard(
  lesson: MemoryDailyLessonRow,
  sentences: MemoryLessonSentenceRow[],
): NewsRecallGameCard | null {
  const model = sentences.find((sentence) => sentence.sentence_type === "output_model")
    ?? sentences.find((sentence) => sentence.sentence_type === "mining")
    ?? sentences.find((sentence) => sentence.sentence_type === "shadowing")
    ?? null;
  const modelSentence = model?.sentence_ja.trim()
    || lesson.shadowing_line?.trim()
    || firstJapaneseSentence(lesson.easy_summary_ja)
    || firstJapaneseSentence(lesson.original_snippet)
    || "";

  if (!modelSentence) return null;

  return {
    id: `news-recall-${lesson.id}`,
    dailyLessonId: lesson.id,
    lessonDate: lesson.lesson_date,
    hookZh: lesson.hook_zh,
    summaryJa: lesson.easy_summary_ja,
    originalSnippet: lesson.original_snippet,
    outputMission: lesson.output_mission,
    modelSentence,
    modelTranslationZh: model?.translation_zh ?? lesson.hook_zh,
    difficultyJlpt: model?.difficulty_jlpt ?? null,
    keyVocab: compact(model?.key_vocab),
    keyGrammar: compact(model?.key_grammar),
    explanation: lesson.output_mission
      ? `睇完 ${lesson.lesson_date} 的 input 後，用日文講返一個重點：${lesson.output_mission}`
      : `睇完 ${lesson.lesson_date} 的 input 後，用日文講返一個重點。`,
  };
}

function firstJapaneseSentence(value: string | null) {
  const text = value?.trim();
  if (!text) return null;
  return text.split(/(?<=[。！？!?])/u).map((item) => item.trim()).find(Boolean) ?? text;
}

function buildMemoryPalaceCards(groups: MemoryStorylineGroupRow[]): MemoryPalaceGameCard[] {
  return groups
    .map(buildMemoryPalaceCard)
    .filter((card): card is MemoryPalaceGameCard => Boolean(card));
}

function buildMemoryPalaceCard(group: MemoryStorylineGroupRow): MemoryPalaceGameCard | null {
  const words = parseMemoryPalaceWords(group.words);
  if (words.length < 2) return null;
  const requiredRecallCount = Math.min(3, words.length);

  return {
    id: `memory-palace-${group.id}`,
    groupId: group.id,
    titleZh: group.title_traditional_chinese,
    storylineJa: group.storyline_japanese,
    storylineZh: group.storyline_traditional_chinese,
    imageUrl: group.image_url,
    generationStatus: group.generation_status,
    words,
    requiredRecallCount,
    explanation: `用場景記返至少 ${requiredRecallCount} 個詞：${words.map((word) => word.word).join(" / ")}`,
  };
}

function parseMemoryPalaceWords(value: unknown): MemoryPalaceWord[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const word = stringFromUnknown(row.word) ?? stringFromUnknown(row.japanese) ?? stringFromUnknown(row.term);
      if (!word) return null;
      return {
        word,
        reading: stringFromUnknown(row.reading),
        meaningZh: stringFromUnknown(row.meaningTraditionalChinese)
          ?? stringFromUnknown(row.meaning_zh)
          ?? stringFromUnknown(row.meaningZh),
        visualAnchor: stringFromUnknown(row.visualAnchor) ?? stringFromUnknown(row.visual_anchor),
      };
    })
    .filter((word): word is MemoryPalaceWord => Boolean(word));
}

function buildConversationNextLineCards(
  sessions: MemoryRoleplaySessionRow[],
  turns: MemoryRoleplayTurnRow[],
): ConversationNextLineGameCard[] {
  const turnsBySession = new Map<string, MemoryRoleplayTurnRow[]>();
  for (const turn of turns) {
    if (!turn.text_ja.trim()) continue;
    const list = turnsBySession.get(turn.session_id) ?? [];
    list.push(turn);
    turnsBySession.set(turn.session_id, list);
  }

  const learnerReplies = turns
    .filter((turn) => turn.speaker === "user" && turn.text_ja.trim().length >= 2)
    .filter((turn, index, all) => all.findIndex((item) => normalizeComparable(item.text_ja) === normalizeComparable(turn.text_ja)) === index);
  if (learnerReplies.length < 2) return [];

  const cards: ConversationNextLineGameCard[] = [];
  for (const session of sessions) {
    const sessionTurns = (turnsBySession.get(session.id) ?? [])
      .sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")));
    for (let index = 0; index < sessionTurns.length - 1; index += 1) {
      const partnerTurn = sessionTurns[index];
      const learnerTurn = sessionTurns[index + 1];
      if (partnerTurn.speaker !== "ai" || learnerTurn.speaker !== "user") continue;

      const previousUserLine = [...sessionTurns.slice(0, index)]
        .reverse()
        .find((turn) => turn.speaker === "user")?.text_ja ?? null;
      const choiceById = new Map(learnerReplies.map((reply) => [reply.id, buildConversationChoice(reply)]));
      const distractorIds = deterministicShuffle(
        learnerReplies
          .filter((reply) => reply.id !== learnerTurn.id && normalizeComparable(reply.text_ja) !== normalizeComparable(learnerTurn.text_ja))
          .map((reply) => reply.id),
        `${session.id}-${partnerTurn.id}-next-line`,
      ).slice(0, 3);
      const correctChoice = buildConversationChoice(learnerTurn);
      const choices = deterministicShuffle([learnerTurn.id, ...distractorIds], `${learnerTurn.id}-choices`)
        .map((id) => (id === learnerTurn.id ? correctChoice : choiceById.get(id)))
        .filter((choice): choice is ConversationNextLineChoice => Boolean(choice));

      if (choices.length < 2) continue;
      cards.push({
        id: `next-line-${partnerTurn.id}-${learnerTurn.id}`,
        sessionId: session.id,
        turnId: learnerTurn.id,
        scenario: session.scenario,
        partnerRole: session.partner_role,
        personaLabel: roleplayPersonaLabel(session.persona_id, session.partner_role),
        difficultyJlpt: session.difficulty,
        partnerLine: partnerTurn.text_ja,
        partnerTranslationZh: partnerTurn.translation_zh,
        previousUserLine,
        correct: learnerTurn.text_ja,
        correctTranslationZh: learnerTurn.translation_zh,
        choices,
        explanation: `在「${session.scenario}」入面，${session.partner_role} 講完呢句，最自然係接返「${learnerTurn.text_ja}」。`,
      });
    }
  }

  return cards;
}

function buildConversationChoice(turn: MemoryRoleplayTurnRow): ConversationNextLineChoice {
  return {
    id: turn.id,
    textJa: turn.text_ja,
    translationZh: turn.translation_zh,
  };
}

function roleplayPersonaLabel(personaId: string | null, partnerRole: string) {
  const labels: Record<string, string> = {
    "mission-default": "Mission default",
    "tokyo-friend": "Tokyo Friend",
    sensei: "Japanese Sensei",
    konbini: "Konbini Staff",
    senpai: "Work Senpai",
    examiner: "JLPT Examiner",
  };
  if (personaId && labels[personaId]) return labels[personaId];
  return partnerRole || "Mission default";
}

function buildBossFight(
  weaknessRows: WeaknessRow[],
  prompts: MemorySentencePromptRow[],
): MemoryBossFight | null {
  const counts = new Map<string, { count: number; severityScore: number; details: Set<string> }>();
  const add = (label: string | null, severity: string, detail: string) => {
    const key = label?.trim() || "output";
    const current = counts.get(key) ?? { count: 0, severityScore: 0, details: new Set<string>() };
    current.count += 1;
    current.severityScore += severity === "leech" ? 3 : severity === "miss" ? 2 : 1;
    current.details.add(detail);
    counts.set(key, current);
  };

  for (const row of weaknessRows) {
    add(stringMeta(row.metadata, "grammar_point") ?? stringMeta(row.metadata, "pattern") ?? row.skill_area, row.severity, row.source);
  }

  for (const prompt of prompts) {
    if (!prompt.is_leech && prompt.status !== "weak") continue;
    const severity = prompt.is_leech ? "leech" : "hard";
    const tags = compact(prompt.key_grammar);
    if (tags.length) {
      tags.forEach((tag) => add(tag, severity, prompt.prompt_type));
    } else {
      add(prompt.prompt_type, severity, "sentence prompt");
    }
  }

  const [label, value] = [...counts.entries()].sort((a, b) => b[1].severityScore - a[1].severityScore)[0] ?? [];
  if (!label || !value) return null;

  return {
    label,
    count: value.count,
    severityScore: value.severityScore,
    detail: [...value.details].slice(0, 3).join(" / "),
  };
}

function collectGrammarTags(prompts: MemorySentencePromptRow[], weaknessRows: WeaknessRow[]) {
  return Array.from(
    new Set([
      ...prompts.flatMap((prompt) => compact(prompt.key_grammar)),
      ...weaknessRows.flatMap((row) => [
        stringMeta(row.metadata, "grammar_point"),
        stringMeta(row.metadata, "pattern"),
        row.skill_area === "grammar" ? stringMeta(row.metadata, "category") : null,
      ]),
      "は vs が",
      "に vs で",
      "〜ている",
      "〜そう / 〜よう",
    ].filter((tag): tag is string => Boolean(tag?.trim()))),
  ).slice(0, 16);
}

function uniqueById(rows: MemorySentencePromptRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function tokenizeSentence(sentence: string): string[] {
  const compactSentence = sentence.replace(/\s+/g, "");
  const tokens: string[] = [];
  let buffer = "";

  for (const char of [...compactSentence]) {
    buffer += char;
    if (/[、。！？!?.,]/.test(char) || buffer.length >= chunkSize(buffer)) {
      tokens.push(buffer);
      buffer = "";
    }
  }

  if (buffer) tokens.push(buffer);
  if (tokens.length <= 2 && compactSentence.length > 3) {
    return [...compactSentence];
  }
  return tokens.slice(0, 18);
}

function chunkSize(buffer: string) {
  if (/^[ぁ-んァ-ン]+$/.test(buffer)) return 3;
  return 2;
}

function deterministicShuffle(values: string[], seed: string): string[] {
  const scored = values.map((value, index) => ({
    value,
    score: hash(`${seed}:${value}:${index}`),
  }));
  const shuffled = scored.sort((a, b) => a.score - b.score).map((item) => item.value);
  return shuffled.join("") === values.join("") && shuffled.length > 1
    ? [shuffled[1], shuffled[0], ...shuffled.slice(2)]
    : shuffled;
}

function buildChoiceSet({
  correct,
  distractors,
  seed,
  offset,
}: {
  correct: string;
  distractors: string[];
  seed: string;
  offset: number;
}) {
  const uniqueDistractors = Array.from(new Set(distractors.map((value) => value.trim()).filter(Boolean)))
    .filter((value) => normalizeComparable(value) !== normalizeComparable(correct));
  const rotated = [...uniqueDistractors.slice(offset), ...uniqueDistractors.slice(0, offset)].slice(0, 3);
  return deterministicShuffle([correct, ...rotated], seed)
    .filter((value, index, all) => all.findIndex((item) => normalizeComparable(item) === normalizeComparable(value)) === index);
}

function normalizeComparable(value: string) {
  return value.trim().replace(/\s+/g, "").toLocaleLowerCase();
}

function containsKanji(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function hash(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function compact(values: string[] | null | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean))).slice(0, 8);
}

function stringMeta(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringFromUnknown(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
