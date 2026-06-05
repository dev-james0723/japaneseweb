import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  MessageSquareText,
  NotebookPen,
  Repeat2,
  ShieldAlert,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { getCanDoGoalsForPhase, pickCanDoGoal } from "@/lib/learning/communicationGoals";
import { fetchConversationOsContext, type ConversationOsContext, type ConversationOsSession } from "@/lib/roleplay/conversationOs";
import { promoteRoleplayTextAction } from "@/lib/actions/roleplay";
import { SpeakerButton } from "@/components/SpeakerButton";
import { RoleplayClient, type Difficulty } from "./RoleplayClient";

export const dynamic = "force-dynamic";

export default async function RoleplayPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("user_os_settings")
    .select("target_jlpt, current_phase, phase_started_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const phase = settings?.current_phase ?? 1;
  const now = new Date();
  const startedAt = settings?.phase_started_at ? new Date(settings.phase_started_at).getTime() : now.getTime();
  const daysIntoPhase = Math.max(1, Math.floor((now.getTime() - startedAt) / (1000 * 60 * 60 * 24)) + 1);
  const goals = getCanDoGoalsForPhase(phase);
  const defaultGoal = pickCanDoGoal(phase, daysIntoPhase);
  const conversationOs = await fetchConversationOsContext(supabase, user.id);
  if (conversationOs.errors.length) {
    console.error("[roleplay] conversation OS:", conversationOs.errors.join(" / "));
  }

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <p className="section-eyebrow mb-2">對話作業系統</p>
            <h1 className="mb-2 text-2xl font-semibold md:text-3xl">任務角色扮演</h1>
            <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              選一個 Can-Do 任務，AI 扮對手同你練對話。完成後會留下證據、修正、可重用句型和下一步練習材料。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <HeroStat label="場次" value={conversationOs.stats.totalSessions} />
            <HeroStat label="證據" value={conversationOs.stats.evidenceCount} />
            <HeroStat label="分數" value={conversationOs.stats.averageScore ?? "—"} />
          </div>
        </div>
      </GlassPanel>
      <RoleplayClient
        defaultDifficulty={normalizeDifficulty(settings?.target_jlpt)}
        goals={goals}
        defaultGoalId={defaultGoal.id}
      />
      <ConversationEvidencePanel context={conversationOs} />
    </div>
  );
}

function normalizeDifficulty(value: string | null | undefined): Difficulty {
  if (value === "N5" || value === "N4" || value === "N3" || value === "N2" || value === "N1") {
    return value;
  }
  return "N4";
}

function HeroStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-[var(--accent-lime)]">{value}</div>
    </div>
  );
}

function ConversationEvidencePanel({ context }: { context: ConversationOsContext }) {
  const latest = context.sessions[0] ?? null;
  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <ConversationStat icon={CheckCircle2} label="完成" value={`${context.stats.completedSessions}/${context.stats.totalSessions}`} detail="完成任務的場次" />
        <ConversationStat icon={Sparkles} label="句型" value={context.stats.reusablePatternCount} detail="抽出的自然語塊" />
        <ConversationStat icon={ShieldAlert} label="修正" value={context.stats.correctionCount} detail="文法醫生輸入" />
      </div>

      {latest ? (
        <LatestSessionRecap session={latest} />
      ) : (
        <GlassPanel variant="subtle" className="p-8 text-center">
          <Bot className="mx-auto mb-4 h-6 w-6 text-[var(--accent-lime)]" aria-hidden="true" />
          <h2 className="text-xl font-semibold">未有角色扮演證據</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            完成一輪對話後，這裡會顯示最佳句子、文法問題、可重用句型、跟讀句和日記提示。
          </p>
        </GlassPanel>
      )}

      {context.sessions.length > 1 ? (
        <GlassPanel className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="section-eyebrow mb-1">最近場次</p>
              <h2 className="text-lg font-semibold">Can-Do 證據流</h2>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {context.sessions.slice(1, 7).map((session) => (
              <SessionHistoryCard key={session.id} session={session} />
            ))}
          </div>
        </GlassPanel>
      ) : null}

      {context.errors.length ? (
        <GlassPanel variant="subtle" className="p-4">
          <p className="text-sm font-medium">對話脈絡部分可用</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {context.errors.slice(0, 2).join(" / ")}
          </p>
        </GlassPanel>
      ) : null}
    </section>
  );
}

