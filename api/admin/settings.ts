import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { settings } from "../../db/schema";
import { adminSettingsSchema } from "../../shared/schemas";
import { handler } from "../../server-lib/http";
import { requireAdmin } from "../../server-lib/auth";

export default handler({
  methods: ["GET", "PUT"],
  handler: async ({ req, body }) => {
    await requireAdmin(req);
    const db = getDb();

    if (req.method === "GET") {
      const rows = await db.select().from(settings);
      const out: Record<string, string> = {};
      for (const r of rows) out[r.key] = r.value;
      return { settings: out };
    }

    const data = adminSettingsSchema.parse(body);
    const now = Date.now();
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      await db
        .insert(settings)
        .values({ key, value: String(value), updatedAt: now })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: String(value), updatedAt: now },
        });
    }

    const rows = await db.select().from(settings);
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = r.value;
    return { settings: out };
  },
});
