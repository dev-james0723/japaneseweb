import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ArrowRight,
  BookMarked,
  Flower2,
  Notebook,
  Pickaxe,
  Search,
  Star,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type NotebookRow = {
  id: string;
  kind: string;
  japanese: string | null;
  reading: string | null;
  meaning_zh: string | null;
  content: string | null;
  tags: string[];
  is_favorite: boolean;
  updated_at: string;
};

type MinedSentenceRow = {
  id: string;
  sentence_ja: string;
  kana_reading: string | null;
  translation_zh: string | null;
  difficulty_jlpt: string | null;
  source_type: string | null;
  source_title: string | null;
  key_vocab: string[];
  key_grammar: string[];
  mined_at: string;
};

type GrammarRow = {
  id: string;
  pattern: string;
  jlpt_level: string | null;
  core_meaning: string | null;
  active_stage: number;
  source_type: string | null;
  updated_at: string;
};

type CulturalRow = {
  id: string;
  title_ja: string;
  title_zh: string;
  category: string | null;
  difficulty_jlpt: string | null;
  estimated_minutes: number | null;
  is_daily_pick: boolean;
  created_at: string;
};

export default async function LibraryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const [
    notebookResult,
    minedResult,
    grammarResult,
    culturalResult,
    notebookCount,
    minedCount,
    grammarCount,
    culturalCount,
  ] = await Promise.all([
    supabase
      .from("notebook_entries")
      .select("id, kind, japanese, reading, meaning_zh, content, tags, is_favorite, updated_at")
      .eq("user_id", user.id)
      .order("is_favorite", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("mined_sentences")
      .select("id, sentence_ja, kana_reading, translation_zh, difficulty_jlpt, source_type, source_title, key_vocab, key_grammar, mined_at")
      .eq("user_id", user.id)
      .order("mined_at", { ascending: false })
      .limit(8),
    supabase
      .from("grammar_points")
      .select("id, pattern, jlpt_level, core_meaning, active_stage, source_type, updated_at")
      .eq("user_id", user.id)
      .order("active_stage", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("cultural_contents")
      .select("id, title_ja, title_zh, category, difficulty_jlpt, estimated_minutes, is_daily_pick, created_at")
      .eq("user_id", user.id)
      .order("is_daily_pick", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("notebook_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("mined_sentences").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("grammar_points").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("cultural_contents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const notebook = (notebookResult.data ?? []) as NotebookRow[];
  const mined = (minedResult.data ?? []) as MinedSentenceRow[];
  const grammar = (grammarResult.data ?? []) as GrammarRow[];
  const cultural = (culturalResult.data ?? []) as CulturalRow[];
  const total =
    (notebookCount.count ?? 0) +
    (minedCount.count ?? 0) +
    (grammarCount.count ?? 0) +
    (culturalCount.count ?? 0);
  const favorites = notebook.filter((item) => item.is_favorite).length;
  const activeArtifacts = [notebook.length, mined.length, grammar.length, cultural.length].filter((count) => count > 0).length;

  return (
    <div className="space-y-6">
      <GlassPanel className="p-5 md:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <p className="section-eyebrow mb-2">學習素材庫</p>
            <h1 className="text-2xl font-semibold leading-tight md:text-4xl">素材庫</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              把筆記本、句子採礦、文法地圖和文化課收成一個可掃描的學習資產庫。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip chip-active">{total} 項總數</span>
              <span className="chip">{activeArtifacts}/4 個分架啟用</span>
              <span className="chip">{favorites} 個收藏</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="section-eyebrow mb-1">回想分架</p>
                <p className="text-lg font-semibold">搜尋、重開、重用</p>
              </div>
              <Archive className="h-6 w-6 text-[var(--accent-lime)]" aria-hidden="true" />
            </div>
            <div className="grid gap-2">
              <LibraryLink href="/notebook" icon={Notebook} label="整理筆記" />
              <LibraryLink href="/mining" icon={Pickaxe} label="採礦新句" />
              <LibraryLink href="/grammar-map" icon={BookMarked} label="看文法地圖" />
            </div>
          </div>
        </div>
      </GlassPanel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ShelfStat icon={Notebook} label="筆記本" value={notebookCount.count ?? 0} detail="詞語、短句、Professor 保存" href="/notebook" />
        <ShelfStat icon={Pickaxe} label="句子" value={minedCount.count ?? 0} detail="可進入複習的採礦例句" href="/mining" />
        <ShelfStat icon={BookMarked} label="文法" value={grammarCount.count ?? 0} detail="句型與修復點" href="/grammar-map" />
        <ShelfStat icon={Flower2} label="文化" value={culturalCount.count ?? 0} detail="AI 教授文章" href="/cultural" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <LibrarySection
          title="最近筆記"
          eyebrow="筆記本"
          href="/notebook"
          empty="未有筆記。由 Professor 或選文字句快速儲存開始。"
        >
          {notebook.map((item) => (
            <ArtifactCard
              key={item.id}
              icon={item.is_favorite ? Star : Notebook}
              title={item.japanese || firstLine(item.content) || "筆記項目"}
              subtitle={item.meaning_zh || item.reading || item.kind}
              detail={item.content || item.tags.join(" · ") || dateLabel(item.updated_at)}
              chips={[item.kind, ...item.tags.slice(0, 2)]}
            />
          ))}
        </LibrarySection>

        <LibrarySection
          title="最近採礦句"
          eyebrow="句子採礦"
          href="/mining"
          empty="未有採礦句。貼一段真日文，保存後會自動進入複習。"
        >
          {mined.map((item) => (
            <ArtifactCard
              key={item.id}
              icon={Pickaxe}
              title={item.sentence_ja}
              subtitle={item.translation_zh || item.kana_reading || "待補充翻譯"}
              detail={item.source_title || item.source_type || dateLabel(item.mined_at)}
              chips={[item.difficulty_jlpt, ...item.key_vocab.slice(0, 2), ...item.key_grammar.slice(0, 1)].filter(Boolean)}
            />
          ))}
        </LibrarySection>

        <LibrarySection
          title="文法地圖節點"
          eyebrow="文法"
          href="/grammar-map"
          empty="未有文法點。由複習錯題或 Professor 採礦建立第一批。"
        >
          {grammar.map((item) => (
            <ArtifactCard
              key={item.id}
              icon={BookMarked}
              title={item.pattern}
              subtitle={item.core_meaning || "補充核心意思"}
              detail={`階段 ${item.active_stage} · ${sourceTypeLabel(item.source_type)} · ${dateLabel(item.updated_at)}`}
              chips={[item.jlpt_level, `階段 ${item.active_stage}`].filter(Boolean)}
            />
          ))}
        </LibrarySection>

        <LibrarySection
          title="文化輸入"
          eyebrow="文化"
          href="/cultural"
          empty="未有文化文章。去文化沉浸生成今日輸入。"
        >
          {cultural.map((item) => (
            <ArtifactCard
              key={item.id}
              icon={Flower2}
              title={item.title_ja}
              subtitle={item.title_zh}
              detail={`${item.category || "文化"} · ${item.estimated_minutes ?? "?"} 分 · ${dateLabel(item.created_at)}`}
              href={`/cultural/article/${item.id}`}
              chips={[item.is_daily_pick ? "每日精選" : null, item.difficulty_jlpt].filter(Boolean)}
            />
          ))}
        </LibrarySection>
      </div>

      <GlassPanel variant="subtle" className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="section-eyebrow mb-2">全域搜尋</p>
            <h2 className="text-base font-semibold">要搵特定句子或文法？</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              用頂部搜尋搜單字、例句、筆記、文法和文化文章；素材庫負責幫你看整體庫存。
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-[var(--text-muted)]">
            <Search className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            ⌘K／頂部搜尋
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

function LibrarySection({
  eyebrow,
  title,
  href,
  empty,
  children,
}: {
  eyebrow: string;
  title: string;
  href: string;
  empty: string;
  children: ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <GlassPanel className="p-5 md:p-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="section-eyebrow mb-2">{eyebrow}</p>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <Link href={href} className="btn-ghost px-3 py-1.5 text-xs">
          Open
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="space-y-2">
        {hasChildren ? children : (
          <div className="rounded-xl border border-dashed border-white/15 p-4 text-sm leading-6 text-[var(--text-secondary)]">
            {empty}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}

function ArtifactCard({
  icon: Icon,
  title,
  subtitle,
  detail,
  chips,
  href,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  detail: string;
  chips: (string | null | undefined)[];
  href?: string;
}) {
  const visibleChips = chips.filter((chip): chip is string => Boolean(chip));
  const body = (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-[var(--accent-lime)]/30">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.045] text-[var(--accent-lime)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="line-clamp-2 font-jp text-sm font-semibold leading-6">{title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{subtitle}</p>
        </div>
      </div>
      <p className="line-clamp-2 text-[11px] leading-5 text-[var(--text-muted)]">{detail}</p>
      {visibleChips.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleChips.slice(0, 4).map((chip) => (
            <span key={chip} className="chip font-jp text-[10px]">{chip}</span>
          ))}
        </div>
      ) : null}
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

function ShelfStat({
  icon: Icon,
  label,
  value,
  detail,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <GlassPanel variant="subtle" className="p-4 transition hover:border-[var(--accent-lime)]/35">
        <div className="mb-3 flex items-center justify-between">
          <Icon className="h-5 w-5 text-[var(--accent-lime)]" aria-hidden="true" />
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
        </div>
        <div className="text-2xl font-semibold tabular-nums text-[var(--accent-lime)]">{value}</div>
        <div className="mt-1 text-sm font-semibold">{label}</div>
        <div className="mt-1 min-h-8 text-xs leading-4 text-[var(--text-secondary)]">{detail}</div>
      </GlassPanel>
    </Link>
  );
}

function LibraryLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-sm transition hover:border-[var(--accent-lime)]/35">
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
        {label}
      </span>
      <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden="true" />
    </Link>
  );
}

function firstLine(value: string | null) {
  if (!value) return "";
  return value.split(/\n+/)[0]?.trim() ?? "";
}

function sourceTypeLabel(value: string | null) {
  if (!value) return "手動";
  if (value === "manual") return "手動";
  if (value === "ai") return "AI";
  if (value === "daily_feed") return "每日輸入";
  if (value === "professor") return "Professor";
  if (value === "review") return "複習";
  return value.replace(/_/g, " ");
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-Hant-HK", { month: "short", day: "numeric" });
}
