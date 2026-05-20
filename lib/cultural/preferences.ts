import type { SupabaseClient } from "@supabase/supabase-js";

/** Ensures a cultural_preferences row exists (idempotent). */
export async function ensureCulturalPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("cultural_preferences")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) throw error;
}
