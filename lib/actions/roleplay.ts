"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildSentenceReviewPrompts } from "@/lib/sentenceReview";
import { recordGrammarExposures } from "@/lib/learning/grammarMastery";

const PromoteSchema = z.object({
  sessionId: z.string().uuid(),
  text: z.string().min(2).max(1000),
  label: z.string().max(120).optional().nullable(),
  kind: z.enum(["best_sentence", "shadow_sentence", "review_sentence", "pattern"]),
});

export async function promoteRoleplayTextAction(formData: FormData) {
  const parsed = PromoteSchema.safeParse({
    sessionId: formData.get("sessionId"),
    text: formData.get("text"),
    label: formData.get("label"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) return;

  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return;

  const { data: roleplaySession, error: sessionError } = await supabase
    .from("roleplay_sessions")
    .select("id, scenario, difficulty")
    .eq("user_id", user.id)
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (sessionError) {
    console.error("[roleplay promote] session:", sessionError.message);
    return;
  }
  if (!roleplaySession) return;

  const difficulty = normalizeDifficulty(String(roleplaySession.difficulty ?? ""));
  const { data: savedSentence, error: sentenceError } = await supabase
    .from("mined_sentences")
    .insert({
      user_id: user.id,
      source_type: "other",
      source_title: `Roleplay evidence · ${parsed.data.label || parsed.data.kind}`,
      source_url: null,
      sentence_ja: parsed.data.text,
      kana_reading: null,
      translation_zh: `Roleplay「${roleplaySession.scenario}」入面可重用的輸出句。`,
      difficulty_jlpt: difficulty,
      key_vocab: [],
      key_grammar: parsed.data.kind === "pattern" ? [parsed.data.text] : [],
      cloze_target: clozeTarget(parsed.data.text),
    })
    .select("id, user_id, sentence_ja, kana_reading, translation_zh, difficulty_jlpt, key_vocab, key_grammar, cloze_target")
    .maybeSingle();

  if (sentenceError) {
    console.error("[roleplay promote] mined sentence:", sentenceError.message);
    return;
  }

  const prompts = savedSentence ? buildSentenceReviewPrompts(savedSentence) : [];
  if (prompts.length) {
    const { error: promptError } = await supabase.from("sentence_review_prompts").insert(prompts);
    if (promptError) {
      console.error("[roleplay promote] review prompts:", promptError.message);
      return;
    }
  }

  if (parsed.data.kind === "pattern") {
    const grammarExposure = await recordGrammarExposures({
      supabase,
      userId: user.id,
      exposures: [{
        pattern: parsed.data.text,
        jlptLevel: difficulty,
        exposureType: "production",
        result: "produced",
        sourceSurface: "roleplay_promote_pattern",
        sourceReference: parsed.data.sessionId,
        roleplaySessionId: parsed.data.sessionId,
        minedSentenceId: savedSentence?.id ?? null,
        evidenceText: parsed.data.text,
        metadata: {
          scenario: roleplaySession.scenario,
          label: parsed.data.label ?? null,
        },
      }],
    });
    if (grammarExposure.errors.length) {
      console.error("[roleplay promote] grammar exposure:", grammarExposure.errors.join(" / "));
    }

    await supabase
      .from("roleplay_reusable_patterns")
      .update({ saved_to_review: true })
      .eq("user_id", user.id)
      .eq("session_id", parsed.data.sessionId)
      .eq("pattern", parsed.data.text);
  } else {
    await supabase
      .from("roleplay_evidence")
      .update({ saved_to_review: true })
      .eq("user_id", user.id)
      .eq("session_id", parsed.data.sessionId)
      .eq("proof_text", parsed.data.text);
  }

  revalidatePath("/roleplay");
  revalidatePath("/review");
  revalidatePath("/shadowing");
  revalidatePath("/library");
  revalidatePath("/grammar-map");
}

function normalizeDifficulty(value: string): "N5" | "N4" | "N3" | "N2" | "N1" | null {
  return value === "N5" || value === "N4" || value === "N3" || value === "N2" || value === "N1"
    ? value
    : null;
}

function clozeTarget(text: string) {
  const match = text.match(/[一-龯ぁ-んァ-ン]{2,8}/u);
  return match?.[0] ?? null;
}
