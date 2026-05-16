"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Flame,
  RefreshCw,
  Settings as SettingsIcon,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { APP_NAV, isNavItemActive } from "@/lib/appNav";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function TopBar({
  streak,
  dueCount,
  displayName,
}: {
  streak: number;
  dueCount: number;
  displayName?: string | null;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  async function onLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="sticky top-0 z-20 px-4 md:px-6 pt-4">
      <div className="glass-panel-dark flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-3 md:px-4 py-2.5">
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

          <button
            type="button"
            id="app-mobile-nav-toggle"
            aria-controls="app-mobile-nav"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "關閉選單" : "開啟選單"}
            onClick={() => setMobileNavOpen((o) => !o)}
            className="md:hidden w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
          >
            {mobileNavOpen ? (
              <X className="w-4 h-4" aria-hidden />
            ) : (
              <Menu className="w-4 h-4" aria-hidden />
            )}
          </button>

          <Link
            href="/settings"
            aria-label="設定"
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
          >
            <SettingsIcon className="w-4 h-4" />
          </Link>
        </div>

        <div
          id="app-mobile-nav"
          role="region"
          aria-labelledby="app-mobile-nav-toggle"
          aria-hidden={!mobileNavOpen}
          className={clsx(
            "md:hidden grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
            mobileNavOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden min-h-0">
            <div className="border-t border-white/10 px-2 pt-2 pb-3 max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
              <nav className="flex flex-col gap-0.5" aria-label="主選單">
                {APP_NAV.map((item) => {
                  const active = isNavItemActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                        active
                          ? "bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
                          : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <span
                        className={clsx(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          active ? "bg-[var(--accent-lime-bg)]" : "bg-white/5",
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-3 pt-3 border-t border-white/10 px-3">
                <div className="text-xs text-[var(--text-secondary)] mb-2 truncate">
                  {displayName ?? "學習者"}
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  登出
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
