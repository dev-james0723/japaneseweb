"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  Sparkles,
  ImageUp,
  RefreshCw,
  CalendarDays,
  Network,
  CircleHelp,
  Settings,
  LogOut,
} from "lucide-react";
import clsx from "clsx";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "今日總覽", icon: LayoutDashboard },
  { href: "/decks", label: "今日詞庫", icon: BookOpen },
  { href: "/decks/new", label: "建立詞庫", icon: PlusCircle },
  { href: "/decks/new?mode=ai", label: "AI 生成", icon: Sparkles },
  { href: "/decks/new?mode=ocr", label: "圖片 OCR", icon: ImageUp },
  { href: "/review", label: "待複習", icon: RefreshCw },
  { href: "/calendar", label: "學習日曆", icon: CalendarDays },
  { href: "/connections", label: "智能連結", icon: Network },
  { href: "/quizzes", label: "小測紀錄", icon: CircleHelp },
  { href: "/settings", label: "設定", icon: Settings },
];

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
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href.split("?")[0]) && item.href.split("?")[0] !== "/decks/new") ||
            (item.href === "/decks/new" && pathname === "/decks/new");
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
