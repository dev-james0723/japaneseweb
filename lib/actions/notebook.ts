"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { postgrestUserMessage } from "@/lib/supabase/postgrestUserMessage";
import type { NotebookEntryKind } from "@/lib/notebook/types";

const NOTEBOOK_PATH = "/notebook";

const EntryKindSchema = z.enum(["term", "phrase", "freeform"]);

const CreateFolderSchema = z.object({
  name: z.string().trim().min(1).max(80),
  parentId: z.string().uuid().optional().nullable(),
});

const UpdateFolderSchema = z.object({
  folderId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
});

const FolderIdSchema = z.object({
  folderId: z.string().uuid(),
});

const EntryInputSchema = z.object({
  kind: EntryKindSchema.default("term"),
  folderId: z.string().uuid().optional().nullable(),
  japanese: z.string().max(500).optional().nullable(),
  reading: z.string().max(200).optional().nullable(),
  meaningZh: z.string().max(800).optional().nullable(),
  meaningEn: z.string().max(800).optional().nullable(),
  content: z.string().max(4000).optional().nullable(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  isFavorite: z.boolean().optional(),
});

const CreateEntrySchema = EntryInputSchema.refine(
  (d) => {
    const jp = d.japanese?.trim();
    const ct = d.content?.trim();
    return Boolean(jp || ct);
  },
  { message: "請至少填寫日文或內容。" },
);

const UpdateEntrySchema = EntryInputSchema.extend({
  entryId: z.string().uuid(),
}).refine(
  (d) => {
    const jp = d.japanese?.trim();
    const ct = d.content?.trim();
    return Boolean(jp || ct);
  },
  { message: "請至少填寫日文或內容。" },
);

const EntryIdSchema = z.object({
  entryId: z.string().uuid(),
});

const MoveEntrySchema = z.object({
  entryId: z.string().uuid(),
  folderId: z.string().uuid().optional().nullable(),
});

const ToggleFavoriteSchema = z.object({
  entryId: z.string().uuid(),
  isFavorite: z.boolean(),
});

const ApplyClassifySchema = z.object({
  entryId: z.string().uuid(),
  folderId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(40)).max(20).optional(),
});

const AddFromVocabSchema = z.object({
  vocabId: z.string().uuid(),
  folderId: z.string().uuid().optional().nullable(),
  kind: EntryKindSchema.default("term"),
});

const ImportToDeckSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1).max(50),
  title: z.string().trim().min(1).max(120),
  topic: z.string().trim().max(120).optional().nullable(),
});

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  return { supabase, user };
}

function entryRowFromInput(
  userId: string,
  input: z.infer<typeof EntryInputSchema>,
  entryId?: string,
) {
  return {
    ...(entryId ? { id: entryId } : {}),
    user_id: userId,
    folder_id: input.folderId ?? null,
    kind: input.kind as NotebookEntryKind,
    japanese: input.japanese?.trim() || null,
    reading: input.reading?.trim() || null,
    meaning_zh: input.meaningZh?.trim() || null,
    meaning_en: input.meaningEn?.trim() || null,
    content: input.content?.trim() || null,
    tags: input.tags ?? [],
    is_favorite: input.isFavorite ?? false,
  };
}

function revalidateNotebook() {
  revalidatePath(NOTEBOOK_PATH);
}

export async function createNotebookFolderAction(input: {
  name: string;
  parentId?: string | null;
}): Promise<ActionResult<{ folderId: string }>> {
  const parsed = CreateFolderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "資料夾名稱格式不正確。" };
  }

  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: "請先登入。" };

  const { data: maxRow } = await supabase
    .from("notebook_folders")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("notebook_folders")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      parent_id: parsed.data.parentId ?? null,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "建立資料夾失敗：" + postgrestUserMessage(error) };
  }

  revalidateNotebook();
  return { ok: true, data: { folderId: data.id } };
}

