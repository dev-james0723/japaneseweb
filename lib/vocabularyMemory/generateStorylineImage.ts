import OpenAI from "openai";
import { getImageModel } from "@/lib/ai/openai";
import {
  buildStorylineMemoryStructuredImagePrompt,
  type StorylineMemoryImagePromptInput,
} from "@/lib/ai/prompts/storylineMemoryImagePrompt";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type StorylineImageGenResult =
  | { ok: true; imageUrl: string; storagePath: string; model: string; prompt: string }
  | { ok: false; error: string };

const IMAGE_GENERATE_TIMEOUT_MS = 120_000;

export async function generateStorylineGroupImage(opts: {
  openai: InstanceType<typeof OpenAI>;
  userId: string;
  sessionId: string;
  groupId: string;
  storyline: StorylineMemoryImagePromptInput;
}): Promise<StorylineImageGenResult> {
  const model = getImageModel();
  const prompt = buildStorylineMemoryStructuredImagePrompt(opts.storyline);
  let b64: string;
  try {
    const generatePromise = opts.openai.images.generate({
      model,
      prompt,
      size: "1536x1024",
      n: 1,
    });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`影像生成逾時（>${IMAGE_GENERATE_TIMEOUT_MS / 1000}s），請稍後按「重生此組圖」。`)),
        IMAGE_GENERATE_TIMEOUT_MS,
      );
    });
    const result = await Promise.race([generatePromise, timeoutPromise]);
    const first = result.data?.[0];
    if (!first?.b64_json) {
      return { ok: false, error: "影像產生失敗（無資料）。" };
    }
    b64 = first.b64_json;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "未知錯誤";
    return { ok: false, error: "OpenAI 影像生成失敗：" + msg };
  }

  const buf = Buffer.from(b64, "base64");
  const filename = `${opts.userId}/memory-scene/${opts.sessionId}/${opts.groupId}.png`;
  try {
    const service = createSupabaseServiceClient();
    const { error: uploadErr } = await service.storage
      .from("generated-images")
      .upload(filename, buf, { contentType: "image/png", upsert: true });
    if (uploadErr) {
      return { ok: false, error: "影像儲存失敗：" + uploadErr.message };
    }
    const { data: pub } = service.storage.from("generated-images").getPublicUrl(filename);
    return {
      ok: true,
      imageUrl: pub.publicUrl,
      storagePath: filename,
      model,
      prompt,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "未知錯誤";
    return { ok: false, error: "儲存流程錯誤：" + msg };
  }
}
