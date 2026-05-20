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
  { href: "/dashboard", label: "Today's Boot", icon: LayoutDashboard },
  { href: "/decks", label: "Vocab Decks", icon: BookOpen },
  { href: "/grammar", label: "Grammar", icon: BookMarked },
  { href: "/journal", label: "Journal", icon: Pencil },
  { href: "/mining", label: "Sentence Mining", icon: Pickaxe },
  { href: "/talk-me", label: "Talk Me Log", icon: PhoneCall },
  { href: "/roleplay", label: "Roleplay", icon: Theater },
  { href: "/notebook", label: "Notebook", icon: Notebook },
  { href: "/review", label: "Review", icon: RefreshCw },
  { href: "/decks/new", label: "建立詞庫", icon: PlusCircle },
  { href: "/decks/new?mode=ai", label: "AI 生成", icon: Sparkles },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/quizzes", label: "Quiz Log", icon: CircleHelp },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/weekly-review", label: "Weekly Review", icon: CalendarClock },
  { href: "/monthly-audit", label: "Monthly Audit", icon: Moon },
  { href: "/settings", label: "OS Settings", icon: Settings },
];

export function isNavItemActive(pathname: string, itemHref: string): boolean {
  const base = itemHref.split("?")[0];
  if (pathname === itemHref) return true;
  if (pathname === base) return true;
  if (base === "/dashboard" || base === "/decks/new" || base === "/notebook") return false;
  return pathname.startsWith(base + "/");
}
