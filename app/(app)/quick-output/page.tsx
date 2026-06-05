import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  MessageCircle,
  Network,
  NotebookPen,
  PenLine,
  Pickaxe,
  Repeat2,
  ShieldAlert,
  Sparkles,
  Target,
  Theater,
  Volume2,
} from "lucide-react";
import { redirect } from "next/navigation";
import { GlassPanel } from "@/components/GlassPanel";
import { JapaneseSentence } from "@/components/JapaneseSentence";
import { fetchQuickOutputContext, type QuickOutputConnection } from "@/lib/output/quickOutput";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SelfTalkQuickLog } from "../self-talk/SelfTalkQuickLog";

export const dynamic = "force-dynamic";

const OUTPUT_ACTIONS: Array<{
  href: string;
  icon: LucideIcon;
  title: string;
  label: string;
  detail: string;
}> = [
  {
    href: "/journal",
    icon: NotebookPen,
    title: "書寫",
    label: "寫成日記",
    detail: "一句完整日文，留低修正證據。",
  },
  {
    href: "/roleplay",
    icon: Theater,
    title: "對話",
    label: "開一場對話",
    detail: "用今日提示做任務，保存可重用句型。",
  },
  {
    href: "/shadowing",
    icon: Volume2,
    title: "跟讀",
    label: "先跟讀",
    detail: "把句子讀順，再做輸出證據。",
  },
  {
    href: "/mining",
    icon: Pickaxe,
    title: "採礦",
    label: "補一句材料",
    detail: "抽一條可重用句，變成複習提示。",
  },
];

