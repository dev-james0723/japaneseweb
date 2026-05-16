import { createBrowserClient } from "@supabase/ssr";
import { normalizeSupabaseAnonKey, normalizeSupabaseUrl } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = normalizeSupabaseAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (check .env.local / Vercel env).",
    );
  }
  return createBrowserClient(url, anon);
}
