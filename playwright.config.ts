import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.test", override: true });

const PORT = Number(process.env.E2E_PORT ?? 8090);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
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
  webServer: {
    command: "bunx tsx tests/e2e/server.ts",
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
