"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { weekStartDate, monthStartDate } from "@/lib/os/types";
import { getOpenAI, getTextModel, modelAllowsCustomTemperature } from "@/lib/ai/openai";
import { updateOsSettingsAction } from "@/lib/actions/os";

const ReflectSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  userReflection: z.string().max(2000),
  nextWeekFocus: z.string().max(500),
});

export async function saveWeeklyReviewAction(input: z.infer<typeof ReflectSchema>) {
  const parsed = ReflectSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const wk = parsed.data.weekStart ?? weekStartDate();

  const [{ count: newVocab }, { count: newGrammar }, { data: bootLogs }, { data: talkMe }] = await Promise.all([
    supabase.from("vocabulary_items").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", `${wk}T00:00:00Z`),
    supabase.from("grammar_points").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", `${wk}T00:00:00Z`),
    supabase
      .from("os_boot_logs")
      .select("boot_date, boot_layer_done, input_layer_done, review_layer_done, output_layer_done, debug_layer_done, anki_due_completed, anki_due_total")
      .eq("user_id", user.id)
      .gte("boot_date", wk),
    supabase.from("talk_me_sessions").select("session_date").eq("user_id", user.id).gte("session_date", wk),
  ]);

  const bootDays = (bootLogs ?? []).filter((l) =>
    [l.boot_layer_done, l.input_layer_done, l.review_layer_done, l.output_layer_done, l.debug_layer_done].some(Boolean),
  ).length;
  const ankiTotals = (bootLogs ?? []).reduce(
    (a, l) => ({ c: a.c + (l.anki_due_completed ?? 0), t: a.t + (l.anki_due_total ?? 0) }),
    { c: 0, t: 0 },
  );
  const ankiRate = ankiTotals.t > 0 ? ankiTotals.c / ankiTotals.t : null;
  const talkMeDays = new Set((talkMe ?? []).map((t) => t.session_date)).size;

  const { error } = await supabase
    .from("weekly_reviews")
    .upsert(
      {
        user_id: user.id,
        week_start_date: wk,
        new_vocab_added: newVocab ?? 0,
        new_grammar_added: newGrammar ?? 0,
        anki_completion_rate: ankiRate,
        talk_me_days: talkMeDays,
        boot_days: bootDays,
        user_reflection: parsed.data.userReflection,
        next_week_focus: parsed.data.nextWeekFocus,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,week_start_date" },
    );

  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };
  revalidatePath("/weekly-review");
  return { ok: true as const };
}

const MonthlySchema = z.object({
  monthStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  biggestProgress: z.string().max(800),
  biggestBottleneck: z.string().max(800),
  nextMonthFocus: z.string().max(800),
  planningRating: z.number().int().min(1).max(10).optional(),
  talkMeNaturalness: z.number().int().min(1).max(10).optional(),
});

