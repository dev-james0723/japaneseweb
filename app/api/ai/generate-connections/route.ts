import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI, getTextModel, modelAllowsCustomTemperature } from "@/lib/ai/openai";
import { buildGenerateConnectionsPrompt } from "@/lib/ai/prompts/generateConnectionsPrompt";
import { ConnectionsResultSchema } from "@/lib/ai/schemas";

const RequestSchema = z.object({ deckId: z.string().uuid() });

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

  const { data: newItems } = await supabase
    .from("vocabulary_items")
    .select("id, japanese")
    .eq("deck_id", parsed.data.deckId)
    .eq("user_id", user.id);
  if (!newItems || newItems.length === 0) {
    return NextResponse.json({ error: "詞庫中沒有單字。" }, { status: 400 });
  }

  const { data: oldItems } = await supabase
    .from("vocabulary_items")
    .select("id, japanese, created_at")
    .eq("user_id", user.id)
    .neq("deck_id", parsed.data.deckId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (!oldItems || oldItems.length === 0) {
    return NextResponse.json({
      ok: true,
      relationships: [],
      mixed_sentences: [],
      note: "尚無舊詞可連結。",
    });
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
    return NextResponse.json({ error: "AI 輸出非 JSON。", raw }, { status: 502 });
  }
  const validated = ConnectionsResultSchema.safeParse(json);
  if (!validated.success) {
    return NextResponse.json(
      { error: "AI 輸出格式錯誤：" + validated.error.issues[0]?.message, raw: json },
      { status: 502 },
    );
  }

  const byJa = new Map<string, string>();
  for (const it of newItems) byJa.set(it.japanese, it.id);
  for (const it of oldItems) if (!byJa.has(it.japanese)) byJa.set(it.japanese, it.id);

  // Persist relationships
  const rows = validated.data.relationships
    .map((r) => {
      const sId = byJa.get(r.source_japanese);
      const tId = byJa.get(r.target_japanese);
      if (!sId || !tId || sId === tId) return null;
      return {
        user_id: user.id,
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

  // Persist mixed sentences as story-type example_sentences scoped to deck.
  if (validated.data.mixed_sentences.length > 0) {
    await supabase.from("example_sentences").insert(
      validated.data.mixed_sentences.map((s) => ({
        user_id: user.id,
        deck_id: parsed.data.deckId,
        japanese_sentence: s.japanese,
        romaji_sentence: s.romaji ?? null,
        meaning_zh: s.meaning_zh ?? null,
        sentence_type: "story" as const,
      })),
    );
  }

  return NextResponse.json({
    ok: true,
    relationships: validated.data.relationships,
    mixed_sentences: validated.data.mixed_sentences,
  });
}
