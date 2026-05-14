import Link from "next/link";
import { Sparkles, ImageUp, Volume2, Network, CalendarDays, BookOpen } from "lucide-react";

const features = [
  { icon: Sparkles, title: "AI 生成今日單字", body: "選一個主題，AI 即時建立今日詞庫，10 個實用單字。" },
  { icon: ImageUp, title: "圖片 OCR 匯入教材", body: "拍下課本或筆記，Gemini 抽取單字並可編輯確認。" },
  { icon: BookOpen, title: "Romaji 預設輔助閱讀", body: "所有漢字上方顯示 Romaji，可隨時關閉。" },
  { icon: Volume2, title: "Amazon Polly 日文發音", body: "每個單字與例句皆可點擊收聽，音訊快取避免重生成。" },
  { icon: CalendarDays, title: "Spaced Repetition", body: "依正確率自動安排下一次複習，日曆檢視學習紀錄。" },
  { icon: Network, title: "舊新詞智能連結", body: "新詞自動與你之前學過的詞建立網絡，產生混合例句。" },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen px-6 pt-16 pb-24 md:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between mb-20">
          <div className="text-lg font-semibold tracking-wide">日文快上手</div>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">登入</Link>
            <Link href="/signup" className="btn-primary text-sm">建立免費帳戶</Link>
          </nav>
        </header>

        <section className="text-center mb-24 animate-glassFadeIn">
          <p className="text-sm tracking-[0.3em] text-[var(--text-muted)] uppercase mb-6">
            Nihongo Quick Start
          </p>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            日文快上手
          </h1>
          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            將零散的日文單字織成一張真正記得住的知識網。
            <br className="hidden md:block" />
            AI 詞彙、圖像記憶、Romaji 輔助、發音與舊新詞連結，集中於一個沉浸式控制台。
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/login" className="btn-primary">開始今日複習</Link>
            <Link href="/signup" className="btn-ghost">建立免費帳戶</Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="glass-panel p-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-lime-bg)] flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-[var(--accent-lime)]" />
              </div>
              <h3 className="text-base font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-24 text-center">
          <blockquote className="text-base md:text-lg text-[var(--text-secondary)] italic leading-relaxed">
            「單字唔係一粒粒記。<br />單字要織成一張網，先真正入到腦。」
          </blockquote>
        </section>
      </div>
    </main>
  );
}
