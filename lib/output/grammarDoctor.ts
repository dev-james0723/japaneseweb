import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSentenceReviewPrompts } from "@/lib/sentenceReview";
import { recordGrammarExposures } from "@/lib/learning/grammarMastery";

export type OutputCorrectionSource = "journal" | "roleplay" | "self_talk";

export type OutputCorrectionInput = {
  original: string;
  corrected: string;
  category?: string | null;
  explanationZh?: string | null;
  grammarPoint?: string | null;
};

export type GrammarDoctorResult = {
  weaknessEvents: number;
  grammarPointsCreated: number;
  grammarPointsUpdated: number;
  minedSentences: number;
  reviewPrompts: number;
  errors: string[];
};

type ExistingGrammarPoint = {
  id: string;
  pattern: string;
  active_stage: number | null;
  common_mistake: string | null;
  examples: unknown;
};

const GRAMMAR_LIKE_CATEGORIES = new Set(["grammar", "particle", "register", "style"]);

export async function recordOutputCorrections({
  supabase,
  userId,
  source,
  sourceReference,
  corrections,
  noticeGaps = [],
  difficultyJlpt = null,
}: {
  supabase: SupabaseClient;
  userId: string;
  source: OutputCorrectionSource;
  sourceReference?: string | null;
  corrections: OutputCorrectionInput[];
  noticeGaps?: string[];
  difficultyJlpt?: "N5" | "N4" | "N3" | "N2" | "N1" | null;
}): Promise<GrammarDoctorResult> {
  const usable = corrections
    .map(normalizeCorrection)
    .filter((correction): correction is NormalizedCorrection => Boolean(correction))
    .slice(0, 8);

  if (!usable.length) {
    return emptyResult();
  }

  const diagnosed = usable.map((correction, index) => ({
    ...correction,
    pattern: inferGrammarPoint(correction, noticeGaps[index] ?? noticeGaps[0] ?? null),
  }));
  const result = emptyResult();

  const { error: weaknessError } = await supabase.from("weakness_events").insert(
    diagnosed.map((correction) => ({
      user_id: userId,
      source,
      skill_area: skillAreaForCorrection(correction.category),
      severity: "miss",
      prompt: correction.original,
      user_answer: correction.original,
      correct_answer: correction.corrected,
      metadata: {
        error_type: correction.category,
        grammar_point: correction.pattern,
        explanation_zh: correction.explanationZh,
        source_reference: sourceReference ?? null,
        repair_card: {
          prompt: `改正：${correction.original}`,
          answer: correction.corrected,
        },
      },
    })),
  );
  if (weaknessError) {
    result.errors.push("weakness_events: " + weaknessError.message);
  } else {
    result.weaknessEvents = diagnosed.length;
  }

  const grammarLike = diagnosed.filter((correction) => GRAMMAR_LIKE_CATEGORIES.has(correction.category));
  if (grammarLike.length) {
    const grammarResult = await upsertGrammarPoints({
      supabase,
      userId,
      source,
      sourceReference,
      corrections: grammarLike,
    });
    result.grammarPointsCreated = grammarResult.created;
    result.grammarPointsUpdated = grammarResult.updated;
    result.errors.push(...grammarResult.errors);

    const exposureResult = await recordGrammarExposures({
      supabase,
      userId,
      exposures: grammarLike.map((correction) => ({
        pattern: correction.pattern,
        exposureType: "correction",
        result: "miss",
        sourceSurface: `${source}_grammar_doctor`,
        sourceReference: sourceReference ?? null,
        evidenceText: `${correction.original} → ${correction.corrected}`,
        metadata: {
          category: correction.category,
          explanation_zh: correction.explanationZh,
        },
      })),
    });
    result.errors.push(...exposureResult.errors);
  }

  const repairResult = await createRepairPrompts({
    supabase,
    userId,
    source,
    sourceReference,
    difficultyJlpt,
    corrections: diagnosed,
  });
  result.minedSentences = repairResult.minedSentences;
  result.reviewPrompts = repairResult.reviewPrompts;
  result.errors.push(...repairResult.errors);

  return result;
}

type NormalizedCorrection = {
  original: string;
  corrected: string;
  category: string;
  explanationZh: string | null;
  grammarPoint: string | null;
};

