"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { postgrestUserMessage } from "@/lib/supabase/postgrestUserMessage";

const VocabInput = z.object({
  japanese: z.string().min(1).max(120),
  kana: z.string().max(120).optional().nullable(),
  romaji: z.string().max(160).optional().nullable(),
  meaning_zh: z.string().max(400).optional().nullable(),
  notes: z.string().max(800).optional().nullable(),
});

const CreateDeckSchema = z.object({
  title: z.string().min(1).max(120),
  topic: z.string().max(120).optional().nullable(),
  source_type: z.enum(["manual", "ai_generated", "ocr"]),
  items: z.array(VocabInput).min(1).max(50),
});

export type CreateDeckInput = z.infer<typeof CreateDeckSchema>;

export async function createDeckAction(input: CreateDeckInput) {
  const parsed = CreateDeckSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "輸入格式不正確：" + parsed.error.issues[0]?.message };
  }
  const data = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "請先登入。" };

  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .insert({
      user_id: user.id,
      title: data.title,
      topic: data.topic,
      source_type: data.source_type,
    })
    .select("id")
    .single();

  if (deckErr || !deck) {
    return { ok: false as const, error: "建立詞庫失敗：" + postgrestUserMessage(deckErr) };
  }

  const rows = data.items.map((it) => ({
    user_id: user.id,
    deck_id: deck.id,
    japanese: it.japanese,
    kana: it.kana ?? null,
    romaji: it.romaji ?? null,
    meaning_zh: it.meaning_zh ?? null,
    notes: it.notes ?? null,
    source_type: data.source_type,
  }));

  const { error: vocabErr } = await supabase.from("vocabulary_items").insert(rows);
  if (vocabErr) {
    return { ok: false as const, error: "儲存單字失敗：" + postgrestUserMessage(vocabErr) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  redirect(`/decks/${deck.id}`);
}

function parseManualLines(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      // Accept simple list or `word | meaning` style.
      const [japanese, meaning] = line.split(/\s*[|｜]\s*/);
      return {
        japanese: japanese.trim(),
        meaning_zh: meaning?.trim() || null,
      };
    });
}

export async function createDeckFromTextAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim() || "今日詞庫";
  const topic = String(formData.get("topic") ?? "").trim() || null;
  const raw = String(formData.get("raw") ?? "");

  const items = parseManualLines(raw);
  if (items.length === 0) {
    return { ok: false as const, error: "請至少輸入一個日文單字。" };
  }

  return createDeckAction({
    title,
    topic,
    source_type: "manual",
    items,
  });
}