export async function saveMonthlyAuditAction(input: z.infer<typeof MonthlySchema>) {
  const parsed = MonthlySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const ms = parsed.data.monthStart ?? monthStartDate();
  const [{ count: cumVocab }, { data: bootLogs }, { data: journals }] = await Promise.all([
    supabase.from("vocabulary_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("os_boot_logs")
      .select("boot_date, boot_layer_done, input_layer_done, review_layer_done, output_layer_done, debug_layer_done")
      .eq("user_id", user.id)
      .gte("boot_date", ms),
    supabase.from("journal_entries").select("sentence_count").eq("user_id", user.id).gte("entry_date", ms),
  ]);

  const totalDays = new Date(new Date(ms).getFullYear(), new Date(ms).getMonth() + 1, 0).getDate();
  const bootDays = (bootLogs ?? []).filter((l) =>
    [l.boot_layer_done, l.input_layer_done, l.review_layer_done, l.output_layer_done, l.debug_layer_done].some(Boolean),
  ).length;
  const bootRate = totalDays > 0 ? bootDays / totalDays : null;
  const journalSentences = (journals ?? []).map((j) => j.sentence_count ?? 0);
  const avgSentences = journalSentences.length ? journalSentences.reduce((a, b) => a + b, 0) / journalSentences.length : null;

  const { error } = await supabase
    .from("monthly_audits")
    .upsert(
      {
        user_id: user.id,
        month_start: ms,
        cumulative_vocab_count: cumVocab ?? 0,
        os_boot_rate: bootRate,
        journal_avg_sentences: avgSentences,
        planning_rating: parsed.data.planningRating ?? null,
        talk_me_naturalness: parsed.data.talkMeNaturalness ?? null,
        biggest_progress: parsed.data.biggestProgress,
        biggest_bottleneck: parsed.data.biggestBottleneck,
        next_month_focus: parsed.data.nextMonthFocus,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,month_start" },
    );

  if (error) return { ok: false as const, error: "儲存失敗：" + error.message };
  revalidatePath("/monthly-audit");
  return { ok: true as const };
}

const QuizSchema = z.object({ weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export async function generateWeeklyQuizAction(input: z.infer<typeof QuizSchema>) {
  const parsed = QuizSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "格式錯誤。" };
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const wk = parsed.data.weekStart ?? weekStartDate();

  const [{ data: vocab }, { data: grammar }] = await Promise.all([
    supabase
      .from("vocabulary_items")
      .select("japanese, kana, meaning_zh")
      .eq("user_id", user.id)
      .gte("created_at", `${wk}T00:00:00Z`)
      .limit(20),
    supabase
      .from("grammar_points")
      .select("pattern, core_meaning")
      .eq("user_id", user.id)
      .gte("created_at", `${wk}T00:00:00Z`)
      .limit(5),
  ]);

  if (!vocab?.length && !grammar?.length) {
    return { ok: false as const, error: "本週尚未加任何新嘢，冇得出題。" };
  }

  const openai = getOpenAI();
  if (!openai) return { ok: false as const, error: "未設定 OPENAI_API_KEY。" };

  const prompt = `根據本週新加嘅單字同文法，出 10 題小測 (mix MCQ + 填充)。學生係香港人，目標 N2。

## 本週新單字
${(vocab ?? []).map((v) => `- ${v.japanese} (${v.kana ?? ""}) — ${v.meaning_zh ?? ""}`).join("\n")}

## 本週新文法
${(grammar ?? []).map((g) => `- ${g.pattern} — ${g.core_meaning ?? ""}`).join("\n") || "（無）"}

純 JSON output:
{
  "questions": [
    {"type": "mcq", "prompt_ja": "...", "prompt_zh": "...", "options": ["A","B","C","D"], "correct_index": 0, "explanation_zh": "..."},
    {"type": "cloze", "sentence_ja": "...（____）", "answer": "...", "hint_zh": "..."}
  ]
}`;

  const model = getTextModel();
  let raw = "";
  try {
    const c = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      ...(modelAllowsCustomTemperature(model) ? { temperature: 0.5 } : {}),
      messages: [
        { role: "system", content: "你只輸出嚴格的 JSON，沒有 markdown 圍欄或說明。" },
        { role: "user", content: prompt },
      ],
    });
    raw = c.choices[0]?.message?.content ?? "";
  } catch (e) {
    return { ok: false as const, error: "AI 呼叫失敗：" + (e instanceof Error ? e.message : "未知") };
  }
  let json: any;
  try { json = JSON.parse(raw); } catch { return { ok: false as const, error: "AI 輸出格式錯誤。" }; }

  await supabase
    .from("weekly_reviews")
    .upsert(
      { user_id: user.id, week_start_date: wk, ai_generated_quiz: json, updated_at: new Date().toISOString() },
      { onConflict: "user_id,week_start_date" },
    );

  revalidatePath("/weekly-review");
  return { ok: true as const, quiz: json };
}

export async function advancePhaseAction() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return { ok: false as const, error: "未登入。" };

  const { data } = await supabase
    .from("user_os_settings")
    .select("current_phase")
    .eq("user_id", user.id)
    .maybeSingle();
  const next = Math.min(6, (data?.current_phase ?? 1) + 1);
  return updateOsSettingsAction({ currentPhase: next });
}
