"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkWeeklyQuota } from "@/lib/os/quota";

const AddSchema = z.object({
  pattern: z.string().min(1).max(120),
  jlptLevel: z.enum(["N5", "N4", "N3", "N2", "N1"]).optional(),
  coreMeaning: z.string().max(800).optional(),
  construction: z.string().max(500).optional(),
  commonMistake: z.string().max(800).optional(),
  mnemonic: z.string().max(800).optional(),
  override: z.boolean().default(false),
});

export async function addGrammarPointAction(input: z.infer<typeof AddSchema>) {
  const parsed = AddSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const q = await checkWeeklyQuota(supabase, user.id);
  if (q.grammarExceeded && !parsed.data.override) {
    return {
      ok: false as const,
      error: `已達本週新文法 quota (${q.newGrammarThisWeek}/${q.grammarQuota})。研究顯示每週 > ${q.grammarQuota} 條新文法會降低吸收率。`,
      quotaExceeded: true,
    };
  }

  const { error } = await supabase.from("grammar_points").insert({
    user_id: user.id,
    pattern: parsed.data.pattern,
    jlpt_level: parsed.data.jlptLevel ?? null,
    core_meaning: parsed.data.coreMeaning ?? null,
    construction: parsed.data.construction ?? null,
    common_mistake: parsed.data.commonMistake ?? null,
    mnemonic: parsed.data.mnemonic ?? null,
  });
  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };
  revalidatePath("/grammar");
  return { ok: true as const };
}

export async function deleteGrammarPointAction(input: { id: string }) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };
  const { error } = await supabase.from("grammar_points").delete().eq("id", input.id).eq("user_id", user.id);
  if (error) return { ok: false as const, error: "刪除失敗：" + error.message };
  revalidatePath("/grammar");
  return { ok: true as const };
}
