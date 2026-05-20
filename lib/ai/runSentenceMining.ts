import type OpenAI from "openai";
import { getTextModel, modelAllowsCustomTemperature } from "@/lib/ai/openai";
import { buildSentenceMiningPrompt } from "@/lib/ai/prompts/sentenceMiningPrompt";
import { SentenceMiningResultSchema, type SentenceMiningResult } from "@/lib/ai/schemas/sentenceMining";

export async function runSentenceMining(opts: {
  openai: InstanceType<typeof OpenAI>;
  text: string;
  phase: number;
}): Promise<{ ok: true; result: SentenceMiningResult } | { ok: false; error: string }> {
  const model = getTextModel();
  let raw = "";
  try {
    const completion = await opts.openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      ...(modelAllowsCustomTemperature(model) ? { temperature: 0.4 } : {}),
      messages: [
        { role: "system", content: "你只輸出嚴格的 JSON，沒有 markdown 圍欄或說明。" },
        { role: "user", content: buildSentenceMiningPrompt(opts.text, opts.phase) },
      ],
    });
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知";
    return { ok: false, error: "AI 呼叫失敗：" + msg };
  }
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return { ok: false, error: "AI 輸出格式錯誤。" }; }
  const parsed = SentenceMiningResultSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: "AI 輸出驗證失敗：" + parsed.error.issues[0]?.message };
  return { ok: true, result: parsed.data };
}
