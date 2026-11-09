// Drops all data in the TEST database, re-applies migrations and seeds baseline data.
// Safety guard: refuses to run unless TURSO_DATABASE_URL contains "test".
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";
import { seed } from "./seed";

const TABLES = [
  "order_status_history",
  "order_items",
  "orders",
  "order_counters",
  "rate_limits",
  "product_variants",
  "product_images",
  "products",
  "categories",
  "addresses",
  "users",
  "settings",
];

export async function resetTestDb() {
  const url = process.env.TURSO_DATABASE_URL || "";
  if (!url.includes("test")) {
    throw new Error(
      `Refusing to reset: TURSO_DATABASE_URL (${url || "unset"}) does not look like a test database. ` +
        `It must contain "test" (e.g. libsql://pistara-test-....turso.io or file:./pistara-test.db).`,
    );
  }
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./db/migrations" });

  for (const t of TABLES) {
    await client.execute(`DELETE FROM "${t}"`);
  }

  await seed();
  console.log("Test database reset and seeded");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // CLI entry: load the test env explicitly (never the production .env).
  config({ path: ".env.test", override: true });
  resetTestDb().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
