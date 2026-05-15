"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createSupabaseBrowserClient();
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo,
      },
    });
    setLoading(false);
    if (error) {
      setError("註冊失敗：" + error.message);
      return;
    }
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setInfo("已寄出確認郵件，請至信箱完成驗證。");
    }
  }

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

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1.5">顯示名稱</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="glass-input w-full"
              placeholder="你的暱稱"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1.5">電子郵件</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input w-full"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1.5">密碼</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full"
              placeholder="至少 6 個字元"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--danger)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-[var(--accent-sky)] bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">
              {info}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-60">
            {loading ? "建立中..." : "建立帳戶"}
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
