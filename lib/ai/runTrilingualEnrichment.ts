import type OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTextModel, modelAllowsCustomTemperature } from "@/lib/ai/openai";
import { buildTrilingualEnrichmentPrompt } from "@/lib/ai/prompts/trilingualEnrichmentPrompt";
import { TrilingualEnrichmentResultSchema } from "@/lib/ai/schemas/trilingualEnrichment";

const KANJI_RE = /[一-龯㐀-䶿]/;

export async function runTrilingualEnrichmentForDeck(opts: {
  supabase: SupabaseClient;
  openai: InstanceType<typeof OpenAI>;
  userId: string;
  deckId: string;
}): Promise<{ ok: true; enrichedCount: number } | { ok: false; error: string }> {
  const { supabase, openai, userId, deckId } = opts;

  const [{ data: items }, { data: settings }, { data: falseFriends }] = await Promise.all([
    supabase
      .from("vocabulary_items")
      .select("id, japanese, kana, romaji, meaning_zh, cantonese_reading")
      .eq("deck_id", deckId)
      .eq("user_id", userId),
    supabase
      .from("user_os_settings")
      .select("current_phase")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("false_friends_reference")
      .select("kanji, chinese_meaning, japanese_meaning"),
  ]);

  if (!items?.length) return { ok: false, error: "詞庫中沒有單字。" };

  // Only enrich rows that don't already have a trilingual mnemonic.
  const toEnrich = items.filter((it) => !it.cantonese_reading);
  if (toEnrich.length === 0) return { ok: true, enrichedCount: 0 };

  const phase = settings?.current_phase ?? 1;
  const prompt = buildTrilingualEnrichmentPrompt(
    toEnrich.map((it) => ({
      japanese: it.japanese,
      kana: it.kana,
      romaji: it.romaji,
      meaning_zh: it.meaning_zh,
    })),
    falseFriends ?? [],
    phase,
  );

  const model = getTextModel();
  let raw = "";
  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      ...(modelAllowsCustomTemperature(model) ? { temperature: 0.5 } : {}),
      messages: [
        { role: "system", content: "你只輸出嚴格的 JSON，沒有 markdown 圍欄或說明。" },
        { role: "user", content: prompt },
      ],
    });
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知";
    return { ok: false, error: "AI 呼叫失敗：" + msg };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "AI 輸出格式錯誤。" };
  }
  const parsed = TrilingualEnrichmentResultSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: "AI 輸出驗證失敗：" + parsed.error.issues[0]?.message };
  }

  const byJa = new Map(items.map((it) => [it.japanese, it]));
  let count = 0;

  for (const enriched of parsed.data.items) {
    const row = byJa.get(enriched.japanese);
    if (!row) continue;
    const hasKanji = KANJI_RE.test(enriched.japanese);
    const { error } = await supabase
      .from("vocabulary_items")
      .update({
        cantonese_reading: enriched.cantonese_reading ?? null,
        has_kanji: hasKanji,
        is_false_friend: enriched.is_false_friend ?? false,
        false_friend_warning: enriched.false_friend_warning ?? null,
        trilingual_mnemonic: enriched.trilingual_mnemonic,
        common_mistake: enriched.common_mistake ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (!error) count++;
  }

  return { ok: true, enrichedCount: count };
}
