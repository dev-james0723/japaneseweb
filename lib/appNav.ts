import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookOpen,
  Notebook,
  PlusCircle,
  Sparkles,
  RefreshCw,
  CalendarDays,
  CircleHelp,
  Settings,
  Pencil,
  Pickaxe,
  PhoneCall,
  Theater,
  BookMarked,
  BarChart3,
  CalendarClock,
  Moon,
} from "lucide-react";

export type AppNavItem = { href: string; label: string; icon: LucideIcon };

export const APP_NAV: AppNavItem[] = [
  { href: "/dashboard", label: "今日開機", icon: LayoutDashboard },
  { href: "/decks", label: "詞庫", icon: BookOpen },
  { href: "/grammar", label: "文法", icon: BookMarked },
  { href: "/journal", label: "日記", icon: Pencil },
  { href: "/mining", label: "句子採礦", icon: Pickaxe },
  { href: "/talk-me", label: "Talk Me 紀錄", icon: PhoneCall },
  { href: "/roleplay", label: "角色扮演", icon: Theater },
  { href: "/notebook", label: "筆記本", icon: Notebook },
  { href: "/review", label: "複習", icon: RefreshCw },
  { href: "/decks/new", label: "建立詞庫", icon: PlusCircle },
  { href: "/decks/new?mode=ai", label: "AI 生成", icon: Sparkles },
  { href: "/calendar", label: "日曆", icon: CalendarDays },
  { href: "/quizzes", label: "小測紀錄", icon: CircleHelp },
  { href: "/stats", label: "統計", icon: BarChart3 },
  { href: "/weekly-review", label: "每週回顧", icon: CalendarClock },
  { href: "/monthly-audit", label: "每月檢討", icon: Moon },
  { href: "/settings", label: "設定", icon: Settings },
];

export function isNavItemActive(pathname: string, itemHref: string): boolean {
  const base = itemHref.split("?")[0];
  if (pathname === itemHref) return true;
  if (pathname === base) return true;
  if (base === "/dashboard" || base === "/decks/new" || base === "/notebook") return false;
  return pathname.startsWith(base + "/");
}
