import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  Flame,
  History,
  Images,
  MapPinned,
  MessageSquareText,
  Newspaper,
  Puzzle,
  ScanSearch,
  Stethoscope,
  Swords,
  X,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { fetchMemoryGameContext } from "@/lib/memoryGames/queue";
import { MemoryGamesClient } from "./MemoryGamesClient";

export const dynamic = "force-dynamic";

type QuizAttemptRow = {
  id: string;
  quiz_type: string;
  prompt: string | null;
  user_answer: string | null;
  correct_answer: string | null;
  explanation: string | null;
  is_correct: boolean | null;
  created_at: string;
};

export default async function QuizzesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const [{ data: attempts }, memoryContext] = await Promise.all([
    supabase
      .from("quiz_attempts")
      .select("id, quiz_type, prompt, user_answer, correct_answer, explanation, is_correct, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    fetchMemoryGameContext(supabase, user.id),
  ]);

  if (memoryContext.errors.length) {
    console.warn("[quizzes] memory game context:", memoryContext.errors.join(" / "));
  }

  const rows = ((attempts ?? []) as QuizAttemptRow[]);
  const total = rows.length;
  const correct = rows.filter((attempt) => attempt.is_correct).length;
  const rate = total ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <GlassPanel className="p-5 md:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="section-eyebrow mb-2">複習／記憶引擎 2.0</p>
            <h1 className="text-2xl font-semibold leading-tight md:text-4xl">記憶遊戲</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              用採礦句子、角色扮演對話、每日輸入、AI 圖像記憶場景和真錯題做小型練習：快速配對漢字假名、重組句子、限時填空、分辨相近文法、修正自己錯句、把單字放回正確語境、講返今日新聞一句、用場景回想詞組，再練最自然下一句。遊戲紀錄會進入統計；錯題會浮上修復隊列。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip chip-active">{memoryContext.stats.duePrompts} 個到期提示</span>
              <span className="chip">{memoryContext.stats.grammarTagged} 個文法相關</span>
              <span className="chip">{memoryContext.stats.leechPrompts} 個弱項</span>
              <span className="chip">
                7 日準確率 {memoryContext.stats.gameAccuracy7d == null ? "—" : `${memoryContext.stats.gameAccuracy7d}%`}
              </span>
              <span className="chip">
                平均速度 {memoryContext.stats.averageResponseMs7d == null ? "—" : formatDuration(memoryContext.stats.averageResponseMs7d)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="section-eyebrow mb-1">重點對戰</p>
                <p className="text-lg font-semibold">
                  {memoryContext.bossFight?.label ?? "暫時未有重點對戰"}
                </p>
              </div>
              <Flame className="h-5 w-5 text-[var(--accent-amber)]" aria-hidden="true" />
            </div>
            {memoryContext.bossFight ? (
              <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                <BossLine label="信號" value={`${memoryContext.bossFight.count} 次失誤`} />
                <BossLine label="來源" value={memoryContext.bossFight.detail || "混合複習"} />
                <BossLine label="嚴重度" value={String(memoryContext.bossFight.severityScore)} />
                <BossLine label="遊戲壓力" value={memoryContext.stats.hardestGame7d ?? "嘗試次數不足"} />
              </div>
            ) : (
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                當複習或遊戲出現錯題，這裡會自動集中成今週重點。
              </p>
            )}
          </div>
        </div>
      </GlassPanel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-9">
        <GameStat icon={ScanSearch} label="快配卡" value={memoryContext.stats.snapCards} detail="辨認池" />
        <GameStat icon={Puzzle} label="句子卡" value={memoryContext.stats.sentencePrompts} detail="重組池" />
        <GameStat icon={Swords} label="文法標籤" value={memoryContext.stats.grammarTagged} detail="對決候選" />
        <GameStat icon={Stethoscope} label="錯句" value={memoryContext.stats.mistakeDoctorCards} detail="修復池" />
        <GameStat icon={MapPinned} label="語境卡" value={memoryContext.stats.contextMatchCards} detail="用法池" />
        <GameStat icon={Newspaper} label="新聞回想" value={memoryContext.stats.newsRecallCards} detail="輸出池" />
        <GameStat icon={Images} label="記憶宮殿" value={memoryContext.stats.memoryPalaceCards} detail="雙編碼池" />
        <GameStat icon={MessageSquareText} label="下一句" value={memoryContext.stats.conversationNextLineCards} detail="語用池" />
        <GameStat
          icon={History}
          label="遊戲速度"
          value={memoryContext.stats.averageResponseMs7d == null ? "—" : Math.round(memoryContext.stats.averageResponseMs7d / 1000)}
          detail={memoryContext.stats.averageResponseMs7d == null ? `整體小測 ${rate}%` : `遊戲準確率 ${memoryContext.stats.gameAccuracy7d ?? 0}%`}
        />
      </div>

      <MemoryGamesClient context={memoryContext} />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <h2 className="text-sm font-semibold">最近答題紀錄</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">最近 100 次小測／遊戲／每週嘗試</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <GlassPanel variant="subtle" className="p-10 text-center text-sm text-[var(--text-secondary)]">
            還沒有答題紀錄。先玩一局句子重組或限時填空。
          </GlassPanel>
        ) : (
          <GlassPanel className="p-3">
            <div className="divide-y divide-white/5">
              {rows.map((attempt) => (
                <AttemptRow key={attempt.id} attempt={attempt} />
              ))}
            </div>
          </GlassPanel>
        )}
      </section>

      {memoryContext.errors.length ? (
        <GlassPanel variant="subtle" className="p-4">
          <p className="text-sm font-medium">部分記憶脈絡未能載入</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {memoryContext.errors.slice(0, 2).join(" / ")}
          </p>
        </GlassPanel>
      ) : null}
    </div>
  );
}

