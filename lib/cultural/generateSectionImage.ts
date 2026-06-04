import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getImageModel, getOpenAI } from "@/lib/ai/openai";
import type { CulturalCategory } from "@/lib/cultural/categories";
import type { GeneratedCulturalArticle } from "@/lib/cultural/schemas";

const CATEGORY_MOTIFS: Record<CulturalCategory, string> = {
  history_festivals: "matsuri lanterns, shrine gates, seasonal food stalls",
  language_history: "kanji brushwork, kana rhythm, old paper and learning tools",
  pop_culture: "modern Tokyo street details, media culture, playful urban icons",
  traditional_arts: "tea utensils, craft tools, kimono fabric geometry",
  regional_culture: "local Japanese street, regional food, train travel mood",
  news_current: "contemporary Japan, civic daily life, newspapers and city silhouettes",
  lifestyle_niche: "quiet cafe table, neighborhood details, everyday Japanese objects",
};

export type CulturalSectionImageResult = {
  imageUrl: string;
  prompt: string;
  storagePath: string;
  model: string;
};

export async function generateCantoneseLensIllustration(params: {
  userId: string;
  article: GeneratedCulturalArticle;
  category: CulturalCategory;
}): Promise<CulturalSectionImageResult | null> {
  if (!params.article.cantonese_lens?.trim()) return null;

  const openai = getOpenAI();
  if (!openai) return null;

  const model = getImageModel();
  const prompt = buildCantoneseLensImagePrompt(params.article, params.category);

  try {
    const result = await openai.images.generate({
      model,
      prompt,
      size: "1024x1536",
      n: 1,
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return null;

    const service = createSupabaseServiceClient();
    const filename = `${params.userId}/cultural-hk-lens-${Date.now()}.png`;
    const { error: uploadError } = await service.storage
      .from("generated-images")
      .upload(filename, Buffer.from(b64, "base64"), {
        contentType: "image/png",
        upsert: false,
      });
    if (uploadError) return null;

    const { data } = service.storage.from("generated-images").getPublicUrl(filename);
    await service.from("generated_images").insert({
      user_id: params.userId,
      image_type: "cultural_article_section",
      prompt,
      model,
      storage_path: filename,
      image_url: data.publicUrl,
    });

    return {
      imageUrl: data.publicUrl,
      prompt,
      storagePath: filename,
      model,
    };
  } catch {
    return null;
  }
}

function buildCantoneseLensImagePrompt(
  article: GeneratedCulturalArticle,
  category: CulturalCategory,
) {
  const vocab = article.key_vocab
    .slice(0, 5)
    .map((item) => item.word)
    .join(", ");
  const lens = article.cantonese_lens.slice(0, 700);

  return [
    "Use case: illustration-story",
    "Asset type: portrait editorial illustration for the Hong Kong perspective section of a Japanese learning article.",
    `Article topic: ${article.title_zh || article.title_ja}`,
    `Japanese title: ${article.title_ja}`,
    `Hong Kong perspective summary: ${lens}`,
    `Motifs to consider: ${CATEGORY_MOTIFS[category]}.`,
    vocab ? `Relevant Japanese vocabulary mood: ${vocab}.` : "",
    "Primary request: create a clean poster-like illustration that visually bridges Hong Kong and Japan.",
    "Style: modern Japanese travel poster, flat geometric vector shapes, subtle paper grain, warm sunset gradient, muted blue foreground, cream/yellow sky, crisp black ink details, calm editorial mood.",
    "Composition: vertical portrait card, centered iconic objects, balanced negative space, soft sun disk or arc motif, refined magazine illustration quality.",
    "Avoid: readable text, captions, labels, logos, brand names, people, photorealism, crowded collage, copyrighted characters.",
  ]
    .filter(Boolean)
    .join("\n");
}
