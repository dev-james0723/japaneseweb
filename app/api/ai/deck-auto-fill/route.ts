import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/ai/openai";
import { runDeckAutoFillPipeline } from "@/lib/ai/runDeckAutoFill";

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

  const outcome = await runDeckAutoFillPipeline({
    supabase,
    openai,
    userId: user.id,
    deckId: parsed.data.deckId,
  });

  if (outcome.ok && outcome.skipped) {
    return NextResponse.json({ ok: true, skipped: true, reason: outcome.reason });
  }

  if (!outcome.ok) {
    return NextResponse.json(
      { ok: false, error: outcome.error, steps: outcome.steps },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    steps: outcome.steps,
    memoryImageFailures: outcome.memoryImageFailures,
  });
}
