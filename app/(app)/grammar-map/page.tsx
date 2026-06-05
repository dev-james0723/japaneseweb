import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Flame,
  GitBranch,
  ListChecks,
  Map as MapIcon,
  Pencil,
  RefreshCw,
  Sparkles,
  Swords,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1" | "Unsorted";

type GrammarPointRow = {
  id: string;
  pattern: string;
  jlpt_level: string | null;
  core_meaning: string | null;
  construction: string | null;
  similar_patterns: string[];
  common_mistake: string | null;
  examples: unknown;
  active_stage: number;
  next_review_at: string | null;
  source_type: string | null;
  created_at: string;
  updated_at: string;
};

type WeaknessEventRow = {
  id: string;
  severity: "hard" | "miss" | "leech" | string;
  prompt: string | null;
  correct_answer: string | null;
  metadata: unknown;
  created_at: string;
};

type WeaknessSignal = {
  pattern: string;
  count: number;
  lastSeen: string;
  severity: string;
  example: string | null;
};

type GrammarMasteryRow = {
  pattern: string;
  mastery_score: number;
  active_stage: number;
  exposure_count: number;
  notice_count: number;
  recognition_count: number;
  correction_count: number;
  contrast_count: number;
  review_count: number;
  correct_count: number;
  miss_count: number;
  hard_count: number;
  leech_count: number;
  production_count: number;
  repaired_count: number;
  evidence_summary: string | null;
  last_seen_at: string | null;
};

type GrammarNode = GrammarPointRow & {
  level: JlptLevel;
  weakness: WeaknessSignal | null;
  mastery: GrammarMasteryRow | null;
  exampleJa: string | null;
  exampleZh: string | null;
};

type GrammarMapView = "tree" | "list" | "confusion" | "review";
type GrammarLevelFilter = JlptLevel | "All";
type GrammarMapOverviewData = {
  canDoGroups: CanDoGroup[];
  weakNodes: GrammarNode[];
  newlyEncountered: GrammarNode[];
  masteredNodes: GrammarNode[];
  bossFights: BossFight[];
};
type CanDoGroup = {
  id: string;
  title: string;
  detail: string;
  nodes: GrammarNode[];
  weak: number;
  owned: number;
};
type BossFight = {
  id: string;
  label: string;
  detail: string;
  nodes: GrammarNode[];
  weakSignals: number;
};

const levels: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1", "Unsorted"];
const levelFilters: GrammarLevelFilter[] = ["All", ...levels];
const stageLabels = ["", "察覺", "修復", "使用", "掌握"];
const learningFlowLabels = ["察覺", "解釋", "對比", "辨認", "產出", "修正", "複習"];
const canDoGroupDefinitions: Array<{ id: string; title: string; detail: string; matcher: RegExp }> = [
  {
    id: "reasons-goals",
    title: "說明原因與目的",
    detail: "原因、目的、結果：〜から / 〜ので / 〜ため / 〜ように",
    matcher: /から|ので|ため|ように|によって|理由|原因|目的|goal|purpose|reason|cause|because|為|以便|因為/i,
  },
  {
    id: "contrast-choice",
    title: "比較與對比",
    detail: "讓步、對比、取捨：〜けど / 〜のに / 〜ても / vs",
    matcher: /けど|のに|ても|一方|しかし|contrast|although|despite|混淆|對比|相比|vs/i,
  },
  {
    id: "condition-time",
    title: "設定條件與時間",
    detail: "條件、期限、時間：〜たら / 〜なら / 〜ば / 〜までに",
    matcher: /たら|なら|ば|とき|時|まで|までに|条件|條件|condition|when|if|假如|如果|期限/i,
  },
  {
    id: "stance-evidence",
    title: "表達立場與證據",
    detail: "看法、推測、傳聞：〜と思う / 〜はず / 〜そう / 〜らしい",
    matcher: /と思|はず|かもしれ|そう|ようだ|らしい|みたい|opinion|guess|evidence|hearsay|推測|意見|看法|傳聞/i,
  },
  {
    id: "obligation-permission",
    title: "協商規則",
    detail: "義務、許可、禁止：〜なければ / 〜てもいい / 〜てはいけない",
    matcher: /なければ|なくてはいけない|てもいい|てはいけない|べき|must|permission|obligation|禁止|可以|必須/i,
  },
  {
    id: "state-change",
    title: "描述狀態與變化",
    detail: "狀態、準備、變化：〜ている / 〜てある / 〜ておく / 〜ようになる",
    matcher: /ている|てある|ておく|ようになる|ながら|たり|state|change|sequence|狀態|變化|準備/i,
  },
  {
    id: "register-politeness",
    title: "控制語域與禮貌",
    detail: "敬語、語氣、場合：丁寧 / 尊敬 / 謙譲 / 日常語氣",
    matcher: /敬語|丁寧|謙譲|尊敬|register|formal|casual|polite|語氣|禮貌|場合/i,
  },
];

