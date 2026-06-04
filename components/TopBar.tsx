"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Flame,
  RefreshCw,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { APP_NAV_GROUPS, type AppNavItem, isNavItemActive } from "@/lib/appNav";
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
    <div className="sticky top-0 z-20 px-4 pt-4 md:px-6">
      <div className="glass-panel-dark flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-2.5 md:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-2">
            <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              placeholder="搜尋單字、例句、日期或主題..."
              aria-label="搜尋"
              className="w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-muted)]"
            />
            <kbd className="hidden items-center rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] md:inline-flex">
              ⌘K
            </kbd>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs">
              <Flame className="w-3.5 h-3.5 text-[var(--accent-amber)]" />
              <span className="tabular-nums">{streak}</span>
              <span className="text-[var(--text-muted)]">天</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs">
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
            className="group grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] transition-colors hover:bg-white/10 md:hidden"
          >
            <span className="relative h-3.5 w-4" aria-hidden>
              <span
                className={clsx(
                  "absolute left-0 top-0 h-px w-4 bg-current transition-transform duration-300",
                  mobileNavOpen && "translate-y-[7px] rotate-45",
                )}
              />
              <span
                className={clsx(
                  "absolute bottom-0 left-0 h-px w-4 bg-current transition-transform duration-300",
                  mobileNavOpen && "-translate-y-[7px] -rotate-45",
                )}
              />
            </span>
          </button>

          <Link
            href="/settings"
            aria-label="設定"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10"
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
            <div className="max-h-[min(72vh,560px)] overflow-y-auto overscroll-contain border-t border-white/10 px-2 pb-3 pt-2">
              <nav className="space-y-3" aria-label="主選單">
                {APP_NAV_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="px-2 pb-1 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                      {group.label}
                    </div>
                    <div className="flex flex-col gap-1">
                      {group.items.map((item) => (
                        <MobileNavItem key={item.href} item={item} pathname={pathname} />
                      ))}
                    </div>
                  </div>
                ))}
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

function MobileNavItem({ item, pathname }: { item: AppNavItem; pathname: string }) {
  const active = isNavItemActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300",
        active
          ? "bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
          : "text-[var(--text-secondary)] hover:bg-white/[0.055] hover:text-white",
      )}
    >
      <span
        className={clsx(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg border",
          active ? "border-[var(--accent-lime)]/30 bg-black/15" : "border-white/10 bg-white/[0.045]",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span>{item.label}</span>
    </Link>
  );
}
