"use client";

import { Suspense, useActionState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { signInWithEmailPassword, type LoginActionState } from "./actions";

function LoginForm() {
  const search = useSearchParams();
  const next = search.get("next") ?? "/dashboard";
  const [state, formAction, isPending] = useActionState<
    LoginActionState,
    FormData
  >(signInWithEmailPassword, null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      window.location.assign(state.next);
    }
  }, [state]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel p-8 w-full max-w-md animate-glassFadeIn">
        <h1 className="text-2xl font-semibold mb-2">登入</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          歡迎回來，繼續今日的日文學習。
        </p>

        <GoogleAuthButton nextPath={next} />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-[var(--border-subtle)]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[rgba(12,10,9,0.35)] px-3 text-[var(--text-muted)]">或使用電郵</span>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1.5">電子郵件</label>
            <input
              type="email"
              name="email"
              required
              className="glass-input w-full"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1.5">密碼</label>
            <input
              type="password"
              name="password"
              required
              className="glass-input w-full"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {state && "error" in state && (
            <p className="text-sm text-[var(--danger)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full justify-center disabled:opacity-60"
          >
            {isPending ? "登入中..." : "登入"}
          </button>
        </form>

        <p className="mt-6 text-sm text-[var(--text-secondary)] text-center">
          還沒有帳戶？{" "}
          <Link href="/signup" className="text-[var(--accent-lime)] hover:underline">
            建立免費帳戶
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="glass-panel p-8 w-full max-w-md animate-glassFadeIn">
            <p className="text-sm text-[var(--text-secondary)] text-center">載入中…</p>
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
