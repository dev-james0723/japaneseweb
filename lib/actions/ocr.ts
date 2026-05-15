"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { postgrestUserMessage } from "@/lib/supabase/postgrestUserMessage";

const ItemSchema = z.object({
  japanese: z.string().min(1).max(120),
  kana: z.string().max(120).optional().nullable(),
  romaji: z.string().max(160).optional().nullable(),
  meaning_zh: z.string().max(400).optional().nullable(),
  meaning_en: z.string().max(400).optional().nullable(),
  part_of_speech: z.string().max(40).optional().nullable(),
  jlpt_level: z.string().max(8).optional().nullable(),
});

const ConfirmSchema = z.object({
  ocrId: z.string().uuid(),
  title: z.string().min(1).max(120),
  topic: z.string().max(120).optional().nullable(),
  items: z.array(ItemSchema).min(1).max(80),
});

export async function confirmOcrImportAction(input: z.infer<typeof ConfirmSchema>) {
  const parsed = ConfirmSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "輸入錯誤：" + parsed.error.issues[0]?.message };
  }
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      topic: parsed.data.topic ?? null,
      source_type: "ocr",
    })
    .select("id")
    .single();
  if (deckErr || !deck) {
    return { ok: false as const, error: "建立詞庫失敗：" + postgrestUserMessage(deckErr) };
  }

  const rows = parsed.data.items.map((it) => ({
    user_id: user.id,
    deck_id: deck.id,
    japanese: it.japanese,
    kana: it.kana ?? null,
    romaji: it.romaji ?? null,
    meaning_zh: it.meaning_zh ?? null,
    meaning_en: it.meaning_en ?? null,
    part_of_speech: it.part_of_speech ?? null,
    jlpt_level: it.jlpt_level ?? null,
    source_type: "ocr",
  }));

  const { error: vocabErr } = await supabase.from("vocabulary_items").insert(rows);
  if (vocabErr) {
    return { ok: false as const, error: "儲存單字失敗：" + postgrestUserMessage(vocabErr) };
  }

  await supabase
    .from("ocr_imports")
    .update({ confirmed: true, deck_id: deck.id })
    .eq("id", parsed.data.ocrId);

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  return { ok: true as const, deckId: deck.id };
}
