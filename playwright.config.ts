import { config as loadEnv } from "dotenv";
import { defineConfig } from "@playwright/test";

loadEnv({ path: ".env.local" });

const playwrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3101";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: playwrightBaseUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --hostname localhost --port 3101",
    reuseExistingServer: false,
    timeout: 120_000,
    url: playwrightBaseUrl,
  },
});
