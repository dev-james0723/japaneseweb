import type { SupabaseClient } from "@supabase/supabase-js";

export type PhaseAdvancementCheck = {
  currentPhase: number;
  meetsCriteria: boolean;
  daysIntoPhase: number;
  vocabCount: number;
  recommendedAdvance: boolean;
  reasons: string[];
};

const PHASE_THRESHOLDS: Record<number, { minDays: number; minVocab: number; description: string }> = {
  1: { minDays: 60, minVocab: 100, description: "Installation: 假名熟練 + 100 字 + 60 日 boot" },
  2: { minDays: 120, minVocab: 500, description: "Basic Boot: 500 字 + Phase 2 滿 4 個月" },
  3: { minDays: 180, minVocab: 1000, description: "Daily Operation: 1000 字 + Phase 3 滿 6 個月" },
  4: { minDays: 180, minVocab: 1500, description: "Immersion: 1500 字 + 6 個月" },
  5: { minDays: 120, minVocab: 1800, description: "Output Activation: 1800 字 + 4 個月" },
  6: { minDays: 60, minVocab: 2000, description: "Refinement: 2000 字 + 2 個月" },
};

export async function evaluatePhaseAdvancement(
  supabase: SupabaseClient,
  userId: string,
): Promise<PhaseAdvancementCheck | null> {
  const { data: settings } = await supabase
    .from("user_os_settings")
    .select("current_phase, phase_started_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!settings) return null;

  const phase = settings.current_phase as number;
  const startedAt = new Date(settings.phase_started_at);
  const daysIntoPhase = Math.floor((Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24));

  const { count: vocabCount } = await supabase
    .from("vocabulary_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const threshold = PHASE_THRESHOLDS[phase];
  const reasons: string[] = [];
  const daysOk = daysIntoPhase >= threshold.minDays;
  const vocabOk = (vocabCount ?? 0) >= threshold.minVocab;
  if (!daysOk) reasons.push(`仲差 ${threshold.minDays - daysIntoPhase} 日 (要 ${threshold.minDays} 日)`);
  if (!vocabOk) reasons.push(`仲差 ${threshold.minVocab - (vocabCount ?? 0)} 字 (要 ${threshold.minVocab} 字)`);

  const meets = daysOk && vocabOk && phase < 6;

  return {
    currentPhase: phase,
    meetsCriteria: meets,
    daysIntoPhase,
    vocabCount: vocabCount ?? 0,
    recommendedAdvance: meets,
    reasons: meets ? [`✓ 符合 Phase ${phase + 1} 條件`] : reasons,
  };
}
