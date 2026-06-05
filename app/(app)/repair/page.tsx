import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Dumbbell,
  Flame,
  Gauge,
  Map as MapIcon,
  PenLine,
  Repeat2,
  ShieldAlert,
  Sparkles,
  Target,
  Volume2,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import {
  fetchRepairQueue,
  type RepairCluster,
  type RepairEvidence,
  type RepairSentenceItem,
  type RepairVocabItem,
  type RepairWeaknessEvent,
} from "@/lib/repair/queue";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RepairPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) console.error("[repair] auth:", authError.message);
  if (!user) redirect("/login");

  const queue = await fetchRepairQueue(supabase, user.id);
  const topCluster = queue.clusters[0] ?? null;

  return (
    <div className="space-y-6">
      <GlassPanel className="overflow-hidden p-0">
        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_280px] md:p-7">
          <div className="min-w-0">
            <p className="section-eyebrow mb-2">弱項修復通道</p>
            <h1 className="text-2xl font-semibold leading-tight md:text-4xl">修復隊列</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              弱項唔再只係排早啲再問。先診斷錯誤來源，再用對比、跟讀同輸出證據修復記憶路徑。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip chip-active">{queue.stats.total} 個待修項目</span>
              <span className="chip">{queue.stats.leech} 個弱項</span>
              <span className="chip">{queue.stats.grammarLinked} 個文法相關</span>
              <span className="chip">{queue.stats.listeningOrShadowing} 個聽力／跟讀</span>
              <span className="chip">{queue.stats.repairCompletions} 次已完成修復</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <ShieldAlert className="h-4 w-4 text-[var(--accent-amber)]" aria-hidden="true" />
              最高風險模式
            </div>
            {topCluster ? (
              <>
                <div className="font-jp text-2xl font-semibold text-[var(--accent-lime)]">{topCluster.label}</div>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                  {topCluster.count} 個信號 · {topCluster.detail || "混合證據"}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold text-[var(--accent-lime)]">清空</div>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                  暫時未見弱項模式。繼續用混合複習，避免記憶痕跡變弱。
                </p>
              </>
            )}
            <Link href="/review" className="btn-primary mt-4 w-full justify-center text-sm">
              開始修復
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="grid border-t border-white/10 sm:grid-cols-2 lg:grid-cols-5">
          <RepairStat icon={Flame} label="弱項" value={String(queue.stats.leech)} detail="需要改路徑" />
          <RepairStat icon={Gauge} label="薄弱" value={String(queue.stats.weak)} detail="近期答錯" />
          <RepairStat icon={MapIcon} label="文法" value={String(queue.stats.grammarLinked)} detail="句型相關" />
          <RepairStat icon={Volume2} label="音訊循環" value={String(queue.stats.listeningOrShadowing)} detail="聽音／跟讀" />
          <RepairStat
            icon={CheckCircle2}
            label="證據"
            value={queue.stats.repairSuccessRate == null ? "—" : `${queue.stats.repairSuccessRate}%`}
            detail={`${queue.stats.repairAttempts} 次嘗試`}
          />
        </div>
      </GlassPanel>

      {queue.errors.length ? <RepairSetupNotice errors={queue.errors} /> : null}

      <GlassPanel className="p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-eyebrow mb-1">修復流程</p>
            <h2 className="text-lg font-semibold">錯題唔再重刷，先改路徑</h2>
          </div>
          <Link href="/grammar-map" className="btn-ghost w-fit text-sm">
            文法地圖
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <ProtocolStep number="01" icon={Brain} title="診斷" detail="睇提示、錯答同正答，分清係辨認、產出、文法定係聲音問題。" />
          <ProtocolStep number="02" icon={Sparkles} title="對比" detail="用最接近嘅混淆組做一組對比，而唔係單張卡硬背。" />
          <ProtocolStep number="03" icon={Repeat2} title="跟讀" detail="聽一句 → 跟讀 → 遮字復述，建立聲音記憶。" />
          <ProtocolStep number="04" icon={PenLine} title="輸出證據" detail="用同一句型寫／講一句，完成後先當修復有證據。" />
        </div>
      </GlassPanel>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <GlassPanel className="p-5 md:p-6">
            <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="section-eyebrow mb-1">重點修復隊列</p>
              <h2 className="text-lg font-semibold">單字＋句子弱項</h2>
            </div>
            <span className="chip">{queue.stats.total} 項</span>
          </div>

          <div className="space-y-4">
            {queue.vocabItems.map((item) => <VocabRepairCard key={item.id} item={item} />)}
            {queue.sentenceItems.map((item) => <SentenceRepairCard key={item.id} item={item} />)}
            {!queue.vocabItems.length && !queue.sentenceItems.length ? (
              <EmptyRepairQueue />
            ) : null}
          </div>
        </GlassPanel>

        <div className="space-y-6">
          <ClusterPanel clusters={queue.clusters} />
          <RepairEvidencePanel evidence={queue.repairEvidence.slice(0, 8)} />
          <WeaknessTimeline events={queue.weaknessEvents.slice(0, 8)} />
        </div>
      </section>
    </div>
  );
}

