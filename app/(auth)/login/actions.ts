"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/** Avoid `redirect()` in the same Server Action as `cookies().set` (Vercel/Next can throw); client navigates on `ok`. */
export type LoginActionState =
  | { error: string }
  | { ok: true; next: string }
  | null;

function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function signInWithEmailPassword(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/dashboard"));

  if (!email || !password) {
    return { error: "請填寫電郵與密碼。" };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return { error: "伺服器未設定 Supabase（NEXT_PUBLIC_SUPABASE_URL / ANON_KEY）。" };
  }

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

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: "登入失敗：" + error.message };
    }
    return { ok: true, next };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: "登入時發生錯誤：" + msg };
  }
}
