import { GlassPanel } from "@/components/GlassPanel";

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold mb-1">待複習</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          根據 spaced repetition 排程的單字將顯示於此。
        </p>
      </header>
      <GlassPanel variant="subtle" className="p-10 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          複習系統將在 Phase 7 啟用，會自動排程 D0 / D1 / D3 / D7 / D14 / D30 / D60。
        </p>
      </GlassPanel>
    </div>
  );
}
