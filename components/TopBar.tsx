import { Search, Flame, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";

export function TopBar({
  streak,
  dueCount,
}: {
  streak: number;
  dueCount: number;
}) {
  return (
    <div className="sticky top-0 z-20 px-4 md:px-6 pt-4">
      <div className="glass-panel-dark flex items-center gap-3 px-3 md:px-4 py-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            placeholder="搜尋單字、例句、日期或主題..."
            className="bg-transparent border-none outline-none text-sm text-white placeholder:text-[var(--text-muted)] w-full"
          />
          <kbd className="hidden md:inline-flex items-center text-[10px] text-[var(--text-muted)] border border-white/10 rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </div>

        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/10">
          <div className="flex items-center gap-1.5 text-xs">
            <Flame className="w-3.5 h-3.5 text-[var(--accent-amber)]" />
            <span className="tabular-nums">{streak}</span>
            <span className="text-[var(--text-muted)]">天</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5 text-[var(--accent-lime)]" />
            <span className="tabular-nums">{dueCount}</span>
            <span className="text-[var(--text-muted)]">待複習</span>
          </div>
        </div>

        <Link
          href="/settings"
          aria-label="設定"
          className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <SettingsIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
