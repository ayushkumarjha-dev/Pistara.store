import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { rateLimits } from "../db/schema";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export function clientIp(req: { headers: Record<string, unknown> }): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  if (Array.isArray(fwd) && fwd[0]) return fwd[0].split(",")[0].trim();
  return "unknown";
}

/**
 * Turso-backed fixed-window rate limiter (works across serverless instances).
 * Returns true if the request is allowed; increments the counter when allowed.
 */
export async function checkRateLimit(key: string): Promise<boolean> {
  const db = getDb();
  const now = Date.now();
  const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
  if (!row || now - row.windowStart > WINDOW_MS) {
    await db
      .insert(rateLimits)
      .values({ key, count: 1, windowStart: now })
      .onConflictDoUpdate({ target: rateLimits.key, set: { count: 1, windowStart: now } });
    return true;
  }
  if (row.count >= MAX_ATTEMPTS) return false;
  await db
    .insert(rateLimits)
    .values({ key, count: row.count + 1, windowStart: row.windowStart })
    .onConflictDoUpdate({ target: rateLimits.key, set: { count: row.count + 1 } });
  return true;
}

export async function resetRateLimit(key: string): Promise<void> {
  const db = getDb();
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}