export async function updateNotebookFolderAction(input: {
  folderId: string;
  name: string;
}): Promise<ActionResult> {
  const parsed = UpdateFolderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "資料夾名稱格式不正確。" };
  }

  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: "請先登入。" };

  const { error } = await supabase
    .from("notebook_folders")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.folderId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "更新資料夾失敗：" + postgrestUserMessage(error) };
  }

  revalidateNotebook();
  return { ok: true };
}

export async function deleteNotebookFolderAction(input: {
  folderId: string;
}): Promise<ActionResult> {
  const parsed = FolderIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "資料夾 ID 不正確。" };
  }

  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: "請先登入。" };

  await supabase
    .from("notebook_entries")
    .update({ folder_id: null })
    .eq("folder_id", parsed.data.folderId)
    .eq("user_id", user.id);

  const { error } = await supabase
    .from("notebook_folders")
    .delete()
    .eq("id", parsed.data.folderId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "刪除資料夾失敗：" + postgrestUserMessage(error) };
  }

  revalidateNotebook();
  return { ok: true };
}

export async function createNotebookEntryAction(
  input: z.infer<typeof CreateEntrySchema>,
): Promise<ActionResult<{ entryId: string }>> {
  const parsed = CreateEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "輸入格式不正確。",
    };
  }

  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: "請先登入。" };

  const row = entryRowFromInput(user.id, parsed.data);

  const { data, error } = await supabase
    .from("notebook_entries")
    .insert(row)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "新增筆記失敗：" + postgrestUserMessage(error) };
  }

  revalidateNotebook();
  return { ok: true, data: { entryId: data.id } };
}

export async function updateNotebookEntryAction(
  input: z.infer<typeof UpdateEntrySchema>,
): Promise<ActionResult> {
  const parsed = UpdateEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "輸入格式不正確。",
    };
  }

  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: "請先登入。" };

  const { entryId, ...rest } = parsed.data;
  const row = entryRowFromInput(user.id, rest);

  const { error } = await supabase
    .from("notebook_entries")
    .update({
      folder_id: row.folder_id,
      kind: row.kind,
      japanese: row.japanese,
      reading: row.reading,
      meaning_zh: row.meaning_zh,
      meaning_en: row.meaning_en,
      content: row.content,
      tags: row.tags,
      is_favorite: row.is_favorite,
    })
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "更新筆記失敗：" + postgrestUserMessage(error) };
  }

  revalidateNotebook();
  revalidatePath("/decks");
  return { ok: true };
}

export async function deleteNotebookEntryAction(input: {
  entryId: string;
}): Promise<ActionResult> {
  const parsed = EntryIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "筆記 ID 不正確。" };
  }

  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: "請先登入。" };

  const { error } = await supabase
    .from("notebook_entries")
    .delete()
    .eq("id", parsed.data.entryId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "刪除筆記失敗：" + postgrestUserMessage(error) };
  }

  revalidateNotebook();
  return { ok: true };
}

export async function moveNotebookEntryAction(input: {
  entryId: string;
  folderId?: string | null;
}): Promise<ActionResult> {
  const parsed = MoveEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "輸入格式不正確。" };
  }

  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: "請先登入。" };

  const { error } = await supabase
    .from("notebook_entries")
    .update({ folder_id: parsed.data.folderId ?? null })
    .eq("id", parsed.data.entryId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "移動筆記失敗：" + postgrestUserMessage(error) };
  }

  revalidateNotebook();
  return { ok: true };
}

export async function toggleNotebookFavoriteAction(input: {
  entryId: string;
  isFavorite: boolean;
}): Promise<ActionResult> {
  const parsed = ToggleFavoriteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "輸入格式不正確。" };
  }

  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: "請先登入。" };

  const { error } = await supabase
    .from("notebook_entries")
    .update({ is_favorite: parsed.data.isFavorite })
    .eq("id", parsed.data.entryId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "更新最愛失敗：" + postgrestUserMessage(error) };
  }

  revalidateNotebook();
  return { ok: true };
}

