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
  difficulty: z.enum(["N5", "N4", "N3", "N2", "N1"]).default("N4"),
  canDo: z.string().max(400).optional(),
  successCriteria: z.array(z.string().max(140)).max(6).default([]),
  requiredPhrases: z.array(z.string().max(80)).max(8).default([]),
  history: z.array(MessageSchema).max(40),
});

const RoleplayReplySchema = z.object({
  reply_ja: z.string().default(""),
  kana: z.string().default(""),
  translation_zh: z.string().default(""),
  correction: z.object({
    original: z.string(),
    corrected: z.string(),
    explanation_zh: z.string(),
  }).nullable().default(null),
  suggestion_ja: z.string().nullable().default(null),
  suggestion_zh: z.string().nullable().default(null),
  task_complete: z.boolean().default(false),
  rubric: z.array(z.object({
    criterion: z.string(),
    passed: z.boolean(),
    evidence_zh: z.string(),
  })).default([]),
  reusable_patterns: z.array(z.string()).default([]),
  next_assignment: z.string().nullable().default(null),
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

  const { scenario, partnerRole, difficulty, canDo, successCriteria, requiredPhrases, history } = parsed.data;

  const system = `你係日文 roleplay 對話伙伴。
- Scenario: ${scenario}
- 你嘅角色: ${partnerRole}
- 學生程度: JLPT ${difficulty} (香港人，母語廣東話)
- Can-Do 任務: ${canDo ?? "完成場景內的實用溝通"}
- 成功條件: ${successCriteria.length ? successCriteria.map((criterion, index) => `${index + 1}. ${criterion}`).join(" / ") : "按場景自然完成任務"}
- 必用/建議句型: ${requiredPhrases.length ? requiredPhrases.join("、") : "無"}
- 規則:
  1. 每次回應只輸出 strict JSON，schema:
     {"reply_ja": string, "kana": string, "translation_zh": string, "correction": null | {"original": string, "corrected": string, "explanation_zh": string}, "suggestion_ja": string | null, "suggestion_zh": string | null, "task_complete": boolean, "rubric": [{"criterion": string, "passed": boolean, "evidence_zh": string}], "reusable_patterns": string[], "next_assignment": string | null}
  2. reply_ja: 你嘅日文回應，控制喺 ${difficulty} 程度，一句到兩句
  3. kana: reply_ja 全句假名 reading
  4. translation_zh: 繁體中文翻譯
  5. correction: 如果學生上一句有錯（語法／助詞／用詞／敬語），列出修正；否則 null
  6. suggestion_ja: 建議學生下一步可以點答嘅 sample（${difficulty} 程度），或 null
  7. suggestion_zh: suggestion 嘅中文意思
  8. task_complete: 根據成功條件判斷學生是否已完成任務；不要因為只講一句就過早判定完成
  9. rubric: 對每個成功條件回傳 passed 和簡短廣東話/繁中 evidence
  10. reusable_patterns: 從本輪對話抽 1-3 個可重用日文句型
  11. next_assignment: 未完成時給下一句要做甚麼；完成時給一個延伸任務
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

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "AI 輸出格式錯誤。", raw }, { status: 500 });
  }

  const reply = RoleplayReplySchema.safeParse(parsedJson);
  if (!reply.success) {
    return NextResponse.json({ error: "AI 輸出驗證失敗。", raw }, { status: 500 });
  }

  return NextResponse.json(reply.data);
}
