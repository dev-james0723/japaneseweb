"use client";

import { useActionState } from "react";
import Link from "next/link";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { signUpWithEmailPassword, type SignupActionState } from "./actions";

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState<
    SignupActionState,
    FormData
  >(signUpWithEmailPassword, null);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel p-8 w-full max-w-md animate-glassFadeIn">
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

          {state?.error && (
            <p className="text-sm text-[var(--danger)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}
          {state?.info && (
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
