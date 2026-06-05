import type { SupabaseClient } from "@supabase/supabase-js";

export type GrammarExposureType =
  | "notice"
  | "recognition"
  | "production"
  | "correction"
  | "contrast"
  | "review"
  | "shadow"
  | "output"
  | "mine"
  | "manual";

export type GrammarExposureResult =
  | "seen"
  | "correct"
  | "hard"
  | "miss"
  | "leech"
  | "repaired"
  | "produced";

export type GrammarExposureInput = {
  pattern: string;
  grammarPointId?: string | null;
  jlptLevel?: "N5" | "N4" | "N3" | "N2" | "N1" | null;
  exposureType: GrammarExposureType;
  result?: GrammarExposureResult;
  sourceSurface: string;
  sourceReference?: string | null;
  dailyLessonId?: string | null;
  sentenceReviewPromptId?: string | null;
  minedSentenceId?: string | null;
  weaknessEventId?: string | null;
  roleplaySessionId?: string | null;
  evidenceText?: string | null;
  metadata?: Record<string, unknown>;
};

type GrammarExposureRow = {
  id: string;
  pattern: string;
  grammar_point_id: string | null;
  jlpt_level: "N5" | "N4" | "N3" | "N2" | "N1" | null;
  exposure_type: GrammarExposureType;
  result: GrammarExposureResult;
  created_at: string;
};

type GrammarPointRow = {
  id: string;
  pattern: string;
  jlpt_level: "N5" | "N4" | "N3" | "N2" | "N1" | null;
};

export async function recordGrammarExposures({
  supabase,
  userId,
  exposures,
}: {
  supabase: SupabaseClient;
  userId: string;
  exposures: GrammarExposureInput[];
}) {
  const rows = exposures
    .map((exposure) => ({
      user_id: userId,
      grammar_point_id: exposure.grammarPointId ?? null,
      pattern: normalizePattern(exposure.pattern),
      jlpt_level: exposure.jlptLevel ?? null,
      exposure_type: exposure.exposureType,
      result: exposure.result ?? defaultResultForExposure(exposure.exposureType),
      source_surface: normalizeSurface(exposure.sourceSurface),
      source_reference: exposure.sourceReference ?? null,
      daily_lesson_id: exposure.dailyLessonId ?? null,
      sentence_review_prompt_id: exposure.sentenceReviewPromptId ?? null,
      mined_sentence_id: exposure.minedSentenceId ?? null,
      weakness_event_id: exposure.weaknessEventId ?? null,
      roleplay_session_id: exposure.roleplaySessionId ?? null,
      evidence_text: exposure.evidenceText?.trim().slice(0, 1400) || null,
      metadata: exposure.metadata ?? {},
    }))
    .filter((row) => row.pattern.length > 0)
    .slice(0, 40);

  if (!rows.length) return { ok: true as const, exposures: 0, mastery: 0, errors: [] as string[] };

  const { error: insertError } = await supabase.from("grammar_exposures").insert(rows);
  if (insertError) {
    if (isMissingGrammarMasterySchemaError(insertError)) {
      return {
        ok: true as const,
        skipped: true as const,
        exposures: 0,
        mastery: 0,
        errors: [] as string[],
      };
    }
    return { ok: false as const, exposures: 0, mastery: 0, errors: ["grammar_exposures: " + insertError.message] };
  }

  const mastery = await refreshGrammarMasteryForPatterns({
    supabase,
    userId,
    patterns: Array.from(new Set(rows.map((row) => row.pattern))),
  });

  return {
    ok: mastery.errors.length === 0,
    exposures: rows.length,
    mastery: mastery.updated,
    errors: mastery.errors,
  };
}

export async function refreshGrammarMasteryForPatterns({
  supabase,
  userId,
  patterns,
}: {
  supabase: SupabaseClient;
  userId: string;
  patterns: string[];
}) {
  const normalized = Array.from(new Set(patterns.map(normalizePattern).filter(Boolean))).slice(0, 40);
  if (!normalized.length) return { updated: 0, errors: [] as string[] };

  const [{ data: exposures, error: exposureError }, { data: points, error: pointError }] = await Promise.all([
    supabase
      .from("grammar_exposures")
      .select("id, pattern, grammar_point_id, jlpt_level, exposure_type, result, created_at")
      .eq("user_id", userId)
      .in("pattern", normalized)
      .order("created_at", { ascending: false })
      .limit(600),
    supabase
      .from("grammar_points")
      .select("id, pattern, jlpt_level")
      .eq("user_id", userId)
      .in("pattern", normalized),
  ]);

  if (exposureError) {
    if (isMissingGrammarMasterySchemaError(exposureError)) return { updated: 0, errors: [] as string[] };
    return { updated: 0, errors: ["grammar_exposures load: " + exposureError.message] };
  }
  if (pointError) return { updated: 0, errors: ["grammar_points load: " + pointError.message] };

  const rows = (exposures ?? []) as GrammarExposureRow[];
  const pointsByPattern = new Map(((points ?? []) as GrammarPointRow[]).map((point) => [point.pattern, point]));
  const upserts = normalized
    .map((pattern) => buildMasteryRow({
      userId,
      pattern,
      exposures: rows.filter((row) => row.pattern === pattern),
      point: pointsByPattern.get(pattern) ?? null,
    }))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (!upserts.length) return { updated: 0, errors: [] as string[] };

  const { error } = await supabase
    .from("grammar_mastery")
    .upsert(upserts, { onConflict: "user_id,pattern" });

  if (error) {
    if (isMissingGrammarMasterySchemaError(error)) return { updated: 0, errors: [] as string[] };
    return { updated: 0, errors: ["grammar_mastery upsert: " + error.message] };
  }

  return { updated: upserts.length, errors: [] as string[] };
}