function normalizeCorrection(correction: OutputCorrectionInput): NormalizedCorrection | null {
  const original = correction.original.trim();
  const corrected = correction.corrected.trim();
  if (!original || !corrected || original === corrected) return null;
  return {
    original,
    corrected,
    category: normalizeCategory(correction.category),
    explanationZh: correction.explanationZh?.trim() || null,
    grammarPoint: correction.grammarPoint?.trim() || null,
  };
}

async function upsertGrammarPoints({
  supabase,
  userId,
  source,
  sourceReference,
  corrections,
}: {
  supabase: SupabaseClient;
  userId: string;
  source: OutputCorrectionSource;
  sourceReference?: string | null;
  corrections: Array<NormalizedCorrection & { pattern: string }>;
}) {
  const patterns = Array.from(new Set(corrections.map((correction) => correction.pattern))).slice(0, 12);
  const result = { created: 0, updated: 0, errors: [] as string[] };
  const { data: existingRows, error: loadError } = await supabase
    .from("grammar_points")
    .select("id, pattern, active_stage, common_mistake, examples")
    .eq("user_id", userId)
    .in("pattern", patterns);

  if (loadError) {
    result.errors.push("grammar_points load: " + loadError.message);
    return result;
  }

  const existingByPattern = new Map(((existingRows ?? []) as ExistingGrammarPoint[]).map((row) => [row.pattern, row]));
  const now = new Date().toISOString();
  const inserts: Array<Record<string, unknown>> = [];

  for (const pattern of patterns) {
    const correction = corrections.find((item) => item.pattern === pattern);
    if (!correction) continue;

    const example = grammarExample(correction);
    const existing = existingByPattern.get(pattern);
    if (!existing) {
      inserts.push({
        user_id: userId,
        pattern,
        core_meaning: correction.explanationZh ?? "Output correction revealed this grammar weakness.",
        common_mistake: commonMistake(correction),
        examples: [example],
        active_stage: 1,
        source_type: `${source}_grammar_doctor`,
        source_reference: sourceReference ?? null,
      });
      continue;
    }

    const examples = mergeExamples(existing.examples, example);
    const { error: updateError } = await supabase
      .from("grammar_points")
      .update({
        active_stage: Math.min(existing.active_stage ?? 2, 2),
        common_mistake: existing.common_mistake || commonMistake(correction),
        examples,
        updated_at: now,
      })
      .eq("user_id", userId)
      .eq("id", existing.id);

    if (updateError) {
      result.errors.push(`grammar_points update ${pattern}: ${updateError.message}`);
    } else {
      result.updated += 1;
    }
  }

  if (inserts.length) {
    const { data, error } = await supabase.from("grammar_points").insert(inserts).select("id");
    if (error) {
      result.errors.push("grammar_points insert: " + error.message);
    } else {
      result.created += data?.length ?? 0;
    }
  }

  return result;
}

async function createRepairPrompts({
  supabase,
  userId,
  source,
  sourceReference,
  difficultyJlpt,
  corrections,
}: {
  supabase: SupabaseClient;
  userId: string;
  source: OutputCorrectionSource;
  sourceReference?: string | null;
  difficultyJlpt?: "N5" | "N4" | "N3" | "N2" | "N1" | null;
  corrections: Array<NormalizedCorrection & { pattern: string }>;
}) {
  const result = { minedSentences: 0, reviewPrompts: 0, errors: [] as string[] };
  const rows = corrections
    .filter((correction) => correction.corrected.length >= 2)
    .slice(0, 6)
    .map((correction) => ({
      user_id: userId,
      source_type: source === "journal" ? "journal" : "other",
      source_url: null,
      source_title: sourceReference ? `Grammar Doctor · ${source} · ${sourceReference}` : `Grammar Doctor · ${source}`,
      sentence_ja: correction.corrected,
      kana_reading: null,
      translation_zh: correction.explanationZh ?? `原句「${correction.original}」的修正版。`,
      difficulty_jlpt: difficultyJlpt,
      key_vocab: [] as string[],
      key_grammar: GRAMMAR_LIKE_CATEGORIES.has(correction.category) ? [correction.pattern] : [],
      cloze_target: clozeTarget(correction),
    }));

  if (!rows.length) return result;

  const { data: savedRows, error: sentenceError } = await supabase
    .from("mined_sentences")
    .insert(rows)
    .select("id, user_id, sentence_ja, kana_reading, translation_zh, difficulty_jlpt, key_vocab, key_grammar, cloze_target");
  if (sentenceError) {
    result.errors.push("mined_sentences: " + sentenceError.message);
    return result;
  }

  result.minedSentences = savedRows?.length ?? 0;
  const prompts = ((savedRows ?? []) as Parameters<typeof buildSentenceReviewPrompts>[0][]).flatMap((sentence) =>
    buildSentenceReviewPrompts(sentence),
  );

  if (prompts.length) {
    const { error: promptError } = await supabase
      .from("sentence_review_prompts")
      .insert(prompts);
    if (promptError) {
      result.errors.push("sentence_review_prompts: " + promptError.message);
    } else {
      result.reviewPrompts = prompts.length;
    }
  }

  return result;
}