function GameStat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <GlassPanel className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
        <Icon className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{detail}</p>
    </GlassPanel>
  );
}

function BossLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 last:border-b-0 last:pb-0">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="max-w-[190px] truncate text-right text-white">{value}</span>
    </div>
  );
}

function AttemptRow({ attempt }: { attempt: QuizAttemptRow }) {
  return (
    <div className="flex items-center gap-3 px-2 py-2.5">
      <div
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
          attempt.is_correct ? "bg-emerald-500/15 text-[var(--success)]" : "bg-red-500/10 text-[var(--danger)]"
        }`}
      >
        {attempt.is_correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip px-2 py-0.5 text-[10px]">{attemptLabel(attempt.quiz_type)}</span>
          <span className="font-jp text-sm text-white line-clamp-1">{attempt.prompt ?? "—"}</span>
        </div>
        <div className="mt-0.5 line-clamp-1 text-xs text-[var(--text-muted)]">
          你的答案：{attempt.user_answer ?? "—"}　·　正確：{attempt.correct_answer ?? "—"}
        </div>
      </div>
      <div className="hidden text-[10px] tabular-nums text-[var(--text-muted)] sm:block">
        {new Date(attempt.created_at).toLocaleDateString("zh-Hant-TW")}
      </div>
    </div>
  );
}

function attemptLabel(type: string) {
  if (type === "memory_kana_kanji_snap") return "假名漢字快配";
  if (type === "memory_sentence_rebuild") return "句子重組";
  if (type === "memory_cloze_attack") return "限時填空";
  if (type === "memory_grammar_duel") return "文法對決";
  if (type === "memory_context_match") return "語境配對";
  if (type === "memory_mistake_doctor") return "錯句醫生";
  if (type === "memory_news_recall") return "新聞回想";
  if (type === "memory_palace") return "記憶宮殿";
  if (type === "memory_conversation_next_line") return "對話下一句";
  if (type.startsWith("weekly_")) return "每週小測";
  if (type === "cloze") return "填空";
  if (type === "production") return "產出";
  if (type === "shadowing") return "跟讀";
  if (type === "listening") return "聽力";
  return type;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${Math.round(ms / 1000)}s`;
}
