#!/usr/bin/env node
/**
 * Pushes variables from `.env.local` to the linked Vercel project (idempotent: `--force`).
 * Default: **production** only (Preview often needs branch prompts in the CLI). Set
 * `VERCEL_ENV_TARGETS=production,preview` to include Preview when your CLI supports it,
 * or link Preview to Production in the Vercel dashboard.
 *
 * Requires: `vercel` CLI, project linked (`vercel link`), and a saved `.env.local`.
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
const targets = (process.env.VERCEL_ENV_TARGETS || "production")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function parseEnvFile(content) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = raw.indexOf("=");
    if (i === -1) continue;
    const key = raw.slice(0, i).trim();
    const value = raw.slice(i + 1).trim();
    if (!key || value === "") continue;
    out[key] = value;
  }
  return out;
}

function isSensitive(name) {
  return (
    name === "SUPABASE_SERVICE_ROLE_KEY" ||
    name === "OPENAI_API_KEY" ||
    name === "GEMINI_API_KEY" ||
    name === "AWS_SECRET_ACCESS_KEY"
  );
}

if (!existsSync(envPath)) {
  console.error(`Missing ${envPath}. Copy .env.local.example, fill values, save, then re-run.`);
  process.exit(1);
}

const parsed = parseEnvFile(readFileSync(envPath, "utf8"));
const keys = Object.keys(parsed);

if (keys.length === 0) {
  console.error(
    ".env.local has no KEY=value lines with non-empty values. Save your env file to disk, then re-run.",
  );
  process.exit(1);
}

if (targets.length === 0) {
  console.error("No targets in VERCEL_ENV_TARGETS.");
  process.exit(1);
}

console.log(`Targets: ${targets.join(", ")}\n`);

let failures = 0;

for (const key of keys) {
  const value = parsed[key];
  const sensitive = isSensitive(key);
  for (const target of targets) {
    const args = ["env", "add", key, target];
    if (sensitive) args.push("--sensitive");
    args.push("--value", value, "--yes", "--force");

    const r = spawnSync("vercel", args, {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, CI: "1" },
    });
    if (r.status !== 0) {
      console.error(`Failed: ${key} (${target})`);
      failures += 1;
    } else {
      console.log(`Synced ${key} -> ${target}`);
    }
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(
  "\nDone. Redeploy on Vercel. If you only synced production, link Preview to Production under Environment Variables, or set VERCEL_ENV_TARGETS=production,preview and run in a TTY.",
);
