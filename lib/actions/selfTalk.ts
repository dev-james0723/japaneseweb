"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todayDateString } from "@/lib/os/types";

const QuickLogSchema = z.object({
  stageLevel: z.number().int().min(1).max(4),
  samplePhrase: z.string().max(500).optional().nullable(),
  context: z.enum(["morning", "commute", "work", "night", "other"]).default("other"),
});

export async function logSelfTalkAction(input: z.infer<typeof QuickLogSchema>) {
  const parsed = QuickLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const { error } = await supabase.from("self_talk_progressions").insert({
    user_id: user.id,
    log_date: todayDateString(),
    stage_level: parsed.data.stageLevel,
    sample_phrase: parsed.data.samplePhrase ?? null,
    context: parsed.data.context,
  });
  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };
  revalidatePath("/self-talk");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
