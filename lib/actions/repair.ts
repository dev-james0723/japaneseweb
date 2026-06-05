"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { refreshSkillRadarSnapshot } from "@/lib/learning/skillRadar";

const RepairSchema = z.object({
  targetType: z.enum(["vocab", "sentence", "weakness"]),
  vocabId: z.string().uuid().optional().nullable(),
  sentenceReviewPromptId: z.string().uuid().optional().nullable(),
  weaknessEventId: z.string().uuid().optional().nullable(),
  activityType: z.enum([
    "review_rescue",
    "shadow_loop",
    "memory_game",
    "grammar_contrast",
    "output_proof",
    "manual",
  ]),
  repairStage: z.enum(["diagnose", "contrast", "shadow", "output_proof", "completed"]).default("diagnose"),
  rating: z.enum(["again", "hard", "good", "easy"]).optional().nullable(),
  success: z.boolean().default(false),
  evidenceText: z.string().max(1200).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).refine((value) => {
  if (value.targetType === "vocab") return Boolean(value.vocabId);
  if (value.targetType === "sentence") return Boolean(value.sentenceReviewPromptId);
  return Boolean(value.weaknessEventId);
}, {
  message: "repair target missing",
  path: ["targetType"],
});

export type RecordLeechRepairInput = z.input<typeof RepairSchema>;

export async function recordLeechRepairAction(input: RecordLeechRepairInput) {
  const parsed = RepairSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Repair evidence format invalid." };

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const { data, error } = await supabase
    .from("leech_repairs")
    .insert({
      user_id: user.id,
      target_type: parsed.data.targetType,
      vocab_id: parsed.data.vocabId ?? null,
      sentence_review_prompt_id: parsed.data.sentenceReviewPromptId ?? null,
      weakness_event_id: parsed.data.weaknessEventId ?? null,
      activity_type: parsed.data.activityType,
      repair_stage: parsed.data.repairStage,
      rating: parsed.data.rating ?? null,
      success: parsed.data.success,
      evidence_text: parsed.data.evidenceText ?? null,
      metadata: parsed.data.metadata,
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false as const, error: "Repair evidence save failed: " + error.message };

  const skillRadar = await refreshSkillRadarSnapshot({ supabase, userId: user.id });
  if (skillRadar.errors.length) {
    console.error("[repair] skill radar:", skillRadar.errors.join(" / "));
  }

  revalidatePath("/repair");
  revalidatePath("/review");
  revalidatePath("/shadowing");
  revalidatePath("/stats");
  revalidatePath("/goals");

  return { ok: true as const, repairId: data?.id ?? null, skillRadar };
}
