import type OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTextModel, modelAllowsCustomTemperature } from "@/lib/ai/openai";
import { buildGenerateConnectionsPrompt } from "@/lib/ai/prompts/generateConnectionsPrompt";
import { ConnectionsResultSchema } from "@/lib/ai/schemas";

export type GenerateConnectionsResult =
  | { ok: true; note?: string }
  | { ok: false; error: string };

export async function runGenerateConnectionsForDeck(opts: {
  supabase: SupabaseClient;
  openai: InstanceType<typeof OpenAI>;
  userId: string;
  deckId: string;
}): Promise<GenerateConnectionsResult> {
  const { supabase, openai, userId, deckId } = opts;

  const { data: newItems } = await supabase
    .from("vocabulary_items")
    .select("id, japanese")
    .eq("deck_id", deckId)
    .eq("user_id", userId);
  if (!newItems || newItems.length === 0) {
    return { ok: false, error: "詞庫中沒有單字。" };
  }

  const { data: oldItems } = await supabase
    .from("vocabulary_items")
    .select("id, japanese, created_at")
    .eq("user_id", userId)
    .neq("deck_id", deckId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (!oldItems || oldItems.length === 0) {
    return { ok: true, note: "尚無舊詞可連結。" };
  }

  const model = getTextModel();
  let raw = "";
  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      ...(modelAllowsCustomTemperature(model) ? { temperature: 0.5 } : {}),
      messages: [
        { role: "system", content: "你只輸出嚴格 JSON。" },
        {
          role: "user",
          content: buildGenerateConnectionsPrompt({
            newWords: newItems.map((x) => x.japanese),
            oldWords: oldItems.map((x) => x.japanese),
          }),
        },
      ],
    });
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "未知";
    return { ok: false, error: "OpenAI 呼叫失敗：" + msg };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "AI 輸出非 JSON。" };
  }

  const validated = ConnectionsResultSchema.safeParse(json);
  if (!validated.success) {
    return {
      ok: false,
      error: "AI 輸出格式錯誤：" + validated.error.issues[0]?.message,
    };
  }

  const byJa = new Map<string, string>();
  for (const it of newItems) byJa.set(it.japanese, it.id);
  for (const it of oldItems) if (!byJa.has(it.japanese)) byJa.set(it.japanese, it.id);

  const rows = validated.data.relationships
    .map((r) => {
      const sId = byJa.get(r.source_japanese);
      const tId = byJa.get(r.target_japanese);
      if (!sId || !tId || sId === tId) return null;
      return {
        user_id: userId,
        source_vocab_id: sId,
        target_vocab_id: tId,
        relationship_type: r.relationship_type,
        explanation: r.explanation ?? null,
        example_sentence: r.example_sentence ?? null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (rows.length > 0) {
    await supabase.from("vocabulary_relationships").insert(rows);
  }

  if (validated.data.mixed_sentences.length > 0) {
    await supabase.from("example_sentences").insert(
      validated.data.mixed_sentences.map((s) => ({
        user_id: userId,
        deck_id: deckId,
        japanese_sentence: s.japanese,
        romaji_sentence: s.romaji ?? null,
        meaning_zh: s.meaning_zh ?? null,
        sentence_type: "story" as const,
      })),
    );
  }

  return { ok: true };
}
