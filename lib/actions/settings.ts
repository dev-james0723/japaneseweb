"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SettingsSchema = z.object({
  displayName: z.string().max(80).optional(),
  showRomaji: z.boolean(),
  preferredVoice: z.string().max(40),
  defaultJlptLevel: z.enum(["N5", "N4", "N3", "N2", "N1"]),
  dailyWordCount: z.number().int().min(3).max(30),
});

export async function saveSettingsAction(input: z.infer<typeof SettingsSchema>) {
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "格式錯誤：" + parsed.error.issues[0]?.message };
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未登入。" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName || null,
      show_romaji: parsed.data.showRomaji,
      preferred_voice: parsed.data.preferredVoice,
      default_jlpt_level: parsed.data.defaultJlptLevel,
      daily_word_count: parsed.data.dailyWordCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };

  // Mirror Romaji preference to a cookie so the server component
  // <JapaneseText/> can render without an extra DB roundtrip per page.
  const cookieStore = await cookies();
  cookieStore.set("show_romaji", String(parsed.data.showRomaji), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}
