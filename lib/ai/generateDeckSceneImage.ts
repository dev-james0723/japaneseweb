import type OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getImageModel } from "@/lib/ai/openai";
import { buildDeckScenePrompt } from "@/lib/ai/prompts/imagePromptBuilder";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type DeckSceneImageResult =
  | { ok: true; url: string; skipped?: false }
  | { ok: true; skipped: true }
  | { ok: false; error: string };

export async function generateDeckSceneImage(opts: {
  supabase: SupabaseClient;
  openai: InstanceType<typeof OpenAI>;
  userId: string;
  deckId: string;
}): Promise<DeckSceneImageResult> {
  const { supabase, openai, userId, deckId } = opts;

  const { data: existing } = await supabase
    .from("generated_images")
    .select("id")
    .eq("deck_id", deckId)
    .eq("image_type", "deck_scene")
    .limit(1);

  if (existing && existing.length > 0) {
    return { ok: true, skipped: true };
  }

  const { data: deck } = await supabase
    .from("decks")
    .select("topic, user_id")
    .eq("id", deckId)
    .maybeSingle();
  if (!deck || deck.user_id !== userId) {
    return { ok: false, error: "詞庫不存在。" };
  }

  const { data: items } = await supabase
    .from("vocabulary_items")
    .select("japanese")
    .eq("deck_id", deckId)
    .limit(12);

  const prompt = buildDeckScenePrompt({
    topic: deck.topic,
    words: (items ?? []).map((x) => x.japanese),
  });

  const model = getImageModel();
  let b64: string;
  try {
    const result = await openai.images.generate({
      model,
      prompt,
      size: "1536x1024",
      n: 1,
    });
    const first = result.data?.[0];
    if (!first?.b64_json) {
      return { ok: false, error: "影像產生失敗。" };
    }
    b64 = first.b64_json;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "未知";
    return { ok: false, error: "OpenAI 影像生成失敗：" + msg };
  }

  const buf = Buffer.from(b64, "base64");
  const filename = `${userId}/${Date.now()}-deck_scene.png`;
  const service = createSupabaseServiceClient();
  const { error: uploadErr } = await service.storage
    .from("generated-images")
    .upload(filename, buf, { contentType: "image/png", upsert: false });
  if (uploadErr) {
    return { ok: false, error: "影像儲存失敗：" + uploadErr.message };
  }
  const { data: pub } = service.storage.from("generated-images").getPublicUrl(filename);

  await supabase.from("generated_images").insert({
    user_id: userId,
    deck_id: deckId,
    vocab_id: null,
    image_type: "deck_scene",
    prompt,
    model,
    storage_path: filename,
    image_url: pub.publicUrl,
  });

  return { ok: true, url: pub.publicUrl };
}
