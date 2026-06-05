import type { SupabaseClient } from "@supabase/supabase-js";
import {
  todayDateString,
  weekStartDate,
  type OsBootLog,
  type UserOsSettings,
} from "./types";

export async function fetchOsSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserOsSettings | null> {
  const { data } = await supabase
    .from("user_os_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    await supabase
      .from("user_os_settings")
      .insert({ user_id: userId })
      .select()
      .maybeSingle();
    const retry = await supabase
      .from("user_os_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return (retry.data as UserOsSettings | null) ?? null;
  }
  return data as UserOsSettings;
}

export async function fetchTodayBootLog(
  supabase: SupabaseClient,
  userId: string,
): Promise<OsBootLog | null> {
  const { data } = await supabase
    .from("os_boot_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("boot_date", todayDateString())
    .maybeSingle();
  return (data as OsBootLog | null) ?? null;
}

export async function fetchWeeklyStats(
  supabase: SupabaseClient,
  userId: string,
) {
  const weekStart = weekStartDate();
  const [{ count: newVocab }, { data: bootLogs }, dueReviewBreakdown] = await Promise.all([
    supabase
      .from("vocabulary_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", `${weekStart}T00:00:00Z`),
    supabase
      .from("os_boot_logs")
      .select("boot_date, boot_layer_done, input_layer_done, review_layer_done, output_layer_done, debug_layer_done, anki_due_completed, anki_due_total")
      .eq("user_id", userId)
      .gte("boot_date", weekStart),
    fetchDueReviewBreakdown(supabase, userId),
  ]);

  const bootDays = (bootLogs ?? []).filter((l) =>
    [l.boot_layer_done, l.input_layer_done, l.review_layer_done, l.output_layer_done, l.debug_layer_done].some(Boolean),
  ).length;

  const totals = (bootLogs ?? []).reduce(
    (acc, l) => {
      acc.completed += l.anki_due_completed ?? 0;
      acc.total += l.anki_due_total ?? 0;
      return acc;
    },
    { completed: 0, total: 0 },
  );
  const ankiRate = totals.total > 0 ? totals.completed / totals.total : null;

  return {
    weekStart,
    newVocab: newVocab ?? 0,
    bootDays,
    ankiRate,
    dueCount: dueReviewBreakdown.total,
    dueVocabCount: dueReviewBreakdown.vocab,
    dueSentencePromptCount: dueReviewBreakdown.sentence,
  };
}

export type DueReviewBreakdown = {
  vocab: number;
  sentence: number;
  total: number;
  errors: string[];
};

export async function fetchDueReviewBreakdown(
  supabase: SupabaseClient,
  userId: string,
): Promise<DueReviewBreakdown> {
  const today = todayDateString();
  const [vocabDue, sentenceDue] = await Promise.all([
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("next_review_date", today),
    supabase
      .from("sentence_review_prompts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("next_review_date", today),
  ]);

  const vocab = vocabDue.error ? 0 : (vocabDue.count ?? 0);
  const sentence = sentenceDue.error ? 0 : (sentenceDue.count ?? 0);
  return {
    vocab,
    sentence,
    total: vocab + sentence,
    errors: [vocabDue.error?.message, sentenceDue.error?.message].filter(
      (message): message is string => Boolean(message),
    ),
  };
}

export async function fetchStreak(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("os_boot_logs")
    .select("boot_date, boot_layer_done, input_layer_done, review_layer_done, output_layer_done, debug_layer_done")
    .eq("user_id", userId)
    .order("boot_date", { ascending: false })
    .limit(60);
  if (!data?.length) return 0;
  const dones = new Set(
    data
      .filter((l) =>
        [l.boot_layer_done, l.input_layer_done, l.review_layer_done, l.output_layer_done, l.debug_layer_done].some(Boolean),
      )
      .map((l) => l.boot_date),
  );
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 60; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (dones.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      // today not done is allowed if yesterday was
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
