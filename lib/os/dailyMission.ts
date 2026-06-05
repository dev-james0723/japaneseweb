import type { SupabaseClient } from "@supabase/supabase-js";
import type { CulturalContentSummary } from "@/lib/cultural/queries";
import type { CanDoGoal } from "@/lib/learning/communicationGoals";
import type { DailyMode, OsBootLog } from "@/lib/os/types";
import type { DueReviewBreakdown } from "./queries";

export type DailyMissionStepId = "review" | "input" | "mine" | "practice" | "output";
export type DailyMissionStepStatus = "done" | "ready" | "waiting";

export type DailyMissionSignals = {
  shadowingDueCount: number;
  productionDueCount: number;
  shadowingLine: string | null;
  outputMission: string | null;
  grammarHint: string | null;
  lessonHook: string | null;
  shadowingDoneToday: boolean;
  productionDoneToday: boolean;
  errors: string[];
};

export type DailyMissionStep = {
  id: DailyMissionStepId;
  label: string;
  minutes: number;
  href: string;
  action: string;
  detail: string;
  status: DailyMissionStepStatus;
};

export type DailyMissionPlan = {
  title: string;
  target: string;
  totalMinutes: number;
  completedSteps: number;
  totalSteps: number;
  statusLabel: string;
  coachLine: string;
  startHref: string;
  inputTitle: string;
  steps: DailyMissionStep[];
  evidence: {
    dueTotal: number;
    shadowingDueCount: number;
    productionDueCount: number;
    grammarHint: string | null;
    outputProof: number;
    newCardsAdded: number;
  };
};

type DailyLessonLite = {
  hook_zh: string | null;
  shadowing_line: string | null;
  output_mission: string | null;
  key_grammar: unknown;
};

const MODE_TIMES: Record<DailyMode, Record<DailyMissionStepId, number>> = {
  min: { review: 3, input: 0, mine: 0, practice: 2, output: 2 },
  standard: { review: 3, input: 5, mine: 2, practice: 4, output: 4 },
  deep: { review: 8, input: 12, mine: 5, practice: 9, output: 8 },
};

