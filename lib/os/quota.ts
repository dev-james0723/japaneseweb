import type { SupabaseClient } from "@supabase/supabase-js";
import { weekStartDate } from "./types";

export type QuotaCheck = {
  newVocabThisWeek: number;
  vocabQuota: number;
  vocabExceeded: boolean;
  newGrammarThisWeek: number;
  grammarQuota: number;
  grammarExceeded: boolean;
};

export async function checkWeeklyQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuotaCheck> {
  const weekStart = `${weekStartDate()}T00:00:00Z`;
  const [{ data: settings }, { count: vocabCount }, { count: grammarCount }] = await Promise.all([
    supabase
      .from("user_os_settings")
      .select("weekly_new_vocab_quota, weekly_new_grammar_quota")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("vocabulary_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", weekStart),
    supabase
      .from("grammar_points")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", weekStart),
  ]);

  const vQuota = settings?.weekly_new_vocab_quota ?? 20;
  const gQuota = settings?.weekly_new_grammar_quota ?? 2;
  return {
    newVocabThisWeek: vocabCount ?? 0,
    vocabQuota: vQuota,
    vocabExceeded: (vocabCount ?? 0) >= vQuota,
    newGrammarThisWeek: grammarCount ?? 0,
    grammarQuota: gQuota,
    grammarExceeded: (grammarCount ?? 0) >= gQuota,
  };
}
