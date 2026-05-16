import type { LucideIcon } from "lucide-react";
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
} from "lucide-react";

export type AppNavItem = { href: string; label: string; icon: LucideIcon };

export const APP_NAV: AppNavItem[] = [
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

export function isNavItemActive(pathname: string, itemHref: string): boolean {
  return (
    pathname === itemHref ||
    (itemHref !== "/dashboard" &&
      pathname.startsWith(itemHref.split("?")[0]) &&
      itemHref.split("?")[0] !== "/decks/new") ||
    (itemHref === "/decks/new" && pathname === "/decks/new")
  );
}
