import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI, getTextModel, modelAllowsCustomTemperature } from "@/lib/ai/openai";

export const runtime = "nodejs";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(3000),
});

const BodySchema = z.object({
  seed: z.string().trim().min(1).max(240),
  history: z.array(MessageSchema).max(30),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return NextResponse.json({ error: "未登入。" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤。" }, { status: 400 });

  const openai = getOpenAI();
  if (!openai) return NextResponse.json({ error: "未設定 OPENAI_API_KEY。" }, { status: 503 });

  const system = `你係一位專業日本語教授，面向香港日文學習者。
學生想深入探索: ${parsed.data.seed}

教學風格:
- 用繁體中文 / 廣東話做解釋，必要時配自然日文
- 先答重點，再給 2-3 個自然例句
- 例句要有中文翻譯
- 如涉及漢字，解釋音讀/訓讀/常見搭配
- 不要長篇大論，不要 HTML。`;

  const model = getTextModel();
  try {
    const completion = await openai.chat.completions.create({
      model,
      ...(modelAllowsCustomTemperature(model) ? { temperature: 0.55 } : {}),
      messages: [
        { role: "system", content: system },
        ...parsed.data.history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    });
    return NextResponse.json({ reply: completion.choices[0]?.message?.content ?? "" });
  } catch (error) {
    return NextResponse.json(
      { error: "教授暫時連不上：" + (error instanceof Error ? error.message : "未知") },
      { status: 502 },
    );
  }
}