function LatestSessionRecap({ session }: { session: ConversationOsSession }) {
  return (
    <GlassPanel className="p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="section-eyebrow mb-2">角色扮演後吸收</p>
          <h2 className="text-xl font-semibold">{session.scenario}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {session.personaLabel} · {session.partnerRole} · {session.difficulty} · {formatDate(session.startedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip chip-active">{session.score ?? "—"} 分</span>
          <span className={`chip ${session.taskComplete ? "text-[var(--accent-lime)]" : "text-[var(--accent-amber)]"}`}>
            {session.taskComplete ? "任務完成" : "進行中"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          <EvidenceBlock
            icon={Target}
            title="你最好的一句"
            text={session.bestSentence ?? "未有證據句。完成任務時，系統會保存你成功講出的句子。"}
            promote={session.bestSentence ? { sessionId: session.id, text: session.bestSentence, kind: "best_sentence", label: "最佳句子" } : null}
          />
          <EvidenceBlock
            icon={ShieldAlert}
            title="最大文法問題"
            text={session.biggestGrammarIssue ?? "未有修正。下一次故意講完整句，讓 AI 幫你定位語法弱點。"}
          />
          <PatternStrip session={session} />
        </div>

        <div className="space-y-3">
          <NextAsset
            icon={Repeat2}
            title="1 句跟讀"
            text={session.shadowSentence ?? session.bestSentence ?? "完成一輪角色扮演後，這裡會出現跟讀句。"}
            kind="shadow_sentence"
            sessionId={session.id}
          />
          <NextAsset
            icon={BookOpenCheck}
            title="明天複習 1 句"
            text={session.reviewSentence ?? session.bestSentence ?? "文法醫生會把修正變成修復提示。"}
            kind="review_sentence"
            sessionId={session.id}
          />
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <NotebookPen className="h-4 w-4 text-[var(--accent-sakura)]" aria-hidden="true" />
              1 個日記提示
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{session.journalPrompt}</p>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

function ConversationStat({
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

function EvidenceBlock({
  icon: Icon,
  title,
  text,
  promote,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  promote?: { sessionId: string; text: string; kind: "best_sentence" | "pattern"; label: string } | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
          {title}
        </div>
        {/[ぁ-んァ-ン一-龯]/u.test(text) ? <SpeakerButton text={text} size="sm" /> : null}
      </div>
      <p className="font-jp text-sm leading-7 text-[var(--text-secondary)]">{text}</p>
      {promote ? <PromoteButton {...promote} /> : null}
    </div>
  );
}

function PatternStrip({ session }: { session: ConversationOsSession }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-[var(--accent-sakura)]" aria-hidden="true" />
        3 個可重用自然句型
      </div>
      {session.reusablePatterns.length ? (
        <div className="flex flex-wrap gap-2">
          {session.reusablePatterns.slice(0, 3).map((pattern) => (
            <div key={pattern} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
              <span className="font-jp text-xs">{pattern}</span>
              <PromoteButton sessionId={session.id} text={pattern} kind="pattern" label="句型" compact />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">下一輪角色扮演會抽出可重用句型。</p>
      )}
    </div>
  );
}

function NextAsset({
  icon: Icon,
  title,
  text,
  kind,
  sessionId,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  kind: "shadow_sentence" | "review_sentence";
  sessionId: string;
}) {
  const canPromote = /[ぁ-んァ-ン一-龯]/u.test(text);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
          {title}
        </div>
        {canPromote ? <SpeakerButton text={text} size="sm" /> : null}
      </div>
      <p className="font-jp text-sm leading-6 text-[var(--text-secondary)]">{text}</p>
      {canPromote ? <PromoteButton sessionId={sessionId} text={text} kind={kind} label={title} /> : null}
    </div>
  );
}

function PromoteButton({
  sessionId,
  text,
  kind,
  label,
  compact = false,
}: {
  sessionId: string;
  text: string;
  kind: "best_sentence" | "shadow_sentence" | "review_sentence" | "pattern";
  label: string;
  compact?: boolean;
}) {
  return (
    <form action={promoteRoleplayTextAction} className={compact ? "inline-flex" : "mt-3"}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="text" value={text} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="label" value={label} />
      <button type="submit" className={compact ? "text-[10px] text-[var(--accent-lime)] hover:text-white" : "btn-ghost inline-flex text-xs"}>
        {compact ? "+複習" : "儲存到複習"}
        {!compact ? <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      </button>
    </form>
  );
}

function SessionHistoryCard({ session }: { session: ConversationOsSession }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            {session.taskComplete ? (
              <CheckCircle2 className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            ) : (
              <XCircle className="h-4 w-4 text-[var(--accent-amber)]" aria-hidden="true" />
            )}
            <h3 className="truncate text-sm font-semibold">{session.personaLabel}</h3>
          </div>
          <p className="line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
            {session.partnerRole} · {session.scenario}
          </p>
        </div>
        <span className="chip shrink-0 px-2 py-0.5 text-[10px]">{session.score ?? "—"}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <MiniMetric label="輪次" value={session.turnCount} />
        <MiniMetric label="修正" value={session.correctionCount} />
        <MiniMetric label="證據" value={session.evidenceCount} />
      </div>
      {session.bestSentence ? (
        <div className="mt-3 flex items-start gap-2 border-t border-white/10 pt-3">
          <MessageSquareText className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--accent-sakura)]" aria-hidden="true" />
          <p className="line-clamp-2 font-jp text-xs leading-5 text-[var(--text-secondary)]">{session.bestSentence}</p>
        </div>
      ) : null}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-2">
      <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
      <div className="mt-0.5 font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("zh-Hant-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