function inferGrammarPoint(correction: NormalizedCorrection, noticeGap: string | null): string {
  if (correction.grammarPoint) return correction.grammarPoint;
  const explicitPattern = firstJapanesePattern(correction.explanationZh) ?? firstJapanesePattern(noticeGap);
  if (explicitPattern) return explicitPattern;

  if (correction.category === "particle") {
    const particles = extractParticles(`${correction.original} ${correction.corrected} ${correction.explanationZh ?? ""}`);
    return particles.length ? `助詞：${particles.join(" / ")}` : "助詞";
  }
  if (correction.category === "register") return "語域 / 敬語";
  if (correction.category === "style") return "自然度 / 文體";
  if (correction.category === "vocabulary") return "語彙選擇";
  if (correction.category === "kana") return "かな / 表記";
  return "文法";
}

function firstJapanesePattern(text: string | null | undefined): string | null {
  if (!text) return null;
  const wave = text.match(/〜[^\s、。,.，）)「」]{1,18}/u)?.[0];
  if (wave) return wave;
  const bracket = text.match(/[「『]([^」』]{1,24})[」』]/u)?.[1];
  if (bracket && /[ぁ-んァ-ン一-龯]/u.test(bracket)) return bracket;
  const common = text.match(/(ている|てある|ように|ために|そう|らしい|はず|べき|ながら|によって|として)/u)?.[0];
  return common ?? null;
}

function extractParticles(text: string) {
  const particles = ["は", "が", "を", "に", "で", "へ", "と", "から", "まで", "より", "の", "も"];
  return particles.filter((particle) => text.includes(particle)).slice(0, 4);
}

function normalizeCategory(category: string | null | undefined) {
  const normalized = category?.trim().toLowerCase();
  if (normalized === "particle") return "particle";
  if (normalized === "vocabulary" || normalized === "word") return "vocabulary";
  if (normalized === "kana" || normalized === "kanji") return "kana";
  if (normalized === "register" || normalized === "politeness") return "register";
  if (normalized === "style" || normalized === "naturalness") return "style";
  return "grammar";
}

function skillAreaForCorrection(category: string) {
  if (category === "particle" || category === "grammar") return "grammar";
  if (category === "vocabulary") return "vocab_production";
  if (category === "kana") return "kanji";
  if (category === "register" || category === "style") return "pragmatics";
  return "output";
}

function grammarExample(correction: NormalizedCorrection & { pattern: string }) {
  return {
    original: correction.original,
    corrected: correction.corrected,
    explanation_zh: correction.explanationZh,
  };
}

function commonMistake(correction: NormalizedCorrection) {
  return `${correction.original} → ${correction.corrected}${correction.explanationZh ? `：${correction.explanationZh}` : ""}`;
}

function mergeExamples(existing: unknown, example: Record<string, unknown>) {
  const list = Array.isArray(existing) ? existing.filter((item) => item && typeof item === "object") : [];
  const key = JSON.stringify(example);
  const merged = [example, ...list.filter((item) => JSON.stringify(item) !== key)];
  return merged.slice(0, 8);
}

function clozeTarget(correction: NormalizedCorrection) {
  const explicit = firstJapanesePattern(correction.corrected);
  if (explicit && correction.corrected.includes(explicit)) return explicit;
  const match = correction.corrected.match(/[一-龯ぁ-んァ-ン]{2,8}/u);
  return match?.[0] ?? null;
}

function emptyResult(): GrammarDoctorResult {
  return {
    weaknessEvents: 0,
    grammarPointsCreated: 0,
    grammarPointsUpdated: 0,
    minedSentences: 0,
    reviewPrompts: 0,
    errors: [],
  };
}
