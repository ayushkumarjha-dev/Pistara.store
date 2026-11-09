import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.test", override: true });

const PORT = Number(process.env.E2E_PORT ?? 8090);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  // Render all routes once during readiness (see tests/e2e/global-setup.ts)
  // so cold-start SSR compile flake can't fail the first test of the suite;
  // retries are a last-mile safety net for that same class of timing issue.
  globalSetup: "./tests/e2e/global-setup.ts",
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    // Sandbox images ship a pinned Chromium build; use it when present.
    ...(process.env.PLAYWRIGHT_BROWSERS_PATH
      ? {
          launchOptions: {
            executablePath: `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium-1194/chrome-linux/chrome`,
          },
        }
      : {}),
  },
  webServer: [
    {
      command: "npm run dev",
      port: 8080,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npx tsx tests/e2e/server.ts",
      port: PORT,
      // Never reuse an already-running API server: if `npm run dev:api`
      // (production DB) is up, silently reusing it would run E2E tests
      // against production. Fail loudly on a busy port instead.
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
