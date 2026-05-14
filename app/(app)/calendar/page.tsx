import { GlassPanel } from "@/components/GlassPanel";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold mb-1">學習日曆</h1>
        <p className="text-sm text-[var(--text-secondary)]">瀏覽每日詞庫與複習紀錄。</p>
      </header>
      <GlassPanel variant="subtle" className="p-10 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          日曆檢視將在 Phase 8 啟用。屆時可點擊任一日期回看當日詞庫、Quiz 成績與連結。
        </p>
      </GlassPanel>
    </div>
  );
}
