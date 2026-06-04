import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { FuriganaText } from "@/components/FuriganaText";
import { JapaneseSentence } from "@/components/JapaneseSentence";
import { SpeakerButton } from "@/components/SpeakerButton";
import { todayDateString } from "@/lib/os/types";
import { JournalEditor } from "./JournalEditor";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const [{ data: settings }, { data: todayEntries }, { data: recent }] = await Promise.all([
    supabase
      .from("user_os_settings")
      .select("current_phase")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("journal_entries")
      .select("id, content_ja, sentence_count, ai_natural_version, notice_gap_learnings, ai_corrections, created_at")
      .eq("user_id", user.id)
      .eq("entry_date", todayDateString())
      .order("created_at", { ascending: false }),
    supabase
      .from("journal_entries")
      .select("id, entry_date, sentence_count, content_ja")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false })
      .limit(10),
  ]);

  const phase = settings?.current_phase ?? 1;
  const target = phaseSentenceTarget(phase);
  const todayCount = (todayEntries ?? []).reduce((s, e) => s + (e.sentence_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <div className="flex items-end justify-between flex-wrap gap-2 mb-4">
          <div>
            <h1 className="text-xl font-semibold">📓 日記</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              階段 {phase} 目標：每日 {target} 句
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">今日</div>
            <div className="text-2xl font-semibold tabular-nums text-[var(--accent-lime)]">
              {todayCount} / {target}
            </div>
          </div>
        </div>
        <JournalEditor />
      </GlassPanel>

      {todayEntries && todayEntries.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold px-1">今日紀錄</h2>
          {todayEntries.map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </section>
      )}

      {recent && recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold px-1">最近紀錄</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {recent.map((e) => (
              <RecentEntryCard key={e.id} entry={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function phaseSentenceTarget(phase: number): number {
  const map: Record<number, number> = { 1: 1, 2: 3, 3: 5, 4: 7, 5: 8, 6: 10 };
  return map[phase] ?? 5;
}

type EntryRow = {
  id: string;
  content_ja: string;
  ai_natural_version: string | null;
  notice_gap_learnings: string[] | null;
  ai_corrections: any;
  created_at: string;
};

async function EntryCard({ entry }: { entry: EntryRow }) {
  const corrections = entry.ai_corrections?.corrections ?? [];
  const praise = entry.ai_corrections?.praise;
  return (
    <GlassPanel variant="subtle" className="p-4">
      <div className="text-[10px] text-[var(--text-muted)] mb-2">
        {new Date(entry.created_at).toLocaleTimeString("zh-Hant-TW", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <JapaneseSentence text={entry.content_ja} preWrap className="mb-3" />
      {entry.ai_natural_version && (
        <div className="mt-3 p-3 rounded-lg bg-[var(--accent-lime-bg)]/30 border border-[var(--accent-lime)]/20">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent-lime)] mb-1">✨ 自然說法</div>
          <JapaneseSentence text={entry.ai_natural_version} />
        </div>
      )}
      {corrections.length > 0 && (
        <ul className="mt-3 space-y-2">
          {corrections.map((c: any, i: number) => (
            <li key={i} className="text-xs">
              <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                <div className="flex items-start gap-1.5">
                  <FuriganaText text={c.original} size="xs" inline className="text-red-400 line-through" />
                  <SpeakerButton text={c.original} size="sm" className="!w-6 !h-6 shrink-0" />
                </div>
                <span className="text-[var(--text-muted)]">→</span>
                <div className="flex items-start gap-1.5">
                  <FuriganaText text={c.corrected} size="xs" inline className="text-[var(--accent-lime)]" />
                  <SpeakerButton text={c.corrected} size="sm" className="!w-6 !h-6 shrink-0" />
                </div>
              </div>
              <div className="text-[var(--text-muted)] mt-0.5">[{c.category}] {c.explanation_zh}</div>
            </li>
          ))}
        </ul>
      )}
      {entry.notice_gap_learnings && entry.notice_gap_learnings.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">📌 學習缺口</div>
          <ul className="text-xs text-[var(--text-secondary)] list-disc list-inside space-y-0.5">
            {entry.notice_gap_learnings.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}
      {praise && (
        <div className="mt-3 text-xs italic text-[var(--accent-sakura)]">
          <JapaneseSentence text={`💮 ${praise}`} size="xs" speakerSize="sm" />
        </div>
      )}
    </GlassPanel>
  );
}

type RecentRow = {
  id: string;
  entry_date: string;
  sentence_count: number | null;
  content_ja: string;
};

async function RecentEntryCard({ entry }: { entry: RecentRow }) {
  return (
    <GlassPanel variant="subtle" className="p-3">
      <div className="text-[10px] text-[var(--text-muted)]">
        {entry.entry_date} · {entry.sentence_count ?? 0} 句
      </div>
      <JapaneseSentence
        text={entry.content_ja}
        size="xs"
        speakerSize="sm"
        className="mt-1"
        textClassName="line-clamp-3 text-[var(--text-secondary)]"
      />
    </GlassPanel>
  );
}
