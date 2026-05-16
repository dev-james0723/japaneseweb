import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  normalizeServiceRoleKey,
  normalizeSupabaseAnonKey,
  normalizeSupabaseUrl,
} from "@/lib/supabase/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = normalizeSupabaseAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createServerClient(
    url,
    anon,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware should refresh sessions.
          }
        },
      },
    },
  );
}

export function createSupabaseServiceClient() {
  // Service-role client for privileged server-only operations.
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(
    url,
    key,
    { auth: { persistSession: false } },
  );
}
