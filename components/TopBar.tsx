"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Flame,
  RefreshCw,
  Settings as SettingsIcon,
  LogOut,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { APP_NAV_GROUPS, type AppNavItem, isNavItemActive } from "@/lib/appNav";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SearchResult = {
  id: string;
  kind: "vocab" | "notebook" | "sentence" | "grammar" | "article" | "deck";
  label: string;
  description: string;
  href: string;
  meta?: string;
};

export function TopBar({
  streak,
  dueCount,
  dueBreakdown,
  displayName,
}: {
  streak: number;
  dueCount: number;
  dueBreakdown?: {
    vocab: number;
    sentence: number;
  };
  displayName?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const dueReviewLabel = dueBreakdown
    ? `${dueCount} 待複習：${dueBreakdown.vocab} 詞卡 + ${dueBreakdown.sentence} 句子`
    : `${dueCount} 待複習`;

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!canRunSearch(q)) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          return res.json() as Promise<{ results: SearchResult[] }>;
        })
        .then((data) => {
          setResults(data.results ?? []);
          setSearchOpen(true);
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setResults([]);
        })
        .finally(() => setSearchLoading(false));
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function onLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function closeSearch() {
    setQuery("");
    setResults([]);
    setSearchOpen(false);
  }

  function openFirstResult() {
    const first = results[0];
    if (!first) return;
    closeSearch();
    router.push(first.href);
  }

  return (
    <div className="sticky top-0 z-20 px-4 pt-4 md:px-6 xl:px-8">
      <div className="glass-panel-dark topbar-shell flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-2.5 md:px-4">
          <div className="topbar-search flex min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-2">
            <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="搜尋單字、筆記、例句、文法、文章、詞庫..."
              aria-label="搜尋"
              aria-controls="topbar-search-results"
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                setSearchOpen(true);
                if (!canRunSearch(nextQuery.trim())) {
                  setResults([]);
                  setSearchLoading(false);
                }
              }}
              onFocus={() => setSearchOpen(Boolean(query.trim()))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  openFirstResult();
                }
                if (event.key === "Escape") {
                  setSearchOpen(false);
                }
              }}
              className="w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-muted)]"
            />
            {searchLoading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--accent-lime)]" />
            ) : query ? (
              <button
                type="button"
                onClick={closeSearch}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[var(--text-muted)] hover:bg-white/10 hover:text-white"
                aria-label="清除搜尋"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden items-center rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] md:inline-flex">
                ⌘K
              </kbd>
            )}
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="metric-pill flex items-center gap-1.5 rounded-full px-3 py-2 text-xs">
              <Flame className="w-3.5 h-3.5 text-[var(--accent-amber)]" />
              <span className="tabular-nums">{streak}</span>
              <span className="text-[var(--text-muted)]">天</span>
            </div>
            <div
              className="metric-pill flex items-center gap-1.5 rounded-full px-3 py-2 text-xs"
              aria-label={dueReviewLabel}
              title={dueReviewLabel}
            >
              <RefreshCw className="w-3.5 h-3.5 text-[var(--accent-lime)]" />
              <span className="tabular-nums">{dueCount}</span>
              <span className="text-[var(--text-muted)]">待複習</span>
              {dueBreakdown ? (
                <span className="hidden text-[10px] text-[var(--text-muted)] xl:inline">
                  {dueBreakdown.vocab}詞/{dueBreakdown.sentence}句
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            id="app-mobile-nav-toggle"
            aria-controls="app-mobile-nav"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "關閉選單" : "開啟選單"}
            onClick={() => setMobileNavOpen((o) => !o)}
            className="group grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] transition-colors hover:bg-white/[0.11] md:hidden"
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
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent-lime)]/30 hover:bg-white/[0.11]"
          >
            <SettingsIcon className="w-4 h-4" />
          </Link>
        </div>

        {searchOpen && query.trim().length > 0 ? (
          <div id="topbar-search-results" className="border-t border-white/10 px-3 pb-3 md:px-4">
            {!canRunSearch(query.trim()) ? (
              <div className="py-3 text-xs text-[var(--text-muted)]">輸入 2 個字，或 1 個日文 / 漢字開始搜尋。</div>
            ) : results.length > 0 ? (
              <div className="grid gap-1 py-2">
                {results.map((result) => (
                  <SearchResultRow key={`${result.kind}-${result.id}`} result={result} onSelect={closeSearch} />
                ))}
              </div>
            ) : searchLoading ? (
              <div className="py-3 text-xs text-[var(--text-muted)]">搜尋中...</div>
            ) : (
              <div className="py-3 text-xs text-[var(--text-muted)]">沒有找到相符內容。</div>
            )}
          </div>
        ) : null}

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
                    <div className="nav-group-label">{group.label}</div>
                    <div className="flex flex-col gap-1">
                      {group.items.map((item) => (
                          <MobileNavItem
                            key={item.href}
                            item={item}
                            pathname={pathname}
                            onNavigate={() => setMobileNavOpen(false)}
                          />
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

function SearchResultRow({ result, onSelect }: { result: SearchResult; onSelect: () => void }) {
  return (
    <Link
      href={result.href}
      onClick={onSelect}
      className="group grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-[var(--accent-lime)]/25 hover:bg-white/[0.055]"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-white group-hover:text-[var(--accent-lime)]">
          {result.label}
        </span>
        {result.description ? (
          <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
            {result.description}
          </span>
        ) : null}
      </span>
      <span className="self-center text-right">
        <span className="block rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-[10px] uppercase text-[var(--text-muted)]">
          {kindLabel(result.kind)}
        </span>
        {result.meta ? (
          <span className="mt-1 block max-w-24 truncate text-[10px] text-[var(--text-muted)]">
            {result.meta}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function canRunSearch(value: string) {
  const q = value.trim();
  return q.length >= 2 || /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(q);
}

function kindLabel(kind: SearchResult["kind"]) {
  const labels: Record<SearchResult["kind"], string> = {
    vocab: "單字",
    notebook: "筆記",
    sentence: "例句",
    grammar: "文法",
    article: "文章",
    deck: "詞庫",
  };
  return labels[kind];
}

function MobileNavItem({
  item,
  pathname,
  onNavigate,
}: {
  item: AppNavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isNavItemActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300",
        active
          ? "bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
          : "text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-white",
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
