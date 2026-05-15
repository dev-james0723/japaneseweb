import type { PostgrestError } from "@supabase/supabase-js";

/** Maps common PostgREST errors to actionable Traditional Chinese copy. */
export function postgrestUserMessage(err: PostgrestError | null | undefined): string {
  const msg = err?.message ?? "";
  const code = err?.code ?? "";
  if (
    code === "PGRST205" ||
    (msg.includes("Could not find the table") && msg.includes("schema cache"))
  ) {
    return (
      "資料庫尚未建立本應用所需的資料表。請擇一：在 Supabase 控制台 → SQL Editor 貼上並執行 supabase/migrations/0001_init.sql；或在 .env.local 設定 DATABASE_URL（專案 Settings → Database 的連線字串）後執行 npm run db:apply。"
    );
  }
  return msg || "未知錯誤";
}
