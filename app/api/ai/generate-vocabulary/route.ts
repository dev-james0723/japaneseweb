import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { postgrestUserMessage } from "@/lib/supabase/postgrestUserMessage";
import { buildGenerateVocabularyPrompt } from "@/lib/ai/prompts/generateVocabularyPrompt";
import { AIGeneratedDeckSchema } from "@/lib/ai/schemas";

/** OpenAI rejects non-default temperature for some models (e.g. o-series, gpt-5). */
function modelAllowsCustomTemperature(model: string): boolean {
  const base = model.trim().toLowerCase().split("/").pop() ?? model;
  if (/^o[134]/.test(base)) return false;
  if (/^gpt-5/.test(base)) return false;
  return true;
}

const RequestSchema = z.object({
  topic: z.string().min(1).max(80),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  count: z.number().int().min(3).max(20).default(10),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "尚未設定 OPENAI_API_KEY。請在 .env.local 設定後重啟伺服器。" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "輸入錯誤：" + parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { topic, difficulty, count } = parsed.data;

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini";

  let raw = "";
  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      ...(modelAllowsCustomTemperature(model) ? { temperature: 0.6 } : {}),
      messages: [
        {
          role: "system",
          content: "你只輸出乾淨的 JSON，沒有 markdown 圍欄、沒有額外說明。",
        },
        {
          role: "user",
          content: buildGenerateVocabularyPrompt({ topic, difficulty, count }),
        },
      ],
    });
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (e: any) {
    return NextResponse.json(
      { error: "OpenAI 呼叫失敗：" + (e?.message ?? "未知錯誤") },
      { status: 502 },
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "AI 回傳格式錯誤，無法解析 JSON。", raw },
      { status: 502 },
    );
  }

  const validated = AIGeneratedDeckSchema.safeParse(json);
  if (!validated.success) {
    return NextResponse.json(
      { error: "AI 輸出格式驗證失敗：" + validated.error.issues[0]?.message, raw: json },
      { status: 502 },
    );
  }

  // Persist deck + items.
  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .insert({
      user_id: user.id,
      title: validated.data.title,
      topic,
      source_type: "ai_generated",
    })
    .select("id")
    .single();
  if (deckErr || !deck) {
    return NextResponse.json(
      { error: "建立詞庫失敗：" + postgrestUserMessage(deckErr) },
      { status: 500 },
    );
  }

  const rows = validated.data.items.map((it) => ({
    user_id: user.id,
    deck_id: deck.id,
    japanese: it.japanese,
    kana: it.kana ?? null,
    romaji: it.romaji ?? null,
    meaning_zh: it.meaning_zh ?? null,
    meaning_en: it.meaning_en ?? null,
    part_of_speech: it.part_of_speech ?? null,
    jlpt_level: it.jlpt_level ?? null,
    priority_tier: it.priority_tier ?? null,
    source_type: "ai_generated",
  }));

  const { error: vocabErr } = await supabase.from("vocabulary_items").insert(rows);
  if (vocabErr) {
    return NextResponse.json(
      { error: "寫入單字失敗：" + postgrestUserMessage(vocabErr) },
      { status: 500 },
    );
  }

  return NextResponse.json({ deckId: deck.id });
}
