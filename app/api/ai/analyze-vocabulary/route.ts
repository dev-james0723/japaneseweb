import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI, getTextModel, modelAllowsCustomTemperature } from "@/lib/ai/openai";
import { buildAnalyzeVocabularyPrompt } from "@/lib/ai/prompts/analyzeVocabularyPrompt";
import { EnrichedVocabSchema } from "@/lib/ai/schemas";

const RequestSchema = z.object({
  deckId: z.string().uuid(),
});

const Wrapper = z.object({ items: z.array(EnrichedVocabSchema).max(40) });

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ error: "尚未設定 OPENAI_API_KEY。" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "輸入錯誤" }, { status: 400 });
  }

  const { data: items } = await supabase
    .from("vocabulary_items")
    .select("id, japanese")
    .eq("deck_id", parsed.data.deckId)
    .eq("user_id", user.id);

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "詞庫中沒有單字。" }, { status: 400 });
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
  } catch (e: any) {
    return NextResponse.json(
      { error: "OpenAI 呼叫失敗：" + (e?.message ?? "未知") },
      { status: 502 },
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "AI 輸出格式錯誤。", raw }, { status: 502 });
  }

  const validated = Wrapper.safeParse(json);
  if (!validated.success) {
    return NextResponse.json(
      { error: "AI 輸出驗證失敗：" + validated.error.issues[0]?.message, raw: json },
      { status: 502 },
    );
  }

  // Match by Japanese form back to the rows.
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
      const v = (enriched as any)[f];
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
      await supabase
        .from("adjective_forms")
        .insert({ vocab_id: row.id, ...enriched.adjective_forms });
    }

    if (enriched.examples && enriched.examples.length > 0) {
      const rows = enriched.examples.map((ex) => ({
        user_id: user.id,
        vocab_id: row.id,
        deck_id: parsed.data.deckId,
        japanese_sentence: ex.japanese,
        romaji_sentence: ex.romaji ?? null,
        meaning_zh: ex.meaning_zh ?? null,
        sentence_type: "example" as const,
      }));
      await supabase.from("example_sentences").insert(rows);
    }
  }

  return NextResponse.json({ ok: true, enriched: validated.data.items.length });
}
