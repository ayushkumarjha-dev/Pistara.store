// Resets the test database before each API test file so files are isolated.
import { beforeAll, expect } from "vitest";
import { config } from "dotenv";

beforeAll(async () => {
  const testPath = expect.getState().testPath ?? "";
  if (!testPath.includes(`${"tests"}/api`)) return;
  config({ path: ".env.test", override: true });
  const { resetTestDb } = await import("../../db/reset-test-db");
  await resetTestDb();
}, 120_000);