export default async function GrammarMapPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; level?: string }>;
}) {
  const { view, level } = await searchParams;
  const activeView = normalizeView(view);
  const activeLevel = normalizeLevelFilter(level);
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const weaknessSince = new Date();
  weaknessSince.setDate(weaknessSince.getDate() - 90);

  const [{ data: points }, { data: weaknessEvents }, masteryResult] = await Promise.all([
    supabase
      .from("grammar_points")
      .select(
        "id, pattern, jlpt_level, core_meaning, construction, similar_patterns, common_mistake, examples, active_stage, next_review_at, source_type, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .order("jlpt_level", { ascending: true, nullsFirst: false })
      .order("active_stage", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("weakness_events")
      .select("id, severity, prompt, correct_answer, metadata, created_at")
      .eq("user_id", user.id)
      .eq("skill_area", "grammar")
      .gte("created_at", weaknessSince.toISOString())
      .order("created_at", { ascending: false })
      .limit(160),
    supabase
      .from("grammar_mastery")
      .select("pattern, mastery_score, active_stage, exposure_count, notice_count, recognition_count, correction_count, contrast_count, review_count, correct_count, miss_count, hard_count, leech_count, production_count, repaired_count, evidence_summary, last_seen_at")
      .eq("user_id", user.id)
      .limit(500),
  ]);

  const weaknessByPattern = buildWeaknessMap((weaknessEvents ?? []) as WeaknessEventRow[]);
  const masteryRows = isMissingGrammarMasteryTable(masteryResult.error)
    ? []
    : ((masteryResult.data ?? []) as GrammarMasteryRow[]);
  const masteryByPattern = new Map(masteryRows.map((row) => [row.pattern, row]));
  const nodes = ((points ?? []) as GrammarPointRow[]).map((point) => {
    const example = firstExample(point.examples);
    const mastery = masteryByPattern.get(point.pattern) ?? null;
    return {
      ...point,
      active_stage: mastery?.active_stage ?? point.active_stage,
      level: normalizeLevel(point.jlpt_level),
      weakness: weaknessByPattern.get(point.pattern) ?? null,
      mastery,
      exampleJa: example?.ja ?? null,
      exampleZh: example?.zh ?? null,
    };
  });
  const visibleNodes = activeLevel === "All" ? nodes : nodes.filter((node) => node.level === activeLevel);
  const grouped = groupByLevel(visibleNodes);
  const total = visibleNodes.length;
  const owned = visibleNodes.filter((node) => node.active_stage >= 4 || (node.mastery?.mastery_score ?? 0) >= 70).length;
  const inRepair = visibleNodes.filter((node) => node.weakness || node.active_stage <= 2).length;
  const averageMastery = masteryRows.length
    ? Math.round(masteryRows.reduce((sum, row) => sum + row.mastery_score, 0) / masteryRows.length)
    : 0;
  const dueSoonCutoffMs = new Date().getTime() + 1000 * 60 * 60 * 24 * 3;
  const dueSoon = visibleNodes.filter((node) => node.next_review_at && new Date(node.next_review_at).getTime() <= dueSoonCutoffMs).length;
  const nextRepairs = visibleNodes
    .filter((node) => node.weakness || node.active_stage <= 2)
    .sort((a, b) => weaknessWeight(b.weakness) - weaknessWeight(a.weakness) || a.active_stage - b.active_stage)
    .slice(0, 5);
  const reviewQueue = buildGrammarReviewQueue(visibleNodes);
  const confusionPairs = buildConfusionPairs(visibleNodes);
  const overview = buildGrammarMapOverview(visibleNodes, confusionPairs);
  const levelCounts = countLevels(nodes);

  return (
    <div className="space-y-6">
      <GlassPanel className="p-5 md:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <p className="section-eyebrow mb-2">文法技能樹</p>
            <h1 className="text-2xl font-semibold leading-tight md:text-4xl">文法地圖</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              用學習階段、JLPT 分層同複習錯題信號，將文法由「知道」推到「可以講得出」。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <MetricChip label="總數" value={String(total)} active />
              <MetricChip label="已掌握" value={String(owned)} />
              <MetricChip label="待修" value={String(inRepair)} />
              <MetricChip label="將到期" value={String(dueSoon)} />
              <MetricChip label="掌握度" value={String(averageMastery)} />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="section-eyebrow mb-1">階段階梯</p>
              <p className="text-lg font-semibold">察覺 → 複習</p>
            </div>
            <GitBranch className="h-6 w-6 text-[var(--accent-lime)]" aria-hidden="true" />
          </div>
          <div className="space-y-2">
              {learningFlowLabels.map((label, index) => (
                <div key={label} className="grid grid-cols-[84px_1fr] items-center gap-3">
                  <span className="text-xs text-[var(--text-muted)]">{label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className={`h-full rounded-full ${flowColor(index)}`} style={{ width: `${((index + 1) / learningFlowLabels.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>

      <GrammarMapControls activeView={activeView} activeLevel={activeLevel} levelCounts={levelCounts} />
      <GrammarMapOverview overview={overview} />

      {activeView === "tree" ? (
        <>
          {nextRepairs.length ? (
            <RepairQueue nodes={nextRepairs} />
          ) : (
            <EmptyRepairQueue />
          )}

          <GlassPanel className="p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="section-eyebrow mb-2">樹狀檢視</p>
                <h2 className="text-lg font-semibold">JLPT 分層 · 由基礎到輸出</h2>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                <Legend icon={Flame} label="弱點" />
                <Legend icon={CheckCircle2} label="已掌握" />
                <Legend icon={Sparkles} label="AI／採礦" />
              </div>
            </div>

            {total === 0 ? (
              <EmptyMap />
            ) : (
              <div className="space-y-5">
                {levels.map((level) => (
                  <GrammarLane key={level} level={level} nodes={grouped.get(level) ?? []} />
                ))}
              </div>
            )}
          </GlassPanel>
        </>
      ) : null}

      {activeView === "list" ? <GrammarListView nodes={visibleNodes} /> : null}
      {activeView === "confusion" ? <ConfusionPairsView pairs={confusionPairs} /> : null}
      {activeView === "review" ? <GrammarReviewQueueView nodes={reviewQueue} /> : null}
    </div>
  );
}

type ConfusionPair = {
  label: string;
  nodes: GrammarNode[];
  weakSignals: number;
  detail: string;
};

function GrammarMapControls({
  activeView,
  activeLevel,
  levelCounts,
}: {
  activeView: GrammarMapView;
  activeLevel: GrammarLevelFilter;
  levelCounts: Map<GrammarLevelFilter, number>;
}) {
  const viewTabs: Array<{ id: GrammarMapView; label: string; icon: LucideIcon; detail: string }> = [
    { id: "tree", label: "樹狀", icon: GitBranch, detail: "JLPT 分層" },
    { id: "list", label: "清單", icon: ListChecks, detail: "掃描全部文法" },
    { id: "confusion", label: "混淆", icon: Swords, detail: "對比組" },
    { id: "review", label: "複習", icon: RefreshCw, detail: "到期＋薄弱" },
  ];

  return (
    <GlassPanel variant="subtle" className="p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="section-eyebrow mb-1">檢視</p>
              <h2 className="text-sm font-semibold">樹狀／清單／混淆／複習隊列</h2>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {viewTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeView === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={grammarMapHref(tab.id, activeLevel)}
                  className={[
                    "rounded-xl border px-3 py-3 transition-colors",
                    active
                      ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)]/30"
                      : "border-white/10 bg-white/[0.025] hover:bg-white/[0.055]",
                  ].join(" ")}
                >
                  <span className="mb-2 flex items-center gap-2">
                    <Icon className={active ? "h-4 w-4 text-[var(--accent-lime)]" : "h-4 w-4 text-[var(--text-muted)]"} aria-hidden="true" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </span>
                  <span className="block text-[10px] text-[var(--text-muted)]">{tab.detail}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <p className="section-eyebrow mb-3">JLPT 分頁</p>
          <div className="flex flex-wrap gap-2">
            {levelFilters.map((filter) => {
              const active = activeLevel === filter;
              return (
                <Link
                  key={filter}
                  href={grammarMapHref(activeView, filter)}
                  className={active ? "chip chip-active" : "chip hover:border-white/25"}
                >
                  {levelFilterLabel(filter)} · {levelCounts.get(filter) ?? 0}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

function GrammarMapOverview({ overview }: { overview: GrammarMapOverviewData }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <GlassPanel className="p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-eyebrow mb-2">任務能力文法群組</p>
            <h2 className="text-lg font-semibold">任務型文法群組</h2>
          </div>
          <span className="chip chip-active">{overview.canDoGroups.length} 組</span>
        </div>

        {overview.canDoGroups.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {overview.canDoGroups.map((group) => (
              <article key={group.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{group.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{group.detail}</p>
                  </div>
                  <span className={group.weak ? "chip text-[var(--accent-amber)]" : "chip"}>
                    {group.owned}/{group.nodes.length}
                  </span>
                </div>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full rounded-full bg-[var(--accent-lime)]" style={{ width: `${group.nodes.length ? Math.round((group.owned / group.nodes.length) * 100) : 0}%` }} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.nodes.slice(0, 5).map((node) => (
                    <span key={node.id} className="rounded bg-black/20 px-2 py-1 font-jp text-[10px] text-[var(--text-secondary)]">
                      {node.pattern}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/15 p-5 text-sm leading-6 text-[var(--text-secondary)]">
            文法點保存後會按「說明原因、表達立場、描述條件」等任務能力群組自動歸類。
          </div>
        )}
      </GlassPanel>

      <div className="space-y-4">
        <GlassPanel className="p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="section-eyebrow mb-2">地圖分區</p>
              <h2 className="text-base font-semibold">弱點 / 新遇到 / 已掌握</h2>
            </div>
            <MapIcon className="h-5 w-5 text-[var(--accent-lime)]" aria-hidden="true" />
          </div>
          <div className="grid gap-3">
            <GrammarSignalBucket title="薄弱文法" icon={Flame} nodes={overview.weakNodes} tone="weak" />
            <GrammarSignalBucket title="新遇到" icon={Sparkles} nodes={overview.newlyEncountered} tone="new" />
            <GrammarSignalBucket title="已掌握文法" icon={CheckCircle2} nodes={overview.masteredNodes} tone="mastered" />
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="section-eyebrow mb-2">重點對戰</p>
              <h2 className="text-base font-semibold">混淆 → 文法對決</h2>
            </div>
            <Link href="/quizzes?view=grammar_duel" className="btn-ghost px-3 py-1.5 text-xs">
              對決
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {overview.bossFights.length ? (
            <div className="space-y-2">
              {overview.bossFights.map((fight) => (
                <article key={fight.id} className="rounded-xl border border-[var(--accent-amber)]/20 bg-[var(--accent-amber)]/7 p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words font-jp text-sm font-semibold">{fight.label}</h3>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--text-muted)]">{fight.detail}</p>
                    </div>
                    <span className="chip text-[var(--accent-amber)]">{fight.weakSignals} 個弱點</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {fight.nodes.slice(0, 4).map((node) => (
                      <span key={node.id} className="rounded bg-black/20 px-2 py-1 font-jp text-[10px] text-[var(--text-secondary)]">
                        {node.pattern}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/15 p-4 text-sm leading-6 text-[var(--text-secondary)]">
              相近句型或文法錯題出現後，重點對戰會自動形成。
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}

function GrammarSignalBucket({
  title,
  icon: Icon,
  nodes,
  tone,
}: {
  title: string;
  icon: LucideIcon;
  nodes: GrammarNode[];
  tone: "weak" | "new" | "mastered";
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={bucketIconClass(tone)} aria-hidden="true" />
          <h3 className="truncate text-sm font-semibold">{title}</h3>
        </div>
        <span className="text-xs tabular-nums text-[var(--text-muted)]">{nodes.length}</span>
      </div>
      {nodes.length ? (
        <div className="space-y-2">
          {nodes.slice(0, 3).map((node) => (
            <div key={node.id} className="min-w-0 rounded-lg bg-black/15 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-jp text-xs font-medium">{node.pattern}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{levelLabel(node.level)}</span>
              </div>
              <LearningFlowRibbon node={node} compact />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-5 text-[var(--text-muted)]">暫無項目。</p>
      )}
    </section>
  );
}

function EmptyRepairQueue() {
  return (
    <GlassPanel variant="subtle" className="p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="section-eyebrow mb-2">修復隊列</p>
          <h2 className="text-base font-semibold">暫時沒有高優先文法修補</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            當複習、跟讀或輸出出現文法錯題，這裡會浮出下一批要修的句型。
          </p>
        </div>
        <Link href="/grammar" className="btn-primary text-sm">
          新增文法
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </GlassPanel>
  );
}

function GrammarListView({ nodes }: { nodes: GrammarNode[] }) {
  const sorted = [...nodes].sort(
    (a, b) =>
      weaknessWeight(b.weakness) - weaknessWeight(a.weakness) ||
      a.level.localeCompare(b.level) ||
      a.active_stage - b.active_stage ||
      a.pattern.localeCompare(b.pattern),
  );

  return (
    <GlassPanel className="p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-eyebrow mb-2">清單檢視</p>
          <h2 className="text-lg font-semibold">所有文法點，可掃描階段、掌握度同下一步</h2>
        </div>
        <span className="chip chip-active">{sorted.length} 點</span>
      </div>

      {sorted.length ? (
        <div className="space-y-2">
          {sorted.map((node) => (
            <article key={node.id} className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4 lg:grid-cols-[180px_1fr_220px] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip px-2 py-0.5 text-[10px]">{levelLabel(node.level)}</span>
                  <span className="chip px-2 py-0.5 text-[10px]">階段 {node.active_stage}</span>
                </div>
                <h3 className="mt-2 break-words font-jp text-lg font-semibold">{node.pattern}</h3>
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {node.core_meaning || node.common_mistake || node.exampleZh || "補上功能、接續和用法對比。"}
                </p>
                {node.construction ? <p className="mt-1 line-clamp-1 text-xs text-[var(--text-muted)]">接續: {node.construction}</p> : null}
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>掌握度</span>
                  <span>{node.mastery?.mastery_score ?? 0}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full rounded-full bg-[var(--accent-lime)]" style={{ width: `${node.mastery?.mastery_score ?? 0}%` }} />
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {node.weakness ? `${node.weakness.count} 個弱點信號` : node.next_review_at ? `下次 ${formatDateShort(node.next_review_at)}` : "未排複習日期"}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyMap />
      )}
    </GlassPanel>
  );
}

function ConfusionPairsView({ pairs }: { pairs: ConfusionPair[] }) {
  return (
    <GlassPanel className="p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-eyebrow mb-2">混淆對比檢視</p>
          <h2 className="text-lg font-semibold">相近句型對比，而不是孤立背筆記</h2>
        </div>
        <Link href="/quizzes" className="btn-ghost px-3 py-1.5 text-xs">
          文法對決
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {pairs.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {pairs.map((pair) => (
            <article key={pair.label} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-jp text-lg font-semibold">{pair.label}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{pair.detail}</p>
                </div>
                <span className={pair.weakSignals ? "chip text-[var(--accent-amber)]" : "chip"}>
                  {pair.weakSignals} 個弱點
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {pair.nodes.slice(0, 4).map((node) => (
                  <div key={node.id} className="rounded-lg border border-white/10 bg-black/15 p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="chip px-2 py-0.5 text-[10px]">{levelLabel(node.level)}</span>
                      <span className="chip px-2 py-0.5 text-[10px]">階段 {node.active_stage}</span>
                    </div>
                    <div className="break-words font-jp text-sm font-semibold">{node.pattern}</div>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--text-secondary)]">
                      {node.common_mistake || node.core_meaning || node.weakness?.example || "用例句對比功能、語感同語域。"}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm leading-6 text-[var(--text-secondary)]">
          未有混淆對比。當常見錯誤或弱點資料帶有「vs／混淆／對比」時，這裡會自動形成對比卡。
        </div>
      )}
    </GlassPanel>
  );
}

function GrammarReviewQueueView({ nodes }: { nodes: GrammarNode[] }) {
  return (
    <GlassPanel className="p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-eyebrow mb-2">複習隊列檢視</p>
          <h2 className="text-lg font-semibold">今日要修 / 3 日內會回來的文法</h2>
        </div>
        <Link href="/review" className="btn-primary px-3 py-1.5 text-xs">
          開始複習
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {nodes.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {nodes.map((node) => (
            <article key={node.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <span className="chip chip-active">{reviewQueueReason(node)}</span>
                  <span className="chip">{levelLabel(node.level)}</span>
                  <span className="chip">階段 {node.active_stage}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">{node.next_review_at ? formatDateShort(node.next_review_at) : "未排日期"}</span>
              </div>
              <h3 className="break-words font-jp text-lg font-semibold">{node.pattern}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">
                {node.common_mistake || node.weakness?.example || node.core_meaning || "先察覺，再對比，最後產出一句證據。"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/quizzes?view=grammar_duel" className="btn-ghost px-3 py-1.5 text-xs">對決</Link>
                <Link href="/journal" className="btn-ghost px-3 py-1.5 text-xs">輸出證據</Link>
                <Link href="/repair" className="btn-ghost px-3 py-1.5 text-xs">修復通道</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm leading-6 text-[var(--text-secondary)]">
          目前沒有到期或薄弱文法。繼續用複習、日記、角色扮演產生證據。
        </div>
      )}
    </GlassPanel>
  );
}

function RepairQueue({ nodes }: { nodes: GrammarNode[] }) {
  return (
    <GlassPanel variant="subtle" className="p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-eyebrow mb-2">文法醫生</p>
          <h2 className="text-base font-semibold">下一批修補路線</h2>
        </div>
        <Link href="/review" className="btn-ghost px-3 py-1.5 text-xs">去複習</Link>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        {nodes.map((node) => (
          <div key={node.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-words font-jp text-sm font-semibold">{node.pattern}</p>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                  {levelLabel(node.level)} · {stageLabels[node.active_stage] ?? "階段"}
                </p>
              </div>
              {node.weakness ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--accent-amber)]" aria-hidden="true" />
              ) : (
                <Pencil className="h-4 w-4 shrink-0 text-[var(--accent-sky)]" aria-hidden="true" />
              )}
            </div>
            <p className="line-clamp-3 text-xs leading-5 text-[var(--text-secondary)]">
              {node.common_mistake || node.core_meaning || node.weakness?.example || "補充核心意思、接續和可用例句。"}
            </p>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

function GrammarLane({ level, nodes }: { level: JlptLevel; nodes: GrammarNode[] }) {
  const owned = nodes.filter((node) => node.active_stage >= 4 || (node.mastery?.mastery_score ?? 0) >= 70).length;
  const weak = nodes.filter((node) => node.weakness).length;
  return (
    <section className="rounded-xl border border-white/10 bg-black/10 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-sm font-semibold text-[var(--accent-lime)]">
            {level}
          </span>
          <div>
            <h3 className="text-sm font-semibold">{laneTitle(level)}</h3>
            <p className="text-xs text-[var(--text-muted)]">{nodes.length} 點 · {owned} 已掌握 · {weak} 待修</p>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.055] sm:w-36">
          <div className="h-full rounded-full bg-[var(--accent-lime)]" style={{ width: `${nodes.length ? Math.round((owned / nodes.length) * 100) : 0}%` }} />
        </div>
      </div>

      {nodes.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {nodes.map((node) => (
            <GrammarNodeCard key={node.id} node={node} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-[var(--text-secondary)]">
          呢條分層未有文法。由文章或 Professor 採礦時會逐步補上。
        </div>
      )}
    </section>
  );
}

function GrammarNodeCard({ node }: { node: GrammarNode }) {
  const masteryScore = node.mastery?.mastery_score ?? null;
  const isOwned = node.active_stage >= 4 || (masteryScore ?? 0) >= 70;
  const isMined = Boolean(node.source_type && node.source_type !== "manual");
  return (
    <article
      className={[
        "rounded-xl border p-4 transition",
        node.weakness
          ? "border-[var(--accent-amber)]/30 bg-[var(--accent-amber)]/7"
          : isOwned
            ? "border-[var(--accent-lime)]/25 bg-[var(--accent-lime-bg)]/20"
            : "border-white/10 bg-white/[0.025]",
      ].join(" ")}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-jp text-base font-semibold leading-6">{node.pattern}</p>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            階段 {node.active_stage} · {stageLabels[node.active_stage] ?? "學習中"}
            {masteryScore !== null ? ` · 掌握度 ${masteryScore}` : ""}
          </p>
        </div>
        <div className="flex gap-1.5">
          {node.weakness ? <Flame className="h-4 w-4 text-[var(--accent-amber)]" aria-hidden="true" /> : null}
          {isOwned ? <CheckCircle2 className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" /> : null}
          {isMined ? <Sparkles className="h-4 w-4 text-[var(--accent-sky)]" aria-hidden="true" /> : null}
        </div>
      </div>

      <LearningFlowRibbon node={node} />

      {masteryScore !== null ? (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
            <span>{node.mastery?.exposure_count ?? 0} 個證據事件</span>
            <span>{node.mastery?.correct_count ?? 0} 次答中 / {(node.mastery?.miss_count ?? 0) + (node.mastery?.hard_count ?? 0) + (node.mastery?.leech_count ?? 0)} 次薄弱</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-[var(--accent-lime)]" style={{ width: `${masteryScore}%` }} />
          </div>
        </div>
      ) : null}

      {node.core_meaning ? (
        <p className="line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{node.core_meaning}</p>
      ) : null}
      {node.construction ? (
        <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-[var(--text-muted)]">接續: {node.construction}</p>
      ) : null}
      {node.similar_patterns?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {node.similar_patterns.slice(0, 4).map((pattern) => (
            <span key={pattern} className="rounded bg-[var(--accent-amber)]/10 px-1.5 py-0.5 font-jp text-[10px] text-[var(--accent-amber)]">
              vs {pattern}
            </span>
          ))}
        </div>
      ) : null}
      {node.common_mistake || node.weakness ? (
        <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-[var(--accent-amber)]">
          {node.common_mistake || node.weakness?.example || "偵測到複習錯題"}
        </p>
      ) : null}
      {node.exampleJa ? (
        <div className="mt-3 rounded-lg bg-black/15 p-3">
          <p className="line-clamp-2 font-jp text-xs leading-5">{node.exampleJa}</p>
          {node.exampleZh ? <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--text-muted)]">{node.exampleZh}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

function LearningFlowRibbon({ node, compact = false }: { node: GrammarNode; compact?: boolean }) {
  const steps = learningFlowStatus(node);
  return (
    <div className={compact ? "mt-2 grid grid-cols-7 gap-1" : "mb-3 grid grid-cols-7 gap-1"} aria-label={`${node.pattern} 的文法學習流程`}>
      {steps.map((step, index) => (
        <span
          key={step.label}
          className={[
            compact ? "h-1 rounded-full" : "h-1.5 rounded-full",
            step.done ? flowColor(index) : "bg-white/[0.06]",
          ].join(" ")}
          title={`${step.label}: ${step.done ? "已完成" : "待完成"}`}
        />
      ))}
    </div>
  );
}

function EmptyMap() {
  return (
    <div className="rounded-xl border border-dashed border-white/15 p-8 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[var(--accent-lime)]">
        <MapIcon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold">未有文法地圖</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
        先在文法頁新增一條文法，或者從每日輸入／Professor 採礦。複習錯題會自動浮上修復隊列。
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Link href="/grammar" className="btn-primary text-sm">新增文法</Link>
        <Link href="/professor" className="btn-ghost text-sm">問 Professor</Link>
      </div>
    </div>
  );
}

function MetricChip({ label, value, active = false }: { label: string; value: string; active?: boolean }) {
  return <span className={active ? "chip chip-active" : "chip"}>{label}: {value}</span>;
}

function Legend({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-[var(--accent-lime)]" aria-hidden="true" />
      {label}
    </span>
  );
}

function laneTitle(level: JlptLevel) {
  if (level === "N5") return "生存級句型";
  if (level === "N4") return "日常行動句型";
  if (level === "N3") return "意見與語感";
  if (level === "N2") return "抽象連結";
  if (level === "N1") return "精準與語域";
  return "未分類收件匣";
}

function levelLabel(level: JlptLevel) {
  return level === "Unsorted" ? "未分類" : level;
}

function levelFilterLabel(level: GrammarLevelFilter) {
  if (level === "All") return "全部";
  return levelLabel(level);
}

function normalizeLevel(level: string | null): JlptLevel {
  if (level === "N5" || level === "N4" || level === "N3" || level === "N2" || level === "N1") return level;
  return "Unsorted";
}

function groupByLevel(nodes: GrammarNode[]) {
  const map = new Map<JlptLevel, GrammarNode[]>();
  levels.forEach((level) => map.set(level, []));
  nodes.forEach((node) => map.get(node.level)?.push(node));
  return map;
}

function flowColor(index: number) {
  if (index >= 6) return "bg-[var(--accent-lime)]";
  if (index >= 4) return "bg-[var(--accent-sky)]";
  if (index >= 2) return "bg-[var(--accent-sakura)]";
  return "bg-[var(--accent-amber)]";
}

function bucketIconClass(tone: "weak" | "new" | "mastered") {
  const base = "h-4 w-4 shrink-0";
  if (tone === "weak") return `${base} text-[var(--accent-amber)]`;
  if (tone === "mastered") return `${base} text-[var(--accent-lime)]`;
  return `${base} text-[var(--accent-sky)]`;
}

function buildGrammarMapOverview(nodes: GrammarNode[], confusionPairs: ConfusionPair[]): GrammarMapOverviewData {
  return {
    canDoGroups: buildCanDoGroups(nodes),
    weakNodes: [...nodes]
      .filter((node) => node.weakness || weakCount(node) > 0 || node.active_stage <= 2)
      .sort((a, b) => weaknessWeight(b.weakness) - weaknessWeight(a.weakness) || weakCount(b) - weakCount(a) || a.active_stage - b.active_stage)
      .slice(0, 6),
    newlyEncountered: [...nodes]
      .filter((node) => isNewlyEncountered(node))
      .sort((a, b) => recentTime(b) - recentTime(a))
      .slice(0, 6),
    masteredNodes: [...nodes]
      .filter(isOwnedNode)
      .sort((a, b) => (b.mastery?.mastery_score ?? 0) - (a.mastery?.mastery_score ?? 0) || recentTime(b) - recentTime(a))
      .slice(0, 6),
    bossFights: buildBossFights(nodes, confusionPairs),
  };
}

function buildCanDoGroups(nodes: GrammarNode[]) {
  return canDoGroupDefinitions
    .map((definition) => {
      const groupNodes = nodes
        .filter((node) => definition.matcher.test(searchableGrammarText(node)))
        .sort((a, b) => weaknessWeight(b.weakness) - weaknessWeight(a.weakness) || (b.mastery?.mastery_score ?? 0) - (a.mastery?.mastery_score ?? 0))
        .slice(0, 8);
      return {
        id: definition.id,
        title: definition.title,
        detail: definition.detail,
        nodes: groupNodes,
        weak: groupNodes.filter((node) => node.weakness || weakCount(node) > 0).length,
        owned: groupNodes.filter(isOwnedNode).length,
      };
    })
    .filter((group) => group.nodes.length > 0)
    .sort((a, b) => b.weak - a.weak || b.nodes.length - a.nodes.length || a.title.localeCompare(b.title))
    .slice(0, 6);
}

function buildBossFights(nodes: GrammarNode[], confusionPairs: ConfusionPair[]): BossFight[] {
  const pairFights: BossFight[] = confusionPairs
    .filter((pair) => pair.nodes.length > 1 || pair.weakSignals > 0)
    .slice(0, 5)
    .map((pair) => ({
      id: `pair:${pair.label}`,
      label: pair.label,
      detail: pair.detail,
      nodes: pair.nodes,
      weakSignals: pair.weakSignals,
    }));
  const usedPatterns = new Set(pairFights.flatMap((fight) => fight.nodes.map((node) => node.pattern)));
  const soloFights: BossFight[] = nodes
    .filter((node) => (node.weakness || node.common_mistake || node.similar_patterns?.length) && !usedPatterns.has(node.pattern))
    .sort((a, b) => weaknessWeight(b.weakness) - weaknessWeight(a.weakness) || weakCount(b) - weakCount(a))
    .slice(0, Math.max(0, 5 - pairFights.length))
    .map((node) => ({
      id: `node:${node.id}`,
      label: node.similar_patterns?.length ? `${node.pattern} vs ${node.similar_patterns[0]}` : `${node.pattern} 對比`,
      detail: node.common_mistake || node.core_meaning || node.weakness?.example || "對比意思、接續同語域",
      nodes: [node],
      weakSignals: node.weakness?.count ?? weakCount(node),
    }));
  return [...pairFights, ...soloFights]
    .sort((a, b) => b.weakSignals - a.weakSignals || b.nodes.length - a.nodes.length || a.label.localeCompare(b.label))
    .slice(0, 5);
}

function learningFlowStatus(node: GrammarNode) {
  const mastery = node.mastery;
  const weakSignals = weakCount(node);
  return [
    { label: "察覺", done: Boolean((mastery?.notice_count ?? 0) > 0 || (mastery?.exposure_count ?? 0) > 0 || node.source_type) },
    { label: "解釋", done: Boolean(node.core_meaning?.trim()) },
    { label: "對比", done: Boolean((mastery?.contrast_count ?? 0) > 0 || node.common_mistake?.trim() || node.similar_patterns?.length) },
    { label: "辨認", done: Boolean((mastery?.recognition_count ?? 0) > 0 || (mastery?.correct_count ?? 0) > 0) },
    { label: "產出", done: Boolean((mastery?.production_count ?? 0) > 0 || node.active_stage >= 3) },
    { label: "修正", done: Boolean((mastery?.correction_count ?? 0) > 0 || (mastery?.repaired_count ?? 0) > 0 || weakSignals > 0 || node.weakness) },
    { label: "複習", done: Boolean((mastery?.review_count ?? 0) > 0 || node.next_review_at) },
  ];
}

function searchableGrammarText(node: GrammarNode) {
  return [
    node.pattern,
    node.core_meaning,
    node.construction,
    node.common_mistake,
    node.exampleJa,
    node.exampleZh,
    ...(node.similar_patterns ?? []),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
}

function weakCount(node: GrammarNode) {
  return (node.mastery?.miss_count ?? 0) + (node.mastery?.hard_count ?? 0) + (node.mastery?.leech_count ?? 0);
}

function isOwnedNode(node: GrammarNode) {
  return node.active_stage >= 4 || (node.mastery?.mastery_score ?? 0) >= 70;
}

function isNewlyEncountered(node: GrammarNode) {
  const twoWeeksAgo = Date.now() - 1000 * 60 * 60 * 24 * 14;
  const exposureCount = node.mastery?.exposure_count ?? 0;
  return recentTime(node) >= twoWeeksAgo || exposureCount <= 2 || Boolean(node.source_type && node.source_type !== "manual");
}

function recentTime(node: GrammarNode) {
  const value = node.mastery?.last_seen_at ?? node.updated_at ?? node.created_at;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function buildWeaknessMap(events: WeaknessEventRow[]) {
  const map = new Map<string, WeaknessSignal>();
  for (const event of events) {
    const pattern = patternFromMetadata(event.metadata);
    if (!pattern) continue;
    const existing = map.get(pattern);
    if (existing) {
      existing.count += 1;
      if (event.created_at > existing.lastSeen) existing.lastSeen = event.created_at;
      if (severityRank(event.severity) > severityRank(existing.severity)) existing.severity = event.severity;
      continue;
    }
    map.set(pattern, {
      pattern,
      count: 1,
      lastSeen: event.created_at,
      severity: event.severity,
      example: event.correct_answer || event.prompt,
    });
  }
  return map;
}

function patternFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as { pattern?: unknown; grammar_point?: unknown; grammar_tags?: unknown };
  const pattern = record.pattern ?? record.grammar_point;
  if (typeof pattern === "string" && pattern.trim()) return pattern.trim();
  if (Array.isArray(record.grammar_tags)) {
    const first = record.grammar_tags.find((item) => typeof item === "string" && item.trim());
    return typeof first === "string" ? first.trim() : null;
  }
  return null;
}

function severityRank(severity: string | null | undefined) {
  if (severity === "leech") return 3;
  if (severity === "miss") return 2;
  if (severity === "hard") return 1;
  return 0;
}

function weaknessWeight(signal: WeaknessSignal | null) {
  if (!signal) return 0;
  return signal.count * 10 + severityRank(signal.severity);
}

function firstExample(value: unknown): { ja: string | null; zh: string | null } | null {
  if (!Array.isArray(value)) return null;
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const ja = stringValue(record.ja) || stringValue(record.sentence_ja) || stringValue(record.example_ja);
    const zh = stringValue(record.zh) || stringValue(record.translation_zh) || stringValue(record.meaning_zh);
    if (ja || zh) return { ja, zh };
  }
  return null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeView(view: string | null | undefined): GrammarMapView {
  if (view === "list" || view === "confusion" || view === "review") return view;
  return "tree";
}

function normalizeLevelFilter(level: string | null | undefined): GrammarLevelFilter {
  if (level === "N5" || level === "N4" || level === "N3" || level === "N2" || level === "N1" || level === "Unsorted") {
    return level;
  }
  return "All";
}

function grammarMapHref(view: GrammarMapView, level: GrammarLevelFilter) {
  const params = new URLSearchParams();
  if (view !== "tree") params.set("view", view);
  if (level !== "All") params.set("level", level);
  const query = params.toString();
  return query ? `/grammar-map?${query}` : "/grammar-map";
}

function countLevels(nodes: GrammarNode[]) {
  const counts = new Map<GrammarLevelFilter, number>();
  counts.set("All", nodes.length);
  for (const level of levels) {
    counts.set(level, nodes.filter((node) => node.level === level).length);
  }
  return counts;
}

function buildGrammarReviewQueue(nodes: GrammarNode[]) {
  const now = new Date().getTime();
  const dueSoonCutoffMs = now + 1000 * 60 * 60 * 24 * 3;
  return [...nodes]
    .filter((node) => {
      const nextReviewTime = node.next_review_at ? new Date(node.next_review_at).getTime() : Number.POSITIVE_INFINITY;
      return Boolean(node.weakness) || node.active_stage <= 2 || nextReviewTime <= dueSoonCutoffMs;
    })
    .sort((a, b) => {
      const aTime = a.next_review_at ? new Date(a.next_review_at).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.next_review_at ? new Date(b.next_review_at).getTime() : Number.POSITIVE_INFINITY;
      return weaknessWeight(b.weakness) - weaknessWeight(a.weakness) || aTime - bTime || a.active_stage - b.active_stage;
    })
    .slice(0, 24);
}

function buildConfusionPairs(nodes: GrammarNode[]): ConfusionPair[] {
  const pairs = new Map<string, ConfusionPair>();
  for (const node of nodes) {
    for (const label of confusionLabels(node)) {
      const current = pairs.get(label) ?? {
        label,
        nodes: [],
        weakSignals: 0,
        detail: "對比意思、接續同語域",
      };
      if (!current.nodes.some((item) => item.id === node.id)) current.nodes.push(node);
      current.weakSignals += node.weakness?.count ?? 0;
      if (node.common_mistake) current.detail = node.common_mistake;
      pairs.set(label, current);
    }
  }

  return [...pairs.values()]
    .map((pair) => ({
      ...pair,
      nodes: pair.nodes
        .sort((a, b) => weaknessWeight(b.weakness) - weaknessWeight(a.weakness) || a.pattern.localeCompare(b.pattern))
        .slice(0, 6),
    }))
    .sort((a, b) => b.weakSignals - a.weakSignals || b.nodes.length - a.nodes.length || a.label.localeCompare(b.label));
}

function confusionLabels(node: GrammarNode) {
  const labels = new Set<string>();
  node.similar_patterns?.forEach((pattern) => {
    const trimmed = pattern.trim();
    if (trimmed) labels.add(trimLabel(`${node.pattern} vs ${trimmed}`));
  });
  const inferred = confusionLabel(node);
  if (inferred) labels.add(inferred);
  return [...labels].slice(0, 5);
}

function confusionLabel(node: GrammarNode) {
  const candidates = [
    node.weakness?.pattern,
    node.common_mistake,
    node.core_meaning,
    node.pattern,
  ].filter((value): value is string => Boolean(value?.trim()));

  for (const candidate of candidates) {
    const normalized = candidate
      .replace(/[／/]/g, " vs ")
      .replace(/\s+/g, " ")
      .trim();
    if (/\bvs\b/i.test(normalized)) return trimLabel(normalized);
    if (/混淆|confus|contrast|對比|相近/i.test(normalized)) return `${node.pattern} 對比`;
  }

  if (node.common_mistake || node.weakness) return `${node.pattern} 對比`;
  return null;
}

function trimLabel(label: string) {
  return label
    .split(/[。,.，]/)[0]
    .replace(/^.*?(〜|~)/, "$1")
    .slice(0, 48)
    .trim();
}

function reviewQueueReason(node: GrammarNode) {
  if (node.weakness) return node.weakness.severity === "leech" ? "弱項" : "薄弱";
  if (node.active_stage <= 2) return "早期階段";
  return "將到期";
}

function formatDateShort(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function isMissingGrammarMasteryTable(error: unknown) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  return /does not exist|schema cache|PGRST205|42P01|grammar_mastery|grammar_exposures/i.test(message);
}
