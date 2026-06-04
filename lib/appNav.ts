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
  Clapperboard,
  Moon,
  Flower2,
} from "lucide-react";

export type AppNavItem = { href: string; label: string; icon: LucideIcon };
export type AppNavGroup = { label: string; items: AppNavItem[] };

export const APP_NAV: AppNavItem[] = [
  { href: "/dashboard", label: "今日開機", icon: LayoutDashboard },
  { href: "/decks", label: "詞庫", icon: BookOpen },
  { href: "/grammar", label: "文法", icon: BookMarked },
  { href: "/journal", label: "日記", icon: Pencil },
  { href: "/cultural", label: "文化沉浸", icon: Flower2 },
  { href: "/motion", label: "素材動畫", icon: Clapperboard },
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

const navByHref = new Map(APP_NAV.map((item) => [item.href, item]));

function pickNavItems(hrefs: string[]): AppNavItem[] {
  return hrefs.map((href) => navByHref.get(href)).filter((item): item is AppNavItem => Boolean(item));
}

export const APP_NAV_GROUPS: AppNavGroup[] = [
  {
    label: "今日",
    items: pickNavItems(["/dashboard", "/review", "/decks", "/decks/new", "/decks/new?mode=ai"]),
  },
  {
    label: "練習",
    items: pickNavItems([
      "/grammar",
      "/journal",
      "/cultural",
      "/motion",
      "/mining",
      "/talk-me",
      "/roleplay",
      "/notebook",
    ]),
  },
  {
    label: "節奏",
    items: pickNavItems(["/calendar", "/quizzes", "/stats", "/weekly-review", "/monthly-audit", "/settings"]),
  },
];

export function isNavItemActive(pathname: string, itemHref: string): boolean {
  const base = itemHref.split("?")[0];
  if (pathname === itemHref) return true;
  if (pathname === base) return true;
  if (base === "/dashboard" || base === "/decks/new" || base === "/notebook") return false;
  return pathname.startsWith(base + "/");
}
