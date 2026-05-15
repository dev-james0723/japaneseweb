import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Load `.env*` from this app directory (not the inferred multi-lockfile root) and
// merge again so forked dev workers see `NEXT_PUBLIC_*` when compiling middleware.
loadEnvConfig(projectRoot, process.env.NODE_ENV !== "production", undefined, true);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
