import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI, getTextModel, modelAllowsCustomTemperature } from "@/lib/ai/openai";

export const runtime = "nodejs";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const BodySchema = z.object({
  scenario: z.string().max(300),
  partnerRole: z.string().max(100).default("店員"),
  difficulty: z.enum(["N5", "N4", "N3", "N2"]).default("N4"),
  history: z.array(MessageSchema).max(40),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "未登入。" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤。" }, { status: 400 });

  const openai = getOpenAI();
  if (!openai) return NextResponse.json({ error: "未設定 OPENAI_API_KEY。" }, { status: 500 });

  const { scenario, partnerRole, difficulty, history } = parsed.data;

  const system = `你係日文 roleplay 對話伙伴。
- Scenario: ${scenario}
- 你嘅角色: ${partnerRole}
- 學生程度: JLPT ${difficulty} (香港人，母語廣東話)
- 規則:
  1. 每次回應只輸出 strict JSON，schema:
     {"reply_ja": string, "kana": string, "translation_zh": string, "correction": null | {"original": string, "corrected": string, "explanation_zh": string}, "suggestion_ja": string | null, "suggestion_zh": string | null}
  2. reply_ja: 你嘅日文回應，控制喺 ${difficulty} 程度，一句到兩句
  3. kana: reply_ja 全句假名 reading
  4. translation_zh: 繁體中文翻譯
  5. correction: 如果學生上一句有錯（語法／助詞／用詞／敬語），列出修正；否則 null
  6. suggestion_ja: 建議學生下一步可以點答嘅 sample（${difficulty} 程度），或 null
  7. suggestion_zh: suggestion 嘅中文意思
- 對話保持自然友善，鼓勵學生繼續講`;

  const messages = [
    { role: "system" as const, content: system },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  const model = getTextModel();
  let raw = "";
  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      ...(modelAllowsCustomTemperature(model) ? { temperature: 0.7 } : {}),
      messages,
    });
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知";
    return NextResponse.json({ error: "AI 呼叫失敗：" + msg }, { status: 500 });
  }

  let parsedJson: any;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "AI 輸出格式錯誤。", raw }, { status: 500 });
  }

  return NextResponse.json(parsedJson);
}
