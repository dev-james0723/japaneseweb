"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todayDateString } from "@/lib/os/types";
import { patchBootLogAction } from "@/lib/actions/os";

const LogSchema = z.object({
  durationMinutes: z.number().int().min(1).max(600),
  lessonsCompleted: z.array(z.string().max(120)).max(20).default([]),
  mostUsefulSentence: z.string().max(500).optional().nullable(),
  shadowingDone: z.boolean().default(false),
  conversationModeDone: z.boolean().default(false),
  addToMined: z.boolean().default(false),
});

export async function logTalkMeSessionAction(input: z.infer<typeof LogSchema>) {
  const parsed = LogSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const today = todayDateString();
  const d = parsed.data;

  const { error } = await supabase.from("talk_me_sessions").insert({
    user_id: user.id,
    session_date: today,
    duration_minutes: d.durationMinutes,
    lessons_completed: d.lessonsCompleted,
    most_useful_sentence: d.mostUsefulSentence ?? null,
    shadowing_done: d.shadowingDone,
    conversation_mode_done: d.conversationModeDone,
    artifact_saved: !!d.mostUsefulSentence,
  });
  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };

  if (d.addToMined && d.mostUsefulSentence) {
    await supabase.from("mined_sentences").insert({
      user_id: user.id,
      source_type: "talk_me",
      sentence_ja: d.mostUsefulSentence,
      translation_zh: "",
    });
  }

  // bump talk_me_minutes + mark input layer done
  const { data: todaySessions } = await supabase
    .from("talk_me_sessions")
    .select("duration_minutes")
    .eq("user_id", user.id)
    .eq("session_date", today);
  const totalMins = (todaySessions ?? []).reduce((s, r) => s + (r.duration_minutes ?? 0), 0);
  await patchBootLogAction({ talkMeMinutes: totalMins });
  await supabase
    .from("os_boot_logs")
    .update({ input_layer_done: true, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("boot_date", today);

  revalidatePath("/talk-me");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
