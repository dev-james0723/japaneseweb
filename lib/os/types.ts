export type DailyMode = "min" | "standard" | "deep";
export type BootLayer = "boot" | "input" | "review" | "output" | "debug";

export const PHASE_INFO: Record<
  number,
  { name: string; months: string; goal: string; weeklyVocabQuota: number; weeklyGrammarQuota: number }
> = {
  1: { name: "Installation", months: "M1–M2", goal: "假名 95% accuracy + 30 日連續 boot", weeklyVocabQuota: 20, weeklyGrammarQuota: 2 },
  2: { name: "Basic Boot", months: "M3–M6", goal: "500+ vocab + 可以講今日 schedule", weeklyVocabQuota: 20, weeklyGrammarQuota: 2 },
  3: { name: "Daily Operation", months: "M7–M12", goal: "1000 vocab + journal 5 句/日 × 14 連續日", weeklyVocabQuota: 20, weeklyGrammarQuota: 2 },
  4: { name: "Immersion Expansion", months: "M13–M18", goal: "1500 vocab + mining 80+ + N3 mock 70%", weeklyVocabQuota: 25, weeklyGrammarQuota: 3 },
  5: { name: "Output Activation", months: "M19–M22", goal: "Journal 8 句/日 × 30 日 + 5 language islands", weeklyVocabQuota: 25, weeklyGrammarQuota: 3 },
  6: { name: "Refinement", months: "M23–M24", goal: "N2 mock 60% + 100 小時 Talk Me", weeklyVocabQuota: 25, weeklyGrammarQuota: 3 },
};

export const MODE_INFO: Record<DailyMode, { label: string; minutes: number; description: string }> = {
  min: { label: "Min", minutes: 15, description: "15 分鐘最低保底——千祈唔好斷。" },
  standard: { label: "Standard", minutes: 45, description: "45 分鐘標準 boot——平衡 input / review / output。" },
  deep: { label: "Deep", minutes: 90, description: "90 分鐘深度學習——加大 immersion + journaling。" },
};

export const LAYER_INFO: Record<BootLayer, { label: string; emoji: string; description: string }> = {
  boot: { label: "Boot", emoji: "⚡", description: "朝早 30 秒用日文講今日日期、天氣、心情。" },
  input: { label: "Input", emoji: "📥", description: "Comprehensible input：NHK Easy、podcast、Talk Me 等。" },
  review: { label: "Review", emoji: "🔁", description: "Anki due cards 同上週 mining cloze 卡。" },
  output: { label: "Output", emoji: "📝", description: "Journal、self-talk、roleplay——一定要產出。" },
  debug: { label: "Debug", emoji: "🔧", description: "Notice gaps、leech cards、文法錯誤回顧。" },
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

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function weekStartDate(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // ISO week starts Monday
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

export function monthStartDate(d: Date = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
