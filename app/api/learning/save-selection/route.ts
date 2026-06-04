import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({
  text: z.string().trim().min(1).max(500),
  reading: z.string().trim().max(200).optional().default(""),
  meaning_zh: z.string().trim().max(1000).optional().default(""),
  context: z.string().trim().max(1200).optional().default(""),
  source_path: z.string().trim().max(500).optional().default(""),
  tags: z.array(z.string().trim().max(40)).max(12).optional().default([]),
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

  const text = parsed.data.text;
  const kind = text.length <= 12 ? "term" : "phrase";
  const tags = Array.from(new Set(["quick-save", "selection", ...parsed.data.tags]));

  const { data: existing } = await supabase
    .from("notebook_entries")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("japanese", text)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({ ok: true, entry_id: existing.id, existing: true });
  }

  const { data, error } = await supabase
    .from("notebook_entries")
    .insert({
      user_id: session.user.id,
      kind,
      japanese: text,
      reading: parsed.data.reading || null,
      meaning_zh: parsed.data.meaning_zh || null,
      content: parsed.data.context || null,
      tags,
      ai_metadata: {
        source_path: parsed.data.source_path,
        saved_from: "selection_inspector",
      },
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "儲存失敗：" + (error?.message ?? "未知") }, { status: 500 });
  }

  return NextResponse.json({ ok: true, entry_id: data.id, existing: false });
}
