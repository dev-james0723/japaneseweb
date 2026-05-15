import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { getOpenAI, getImageModel } from "@/lib/ai/openai";
import { buildDeckScenePrompt, buildMnemonicPrompt } from "@/lib/ai/prompts/imagePromptBuilder";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z
  .object({
    type: z.enum(["deck_scene", "mnemonic"]),
    deckId: z.string().uuid().optional(),
    vocabId: z.string().uuid().optional(),
  })
  .refine((d) => (d.type === "deck_scene" ? !!d.deckId : !!d.vocabId), {
    message: "deck_scene 需 deckId；mnemonic 需 vocabId。",
  });

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ error: "尚未設定 OPENAI_API_KEY。" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "輸入錯誤：" + parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  let prompt = "";
  let deckId: string | null = null;
  let vocabId: string | null = null;

  if (parsed.data.type === "deck_scene") {
    deckId = parsed.data.deckId!;
    const { data: deck } = await supabase
      .from("decks")
      .select("topic, user_id")
      .eq("id", deckId)
      .maybeSingle();
    if (!deck || deck.user_id !== user.id) {
      return NextResponse.json({ error: "詞庫不存在。" }, { status: 404 });
    }
    const { data: items } = await supabase
      .from("vocabulary_items")
      .select("japanese")
      .eq("deck_id", deckId)
      .limit(12);
    prompt = buildDeckScenePrompt({
      topic: deck.topic,
      words: (items ?? []).map((x) => x.japanese),
    });
  } else {
    vocabId = parsed.data.vocabId!;
    const { data: v } = await supabase
      .from("vocabulary_items")
      .select("japanese, meaning_zh, notes, deck_id, user_id")
      .eq("id", vocabId)
      .maybeSingle();
    if (!v || v.user_id !== user.id) {
      return NextResponse.json({ error: "單字不存在。" }, { status: 404 });
    }
    deckId = v.deck_id;
    prompt = buildMnemonicPrompt({
      japanese: v.japanese,
      meaning: v.meaning_zh,
      mnemonic: v.notes,
    });
  }

  const model = getImageModel();
  let b64: string;
  try {
    const result = await openai.images.generate({
      model,
      prompt,
      size: parsed.data.type === "deck_scene" ? "1536x1024" : "1024x1024",
      n: 1,
    });
    const first = result.data?.[0];
    if (!first?.b64_json) {
      return NextResponse.json({ error: "影像產生失敗。" }, { status: 502 });
    }
    b64 = first.b64_json;
  } catch (e: any) {
    return NextResponse.json(
      { error: "OpenAI 影像生成失敗：" + (e?.message ?? "未知") },
      { status: 502 },
    );
  }

  // Upload to storage.
  const buf = Buffer.from(b64, "base64");
  const filename = `${user.id}/${Date.now()}-${parsed.data.type}.png`;
  const service = createSupabaseServiceClient();
  const { error: uploadErr } = await service.storage
    .from("generated-images")
    .upload(filename, buf, { contentType: "image/png", upsert: false });
  if (uploadErr) {
    return NextResponse.json(
      { error: "影像儲存失敗：" + uploadErr.message },
      { status: 500 },
    );
  }
  const { data: pub } = service.storage.from("generated-images").getPublicUrl(filename);

  await supabase.from("generated_images").insert({
    user_id: user.id,
    deck_id: deckId,
    vocab_id: vocabId,
    image_type: parsed.data.type,
    prompt,
    model,
    storage_path: filename,
    image_url: pub.publicUrl,
  });

  return NextResponse.json({ url: pub.publicUrl });
}
