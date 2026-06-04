export type DailyMode = "min" | "standard" | "deep";
export type BootLayer = "boot" | "input" | "review" | "output" | "debug";

export const PHASE_INFO: Record<
  number,
  { name: string; months: string; goal: string; weeklyVocabQuota: number; weeklyGrammarQuota: number }
> = {
  1: { name: "基礎安裝", months: "第 1–2 月", goal: "假名 95% 正確率 + 30 日連續開機", weeklyVocabQuota: 20, weeklyGrammarQuota: 2 },
  2: { name: "基礎開機", months: "第 3–6 月", goal: "500+ 詞彙 + 可以講今日行程", weeklyVocabQuota: 20, weeklyGrammarQuota: 2 },
  3: { name: "日常運作", months: "第 7–12 月", goal: "1000 詞彙 + 日記 5 句/日 × 14 連續日", weeklyVocabQuota: 20, weeklyGrammarQuota: 2 },
  4: { name: "沉浸擴展", months: "第 13–18 月", goal: "1500 詞彙 + 採礦 80+ + N3 模擬 70%", weeklyVocabQuota: 25, weeklyGrammarQuota: 3 },
  5: { name: "輸出啟動", months: "第 19–22 月", goal: "日記 8 句/日 × 30 日 + 5 個語言島", weeklyVocabQuota: 25, weeklyGrammarQuota: 3 },
  6: { name: "精煉階段", months: "第 23–24 月", goal: "N2 模擬 60% + 100 小時 Talk Me", weeklyVocabQuota: 25, weeklyGrammarQuota: 3 },
};

export const MODE_INFO: Record<DailyMode, { label: string; minutes: number; description: string }> = {
  min: { label: "精簡", minutes: 15, description: "15 分鐘最低保底——千祈唔好斷。" },
  standard: { label: "標準", minutes: 45, description: "45 分鐘標準開機——平衡輸入 / 複習 / 輸出。" },
  deep: { label: "深度", minutes: 90, description: "90 分鐘深度學習——加大沉浸 + 日記。" },
};

export const LAYER_INFO: Record<BootLayer, { label: string; emoji: string; description: string }> = {
  boot: { label: "開機", emoji: "⚡", description: "朝早 30 秒用日文講今日日期、天氣、心情。" },
  input: { label: "輸入", emoji: "📥", description: "可理解輸入：NHK Easy、podcast、Talk Me 等。" },
  review: { label: "複習", emoji: "🔁", description: "Anki 到期卡 + 上週採礦填空卡。" },
  output: { label: "輸出", emoji: "📝", description: "日記、自言自語、角色扮演——一定要產出。" },
  debug: { label: "除錯", emoji: "🔧", description: "整理學習缺口、難記卡、文法錯誤回顧。" },
};

export const LAYER_ORDER: BootLayer[] = ["boot", "input", "review", "output", "debug"];

export type OsBootLog = {
  id: string;
  user_id: string;
  boot_date: string;
  mode: DailyMode;
  boot_layer_done: boolean;
  input_layer_done: boolean;
  review_layer_done: boolean;
  output_layer_done: boolean;
  debug_layer_done: boolean;
  talk_me_minutes: number;
  anki_due_completed: number;
  anki_due_total: number;
  new_cards_added: number;
  journal_sentences: number;
  total_minutes: number;
};

export type UserOsSettings = {
  user_id: string;
  current_phase: number;
  phase_started_at: string;
  target_jlpt: string;
  target_date: string | null;
  weekly_new_vocab_quota: number;
  weekly_new_grammar_quota: number;
  daily_mode: DailyMode;
  trilingual_leverage_enabled: boolean;
  talk_me_integration_enabled: boolean;
};

export function layerCompletion(log: OsBootLog | null): number {
  if (!log) return 0;
  const done = [
    log.boot_layer_done,
    log.input_layer_done,
    log.review_layer_done,
    log.output_layer_done,
    log.debug_layer_done,
  ].filter(Boolean).length;
  return Math.round((done / 5) * 100);
}

function resolveDefaultStudyTimeZone(): string {
  const env =
    typeof process === "undefined"
      ? {}
      : (process.env as Record<string, string | undefined>);
  return (
    env.STUDY_TIME_ZONE ||
    env.NEXT_PUBLIC_STUDY_TIME_ZONE ||
    env.APP_TIME_ZONE ||
    env.TZ ||
    "Asia/Hong_Kong"
  );
}

function datePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return null;
  return { year: Number(year), month: Number(month), day: Number(day) };
}

export function dateStringInTimeZone(
  date: Date = new Date(),
  timeZone = resolveDefaultStudyTimeZone(),
): string {
  const parts = datePartsInTimeZone(date, timeZone);
  if (!parts) return date.toISOString().slice(0, 10);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function todayDateString(): string {
  return dateStringInTimeZone();
}

export function weekStartDate(d: Date = new Date(), timeZone = resolveDefaultStudyTimeZone()): string {
  const parts = datePartsInTimeZone(d, timeZone);
  if (!parts) return d.toISOString().slice(0, 10);
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const day = date.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // ISO week starts Monday
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

export function monthStartDate(d: Date = new Date(), timeZone = resolveDefaultStudyTimeZone()): string {
  const parts = datePartsInTimeZone(d, timeZone);
  if (!parts) return d.toISOString().slice(0, 10);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-01`;
}
