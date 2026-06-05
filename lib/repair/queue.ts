import type { SupabaseClient } from "@supabase/supabase-js";

export type RepairVocabItem = {
  id: string;
  japanese: string;
  kana: string | null;
  meaning: string | null;
  status: string | null;
  lapses: number;
  incorrectCount: number;
  nextReviewDate: string | null;
  commonMistake: string | null;
  sourceReference: string | null;
};

export type RepairSentenceItem = {
  id: string;
  promptType: string;
  sentenceJa: string;
  translationZh: string | null;
  keyGrammar: string[];
  keyVocab: string[];
  status: string | null;
  lapses: number;
  incorrectCount: number;
  nextReviewDate: string | null;
};

export type RepairWeaknessEvent = {
  id: string;
  source: string;
  skillArea: string;
  severity: string;
  grammarPoint: string | null;
  prompt: string | null;
  correctAnswer: string | null;
  createdAt: string;
};

export type RepairEvidence = {
  id: string;
  targetType: string;
  activityType: string;
  repairStage: string;
  rating: string | null;
  success: boolean;
  evidenceText: string | null;
  createdAt: string;
};

export type RepairCluster = {
  label: string;
  count: number;
  severityScore: number;
  detail: string;
};

export type RepairQueue = {
  vocabItems: RepairVocabItem[];
  sentenceItems: RepairSentenceItem[];
  weaknessEvents: RepairWeaknessEvent[];
  repairEvidence: RepairEvidence[];
  clusters: RepairCluster[];
  stats: {
    total: number;
    leech: number;
    weak: number;
    grammarLinked: number;
    listeningOrShadowing: number;
    repairAttempts: number;
    repairCompletions: number;
    repairSuccessRate: number | null;
  };
  errors: string[];
};

type ReviewRow = {
  vocab_id: string;
  status: string | null;
  lapses: number | null;
  incorrect_count: number | null;
  next_review_date: string | null;
  is_leech: boolean | null;
};

type VocabRow = {
  id: string;
  japanese: string;
  kana: string | null;
  meaning_zh: string | null;
  meaning_en: string | null;
  common_mistake?: string | null;
  source_reference?: string | null;
};

type SentenceRow = {
  id: string;
  prompt_type: string;
  sentence_ja: string;
  translation_zh: string | null;
  key_grammar: string[] | null;
  key_vocab: string[] | null;
  status: string | null;
  lapses: number | null;
  incorrect_count: number | null;
  next_review_date: string | null;
  is_leech: boolean | null;
};

