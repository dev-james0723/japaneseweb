import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Archive,
  BookOpen,
  ShieldAlert,
  Notebook,
  PlusCircle,
  Sparkles,
  RefreshCw,
  Repeat2,
  CalendarDays,
  Settings,
  Pencil,
  Pickaxe,
  PhoneCall,
  PenLine,
  Puzzle,
  Theater,
  BookMarked,
  BarChart3,
  BellRing,
  CalendarClock,
  Clapperboard,
  Moon,
  Flower2,
  Map as MapIcon,
  MessageCircle,
  Network,
  Newspaper,
  Target,
} from "lucide-react";

export type AppNavItem = { href: string; label: string; icon: LucideIcon };
export type AppNavGroup = { label: string; items: AppNavItem[] };

export const APP_NAV: AppNavItem[] = [
  { href: "/dashboard", label: "今日開機", icon: LayoutDashboard },
  { href: "/daily-feed", label: "每日輸入", icon: Newspaper },
  { href: "/input", label: "AI 輸入源", icon: Newspaper },
  { href: "/quick-output", label: "今日一句", icon: PenLine },
  { href: "/decks", label: "詞庫", icon: BookOpen },
  { href: "/grammar", label: "文法", icon: BookMarked },
  { href: "/grammar-map", label: "文法地圖", icon: MapIcon },
  { href: "/journal", label: "日記", icon: Pencil },
  { href: "/self-talk", label: "自言自語", icon: MessageCircle },
  { href: "/cultural", label: "文化沉浸", icon: Flower2 },
  { href: "/motion", label: "素材動畫", icon: Clapperboard },
  { href: "/mining", label: "句子採礦", icon: Pickaxe },
  { href: "/shadowing", label: "跟讀練習", icon: Repeat2 },
  { href: "/talk-me", label: "Talk Me 紀錄", icon: PhoneCall },
  { href: "/roleplay", label: "角色扮演", icon: Theater },
  { href: "/notebook", label: "筆記本", icon: Notebook },
  { href: "/library", label: "素材庫", icon: Archive },
  { href: "/connections", label: "詞彙連結", icon: Network },
  { href: "/review", label: "複習", icon: RefreshCw },
  { href: "/repair", label: "修復隊列", icon: ShieldAlert },
  { href: "/decks/new", label: "建立詞庫", icon: PlusCircle },
  { href: "/decks/new?mode=ai", label: "AI 生成", icon: Sparkles },
  { href: "/calendar", label: "日曆", icon: CalendarDays },
  { href: "/goals", label: "目標", icon: Target },
  { href: "/notifications", label: "提醒", icon: BellRing },
  { href: "/quizzes", label: "記憶遊戲", icon: Puzzle },
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
    items: pickNavItems(["/dashboard", "/daily-feed", "/quick-output", "/review", "/repair"]),
  },
  {
    label: "學習",
    items: pickNavItems([
      "/input",
      "/grammar-map",
      "/decks",
      "/decks/new",
      "/decks/new?mode=ai",
      "/notebook",
      "/library",
      "/connections",
      "/cultural",
    ]),
  },
  {
    label: "練習",
    items: pickNavItems([
      "/grammar",
      "/journal",
      "/self-talk",
      "/mining",
      "/shadowing",
      "/talk-me",
      "/roleplay",
    ]),
  },
  {
    label: "進度",
    items: pickNavItems(["/calendar", "/goals", "/notifications", "/quizzes", "/stats", "/weekly-review", "/monthly-audit", "/motion", "/settings"]),
  },
];

export function isNavItemActive(pathname: string, itemHref: string): boolean {
  const base = itemHref.split("?")[0];
  if (pathname === itemHref) return true;
  if (pathname === base) return true;
  if (base === "/dashboard" || base === "/decks/new" || base === "/notebook") return false;
  return pathname.startsWith(base + "/");
}
