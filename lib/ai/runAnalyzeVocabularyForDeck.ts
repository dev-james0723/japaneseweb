import type OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTextModel, modelAllowsCustomTemperature } from "@/lib/ai/openai";
import { buildAnalyzeVocabularyPrompt } from "@/lib/ai/prompts/analyzeVocabularyPrompt";
import { EnrichedVocabSchema } from "@/lib/ai/schemas";
import { z } from "zod";

const Wrapper = z.object({ items: z.array(EnrichedVocabSchema).max(40) });

export type AnalyzeVocabularyResult =
  | { ok: true; enrichedCount: number }
  | { ok: false; error: string; raw?: unknown };

export async function runAnalyzeVocabularyForDeck(opts: {
  supabase: SupabaseClient;
  openai: InstanceType<typeof OpenAI>;
  userId: string;
  deckId: string;
}): Promise<AnalyzeVocabularyResult> {
  const { supabase, openai, userId, deckId } = opts;

  const { data: items } = await supabase
    .from("vocabulary_items")
    .select("id, japanese, kana, romaji")
    .eq("deck_id", deckId)
    .eq("user_id", userId);

  if (!items || items.length === 0) {
    return { ok: false, error: "詞庫中沒有單字。" };
  }

  const model = getTextModel();
  let raw = "";
  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      ...(modelAllowsCustomTemperature(model) ? { temperature: 0.4 } : {}),
      messages: [
        {
          role: "system",
          content: "你只輸出嚴格的 JSON，沒有 markdown 圍欄或說明。",
        },
        { role: "user", content: buildAnalyzeVocabularyPrompt(items) },
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
    return { ok: false, error: "AI 輸出格式錯誤。", raw };
  }

  const validated = Wrapper.safeParse(json);
  if (!validated.success) {
    return {
      ok: false,
      error: "AI 輸出驗證失敗：" + validated.error.issues[0]?.message,
      raw: json,
    };
  }

  await supabase
    .from("example_sentences")
    .delete()
    .eq("deck_id", deckId)
    .eq("sentence_type", "example");

  const byJa = new Map<string, (typeof items)[number]>();
  for (const it of items) byJa.set(it.japanese, it);

  for (const enriched of validated.data.items) {
    const row = byJa.get(enriched.japanese);
    if (!row) continue;

    const update: Record<string, unknown> = {};
    const FIELDS = [
      "kana",
      "romaji",
      "meaning_zh",
      "meaning_en",
      "part_of_speech",
      "jlpt_level",
      "priority_tier",
      "register_label",
      "core_explanation",
    ] as const;
    for (const f of FIELDS) {
      const v = (enriched as Record<string, unknown>)[f];
      if (v !== undefined && v !== null && v !== "") update[f] = v;
    }
    if (enriched.mnemonic) update.notes = enriched.mnemonic;

    if (Object.keys(update).length > 0) {
      await supabase.from("vocabulary_items").update(update).eq("id", row.id);
    }

    if (enriched.verb_forms) {
      await supabase.from("verb_forms").delete().eq("vocab_id", row.id);
      await supabase.from("verb_forms").insert({ vocab_id: row.id, ...enriched.verb_forms });
    }
    if (enriched.adjective_forms) {
      await supabase.from("adjective_forms").delete().eq("vocab_id", row.id);
      await supabase.from("adjective_forms").insert({ vocab_id: row.id, ...enriched.adjective_forms });
    }

    if (enriched.examples && enriched.examples.length > 0) {
      const rows = enriched.examples.map((ex) => ({
        user_id: userId,
        vocab_id: row.id,
        deck_id: deckId,
        japanese_sentence: ex.japanese,
        romaji_sentence: ex.romaji ?? null,
        meaning_zh: ex.meaning_zh ?? null,
        sentence_type: "example" as const,
      }));
      await supabase.from("example_sentences").insert(rows);
    }
  }

  return { ok: true, enrichedCount: validated.data.items.length };
}
