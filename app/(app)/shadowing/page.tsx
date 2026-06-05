import Link from "next/link";
import { redirect } from "next/navigation";
import { Headphones, Pickaxe, Repeat2, Sparkles } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { todayDateString } from "@/lib/os/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pickCanDoGoal } from "@/lib/learning/communicationGoals";
import { fetchOsSettings } from "@/lib/os/queries";
import { ShadowingClient, type ShadowingPrompt } from "./ShadowingClient";

export const dynamic = "force-dynamic";

type PromptRow = ShadowingPrompt & {
  created_at: string;
};

const promptSelect =
  "id, prompt, answer, sentence_ja, kana_reading, translation_zh, difficulty_jlpt, key_vocab, key_grammar, status, is_leech, next_review_date, review_count, created_at";

export default async function ShadowingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const today = todayDateString();
  const [{ data: dueRows }, { data: maintenanceRows }, { count: totalCount }, { count: dueCount }, osSettings] = await Promise.all([
    supabase
      .from("sentence_review_prompts")
      .select(promptSelect)
      .eq("user_id", user.id)
      .eq("prompt_type", "shadowing")
      .lte("next_review_date", today)
      .order("is_leech", { ascending: false })
      .order("next_review_date", { ascending: true })
      .limit(12),
    supabase
      .from("sentence_review_prompts")
      .select(promptSelect)
      .eq("user_id", user.id)
      .eq("prompt_type", "shadowing")
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("sentence_review_prompts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("prompt_type", "shadowing"),
    supabase
      .from("sentence_review_prompts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("prompt_type", "shadowing")
      .lte("next_review_date", today),
    fetchOsSettings(supabase, user.id),
  ]);

  const due = ((dueRows ?? []) as PromptRow[]);
  const maintenance = ((maintenanceRows ?? []) as PromptRow[]);
  const queue = due.length ? due : maintenance;
  const fallbackGoal = pickCanDoGoal(osSettings?.current_phase ?? 1, new Date().getDate());
  const fallbackQueue: ShadowingPrompt[] = fallbackGoal.shadowingSentences.slice(0, 3).map((sentence, index) => ({
    id: `fallback-${fallbackGoal.id}-${index}`,
    prompt: sentence,
    answer: sentence,
    sentence_ja: sentence,
    kana_reading: null,
    translation_zh: fallbackGoal.canDo,
    difficulty_jlpt: null,
    key_vocab: fallbackGoal.roleplay.requiredPhrases,
    key_grammar: [],
    status: "can_do",
    is_leech: false,
    next_review_date: today,
    review_count: null,
    is_fallback: true,
    source_label: fallbackGoal.title,
  }));
  const practiceQueue = queue.length ? queue : fallbackQueue;
  const fallbackMode = queue.length === 0;
  const rescueCount = queue.filter((item) => item.is_leech || item.status === "weak").length;
  const grammarLinkedCount = queue.filter((item) => (item.key_grammar?.length ?? 0) > 0).length;

  return (
    <div className="space-y-6">
      <GlassPanel className="p-5 md:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <p className="section-eyebrow mb-2">跟讀實驗室 · {today}</p>
            <h1 className="text-2xl font-semibold leading-tight md:text-4xl">跟讀影子練習</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              用已採礦句子做聽音、節奏、遮字復述。評分會進入複習排程，同時成為口說能力證據。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip chip-active">{dueCount ?? 0} 到期</span>
              <span className="chip">{totalCount ?? 0} 總數</span>
              <span className="chip">{grammarLinkedCount} 條文法連結</span>
              {rescueCount ? <span className="chip text-[var(--danger)]">{rescueCount} 補救</span> : null}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="section-eyebrow mb-1">流程</p>
                <p className="text-lg font-semibold">聽 → 讀 → 遮字</p>
              </div>
              <Repeat2 className="h-6 w-6 text-[var(--accent-lime)]" aria-hidden="true" />
            </div>
            <div className="grid gap-3 text-sm text-[var(--text-secondary)]">
              <RoutineLine icon={Headphones} text="先按播放，不看字抓節奏。" />
              <RoutineLine icon={Sparkles} text="看字跟讀三次，修正停頓。" />
              <RoutineLine icon={Repeat2} text="遮字復述，然後評分。" />
            </div>
          </div>
        </div>
      </GlassPanel>

      {fallbackMode ? (
        <GlassPanel variant="subtle" className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold">未有到期跟讀，先做 Can-Do 起步句</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                今日用「{fallbackGoal.title}」練 {practiceQueue.length} 句；想把句子寫入 SRS，可以從採礦建立正式提示。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/mining" className="btn-primary text-sm">
                <Pickaxe className="h-4 w-4" aria-hidden="true" />
                去句子採礦
              </Link>
              <Link href="/daily-feed" className="btn-ghost text-sm">看每日輸入</Link>
            </div>
          </div>
        </GlassPanel>
      ) : null}

      <ShadowingClient prompts={practiceQueue} />
    </div>
  );
}

function RoutineLine({ icon: Icon, text }: { icon: typeof Headphones; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <Icon className="h-4 w-4 shrink-0 text-[var(--accent-lime)]" aria-hidden="true" />
      <span className="leading-5">{text}</span>
    </div>
  );
}