export async function applyNotebookClassifyAction(input: {
  entryId: string;
  folderId?: string | null;
  tags?: string[];
}): Promise<ActionResult> {
  const parsed = ApplyClassifySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "輸入格式不正確。" };
  }

  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: "請先登入。" };

  const updates: Record<string, unknown> = {
    folder_id: parsed.data.folderId ?? null,
    ai_suggested_folder_id: null,
  };
  if (parsed.data.tags) {
    updates.tags = parsed.data.tags;
  }

  const { error } = await supabase
    .from("notebook_entries")
    .update(updates)
    .eq("id", parsed.data.entryId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "套用分類失敗：" + postgrestUserMessage(error) };
  }

  revalidateNotebook();
  return { ok: true };
}

export async function addVocabToNotebookAction(input: {
  vocabId: string;
  folderId?: string | null;
  kind?: NotebookEntryKind;
}): Promise<ActionResult<{ entryId: string }>> {
  const parsed = AddFromVocabSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "輸入格式不正確。" };
  }

  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: "請先登入。" };

  const { data: vocab, error: vocabErr } = await supabase
    .from("vocabulary_items")
    .select("id, japanese, kana, romaji, meaning_zh, meaning_en")
    .eq("id", parsed.data.vocabId)
    .eq("user_id", user.id)
    .single();

  if (vocabErr || !vocab) {
    return { ok: false, error: "找不到該單字。" };
  }

  const { data: existing } = await supabase
    .from("notebook_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("source_vocab_id", parsed.data.vocabId)
    .maybeSingle();

  if (existing) {
    return { ok: true, data: { entryId: existing.id } };
  }

  const { data, error } = await supabase
    .from("notebook_entries")
    .insert({
      user_id: user.id,
      folder_id: parsed.data.folderId ?? null,
      kind: parsed.data.kind,
      japanese: vocab.japanese,
      reading: vocab.kana ?? vocab.romaji ?? null,
      meaning_zh: vocab.meaning_zh,
      meaning_en: vocab.meaning_en,
      source_vocab_id: vocab.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "加入筆記本失敗：" + postgrestUserMessage(error) };
  }

  revalidateNotebook();
  return { ok: true, data: { entryId: data.id } };
}

export async function importNotebookEntriesToDeckAction(input: {
  entryIds: string[];
  title: string;
  topic?: string | null;
}): Promise<ActionResult<{ deckId: string }>> {
  const parsed = ImportToDeckSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "輸入格式不正確。" };
  }

  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, error: "請先登入。" };

  const { data: entries, error: entriesErr } = await supabase
    .from("notebook_entries")
    .select("id, japanese, reading, meaning_zh, content")
    .eq("user_id", user.id)
    .in("id", parsed.data.entryIds);

  if (entriesErr || !entries?.length) {
    return { ok: false, error: "找不到要匯入的筆記。" };
  }

  const items = entries
    .map((e) => {
      const japanese = (e.japanese?.trim() || e.content?.trim() || "").slice(0, 120);
      if (!japanese) return null;
      return {
        japanese,
        kana: e.reading?.trim() || null,
        romaji: null,
        meaning_zh: e.meaning_zh?.trim() || null,
        notes: null,
      };
    })
    .filter(Boolean) as {
    japanese: string;
    kana: string | null;
    romaji: string | null;
    meaning_zh: string | null;
    notes: string | null;
  }[];

  if (items.length === 0) {
    return { ok: false, error: "所選筆記沒有可匯入的日文內容。" };
  }

  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      topic: parsed.data.topic ?? null,
      source_type: "manual",
    })
    .select("id")
    .single();

  if (deckErr || !deck) {
    return { ok: false, error: "建立詞庫失敗：" + postgrestUserMessage(deckErr) };
  }

  const rows = items.map((it) => ({
    user_id: user.id,
    deck_id: deck.id,
    japanese: it.japanese,
    kana: it.kana,
    romaji: it.romaji,
    meaning_zh: it.meaning_zh,
    notes: it.notes,
    source_type: "manual" as const,
  }));

  const { error: vocabErr } = await supabase.from("vocabulary_items").insert(rows);
  if (vocabErr) {
    return { ok: false, error: "匯入單字失敗：" + postgrestUserMessage(vocabErr) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  revalidateNotebook();
  return { ok: true, data: { deckId: deck.id } };
}
