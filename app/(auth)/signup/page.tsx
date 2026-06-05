"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { signUpWithEmailPassword, type SignupActionState } from "./actions";

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState<
    SignupActionState,
    FormData
  >(signUpWithEmailPassword, null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      window.location.assign(state.next);
    }
  }, [state]);

  return (
    <main className="auth-shell overflow-x-hidden">
      <section className="auth-intro">
        <div className="mb-6 flex items-center gap-3">
          <span className="brand-mark text-sm font-semibold">日</span>
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            日文快上手
          </span>
        </div>
        <h1 className="heading-balance text-5xl font-semibold leading-tight">
          從第一天開始，把單字織成網。
        </h1>
        <p className="mt-5 max-w-md text-sm leading-7 text-[var(--text-secondary)]">
          建立帳戶後，你的輸入、複習、口說和寫作證據會留在同一條學習線上。
        </p>
      </section>

      <div className="glass-panel auth-card mx-auto animate-glassFadeIn p-6 sm:p-8 lg:mx-0">
        <h1 className="text-2xl font-semibold mb-2">建立帳戶</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          開始你的日文知識網絡。
        </p>

        <GoogleAuthButton label="使用 Google 註冊" />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-[var(--border-subtle)]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[rgba(12,10,9,0.35)] px-3 text-[var(--text-muted)]">或使用電郵</span>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1.5">顯示名稱</label>
            <input
              type="text"
              name="display_name"
              className="glass-input w-full"
              placeholder="你的暱稱"
            />
          </div>
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
              minLength={6}
              className="glass-input w-full"
              placeholder="至少 6 個字元"
              autoComplete="new-password"
            />
          </div>

          {state && "error" in state && (
            <p className="text-sm text-[var(--danger)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}
          {state && "info" in state && (
            <p className="text-sm text-[var(--accent-sky)] bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">
              {state.info}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full justify-center disabled:opacity-60"
          >
            {isPending ? "建立中..." : "建立帳戶"}
          </button>
        </form>

        <p className="mt-6 text-sm text-[var(--text-secondary)] text-center">
          已有帳戶？{" "}
          <Link href="/login" className="text-[var(--accent-lime)] hover:underline">
            登入
          </Link>
        </p>
      </div>
    </main>
  );
}
