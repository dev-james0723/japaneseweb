"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const AiFeedbackSchema = z.object({
  sourceSurface: z.string().trim().min(1).max(80),
  targetType: z.enum([
    "ai_output",
    "cultural_article",
    "daily_lesson",
    "professor_reply",
    "roleplay_reply",
    "journal_correction",
    "sentence_mining",
    "other",
  ]).default("ai_output"),
  targetId: z.string().trim().max(160).optional().nullable(),
  reportType: z.enum([
    "wrong_japanese",
    "wrong_translation",
    "wrong_explanation",
    "bad_source_claim",
    "unsafe_or_sensitive",
    "copyright_or_policy",
    "other",
  ]),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  aiOutputExcerpt: z.string().trim().max(1200).optional().nullable(),
  userNote: z.string().trim().max(1200).optional().nullable(),
  contextUrl: z.string().trim().max(1200).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type RecordAiFeedbackInput = z.input<typeof AiFeedbackSchema>;

export async function recordAiFeedbackAction(input: RecordAiFeedbackInput) {
  const parsed = AiFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "AI feedback format invalid." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未登入。" };

  const { data, error } = await supabase
    .from("ai_feedback_reports")
    .insert({
      user_id: user.id,
      source_surface: parsed.data.sourceSurface,
      target_type: parsed.data.targetType,
      target_id: parsed.data.targetId?.trim() || null,
      report_type: parsed.data.reportType,
      severity: parsed.data.severity,
      ai_output_excerpt: parsed.data.aiOutputExcerpt?.trim().slice(0, 1200) || null,
      user_note: parsed.data.userNote?.trim().slice(0, 1200) || null,
      context_url: parsed.data.contextUrl?.trim() || null,
      metadata: parsed.data.metadata,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (isMissingAiFeedbackSchemaError(error)) {
      return { ok: true as const, skipped: true as const, reason: "ai feedback report schema not applied" };
    }
    return { ok: false as const, error: "AI feedback save failed: " + error.message };
  }

  revalidatePath("/stats");
  return { ok: true as const, reportId: data?.id ?? null };
}

function isMissingAiFeedbackSchemaError(error: unknown) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  return /does not exist|schema cache|PGRST205|42P01|ai_feedback_reports/i.test(message);
}
