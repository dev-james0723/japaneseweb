"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import clsx from "clsx";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { APP_NAV, isNavItemActive } from "@/lib/appNav";

export function Sidebar({ displayName }: { displayName?: string | null }) {
  const pathname = usePathname();

  async function onLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <aside className="hidden md:flex w-[200px] flex-col gap-2 px-3 py-6 sticky top-0 h-screen">
      <div className="px-3 mb-6">
        <div className="text-base font-semibold">日文快上手</div>
        <div className="text-[10px] tracking-[0.25em] text-[var(--text-muted)] uppercase mt-1">
          Nihongo Quick Start
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
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
                  "w-8 h-8 rounded-lg flex items-center justify-center",
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

      <div className="glass-panel-subtle p-3 mt-2">
        <div className="text-xs text-[var(--text-secondary)] mb-2 truncate">
          {displayName ?? "學習者"}
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-white transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          登出
        </button>
      </div>
    </aside>
  );
}
