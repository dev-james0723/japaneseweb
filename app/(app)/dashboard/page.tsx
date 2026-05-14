import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { JapaneseText } from "@/components/JapaneseText";
import { BookOpen, Sparkles, ImageUp, PlusCircle, RefreshCw, Flame } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);

  const { data: todayDecks } = await supabase
    .from("decks")
    .select("id, title, topic, source_type, deck_date")
    .eq("user_id", user!.id)
    .eq("deck_date", today)
    .order("created_at", { ascending: false });

  const { count: newWords } = await supabase
    .from("vocabulary_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .gte("created_at", `${today}T00:00:00Z`);

  const { data: recentVocab } = await supabase
    .from("vocabulary_items")
    .select("id, japanese, romaji, meaning_zh")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <div className="space-y-6">
      {/* Top: today summary */}
      <GlassPanel className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">
              {new Date().toLocaleDateString("zh-Hant-TW", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold mb-1">今日學習</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              把今日的單字織進你的知識網。
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Stat label="今日新單字" value={newWords ?? 0} accent="lime" />
            <Stat label="今日詞庫" value={todayDecks?.length ?? 0} accent="sky" />
            <Stat label="連續學習" value={0} accent="amber" icon={<Flame className="w-3.5 h-3.5" />} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/review" className="btn-primary">
            <RefreshCw className="w-4 h-4" />
            開始今日複習
          </Link>
          <Link href="/decks/new" className="btn-ghost">
            <PlusCircle className="w-4 h-4" />
            建立新詞庫
          </Link>
        </div>
      </GlassPanel>

      {/* Create deck entries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CreateEntry
          href="/decks/new?mode=manual"
          icon={<PlusCircle className="w-5 h-5" />}
          title="手動輸入"
          body="貼上或輸入一份單字清單，AI 會自動結構化。"
          accent="lime"
        />
        <CreateEntry
          href="/decks/new?mode=ai"
          icon={<Sparkles className="w-5 h-5" />}
          title="AI 生成"
          body="選一個主題，AI 即時建立 10 個實用單字。"
          accent="sakura"
        />
        <CreateEntry
          href="/decks/new?mode=ocr"
          icon={<ImageUp className="w-5 h-5" />}
          title="圖片 OCR"
          body="拍下課本或筆記，Gemini 抽取單字並可確認。"
          accent="sky"
        />
      </div>

      {/* Today's decks */}
      <section>
        <SectionTitle title="今日詞庫" subtitle="所有在今天建立的學習組" />
        {todayDecks && todayDecks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayDecks.map((d) => (
              <Link key={d.id} href={`/decks/${d.id}`}>
                <GlassPanel className="p-5 hover:bg-white/[0.09] transition-colors h-full">
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-2">
                    <BookOpen className="w-3 h-3" />
                    {sourceLabel(d.source_type)}
                    {d.topic && <span>· {d.topic}</span>}
                  </div>
                  <div className="text-base font-medium mb-1">{d.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{d.deck_date}</div>
                </GlassPanel>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            text="今天還沒有詞庫。"
            cta={{ href: "/decks/new", label: "建立第一個詞庫" }}
          />
        )}
      </section>

      {/* Recent vocab */}
      <section>
        <SectionTitle title="最近學過" subtitle="最近加入的單字" />
        {recentVocab && recentVocab.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentVocab.map((v) => (
              <GlassPanel key={v.id} variant="subtle" className="p-4">
                <JapaneseText text={v.japanese} romaji={v.romaji} size="lg" />
                <div className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">
                  {v.meaning_zh ?? "—"}
                </div>
              </GlassPanel>
            ))}
          </div>
        ) : (
          <EmptyState text="尚未有學過的單字。建立詞庫後會在這裡顯示。" />
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: "lime" | "sky" | "amber";
  icon?: React.ReactNode;
}) {
  const colorMap = {
    lime: "text-[var(--accent-lime)]",
    sky: "text-[var(--accent-sky)]",
    amber: "text-[var(--accent-amber)]",
  };
  return (
    <div className="text-center md:text-right">
      <div className="text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase mb-1">
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums inline-flex items-center gap-1.5 ${colorMap[accent]}`}>
        {icon}
        {value}
      </div>
    </div>
  );
}

function CreateEntry({
  href,
  icon,
  title,
  body,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: "lime" | "sakura" | "sky";
}) {
  const ring = {
    lime: "bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]",
    sakura: "bg-pink-300/15 text-[var(--accent-sakura)]",
    sky: "bg-sky-300/15 text-[var(--accent-sky)]",
  }[accent];
  return (
    <Link href={href}>
      <GlassPanel className="p-5 h-full hover:bg-white/[0.09] transition-all hover:-translate-y-0.5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${ring}`}>
          {icon}
        </div>
        <div className="text-base font-semibold mb-1.5">{title}</div>
        <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{body}</div>
      </GlassPanel>
    </Link>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3 px-1">
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
    </div>
  );
}

function EmptyState({ text, cta }: { text: string; cta?: { href: string; label: string } }) {
  return (
    <GlassPanel variant="subtle" className="p-8 text-center">
      <p className="text-sm text-[var(--text-secondary)] mb-4">{text}</p>
      {cta && (
        <Link href={cta.href} className="btn-primary inline-flex">
          {cta.label}
        </Link>
      )}
    </GlassPanel>
  );
}

function sourceLabel(s: string) {
  if (s === "manual") return "手動輸入";
  if (s === "ocr") return "圖片 OCR";
  if (s === "ai_generated") return "AI 生成";
  return s;
}