export async function fetchDailyMissionSignals(
  supabase: SupabaseClient,
  userId: string,
  today: string,
): Promise<DailyMissionSignals> {
  const [shadowingResult, productionResult, attemptsResult, lessonResult] = await Promise.all([
    supabase
      .from("sentence_review_prompts")
      .select("id, sentence_ja, key_grammar", { count: "exact" })
      .eq("user_id", userId)
      .eq("prompt_type", "shadowing")
      .lte("next_review_date", today)
      .order("is_leech", { ascending: false })
      .order("next_review_date", { ascending: true })
      .limit(1),
    supabase
      .from("sentence_review_prompts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("prompt_type", "production")
      .lte("next_review_date", today),
    supabase
      .from("quiz_attempts")
      .select("quiz_type")
      .eq("user_id", userId)
      .gte("created_at", `${today}T00:00:00Z`)
      .in("quiz_type", ["shadowing", "production"]),
    supabase
      .from("daily_lessons")
      .select("hook_zh, shadowing_line, output_mission, key_grammar")
      .eq("user_id", userId)
      .eq("lesson_date", today)
      .maybeSingle(),
  ]);

  const shadowingRows = shadowingResult.error ? [] : ((shadowingResult.data ?? []) as Array<{
    sentence_ja?: string | null;
    key_grammar?: string[] | null;
  }>);
  const lesson = lessonResult.error ? null : ((lessonResult.data ?? null) as DailyLessonLite | null);
  const attempts = attemptsResult.error ? [] : ((attemptsResult.data ?? []) as Array<{ quiz_type: string }>);
  const promptGrammar = shadowingRows[0]?.key_grammar?.find(Boolean) ?? null;
  const lessonGrammar = recordsFromJson(lesson?.key_grammar)
    .map((item) => stringField(item, ["pattern", "grammar", "ja"]))
    .find(Boolean) ?? null;

  return {
    shadowingDueCount: shadowingResult.error ? 0 : (shadowingResult.count ?? 0),
    productionDueCount: productionResult.error ? 0 : (productionResult.count ?? 0),
    shadowingLine: lesson?.shadowing_line ?? shadowingRows[0]?.sentence_ja ?? null,
    outputMission: lesson?.output_mission ?? null,
    grammarHint: lessonGrammar ?? promptGrammar,
    lessonHook: lesson?.hook_zh ?? null,
    shadowingDoneToday: attempts.some((attempt) => attempt.quiz_type === "shadowing"),
    productionDoneToday: attempts.some((attempt) => attempt.quiz_type === "production"),
    errors: [
      shadowingResult.error?.message,
      productionResult.error?.message,
      attemptsResult.error?.message,
      lessonResult.error && !isMissingTableError(lessonResult.error.message) ? lessonResult.error.message : null,
    ].filter((message): message is string => Boolean(message)),
  };
}

export function buildDailyMissionPlan({
  mode,
  due,
  dailyPick,
  todayLog,
  canDoGoal,
  signals,
  targetJlpt,
}: {
  mode: DailyMode;
  due: DueReviewBreakdown;
  dailyPick: CulturalContentSummary | null;
  todayLog: OsBootLog | null;
  canDoGoal: CanDoGoal;
  signals: DailyMissionSignals;
  targetJlpt: string;
}): DailyMissionPlan {
  const times = MODE_TIMES[mode] ?? MODE_TIMES.standard;
  const inputTitle = signals.lessonHook ?? dailyPick?.title_zh ?? dailyPick?.title_ja ?? canDoGoal.title;
  const inputHref = dailyPick ? `/cultural/article/${dailyPick.id}` : "/cultural";
  const reviewTarget = Math.max(1, Math.min(mode === "deep" ? 12 : 8, due.total || 4));
  const practiceAction = signals.shadowingLine
    ? `跟讀：${truncate(signals.shadowingLine, 26)}`
    : "跟讀 1 句可重用日文";
  const outputAction = signals.outputMission ?? canDoGoal.journalPrompt;
  const grammarTarget = signals.grammarHint ? ` + ${signals.grammarHint} grammar` : "";

  const steps = [
    makeStep({
      id: "review",
      label: "Warm Review",
      minutes: times.review,
      href: "/review",
      action: due.total > 0 ? `${reviewTarget} due cards` : "1 quick recall card",
      detail: due.total > 0
        ? `${due.vocab} 詞卡 + ${due.sentence} 句子提示，先取回記憶。`
        : "今日 due queue 清，做一張 maintenance recall 就夠。",
      done: Boolean(todayLog?.review_layer_done) || due.total === 0,
      ready: true,
    }),
    makeStep({
      id: "input",
      label: "Input",
      minutes: times.input,
      href: inputHref,
      action: dailyPick ? truncate(dailyPick.title_zh || dailyPick.title_ja, 34) : "生成今日 input",
      detail: dailyPick
        ? `${dailyPick.difficulty_jlpt ?? targetJlpt} bridge · ${dailyPick.estimated_minutes ?? 5} min source`
        : "先準備一個 AI-picked 文化/新聞 input。",
      done: Boolean(todayLog?.input_layer_done),
      ready: Boolean(dailyPick),
    }),
    makeStep({
      id: "mine",
      label: "Mine",
      minutes: times.mine,
      href: "/mining",
      action: "save 3 useful sentences",
      detail: signals.grammarHint ? `留意 ${signals.grammarHint}，把句子變成 review prompt。` : canDoGoal.miningPrompt,
      done: (todayLog?.new_cards_added ?? 0) > 0,
      ready: Boolean(dailyPick) || Boolean(signals.lessonHook),
    }),
    makeStep({
      id: "practice",
      label: "Practice",
      minutes: times.practice,
      href: "/shadowing",
      action: practiceAction,
      detail: signals.shadowingDueCount > 0
        ? `${signals.shadowingDueCount} 條 shadowing due，先做 1 條。`
        : "沒有 due shadowing，就用 Can-Do 句做 listen → repeat → cover。",
      done: signals.shadowingDoneToday || Boolean(todayLog?.talk_me_minutes),
      ready: signals.shadowingDueCount > 0 || Boolean(signals.shadowingLine) || canDoGoal.shadowingSentences.length > 0,
    }),
    makeStep({
      id: "output",
      label: "Output",
      minutes: times.output,
      href: "/quick-output",
      action: truncate(outputAction, 42),
      detail: "寫/講一句就算有 output proof，之後 AI correction 會進入弱點追蹤。",
      done: Boolean(todayLog?.output_layer_done) || (todayLog?.journal_sentences ?? 0) > 0 || signals.productionDoneToday,
      ready: true,
    }),
  ].filter((step) => mode !== "min" || step.minutes > 0);

  const completedSteps = steps.filter((step) => step.status === "done").length;
  const startHref = steps.find((step) => step.status !== "done")?.href ?? "/weekly-review";
  const totalMinutes = steps.reduce((sum, step) => sum + step.minutes, 0);

  return {
    title: `用日文講「${truncate(inputTitle, 22)}」`,
    target: `${targetJlpt} reading${grammarTarget}`,
    totalMinutes,
    completedSteps,
    totalSteps: steps.length,
    statusLabel: `${completedSteps}/${steps.length} completed`,
    coachLine: coachLine(mode, { dueCount: due.total, reviewTarget, inputTitle, grammarHint: signals.grammarHint }),
    startHref,
    inputTitle,
    steps,
    evidence: {
      dueTotal: due.total,
      shadowingDueCount: signals.shadowingDueCount,
      productionDueCount: signals.productionDueCount,
      grammarHint: signals.grammarHint,
      outputProof: todayLog?.journal_sentences ?? 0,
      newCardsAdded: todayLog?.new_cards_added ?? 0,
    },
  };
}

function makeStep({
  id,
  label,
  minutes,
  href,
  action,
  detail,
  done,
  ready,
}: {
  id: DailyMissionStepId;
  label: string;
  minutes: number;
  href: string;
  action: string;
  detail: string;
  done: boolean;
  ready: boolean;
}): DailyMissionStep {
  return {
    id,
    label,
    minutes,
    href,
    action,
    detail,
    status: done ? "done" : ready ? "ready" : "waiting",
  };
}

function coachLine(
  mode: DailyMode,
  context: {
    dueCount: number;
    reviewTarget: number;
    inputTitle: string;
    grammarHint: string | null;
  },
) {
  if (mode === "min") {
    return `你今日時間少，我幫你縮成 7 分鐘版：${context.reviewTarget} 張 review + 1 句 shadowing + 1 句 output。做完都算 keep plan。`;
  }

  const grammar = context.grammarHint ? `，順便補 ${context.grammarHint}` : "";
  if (mode === "deep") {
    return `今日可以做深一點：先清 ${context.dueCount} 張 review，再把「${truncate(context.inputTitle, 18)}」變成跟讀和輸出證據${grammar}。`;
  }

  return `今日 18 分鐘就夠：${context.reviewTarget} 張 review，讀「${truncate(context.inputTitle, 18)}」，最後寫/講 1 句${grammar}。`;
}

function recordsFromJson(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
}

function stringField(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function isMissingTableError(message: string) {
  return /does not exist|schema cache|daily_lessons/i.test(message);
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}
