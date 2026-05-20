import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/ai/openai";
import { runNotebookClassify } from "@/lib/ai/runNotebookClassify";

const RequestSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1).max(30),
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
    return NextResponse.json(
      { error: "尚未設定 OPENAI_API_KEY。" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "輸入錯誤" }, { status: 400 });
  }

  const result = await runNotebookClassify({
    supabase,
    openai,
    userId: user.id,
    entryIds: parsed.data.entryIds,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, raw: result.raw },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    suggestions: result.result.suggestions.map((s) => ({
      entryId: s.entry_id,
      suggestedFolderId: s.suggested_folder_id,
      suggestedFolderName: s.suggested_folder_name,
      tags: s.tags,
      confidence: s.confidence ?? null,
      reason: s.reason ?? null,
    })),
  });
}
