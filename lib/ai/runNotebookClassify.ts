import type { SupabaseClient } from "@supabase/supabase-js";
import type OpenAI from "openai";
import {
  NotebookClassifyResultSchema,
  type NotebookClassifyResult,
} from "@/lib/ai/schemas/notebookClassify";
import { buildNotebookClassifyPrompt } from "@/lib/ai/prompts/notebookClassifyPrompt";
import { getTextModel, modelAllowsCustomTemperature } from "@/lib/ai/openai";

export async function runNotebookClassify({
  supabase,
  openai,
  userId,
  entryIds,
}: {
  supabase: SupabaseClient;
  openai: OpenAI;
  userId: string;
  entryIds: string[];
}): Promise<
  | { ok: true; result: NotebookClassifyResult }
  | { ok: false; error: string; raw?: string }
> {
  if (entryIds.length === 0) {
    return { ok: false, error: "請至少選擇一條筆記。" };
  }
  if (entryIds.length > 30) {
    return { ok: false, error: "一次最多分類 30 條筆記。" };
  }

  const [{ data: folders }, { data: entries }] = await Promise.all([
    supabase
      .from("notebook_folders")
      .select("id, name")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("notebook_entries")
      .select(
        "id, kind, japanese, reading, meaning_zh, content, tags",
      )
      .eq("user_id", userId)
      .in("id", entryIds),
  ]);

  if (!entries?.length) {
    return { ok: false, error: "找不到所選筆記。" };
  }

  const model = getTextModel();
  const prompt = buildNotebookClassifyPrompt(
    folders ?? [],
    entries.map((e) => ({
      id: e.id,
      kind: e.kind,
      japanese: e.japanese,
      reading: e.reading,
      meaning_zh: e.meaning_zh,
      content: e.content,
      tags: e.tags ?? [],
    })),
  );

  const completion = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    ...(modelAllowsCustomTemperature(model) ? { temperature: 0.3 } : {}),
    messages: [
      {
        role: "system",
        content: "你只輸出嚴格的 JSON，沒有 markdown 圍欄或說明。",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "AI 回傳格式無法解析。", raw };
  }

  const validated = NotebookClassifyResultSchema.safeParse(parsed);
  if (!validated.success) {
    return { ok: false, error: "AI 回傳結構不符合預期。", raw };
  }

  const folderIdSet = new Set((folders ?? []).map((f) => f.id));
  const suggestions = validated.data.suggestions.map((s) => ({
    ...s,
    suggested_folder_id:
      s.suggested_folder_id && folderIdSet.has(s.suggested_folder_id)
        ? s.suggested_folder_id
        : null,
  }));

  await Promise.all(
    suggestions.map((s) =>
      supabase
        .from("notebook_entries")
        .update({
          ai_suggested_folder_id: s.suggested_folder_id,
          ai_metadata: {
            suggested_folder_name: s.suggested_folder_name,
            tags: s.tags,
            confidence: s.confidence ?? null,
            reason: s.reason ?? null,
            classified_at: new Date().toISOString(),
          },
        })
        .eq("id", s.entry_id)
        .eq("user_id", userId),
    ),
  );

  return { ok: true, result: { suggestions } };
}
