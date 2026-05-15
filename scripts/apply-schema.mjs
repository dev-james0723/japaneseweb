/**
 * Applies SQL files in supabase/migrations/ in sorted order via Postgres.
 * Tracks applied files in public._app_sql_migrations so re-runs are safe.
 *
 * If public.profiles already exists but 0001_init.sql was never recorded
 * (e.g. applied by an older version of this script), we record 0001_init.sql
 * and skip re-applying it so later migrations (e.g. storage) can run.
 *
 * Usage: DATABASE_URL="postgresql://..." node scripts/apply-schema.mjs
 * Or in .env.local: DATABASE_URL / DIRECT_URL, or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD
 * Then: npm run db:apply
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const INIT_MIGRATION = "0001_init.sql";

function loadEnvLocal() {
  const p = join(root, ".env.local");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line)) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvLocal();

function buildDatabaseUrlFromSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const password =
    process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;
  if (!supabaseUrl || !password) return undefined;
  const m = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co\/?/i);
  if (!m) return undefined;
  const ref = m[1];
  const enc = encodeURIComponent(password);
  return `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`;
}

const connectionString =
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL ||
  buildDatabaseUrlFromSupabaseEnv();

if (!connectionString) {
  console.error(
    [
      "Missing database connection for migrations. Use one of:",
      "  • DATABASE_URL or DIRECT_URL in .env.local (Supabase → Settings → Database → URI, ssl ok)",
      "  • NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD (database user password, not anon key)",
    ].join("\n"),
  );
  process.exit(1);
}

const migrationsDir = join(root, "supabase", "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("No .sql files found in", migrationsDir);
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function ensureMigrationTable() {
  await client.query(`
    create table if not exists public._app_sql_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
    alter table public._app_sql_migrations enable row level security;
    revoke all on public._app_sql_migrations from anon, authenticated;
  `);
}

/** Older runs applied 0001 without recording; avoid failing on "already exists". */
async function backfillInitIfSchemaPresent() {
  const { rows } = await client.query(
    "select to_regclass('public.profiles') as reg",
  );
  if (!rows[0]?.reg) return;
  await client.query(
    `insert into public._app_sql_migrations (name) values ($1)
     on conflict (name) do nothing`,
    [INIT_MIGRATION],
  );
  console.log(
    "Detected existing schema; marked",
    INIT_MIGRATION,
    "as applied (skip).",
  );
}

async function isApplied(name) {
  const { rowCount } = await client.query(
    "select 1 from public._app_sql_migrations where name = $1",
    [name],
  );
  return rowCount > 0;
}

async function applyFile(filename) {
  const sqlPath = join(migrationsDir, filename);
  const sql = readFileSync(sqlPath, "utf8");
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query(
      "insert into public._app_sql_migrations (name) values ($1)",
      [filename],
    );
    await client.query("commit");
    console.log("Applied:", filename);
  } catch (e) {
    await client.query("rollback");
    throw e;
  }
}

try {
  await client.connect();
  await ensureMigrationTable();
  await backfillInitIfSchemaPresent();

  for (const filename of files) {
    if (await isApplied(filename)) {
      console.log("Skip (already applied):", filename);
      continue;
    }
    await applyFile(filename);
  }
  console.log("All pending migrations finished.");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
