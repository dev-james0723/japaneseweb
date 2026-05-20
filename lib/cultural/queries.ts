import type { SupabaseClient } from "@supabase/supabase-js";
import { todayDateString } from "@/lib/os/types";

export type CulturalContentSummary = {
  id: string;
  title_ja: string;
  title_zh: string;
  category: string;
  content_type: string;
  difficulty_jlpt: string | null;
  estimated_minutes: number | null;
  ai_summary_zh: string | null;
  is_daily_pick: boolean;
  daily_pick_date: string | null;
};

export async function getTodayDailyPick(
  supabase: SupabaseClient,
  userId: string,
  date = todayDateString(),
): Promise<CulturalContentSummary | null> {
  const { data, error } = await supabase
    .from("cultural_contents")
    .select(
      "id, title_ja, title_zh, category, content_type, difficulty_jlpt, estimated_minutes, ai_summary_zh, is_daily_pick, daily_pick_date",
    )
    .eq("user_id", userId)
    .eq("is_daily_pick", true)
    .eq("daily_pick_date", date)
    .maybeSingle();
  if (error) throw error;
  return data as CulturalContentSummary | null;
}
