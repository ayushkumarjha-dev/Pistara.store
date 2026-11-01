import "dotenv/config";
import { config } from "dotenv";
import { resetTestDb } from "../../db/reset-test-db";

export default async function globalSetup() {
  config({ path: ".env.test", override: true });
  await resetTestDb();
}
