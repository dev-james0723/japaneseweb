"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  /** Post-login path, e.g. `/dashboard` */
  nextPath?: string;
  /** Button label */
  label?: string;
};

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3 2.3c1.7-1.6 2.7-4 2.7-6.8 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#4285F4"
        d="M12 22c2.4 0 4.5-.8 6-2.2l-3-2.3c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H3.1v2.4C4.6 19.9 8 22 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M7 13.9c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V8.1H3.1C2.4 9.4 2 10.7 2 12s.4 2.6 1.1 3.9l3.9-3z"
      />
      <path
        fill="#34A853"
        d="M12 5.4c1.3 0 2.5.4 3.4 1.3l2.6-2.6C16.5 2.7 14.4 2 12 2 8 2 4.6 4.1 3.1 8.1l3.9 3c.7-2.1 2.7-3.7 5-3.7z"
      />
    </svg>
  );
}

export function GoogleAuthButton({ nextPath = "/dashboard", label = "使用 Google 繼續" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (oauthError) {
      setLoading(false);
      setError(oauthError.message);
      return;
    }
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2.5 rounded-[10px] border border-[var(--border-glass)] bg-[rgba(255,255,255,0.06)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-60"
      >
        <GoogleMark className="h-5 w-5 shrink-0" />
        {loading ? "導向 Google…" : label}
      </button>
      {error && (
        <p className="text-xs text-[var(--danger)] text-center">{error}</p>
      )}
    </div>
  );
}
