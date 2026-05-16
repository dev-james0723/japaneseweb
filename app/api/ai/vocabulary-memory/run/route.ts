import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/ai/openai";
import { runVocabularyMemoryForDeck } from "@/lib/vocabularyMemory/runVocabularyMemoryForDeck";

export const runtime = "nodejs";
export const maxDuration = 300;

const RequestSchema = z.object({
  deckId: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ error: "尚未設定 OPENAI_API_KEY。" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "輸入錯誤" }, { status: 400 });
  }

  const result = await runVocabularyMemoryForDeck({
    supabase,
    openai,
    userId: user.id,
    deckId: parsed.data.deckId,
  });

  if (!result.ok) {
    const status = result.error.includes("沒有單字") ? 400 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    sessionId: result.sessionId,
    groupCount: result.groupCount,
    imageResults: result.imageResults,
  });
}