function RepairStat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border-white/10 px-5 py-4 sm:border-l sm:first:border-l-0">
      <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Icon className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
        {label}
      </div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-[var(--text-muted)]">{detail}</div>
    </div>
  );
}

function ProtocolStep({
  number,
  icon: Icon,
  title,
  detail,
}: {
  number: string;
  icon: typeof Brain;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>{number}</span>
        <Icon className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

function VocabRepairCard({ item }: { item: RepairVocabItem }) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <span className="chip chip-active">單字</span>
          <span className="chip">{reviewStatusLabel(item.status)}</span>
          <span className="chip">{item.lapses} 次失誤</span>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{item.nextReviewDate ?? "未排日期"}</span>
      </div>
      <div className="font-jp text-2xl font-semibold">{item.japanese}</div>
      {item.kana ? <div className="mt-1 font-jp text-sm text-[var(--text-muted)]">{item.kana}</div> : null}
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.meaning ?? "待補意思"}</p>
      <RepairHint
        text={item.commonMistake ?? item.sourceReference ?? "先同相近單字做對比，再自己產出一句原創例句。"}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/review" className="btn-primary px-3 py-1.5 text-xs">
          去複習修復
        </Link>
        <Link href="/connections" className="btn-ghost px-3 py-1.5 text-xs">
          對比組
        </Link>
        <Link href="/journal" className="btn-ghost px-3 py-1.5 text-xs">
          輸出證據
        </Link>
      </div>
    </article>
  );
}

function SentenceRepairCard({ item }: { item: RepairSentenceItem }) {
  const isAudio = item.promptType === "listening" || item.promptType === "shadowing";
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <span className="chip chip-active">{promptTypeLabel(item.promptType)}</span>
          <span className="chip">{reviewStatusLabel(item.status)}</span>
          <span className="chip">{item.lapses} 次失誤</span>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{item.nextReviewDate ?? "未排日期"}</span>
      </div>
      <p className="font-jp text-lg leading-8">{item.sentenceJa}</p>
      {item.translationZh ? <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.translationZh}</p> : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.keyGrammar.slice(0, 4).map((grammar) => (
          <span key={grammar} className="chip font-jp text-[10px]">{grammar}</span>
        ))}
        {item.keyVocab.slice(0, 3).map((vocab) => (
          <span key={vocab} className="chip text-[10px]">{vocab}</span>
        ))}
      </div>
      <RepairHint
        text={isAudio
          ? "修復路徑：先聽一次，跟讀三次，遮住文字復述，再自評。"
          : "修復路徑：由意思重組句子，再寫一句同型句。"}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={isAudio ? "/shadowing" : "/review"} className="btn-primary px-3 py-1.5 text-xs">
          {isAudio ? "立即跟讀" : "去複習修復"}
        </Link>
        <Link href="/grammar-map" className="btn-ghost px-3 py-1.5 text-xs">
          文法地圖
        </Link>
        <Link href="/journal" className="btn-ghost px-3 py-1.5 text-xs">
          輸出證據
        </Link>
      </div>
    </article>
  );
}

function RepairHint({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-lg border border-[var(--accent-lime)]/20 bg-[var(--accent-lime-bg)] px-3 py-2 text-xs leading-5 text-[var(--accent-lime)]">
      {text}
    </div>
  );
}

function ClusterPanel({ clusters }: { clusters: RepairCluster[] }) {
  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
        <h2 className="text-base font-semibold">弱點群組</h2>
      </div>
      <div className="space-y-2">
        {clusters.length ? clusters.map((cluster) => (
          <div key={cluster.label} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="font-jp text-sm font-semibold">{cluster.label}</span>
              <span className="text-xs tabular-nums text-[var(--accent-lime)]">{cluster.severityScore}</span>
            </div>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">
              {cluster.count} 個信號 · {cluster.detail || "混合證據"}
            </p>
          </div>
        )) : (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">暫時未形成弱點群組。</p>
        )}
      </div>
    </GlassPanel>
  );
}

