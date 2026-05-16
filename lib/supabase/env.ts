/**
 * Normalizes Supabase URL and anon/publishable keys from env.
 * Fixes common copy-paste issues: leading "y ", newlines, "Bearer " prefix,
 * or extra text before a JWT (starts with eyJ) or publishable key (sb_*).
 */

export function normalizeSupabaseUrl(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/\/+$/, "");
}

export function normalizeSupabaseAnonKey(raw: string | undefined): string {
  let s = (raw ?? "").trim();
  // Kill line breaks / tabs that break HTTP headers
  s = s.replace(/[\r\n\t]+/g, "").trim();
  // Whole value was pasted as "Bearer eyJ..."
  if (/^bearer\s+/i.test(s)) {
    s = s.replace(/^bearer\s+/i, "").trim();
  }
  // New Supabase keys (do not strip)
  if (s.startsWith("sb_publishable_") || s.startsWith("sb_secret_")) {
    return s;
  }
  // Legacy JWT anon key: keep only from first "eyJ" (drops stray "y " etc.)
  const jwtStart = s.indexOf("eyJ");
  if (jwtStart > 0) {
    s = s.slice(jwtStart);
  }
  return s.trim();
}

export function normalizeServiceRoleKey(raw: string | undefined): string {
  let s = (raw ?? "").trim().replace(/[\r\n\t]+/g, "").trim();
  if (/^bearer\s+/i.test(s)) {
    s = s.replace(/^bearer\s+/i, "").trim();
  }
  const jwtStart = s.indexOf("eyJ");
  if (jwtStart > 0) {
    s = s.slice(jwtStart);
  }
  return s.trim();
}
