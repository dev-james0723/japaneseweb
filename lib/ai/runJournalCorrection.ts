import type OpenAI from "openai";
import { getTextModel, modelAllowsCustomTemperature } from "@/lib/ai/openai";
import { buildJournalCorrectionPrompt } from "@/lib/ai/prompts/journalCorrectionPrompt";
import { JournalCorrectionSchema, type JournalCorrection } from "@/lib/ai/schemas/journalCorrection";

export async function runJournalCorrection(opts: {
  openai: InstanceType<typeof OpenAI>;
  content: string;
  phase: number;
  targetJlpt: string;
}): Promise<{ ok: true; result: JournalCorrection } | { ok: false; error: string }> {
  const { openai, content, phase, targetJlpt } = opts;
  const model = getTextModel();
  let raw = "";
  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      ...(modelAllowsCustomTemperature(model) ? { temperature: 0.3 } : {}),
      messages: [
        { role: "system", content: "你只輸出嚴格的 JSON，沒有 markdown 圍欄或說明。" },
        { role: "user", content: buildJournalCorrectionPrompt(content, phase, targetJlpt) },
      ],
    });
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知";
    return { ok: false, error: "AI 呼叫失敗：" + msg };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "AI 輸出格式錯誤。" };
  }
  const parsed = JournalCorrectionSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: "AI 輸出驗證失敗：" + parsed.error.issues[0]?.message };
  }
  return { ok: true, result: parsed.data };
}