function RepairEvidencePanel({ evidence }: { evidence: RepairEvidence[] }) {
  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
        <h2 className="text-base font-semibold">修復證據</h2>
      </div>
      <div className="space-y-3">
        {evidence.length ? evidence.map((item) => (
          <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span className="chip px-2 py-0.5 text-[10px]">{displayToken(item.activityType)}</span>
              <span className="chip px-2 py-0.5 text-[10px]">{displayToken(item.repairStage)}</span>
              {item.rating ? <span className="chip px-2 py-0.5 text-[10px]">{displayToken(item.rating)}</span> : null}
              <span className={`chip px-2 py-0.5 text-[10px] ${item.success ? "text-[var(--success)]" : "text-[var(--accent-amber)]"}`}>
                {item.success ? "成功" : "需要重做"}
              </span>
            </div>
            <p className="line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
              {item.evidenceText ?? item.targetType}
            </p>
            <div className="mt-2 text-[10px] text-[var(--text-muted)]">{dateLabel(item.createdAt)}</div>
          </div>
        )) : (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            完成複習救援或跟讀救援後，這裡會留下可追蹤證據。
          </p>
        )}
      </div>
    </GlassPanel>
  );
}

function WeaknessTimeline({ events }: { events: RepairWeaknessEvent[] }) {
  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Dumbbell className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
        <h2 className="text-base font-semibold">近期失誤</h2>
      </div>
      <div className="space-y-3">
        {events.length ? events.map((event) => (
          <div key={event.id} className="border-l border-white/10 pl-3">
            <div className="mb-1 flex flex-wrap gap-2">
              <span className="chip px-2 py-0.5 text-[10px]">{displayToken(event.severity)}</span>
              <span className="chip px-2 py-0.5 text-[10px]">{displayToken(event.skillArea)}</span>
            </div>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">
              {event.grammarPoint ?? event.prompt ?? event.correctAnswer ?? event.source}
            </p>
            <div className="mt-1 text-[10px] text-[var(--text-muted)]">{dateLabel(event.createdAt)}</div>
          </div>
        )) : (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">暫時未有弱點事件紀錄。</p>
        )}
      </div>
    </GlassPanel>
  );
}

function EmptyRepairQueue() {
  return (
    <div className="rounded-xl border border-dashed border-white/15 p-8 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[var(--accent-lime)]">
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold">暫時沒有弱項</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
        繼續做混合複習。當單字或句子變弱，這裡會顯示對應修復路徑。
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Link href="/review" className="btn-primary text-sm">去複習</Link>
        <Link href="/mining" className="btn-ghost text-sm">採一句</Link>
      </div>
    </div>
  );
}

function RepairSetupNotice({ errors }: { errors: string[] }) {
  return (
    <GlassPanel className="border-amber-400/25 bg-amber-400/[0.055] p-4">
      <div className="flex items-start gap-3 text-sm leading-6 text-amber-100">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <div className="font-semibold">修復證據暫時未能完整載入</div>
          <div className="text-amber-100/80">{errors[0]}</div>
        </div>
      </div>
    </GlassPanel>
  );
}

function reviewStatusLabel(status: string | null) {
  if (status === "weak") return "薄弱";
  if (status === "learning") return "學習中";
  if (status === "review") return "複習中";
  if (status === "mastered") return "已掌握";
  if (status === "scheduled" || !status) return "已排程";
  return displayToken(status);
}

function promptTypeLabel(type: string) {
  if (type === "listening") return "聽力";
  if (type === "shadowing") return "跟讀";
  if (type === "cloze") return "填空";
  if (type === "production") return "產出";
  if (type === "translation") return "翻譯";
  return displayToken(type);
}

function displayToken(value: string) {
  const labels: Record<string, string> = {
    completed: "已完成",
    contrast: "對比",
    grammar: "文法",
    hard: "困難",
    leech: "弱項",
    listening: "聽力",
    miss: "答錯",
    output: "輸出",
    production: "產出",
    review: "複習",
    shadowing: "跟讀",
    sound: "聲音",
    vocab: "單字",
    vocabulary: "單字",
    weak: "薄弱",
  };
  return labels[value] ?? value.replace(/_/g, " ");
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}
