"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const InteractionSchema = z.object({
  contentItemId: z.string().uuid().optional().nullable(),
  dailyLessonId: z.string().uuid().optional().nullable(),
  culturalContentId: z.string().uuid().optional().nullable(),
  interactionType: z.enum([
    "view",
    "open_source",
    "read",
    "lesson_start",
    "lesson_complete",
    "save",
    "mine",
    "add_vocab",
    "shadow",
    "output",
    "discuss",
    "quiz",
    "dismiss",
  ]),
  sourceSurface: z.string().trim().min(1).max(80).default("unknown"),
  durationSeconds: z.number().int().min(0).optional().nullable(),
  itemsCreated: z.number().int().min(0).default(0),
  deepLink: z.string().trim().max(1200).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).refine((value) => {
  return Boolean(
    value.contentItemId ||
    value.dailyLessonId ||
    value.culturalContentId ||
    value.deepLink,
  );
}, {
  message: "content interaction needs a content id, lesson id, article id, or deep link",
  path: ["deepLink"],
});

export type RecordContentInteractionInput = z.input<typeof InteractionSchema>;

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function recordContentInteractionAction(input: RecordContentInteractionInput) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "未登入。" };

  const result = await recordContentInteractionForUser({
    supabase,
    userId: user.id,
    input,
  });

  if (result.ok) {
    revalidatePath("/daily-feed");
    revalidatePath("/stats");
    if (input.culturalContentId || input.deepLink?.startsWith("/cultural/article/")) {
      revalidatePath("/cultural");
    }
  }

  return result;
}

export async function recordContentInteractionForUser({
  supabase,
  userId,
  input,
}: {
  supabase: SupabaseServerClient;
  userId: string;
  input: RecordContentInteractionInput;
}) {
  const parsed = InteractionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Content interaction format invalid." };
  }

  const deepLink = parsed.data.deepLink?.trim() || null;
  const culturalContentId = parsed.data.culturalContentId ?? extractCulturalArticleId(deepLink);

  if (parsed.data.interactionType === "lesson_complete" && parsed.data.dailyLessonId) {
    const { error: lessonError } = await supabase
      .from("daily_lessons")
      .update({ status: "completed" })
      .eq("id", parsed.data.dailyLessonId)
      .eq("user_id", userId);

    if (lessonError && !isMissingContentInteractionSchemaError(lessonError)) {
      return { ok: false as const, error: "Lesson update failed: " + lessonError.message };
    }
  }

  const { data, error } = await supabase
    .from("content_user_interactions")
    .insert({
      user_id: userId,
      content_item_id: parsed.data.contentItemId ?? null,
      daily_lesson_id: parsed.data.dailyLessonId ?? null,
      cultural_content_id: culturalContentId,
      interaction_type: parsed.data.interactionType,
      source_surface: parsed.data.sourceSurface,
      duration_seconds: parsed.data.durationSeconds ?? null,
      items_created: parsed.data.itemsCreated,
      deep_link: deepLink,
      metadata: parsed.data.metadata,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (isMissingContentInteractionSchemaError(error)) {
      return { ok: true as const, skipped: true as const, reason: "content interactions schema not applied" };
    }
    return { ok: false as const, error: "Content interaction save failed: " + error.message };
  }

  return { ok: true as const, interactionId: data?.id ?? null };
}

function extractCulturalArticleId(path: string | null) {
  if (!path) return null;
  const match = path.match(/^\/cultural\/article\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:[/?#]|$)/i);
  return match?.[1] ?? null;
}

function isMissingContentInteractionSchemaError(error: unknown) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  return /does not exist|schema cache|PGRST205|42P01|content_user_interactions/i.test(message);
}
