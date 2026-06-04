import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI, getTextModel, modelAllowsCustomTemperature } from "@/lib/ai/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({
  text: z.string().trim().min(1).max(240),
  context: z.string().trim().max(1000).optional().default(""),
});

const UsageSchema = z.object({
  expression: z.string().default(""),
  reading: z.string().default(""),
  meaning_zh: z.string().default(""),
  example_ja: z.string().default(""),
  example_zh: z.string().default(""),
});

const InspectSchema = z.object({
  text: z.string().default(""),
  reading: z.string().default(""),
  meaning_zh: z.string().default(""),
  nuance_zh: z.string().default(""),
  common_usages: z.array(UsageSchema).default([]),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return NextResponse.json({ error: "未登入。" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "輸入錯誤：" + parsed.error.issues[0]?.message }, { status: 400 });
  }

  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({
      text: parsed.data.text,
      reading: "",
      meaning_zh: "未設定 OPENAI_API_KEY，暫時只可儲存與播放。",
      nuance_zh: "",
      common_usages: [],
    });
  }

  const prompt = `你係專業日本語教授，幫香港日文學習者 inspect 一個被 highlight 的日文字詞或短句。

Text: ${parsed.data.text}
Context: ${parsed.data.context || "N/A"}

回傳 STRICT JSON:
{
  "text": string,
  "reading": string,
  "meaning_zh": string,
  "nuance_zh": string,
  "common_usages": [
    { "expression": string, "reading": string, "meaning_zh": string, "example_ja": string, "example_zh": string }
  ]
}

要求:
- 繁體中文解釋，語氣似老師，短而精準
- common_usages 2-4 個，必須是自然日文搭配或例句
- 如果輸入係完整短句，就解釋句意、語氣、可抽出的字詞搭配
- 不要 markdown，不要 HTML。`;

  const model = getTextModel();
  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      ...(modelAllowsCustomTemperature(model) ? { temperature: 0.35 } : {}),
      messages: [{ role: "user", content: prompt }],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const inspected = InspectSchema.safeParse(JSON.parse(raw));
    if (!inspected.success) throw new Error(inspected.error.issues[0]?.message ?? "invalid");
    return NextResponse.json(inspected.data);
  } catch (error) {
    return NextResponse.json(
      { error: "inspect 失敗：" + (error instanceof Error ? error.message : "未知") },
      { status: 502 },
    );
  }
}
