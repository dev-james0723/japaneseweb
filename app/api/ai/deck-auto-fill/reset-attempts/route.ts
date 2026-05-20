import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BodySchema = z.object({ deckId: z.string().uuid() });

/**
 * When auto-fill has hit the max attempt count, allow the owner to clear the
 * counter so they can try again after fixes (without editing the DB by hand).
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "輸入錯誤" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("decks")
    .update({
      ai_auto_fill_attempts: 0,
      ai_auto_fill_last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.deckId)
    .eq("user_id", user.id)
    .eq("ai_auto_fill_completed", false)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "無法重設（可能已完成補充或無權限）。" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