type WeaknessRow = {
  id: string;
  source: string;
  skill_area: string;
  severity: string;
  prompt: string | null;
  correct_answer: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type RepairRow = {
  id: string;
  target_type: string;
  activity_type: string;
  repair_stage: string;
  rating: string | null;
  success: boolean;
  evidence_text: string | null;
  created_at: string;
};

export async function fetchRepairQueue(
  supabase: SupabaseClient,
  userId: string,
): Promise<RepairQueue> {
  const [reviewsResult, sentenceResult, weaknessResult, repairResult] = await Promise.all([
    supabase
      .from("reviews")
      .select("vocab_id, status, lapses, incorrect_count, next_review_date, is_leech")
      .eq("user_id", userId)
      .or("is_leech.eq.true,status.eq.weak")
      .order("is_leech", { ascending: false })
      .order("lapses", { ascending: false })
      .order("next_review_date", { ascending: true })
      .limit(30),
    supabase
      .from("sentence_review_prompts")
      .select("id, prompt_type, sentence_ja, translation_zh, key_grammar, key_vocab, status, lapses, incorrect_count, next_review_date, is_leech")
      .eq("user_id", userId)
      .or("is_leech.eq.true,status.eq.weak")
      .order("is_leech", { ascending: false })
      .order("lapses", { ascending: false })
      .order("next_review_date", { ascending: true })
      .limit(30),
    supabase
      .from("weakness_events")
      .select("id, source, skill_area, severity, prompt, correct_answer, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("leech_repairs")
      .select("id, target_type, activity_type, repair_stage, rating, success, evidence_text, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const reviewRows = reviewsResult.error ? [] : ((reviewsResult.data ?? []) as ReviewRow[]);
  const vocabIds = reviewRows.map((row) => row.vocab_id).filter(Boolean);
  const vocabResult = vocabIds.length
    ? await supabase
        .from("vocabulary_items")
        .select("id, japanese, kana, meaning_zh, meaning_en, common_mistake, source_reference")
        .eq("user_id", userId)
        .in("id", vocabIds)
    : { data: [], error: null };

  const vocabById = new Map(((vocabResult.data ?? []) as VocabRow[]).map((row) => [row.id, row]));
  const vocabItems = reviewRows
    .map((review) => {
      const vocab = vocabById.get(review.vocab_id);
      if (!vocab) return null;
      return {
        id: vocab.id,
        japanese: vocab.japanese,
        kana: vocab.kana,
        meaning: vocab.meaning_zh ?? vocab.meaning_en ?? null,
        status: review.status,
        lapses: review.lapses ?? 0,
        incorrectCount: review.incorrect_count ?? 0,
        nextReviewDate: review.next_review_date,
        commonMistake: vocab.common_mistake ?? null,
        sourceReference: vocab.source_reference ?? null,
      };
    })
    .filter((item): item is RepairVocabItem => Boolean(item));

  const sentenceItems = sentenceResult.error
    ? []
    : ((sentenceResult.data ?? []) as SentenceRow[]).map((row) => ({
        id: row.id,
        promptType: row.prompt_type,
        sentenceJa: row.sentence_ja,
        translationZh: row.translation_zh,
        keyGrammar: row.key_grammar ?? [],
        keyVocab: row.key_vocab ?? [],
        status: row.status,
        lapses: row.lapses ?? 0,
        incorrectCount: row.incorrect_count ?? 0,
        nextReviewDate: row.next_review_date,
      }));

  const weaknessEvents = weaknessResult.error
    ? []
    : ((weaknessResult.data ?? []) as WeaknessRow[]).map((row) => ({
        id: row.id,
        source: row.source,
        skillArea: row.skill_area,
        severity: row.severity,
        grammarPoint: stringMeta(row.metadata, "grammar_point"),
        prompt: row.prompt,
        correctAnswer: row.correct_answer,
        createdAt: row.created_at,
      }));

  const repairEvidence = repairResult.error
    ? []
    : ((repairResult.data ?? []) as RepairRow[]).map((row) => ({
        id: row.id,
        targetType: row.target_type,
        activityType: row.activity_type,
        repairStage: row.repair_stage,
        rating: row.rating,
        success: row.success,
        evidenceText: row.evidence_text,
        createdAt: row.created_at,
      }));

  const clusters = buildRepairClusters({ sentenceItems, weaknessEvents });
  const leech = reviewRows.filter((row) => row.is_leech).length +
    ((sentenceResult.data ?? []) as SentenceRow[]).filter((row) => row.is_leech).length;
  const weak = reviewRows.filter((row) => row.status === "weak").length +
    ((sentenceResult.data ?? []) as SentenceRow[]).filter((row) => row.status === "weak").length;
  const completedRepairs = repairEvidence.filter((row) => row.repairStage === "completed").length;
  const successRate = repairEvidence.length
    ? Math.round((repairEvidence.filter((row) => row.success).length / repairEvidence.length) * 100)
    : null;

  return {
    vocabItems,
    sentenceItems,
    weaknessEvents,
    repairEvidence,
    clusters,
    stats: {
      total: vocabItems.length + sentenceItems.length,
      leech,
      weak,
      grammarLinked: sentenceItems.filter((item) => item.keyGrammar.length > 0).length,
      listeningOrShadowing: sentenceItems.filter((item) =>
        item.promptType === "listening" || item.promptType === "shadowing",
      ).length,
      repairAttempts: repairEvidence.length,
      repairCompletions: completedRepairs,
      repairSuccessRate: successRate,
    },
    errors: [
      reviewsResult.error?.message,
      sentenceResult.error?.message,
      weaknessResult.error?.message,
      repairResult.error?.message,
      vocabResult.error?.message,
    ].filter((message): message is string => Boolean(message)),
  };
}

function buildRepairClusters({
  sentenceItems,
  weaknessEvents,
}: {
  sentenceItems: RepairSentenceItem[];
  weaknessEvents: RepairWeaknessEvent[];
}) {
  const counts = new Map<string, { count: number; severityScore: number; details: Set<string> }>();
  const add = (label: string | null | undefined, severity: number, detail: string) => {
    const normalized = label?.trim() || "general output";
    const item = counts.get(normalized) ?? { count: 0, severityScore: 0, details: new Set<string>() };
    item.count += 1;
    item.severityScore += severity;
    item.details.add(detail);
    counts.set(normalized, item);
  };

  for (const sentence of sentenceItems) {
    const severity = sentence.lapses >= 2 ? 3 : sentence.status === "weak" ? 2 : 1;
    if (sentence.keyGrammar.length) {
      sentence.keyGrammar.forEach((grammar) => add(grammar, severity, sentence.promptType));
    } else {
      add(sentence.promptType, severity, "sentence prompt");
    }
  }

  for (const event of weaknessEvents) {
    const severity = event.severity === "leech" ? 3 : event.severity === "miss" ? 2 : 1;
    add(event.grammarPoint ?? event.skillArea, severity, event.source);
  }

  return [...counts.entries()]
    .map(([label, value]) => ({
      label,
      count: value.count,
      severityScore: value.severityScore,
      detail: [...value.details].slice(0, 3).join(" / "),
    }))
    .sort((a, b) => b.severityScore - a.severityScore)
    .slice(0, 8);
}

function stringMeta(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
