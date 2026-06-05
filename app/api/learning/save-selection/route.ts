import { NextResponse } from "next/server";
import { z } from "zod";
import { recordContentInteractionForUser } from "@/lib/actions/contentInteractions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({
  text: z.string().trim().min(1).max(4000),
  reading: z.string().trim().max(200).optional().default(""),
  meaning_zh: z.string().trim().max(1000).optional().default(""),
  context: z.string().trim().max(1200).optional().default(""),
  source_path: z.string().trim().max(500).optional().default(""),
  saved_from: z.string().trim().max(80).optional().default("selection_inspector"),
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
  const kind = text.length <= 12 ? "term" : text.length <= 240 && !text.includes("\n") ? "phrase" : "freeform";
  const tags = Array.from(
    new Set([
      "quick-save",
      ...(parsed.data.saved_from === "selection_inspector" ? ["selection"] : []),
      ...parsed.data.tags,
    ]),
  );

  const existingQuery = supabase
    .from("notebook_entries")
    .select("id")
    .eq("user_id", session.user.id);
  const { data: existing } = kind === "freeform"
    ? await existingQuery.eq("content", text).maybeSingle()
    : await existingQuery.eq("japanese", text).maybeSingle();

  if (existing?.id) {
    await recordContentInteractionForUser({
      supabase,
      userId: session.user.id,
      input: {
        interactionType: "save",
        sourceSurface: parsed.data.saved_from,
        deepLink: parsed.data.source_path || "/notebook",
        itemsCreated: 0,
        metadata: {
          existing: true,
          entry_id: existing.id,
          kind,
          tags,
          text_length: text.length,
        },
      },
    });
    return NextResponse.json({ ok: true, entry_id: existing.id, existing: true });
  }

  const { data, error } = await supabase
    .from("notebook_entries")
    .insert({
      user_id: session.user.id,
      kind,
      japanese: kind === "freeform" ? null : text,
      reading: kind === "freeform" ? null : parsed.data.reading || null,
      meaning_zh: kind === "freeform" ? parsed.data.meaning_zh || null : parsed.data.meaning_zh || null,
      content: kind === "freeform" ? text : parsed.data.context || null,
      tags,
      ai_metadata: {
        source_path: parsed.data.source_path,
        saved_from: parsed.data.saved_from,
      },
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "儲存失敗：" + (error?.message ?? "未知") }, { status: 500 });
  }

  await recordContentInteractionForUser({
    supabase,
    userId: session.user.id,
    input: {
      interactionType: "save",
      sourceSurface: parsed.data.saved_from,
      deepLink: parsed.data.source_path || "/notebook",
      itemsCreated: 1,
      metadata: {
        existing: false,
        entry_id: data.id,
        kind,
        tags,
        text_length: text.length,
      },
    },
  });

  return NextResponse.json({ ok: true, entry_id: data.id, existing: false });
}
