import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";

import { config as loadEnv } from "dotenv";

const execFileAsync = promisify(execFile);

loadEnv({ path: ".env.local" });

const passthroughKeys = [
  "ADMIN_ACCESS_KEY",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
];

function parseSupabaseEnv(stdout) {
  const env = {};

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex);
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^"/, "").replace(/"$/, "");
    env[key] = value;
  }

  return env;
}

function quote(value) {
  return `"${String(value ?? "").replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

async function main() {
  const { stdout } = await execFileAsync("npm", ["run", "db:local:env"], {
    cwd: process.cwd(),
  });

  const localSupabaseEnv = parseSupabaseEnv(stdout);

  const merged = {
    NEXT_PUBLIC_SUPABASE_URL: localSupabaseEnv.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: localSupabaseEnv.PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: localSupabaseEnv.SECRET_KEY,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3101",
    TOURNAMENT_PUBLIC_URL: "http://localhost:3101",
    PLAYWRIGHT_BASE_URL: "http://localhost:3101",
    RESEND_API_KEY: "",
    RESEND_FROM_EMAIL: "",
  };

  for (const key of passthroughKeys) {
    if (process.env[key]) {
      merged[key] = process.env[key];
    }
  }

  const output = [
    "# Generated for local Docker/Supabase testing",
    ...Object.entries(merged).map(([key, value]) => `${key}=${quote(value)}`),
    "",
  ].join("\n");

  await writeFile(".env.local.docker", output, "utf8");
  console.log("Wrote .env.local.docker");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
