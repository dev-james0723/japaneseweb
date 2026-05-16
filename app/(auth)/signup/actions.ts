"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import {
  normalizeSupabaseAnonKey,
  normalizeSupabaseUrl,
} from "@/lib/supabase/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export type SignupActionState =
  | { error: string }
  | { info: string }
  | { ok: true; next: string }
  | null;

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${proto}://${host}`;
  const fallback = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return fallback ?? "";
}

export async function signUpWithEmailPassword(
  _prev: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!email || !password) {
    return { error: "請填寫電郵與密碼。" };
  }
  if (password.length < 6) {
    return { error: "密碼至少需要 6 個字元。" };
  }

  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = normalizeSupabaseAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anon) {
    return { error: "伺服器未設定 Supabase（NEXT_PUBLIC_SUPABASE_URL / ANON_KEY）。" };
  }

  const origin = await requestOrigin();
  const emailRedirectTo = origin
    ? `${origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`
    : undefined;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || undefined },
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    });

    if (error) {
      return { error: "註冊失敗：" + error.message };
    }

    if (data.session) {
      return { ok: true, next: "/dashboard" };
    }

    return {
      info: "已寄出確認郵件（如專案有啟用），請至信箱完成驗證；若已關閉郵件確認，請改以登入頁登入。",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: "註冊時發生錯誤：" + msg };
  }
}
