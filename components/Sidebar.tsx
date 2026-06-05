"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import clsx from "clsx";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { APP_NAV_GROUPS, type AppNavItem, isNavItemActive } from "@/lib/appNav";

export function Sidebar({ displayName }: { displayName?: string | null }) {
  const pathname = usePathname();

  async function onLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-[256px] shrink-0 flex-col px-4 py-4 md:flex">
      <div className="glass-panel-dark sidebar-panel flex min-h-0 flex-1 flex-col p-3.5">
        <div className="px-2 pb-5 pt-1">
          <div className="flex items-center gap-2">
            <div className="brand-mark text-sm font-semibold">
              日
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-[0.01em]">日文快上手</div>
              <div className="text-[10px] uppercase tracking-[0.13em] text-[var(--text-muted)]">每日學習系統</div>
            </div>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1.5" aria-label="主選單">
          {APP_NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <SidebarNavItem key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(247,251,246,0.06)]">
          <div className="text-xs text-[var(--text-secondary)] mb-2 truncate">
            {displayName ?? "學習者"}
          </div>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-full text-xs text-[var(--text-muted)] transition-colors hover:text-white"
          >
            <LogOut className="w-3.5 h-3.5" />
            登出
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarNavItem({ item, pathname }: { item: AppNavItem; pathname: string }) {
  const active = isNavItemActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "nav-link group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        active
          ? "bg-[var(--accent-lime-bg)] text-[var(--accent-lime)] shadow-[inset_0_1px_0_rgba(247,251,246,0.11)]"
          : "text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-white",
      )}
    >
      <span
        className={clsx(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-all duration-300",
          active
            ? "border-[var(--accent-lime)]/35 bg-black/15 shadow-[inset_0_1px_0_rgba(247,251,246,0.08)]"
            : "border-white/10 bg-white/[0.045] group-hover:border-white/20",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
