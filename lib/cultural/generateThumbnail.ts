import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getImageModel, getOpenAI } from "@/lib/ai/openai";
import type { CulturalCategory } from "@/lib/cultural/categories";

const CATEGORY_SCENE_HINT: Record<CulturalCategory, string> = {
  history_festivals: "Japanese summer festival, shrine street, lanterns, food stalls",
  language_history: "Japanese calligraphy classroom, kanji and kana as visual motifs",
  pop_culture: "modern Tokyo street culture, playful media details",
  traditional_arts: "quiet tea room, craft tools, refined traditional atmosphere",
  regional_culture: "Japanese regional street, local food and dialect mood",
  news_current: "contemporary Japanese city, newsstand, civic daily life",
  lifestyle_niche: "small Japanese cafe or neighborhood scene, intimate daily life",
};

export async function generateCulturalArticleThumbnail(params: {
  userId: string;
  topic: string;
  category: CulturalCategory;
}): Promise<string | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  const model = getImageModel();
  const prompt = [
    "Create a single manga-style editorial thumbnail for a Japanese language learning article.",
    `Topic: ${params.topic}`,
    `Scene hint: ${CATEGORY_SCENE_HINT[params.category]}`,
    "Style: warm but restrained modern manga, clean composition, subtle ink linework, cinematic lighting, 16:9 crop safe.",
    "Do not include readable text, captions, logos, speech bubbles, brand names, or copyrighted characters.",
    "The image should help a learner remember the cultural topic at a glance.",
  ].join("\n");

  try {
    const result = await openai.images.generate({
      model,
      prompt,
      size: "1024x1024",
      n: 1,
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return null;

    const service = createSupabaseServiceClient();
    const filename = `${params.userId}/cultural-${Date.now()}.png`;
    const { error } = await service.storage
      .from("generated-images")
      .upload(filename, Buffer.from(b64, "base64"), {
        contentType: "image/png",
        upsert: false,
      });
    if (error) return null;

    const { data } = service.storage.from("generated-images").getPublicUrl(filename);
    await service.from("generated_images").insert({
      user_id: params.userId,
      image_type: "cultural_article_thumbnail",
      prompt,
      model,
      storage_path: filename,
      image_url: data.publicUrl,
    });
    return data.publicUrl;
  } catch {
    return null;
  }
}