function buildMasteryRow({
  userId,
  pattern,
  exposures,
  point,
}: {
  userId: string;
  pattern: string;
  exposures: GrammarExposureRow[];
  point: GrammarPointRow | null;
}) {
  if (!exposures.length && !point) return null;

  const count = (predicate: (row: GrammarExposureRow) => boolean) =>
    exposures.filter(predicate).length;
  const firstByResult = (result: GrammarExposureResult) =>
    exposures.find((row) => row.result === result)?.created_at ?? null;
  const firstByType = (type: GrammarExposureType) =>
    exposures.find((row) => row.exposure_type === type)?.created_at ?? null;

  const exposureCount = exposures.length;
  const noticeCount = count((row) => row.exposure_type === "notice");
  const recognitionCount = count((row) => row.exposure_type === "recognition" || row.exposure_type === "review");
  const productionCount = count((row) => row.exposure_type === "production" || row.result === "produced");
  const correctionCount = count((row) => row.exposure_type === "correction");
  const contrastCount = count((row) => row.exposure_type === "contrast");
  const reviewCount = count((row) => row.exposure_type === "review");
  const correctCount = count((row) => row.result === "correct");
  const hardCount = count((row) => row.result === "hard");
  const missCount = count((row) => row.result === "miss");
  const leechCount = count((row) => row.result === "leech");
  const repairedCount = count((row) => row.result === "repaired");
  const score = masteryScore({
    exposureCount,
    noticeCount,
    recognitionCount,
    productionCount,
    correctionCount,
    contrastCount,
    reviewCount,
    correctCount,
    hardCount,
    missCount,
    leechCount,
    repairedCount,
  });

  const latest = exposures[0] ?? null;
  return {
    user_id: userId,
    grammar_point_id: latest?.grammar_point_id ?? point?.id ?? null,
    pattern,
    jlpt_level: latest?.jlpt_level ?? point?.jlpt_level ?? null,
    mastery_score: score,
    active_stage: stageForScore(score, { productionCount, correctCount, repairedCount, missCount, leechCount }),
    exposure_count: exposureCount,
    notice_count: noticeCount,
    recognition_count: recognitionCount,
    production_count: productionCount,
    correction_count: correctionCount,
    contrast_count: contrastCount,
    review_count: reviewCount,
    correct_count: correctCount,
    hard_count: hardCount,
    miss_count: missCount,
    leech_count: leechCount,
    repaired_count: repairedCount,
    last_seen_at: latest?.created_at ?? null,
    last_correct_at: firstByResult("correct"),
    last_missed_at: firstByResult("miss") ?? firstByResult("hard") ?? firstByResult("leech"),
    last_produced_at: firstByResult("produced") ?? firstByType("production") ?? firstByType("output"),
    evidence_summary: `${exposureCount} exposures · ${correctCount} correct · ${missCount + hardCount + leechCount} weak signals · ${productionCount} production`,
    metadata: {
      latest_exposure_id: latest?.id ?? null,
      recent_results: exposures.slice(0, 8).map((row) => ({
        type: row.exposure_type,
        result: row.result,
        at: row.created_at,
      })),
    },
  };
}

function masteryScore(input: {
  exposureCount: number;
  noticeCount: number;
  recognitionCount: number;
  productionCount: number;
  correctionCount: number;
  contrastCount: number;
  reviewCount: number;
  correctCount: number;
  hardCount: number;
  missCount: number;
  leechCount: number;
  repairedCount: number;
}) {
  const positive =
    Math.min(input.noticeCount, 4) * 4 +
    Math.min(input.recognitionCount, 8) * 5 +
    Math.min(input.productionCount, 6) * 10 +
    Math.min(input.contrastCount, 4) * 6 +
    Math.min(input.reviewCount, 8) * 3 +
    Math.min(input.correctCount, 10) * 6 +
    Math.min(input.repairedCount, 6) * 8 +
    Math.min(input.exposureCount, 12) * 2;
  const penalty =
    Math.min(input.hardCount, 8) * 4 +
    Math.min(input.missCount, 8) * 8 +
    Math.min(input.leechCount, 4) * 14 +
    Math.min(input.correctionCount, 8) * 2;
  return clamp(Math.round(positive - penalty), 0, 100);
}

function stageForScore(
  score: number,
  evidence: { productionCount: number; correctCount: number; repairedCount: number; missCount: number; leechCount: number },
) {
  if (score >= 75 && evidence.productionCount >= 1 && evidence.correctCount >= 2) return 4;
  if (score >= 50 && (evidence.productionCount > 0 || evidence.correctCount >= 2 || evidence.repairedCount > 0)) return 3;
  if (score >= 24 || evidence.missCount > 0 || evidence.leechCount > 0) return 2;
  return 1;
}

function defaultResultForExposure(type: GrammarExposureType): GrammarExposureResult {
  if (type === "production" || type === "output") return "produced";
  if (type === "correction") return "miss";
  return "seen";
}

function normalizePattern(pattern: string) {
  return pattern.replace(/\s+/g, " ").trim().slice(0, 120);
}

function normalizeSurface(surface: string) {
  const trimmed = surface.trim().replace(/\s+/g, "_").slice(0, 80);
  return trimmed || "unknown";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function isMissingGrammarMasterySchemaError(error: unknown) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  return /does not exist|schema cache|PGRST205|42P01|grammar_exposures|grammar_mastery/i.test(message);
}
