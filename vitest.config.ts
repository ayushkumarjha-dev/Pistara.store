import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const alias = { "@": path.resolve(__dirname, "./src") };

export default defineConfig({
  test: {
    globals: true,
    globalSetup: ["./tests/helpers/global-setup.ts"],
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["api/**", "server-lib/**"],
      thresholds: { lines: 80 },
    },
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "ui",
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "api",
          environment: "node",
          setupFiles: ["./tests/helpers/reset-per-file.ts"],
          include: ["tests/**/*.test.ts"],
        },
      },
    ],
  },
});