export default async function QuickOutputPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) console.error("[quick-output] auth:", authError.message);
  if (!user) redirect("/login");

  const context = await fetchQuickOutputContext(supabase, user.id);
  if (context.errors.length) {
    console.error("[quick-output] partial context:", context.errors.join(" / "));
  }

  const selfTalkDone = context.selfTalk.todayCount > 0;
  const topConnection = context.connections[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <GlassPanel className="p-5 md:p-7">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="chip chip-active">快速輸出 · {context.date}</span>
            <span className="chip">第 {context.phase} 階段</span>
            <span className="chip">{context.targetJlpt}</span>
            <span className="chip">{context.promptSource}</span>
            {context.outputPrompt ? (
              <span className={context.outputPrompt.status === "completed" ? "chip chip-active" : "chip"}>
                輸出：{outputStatusLabel(context.outputPrompt.status)}
              </span>
            ) : null}
          </div>
          <div className="mt-5 max-w-3xl">
            <p className="section-eyebrow mb-2">輸出層</p>
            <h1 className="text-2xl font-semibold leading-tight md:text-4xl">今日一句輸出</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {context.communicationPhase.dailyAssignment.standard}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="#prompt" className="btn-primary inline-flex items-center gap-2 text-sm">
              開始提示
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/repair" className="btn-ghost inline-flex items-center gap-2 text-sm">
              先修復
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-eyebrow mb-2">今日證據</p>
              <div className="text-3xl font-semibold tabular-nums text-[var(--accent-lime)]">
                {context.selfTalk.todayCount}
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                自我對話時刻
              </p>
            </div>
            <div className={`grid h-11 w-11 place-items-center rounded-xl border ${selfTalkDone ? "border-[var(--accent-lime)]/40 bg-[var(--accent-lime-bg)]/30 text-[var(--accent-lime)]" : "border-white/10 bg-white/[0.035] text-[var(--text-muted)]"}`}>
              {selfTalkDone ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <MessageCircle className="h-5 w-5" aria-hidden="true" />}
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <SignalRow label="最高級別" value={context.selfTalk.todayMaxStage ? `第 ${context.selfTalk.todayMaxStage} 級` : "未記錄"} />
            <SignalRow label="七日總量" value={`${context.selfTalk.sevenDayCount} 次`} />
            <SignalRow label="Can-Do" value={context.canDoGoal.title} />
            <SignalRow
              label="輸出提示"
              value={context.outputPrompt
                ? context.outputPrompt.status === "completed"
                  ? "完成"
                  : "待輸出"
                : "備用"}
            />
          </div>
        </GlassPanel>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <GlassPanel id="prompt" className="p-5 md:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="section-eyebrow mb-2">一句任務</p>
              <h2 className="text-xl font-semibold">提示</h2>
            </div>
            <PenLine className="h-5 w-5 shrink-0 text-[var(--accent-lime)]" aria-hidden="true" />
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <p className="text-lg font-semibold leading-8 text-white md:text-xl">
              {context.primaryPrompt}
            </p>
            {context.inputHook ? (
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{context.inputHook}</p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <PromptSignal icon={Target} label="證據" value={context.canDoGoal.proof} />
            <PromptSignal icon={Brain} label="焦點" value={context.grammarFocus ?? context.canDoGoal.title} />
            <PromptSignal icon={Repeat2} label="跟讀" value={context.shadowingLine ?? "Can-Do 句子"} />
          </div>
          {context.outputPrompt?.proofReference ? (
            <div className="mt-4 rounded-lg border border-[var(--accent-lime)]/20 bg-[var(--accent-lime-bg)]/20 p-3 text-xs leading-5 text-[var(--text-secondary)]">
              今日輸出已有證據：{context.outputPrompt.proofReference}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/journal" className="btn-primary inline-flex items-center gap-2 text-sm">
              立即書寫
              <NotebookPen className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/roleplay" className="btn-ghost inline-flex items-center gap-2 text-sm">
              用於角色扮演
              <Theater className="h-4 w-4" aria-hidden="true" />
            </Link>
            {context.dailyPick ? (
              <Link href={`/cultural/article/${context.dailyPick.id}`} className="btn-ghost inline-flex items-center gap-2 text-sm">
                打開輸入材料
                <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 md:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="section-eyebrow mb-2">內在日文習慣</p>
              <h2 className="text-xl font-semibold">快速自我對話紀錄</h2>
            </div>
            <MessageCircle className="h-5 w-5 shrink-0 text-[var(--accent-sakura)]" aria-hidden="true" />
          </div>
          <SelfTalkQuickLog />
          {context.selfTalk.lastPhrase ? (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="mb-2 text-xs text-[var(--text-muted)]">上一句 · {context.selfTalk.lastContext ?? "其他"}</p>
              <JapaneseSentence text={context.selfTalk.lastPhrase} size="sm" />
            </div>
          ) : null}
        </GlassPanel>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {OUTPUT_ACTIONS.map((action) => (
          <OutputActionCard key={action.href} {...action} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <GlassPanel className="p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="section-eyebrow mb-2">詞語關係圖</p>
              <h2 className="text-xl font-semibold">連結提示</h2>
            </div>
            <Link href="/connections" className="text-xs text-[var(--text-muted)] hover:text-white">
              打開地圖
            </Link>
          </div>
          {context.connections.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {context.connections.slice(0, 4).map((connection) => (
                <ConnectionPrompt key={connection.id} connection={connection} />
              ))}
            </div>
          ) : (
            <EmptyPanel
              icon={Network}
              title="尚未有詞語連結"
              detail="先由詞庫生成詞語關係，再把成對詞語用於每日輸出。"
              href="/decks"
              label="打開詞庫"
            />
          )}
        </GlassPanel>

        <GlassPanel className="p-5 md:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="section-eyebrow mb-2">弱點提示</p>
              <h2 className="text-xl font-semibold">修復角度</h2>
            </div>
            <ShieldAlert className="h-5 w-5 shrink-0 text-[var(--danger)]" aria-hidden="true" />
          </div>
          {context.weakness ? (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="chip chip-active">{context.weakness.label}</span>
                  <span className="chip">{context.weakness.severity}</span>
                  <span className="chip">{context.weakness.source}</span>
                </div>
                {context.weakness.prompt ? (
                  <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{context.weakness.prompt}</p>
                ) : null}
                {context.weakness.correctAnswer ? (
                  <div className="mt-4 rounded-lg border border-[var(--accent-lime)]/20 bg-[var(--accent-lime-bg)]/20 p-3">
                    <JapaneseSentence text={context.weakness.correctAnswer} size="sm" />
                  </div>
                ) : null}
              </div>
              <Link href="/repair" className="btn-primary inline-flex items-center gap-2 text-sm">
                修復隊列
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : topConnection ? (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                用「{topConnection.source}」同「{topConnection.target}」寫一句，建立今日輸出證據。
              </p>
              <Link href="/journal" className="btn-primary inline-flex items-center gap-2 text-sm">
                用這組詞書寫
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <EmptyPanel
              icon={Sparkles}
              title="暫時乾淨"
              detail="最近未有弱點訊號。用 Can-Do 提示作今日證據。"
              href="/journal"
              label="書寫輸出"
            />
          )}
        </GlassPanel>
      </section>

      {context.errors.length ? <SetupNotice errors={context.errors} /> : null}
    </div>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 last:border-b-0 last:pb-0">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="max-w-[180px] truncate text-right font-medium text-white">{value}</span>
    </div>
  );
}

function PromptSignal({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="min-w-0 border-l border-white/10 pl-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Icon className="h-3.5 w-3.5 text-[var(--accent-lime)]" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <p className="line-clamp-3 text-sm leading-5 text-[var(--text-secondary)]">{value}</p>
    </div>
  );
}

function OutputActionCard({
  href,
  icon: Icon,
  title,
  label,
  detail,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  label: string;
  detail: string;
}) {
  return (
    <Link href={href} className="group block">
      <GlassPanel className="h-full p-4 transition-colors group-hover:border-[var(--accent-lime)]/40 group-hover:bg-white/[0.045]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-[var(--accent-lime)]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="section-eyebrow">{title}</span>
        </div>
        <h3 className="text-base font-semibold">{label}</h3>
        <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{detail}</p>
      </GlassPanel>
    </Link>
  );
}

function ConnectionPrompt({ connection }: { connection: QuickOutputConnection }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-jp text-base">{connection.source}</span>
        <span className="text-xs text-[var(--text-muted)]">↔</span>
        <span className="font-jp text-base">{connection.target}</span>
        <span className="chip px-2 py-0.5 text-[10px]">{connection.relationshipType}</span>
      </div>
      {connection.explanation ? (
        <p className="mb-3 text-sm leading-5 text-[var(--text-secondary)]">{connection.explanation}</p>
      ) : null}
      {connection.exampleSentence ? (
        <div className="border-t border-white/10 pt-3">
          <JapaneseSentence text={connection.exampleSentence} size="xs" speakerSize="sm" />
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          用兩個詞寫一句自己的日文。
        </p>
      )}
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  detail,
  href,
  label,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  href: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
      <Icon className="mb-4 h-5 w-5 text-[var(--accent-lime)]" aria-hidden="true" />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
      <Link href={href} className="btn-ghost mt-4 inline-flex text-sm">
        {label}
      </Link>
    </div>
  );
}

function SetupNotice({ errors }: { errors: string[] }) {
  return (
    <GlassPanel variant="subtle" className="p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-amber)]" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">輸出脈絡部分可用</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {errors.slice(0, 2).join(" / ")}
          </p>
        </div>
      </div>
    </GlassPanel>
  );
}

function outputStatusLabel(status: string) {
  if (status === "completed") return "完成";
  if (status === "active") return "進行中";
  if (status === "pending") return "待輸出";
  if (status === "skipped") return "已略過";
  return status;
}
