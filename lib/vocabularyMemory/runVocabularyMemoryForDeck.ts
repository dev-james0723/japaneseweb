import type OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runVocabularyMemoryPlanning } from "@/lib/vocabularyMemory/planningPipeline";
import { generateStorylineGroupImage } from "@/lib/vocabularyMemory/generateStorylineImage";

export type VocabularyMemoryRunResult =
  | {
      ok: true;
      sessionId: string;
      groupCount: number;
      imageResults: { groupId: string; ok: boolean; error?: string }[];
    }
  | { ok: false; error: string };

export async function runVocabularyMemoryForDeck(opts: {
  supabase: SupabaseClient;
  openai: InstanceType<typeof OpenAI>;
  userId: string;
  deckId: string;
}): Promise<VocabularyMemoryRunResult> {
  const { supabase, openai, userId, deckId } = opts;

  const { data: deck } = await supabase
    .from("decks")
    .select("id, topic, user_id")
    .eq("id", deckId)
    .maybeSingle();
  if (!deck || deck.user_id !== userId) {
    return { ok: false, error: "詞庫不存在。" };
  }

  const { data: items } = await supabase
    .from("vocabulary_items")
    .select("id, japanese, kana, romaji, meaning_zh")
    .eq("deck_id", deckId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(40);

  if (!items?.length) {
    return { ok: false, error: "詞庫中沒有單字。" };
  }

  const expectedJapaneseWords = items.map((x) => x.japanese);
  const sourceInput = expectedJapaneseWords.join("、");

  let planning;
  let planningRaw: string;
  try {
    const out = await runVocabularyMemoryPlanning({
      openai,
      items,
      topicHint: deck.topic,
      expectedJapaneseWords,
    });
    planning = out.planning;
    planningRaw = out.raw;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "未知錯誤";
    return { ok: false, error: msg };
  }

  const extractedVocabulary = planning.vocabulary.map((v) => ({
    word: v.word,
    reading: v.reading ?? undefined,
    meaningTraditionalChinese: v.meaningTraditionalChinese ?? undefined,
  }));

  const { data: sess, error: sessErr } = await supabase
    .from("vocabulary_sessions")
    .insert({
      user_id: userId,
      deck_id: deckId,
      source_input: sourceInput,
      extracted_vocabulary: extractedVocabulary,
      planning_raw: { raw: planningRaw, planning },
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sessErr || !sess) {
    return {
      ok: false,
      error: "無法建立記憶場景工作階段：" + (sessErr?.message ?? "未知"),
    };
  }

  const sessionId = sess.id;

  const groupRows = planning.storylineGroups.map((g, idx) => ({
    session_id: sessionId,
    group_index: idx,
    title_traditional_chinese: g.titleTraditionalChinese,
    storyline_japanese: g.storylineJapanese,
    storyline_traditional_chinese: g.storylineTraditionalChinese,
    words: g.words.map((w) => ({
      word: w.word,
      reading: w.reading ?? undefined,
      meaningTraditionalChinese: w.meaningTraditionalChinese ?? undefined,
      visualAnchor: w.visualAnchor ?? undefined,
      roleInStory: w.roleInStory ?? undefined,
    })),
    image_prompt: g.imagePrompt,
    generation_status: "pending" as const,
    updated_at: new Date().toISOString(),
  }));

  const { error: gErr } = await supabase.from("vocabulary_storyline_groups").insert(groupRows);

  if (gErr) {
    return { ok: false, error: "無法寫入故事線群組：" + (gErr?.message ?? "未知") };
  }

  const { data: insertedGroups, error: fetchGErr } = await supabase
    .from("vocabulary_storyline_groups")
    .select("id, group_index")
    .eq("session_id", sessionId)
    .order("group_index", { ascending: true });

  if (fetchGErr || !insertedGroups?.length) {
    return { ok: false, error: "無法讀取故事線群組：" + (fetchGErr?.message ?? "未知") };
  }

  const now = new Date().toISOString();
  await supabase
    .from("vocabulary_storyline_groups")
    .update({ generation_status: "generating", error_message: null, updated_at: now })
    .eq("session_id", sessionId);

  const settled = await Promise.allSettled(
    insertedGroups.map(async (row) => {
      const gMeta = planning.storylineGroups[row.group_index];
      if (!gMeta) {
        throw new Error("missing planning meta for group " + row.group_index);
      }

      const img = await generateStorylineGroupImage({
        openai,
        userId,
        sessionId,
        groupId: row.id,
        storyline: {
          titleTraditionalChinese: gMeta.titleTraditionalChinese,
          storylineJapanese: gMeta.storylineJapanese,
          storylineTraditionalChinese: gMeta.storylineTraditionalChinese,
          words: gMeta.words.map((w) => ({
            word: w.word,
            reading: w.reading,
            meaningTraditionalChinese: w.meaningTraditionalChinese,
            visualAnchor: w.visualAnchor,
          })),
          plannerImagePromptEnglish: gMeta.imagePrompt,
        },
      });

      const ts = new Date().toISOString();
      if (img.ok) {
        await supabase
          .from("vocabulary_storyline_groups")
          .update({
            generation_status: "completed",
            image_url: img.imageUrl,
            storage_path: img.storagePath,
            model: img.model,
            image_prompt: img.prompt,
            error_message: null,
            updated_at: ts,
          })
          .eq("id", row.id);
        return { groupId: row.id, ok: true as const };
      }
      await supabase
        .from("vocabulary_storyline_groups")
        .update({
          generation_status: "failed",
          error_message: img.error,
          updated_at: ts,
        })
        .eq("id", row.id);
      return { groupId: row.id, ok: false as const, error: img.error };
    }),
  );

  const imageResults: { groupId: string; ok: boolean; error?: string }[] = [];
  for (let i = 0; i < settled.length; i++) {
    const row = insertedGroups[i];
    const r = settled[i];
    if (r.status === "fulfilled") {
      const v = r.value;
      if (v.ok) {
        imageResults.push({ groupId: v.groupId, ok: true });
      } else {
        imageResults.push({ groupId: v.groupId, ok: false, error: v.error });
      }
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      await supabase
        .from("vocabulary_storyline_groups")
        .update({
          generation_status: "failed",
          error_message: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      imageResults.push({ groupId: row.id, ok: false, error: msg });
    }
  }

  await supabase
    .from("vocabulary_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  return {
    ok: true,
    sessionId,
    groupCount: insertedGroups.length,
    imageResults,
  };
}
