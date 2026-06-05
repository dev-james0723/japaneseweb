"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkWeeklyQuota } from "@/lib/os/quota";
import { recordGrammarExposures } from "@/lib/learning/grammarMastery";

const AddSchema = z.object({
  pattern: z.string().min(1).max(120),
  jlptLevel: z.enum(["N5", "N4", "N3", "N2", "N1"]).optional(),
  coreMeaning: z.string().max(800).optional(),
  construction: z.string().max(500).optional(),
  similarPatterns: z.array(z.string().min(1).max(120)).max(8).optional(),
  commonMistake: z.string().max(800).optional(),
  mnemonic: z.string().max(800).optional(),
  override: z.boolean().default(false),
});

const UpdateSchema = AddSchema.omit({ override: true }).extend({
  id: z.string().uuid(),
  activeStage: z.number().int().min(1).max(4).optional(),
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

  const { data, error } = await supabase.from("grammar_points").insert({
    user_id: user.id,
    pattern: parsed.data.pattern,
    jlpt_level: parsed.data.jlptLevel ?? null,
    core_meaning: parsed.data.coreMeaning ?? null,
    construction: parsed.data.construction ?? null,
    similar_patterns: parsed.data.similarPatterns ?? [],
    common_mistake: parsed.data.commonMistake ?? null,
    mnemonic: parsed.data.mnemonic ?? null,
  }).select("id")
    .maybeSingle();
  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };
  await recordGrammarExposures({
    supabase,
    userId: user.id,
    exposures: [{
      pattern: parsed.data.pattern,
      grammarPointId: data?.id ?? null,
      jlptLevel: parsed.data.jlptLevel ?? null,
      exposureType: "manual",
      result: "seen",
      sourceSurface: "grammar_manual_add",
      sourceReference: "/grammar",
      evidenceText: parsed.data.coreMeaning ?? parsed.data.commonMistake ?? null,
      metadata: {
        construction: parsed.data.construction ?? null,
        similar_patterns: parsed.data.similarPatterns ?? [],
      },
    }],
  });
  revalidatePath("/grammar");
  revalidatePath("/grammar-map");
  return { ok: true as const };
}

export async function updateGrammarPointAction(input: z.infer<typeof UpdateSchema>) {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const { error } = await supabase
    .from("grammar_points")
    .update({
      pattern: parsed.data.pattern,
      jlpt_level: parsed.data.jlptLevel ?? null,
      core_meaning: parsed.data.coreMeaning ?? null,
      construction: parsed.data.construction ?? null,
      similar_patterns: parsed.data.similarPatterns ?? [],
      common_mistake: parsed.data.commonMistake ?? null,
      mnemonic: parsed.data.mnemonic ?? null,
      active_stage: parsed.data.activeStage ?? 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: "更新失敗：" + error.message };
  await recordGrammarExposures({
    supabase,
    userId: user.id,
    exposures: [{
      pattern: parsed.data.pattern,
      grammarPointId: parsed.data.id,
      jlptLevel: parsed.data.jlptLevel ?? null,
      exposureType: parsed.data.activeStage && parsed.data.activeStage >= 3 ? "production" : "manual",
      result: parsed.data.activeStage && parsed.data.activeStage >= 4 ? "produced" : "seen",
      sourceSurface: "grammar_manual_update",
      sourceReference: "/grammar",
      evidenceText: parsed.data.coreMeaning ?? parsed.data.commonMistake ?? null,
      metadata: {
        active_stage: parsed.data.activeStage ?? 1,
        similar_patterns: parsed.data.similarPatterns ?? [],
      },
    }],
  });
  revalidatePath("/grammar");
  revalidatePath("/grammar-map");
  return { ok: true as const };
}

export async function deleteGrammarPointAction(input: { id: string }) {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };
  const { error } = await supabase.from("grammar_points").delete().eq("id", parsed.data.id).eq("user_id", user.id);
  if (error) return { ok: false as const, error: "刪除失敗：" + error.message };
  revalidatePath("/grammar");
  revalidatePath("/grammar-map");
  return { ok: true as const };
}
