import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ImageUp,
  Network,
  Sparkles,
  Volume2,
} from "lucide-react";

const features = [
  { icon: Sparkles, title: "AI 生成今日單字", body: "選一個主題，直接建立今日可練的詞庫。", span: "lg:col-span-2" },
  { icon: ImageUp, title: "圖片 OCR 匯入教材", body: "拍下課本或筆記，抽取單字後再確認。", span: "lg:col-span-2" },
  { icon: BookOpen, title: "羅馬字輔助閱讀", body: "漢字上方可顯示羅馬字，讀熟後關閉。", span: "lg:col-span-2" },
  { icon: Volume2, title: "日文發音", body: "單字和例句都能點擊聽音，練聽也練口。", span: "lg:col-span-3" },
  { icon: CalendarDays, title: "間隔重複", body: "依正確率安排下一次複習，避免只靠心情。", span: "lg:col-span-3" },
  { icon: Network, title: "舊新詞連結", body: "新詞會和舊詞形成網絡，混合例句更容易留下來。", span: "lg:col-span-6" },
];

const visualNodes = [
  { ja: "読む", zh: "輸入", pos: "left-5 top-28 sm:left-8 sm:top-24" },
  { ja: "拾う", zh: "採礦", pos: "right-4 top-40 sm:right-10 sm:top-36" },
  { ja: "思い出す", zh: "回想", pos: "left-6 bottom-28 sm:left-16 sm:bottom-32" },
  { ja: "話す", zh: "輸出", pos: "right-4 bottom-12 sm:right-16 sm:bottom-16" },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden px-5 pb-20 pt-8 md:px-10 md:pt-10">
      <div className="mx-auto max-w-[1240px]">
        <header className="mb-14 flex items-center justify-between md:mb-16">
          <div className="flex items-center gap-2.5">
            <span className="brand-mark text-sm font-semibold">日</span>
            <span className="text-base font-semibold tracking-wide">日文快上手</span>
          </div>
          <nav className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link href="/login" className="btn-ghost text-sm">登入</Link>
            <Link href="/signup" className="btn-primary hidden text-sm sm:inline-flex">建立免費帳戶</Link>
          </nav>
        </header>

        <section className="landing-stage mb-16 grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.8fr)]">
          <div className="animate-glassFadeIn">
            <p className="section-eyebrow mb-5">日文快上手</p>
            <h1 className="heading-balance max-w-3xl text-[2.75rem] font-semibold leading-[1.02] md:text-7xl">
              把日文練成每天會用的能力。
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">
              詞庫、輸入、回想、口說和輸出證據都放在同一個學習系統。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn-primary">
                開始複習
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/signup" className="btn-ghost">建立帳戶</Link>
            </div>
          </div>

          <div className="landing-visual">
            <div className="absolute inset-x-7 bottom-7 top-32">
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
              <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              {visualNodes.map((node) => (
                <div
                  key={node.ja}
                  className={`landing-node absolute ${node.pos} rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 shadow-[inset_0_1px_0_rgba(247,251,246,0.08)] backdrop-blur-sm`}
                >
                  <div className="font-jp text-lg font-semibold">{node.ja}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{node.zh}</div>
                </div>
              ))}
              <div className="absolute left-1/2 top-1/2 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border border-[var(--accent-lime)]/30 bg-[var(--accent-lime-bg)] text-center shadow-[inset_0_1px_0_rgba(247,251,246,0.12)]">
                <span className="font-jp text-3xl font-semibold text-[var(--accent-lime)]">網</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          {features.map((f) => (
            <div key={f.title} className={`glass-panel-subtle feature-tile p-6 ${f.span}`}>
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent-lime)]/20 bg-[var(--accent-lime-bg)]">
                <f.icon className="h-5 w-5 text-[var(--accent-lime)]" />
              </div>
              <h3 className="mb-2 text-base font-semibold">{f.title}</h3>
              <p className="max-w-lg text-sm leading-relaxed text-[var(--text-secondary)]">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 border-t border-white/10 pt-8 text-center">
          <blockquote className="mx-auto max-w-xl text-base italic leading-relaxed text-[var(--text-secondary)] md:text-lg">
            「單字唔係一粒粒記。<br />單字要織成一張網，先真正入到腦。」
          </blockquote>
        </section>
      </div>
    </main>
  );
}
