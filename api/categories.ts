import { asc } from "drizzle-orm";
import { getDb } from "../db/client";
import { categories } from "../db/schema";
import { handler } from "../server-lib/http";

export default handler({
  methods: ["GET"],
  handler: async () => {
    const db = getDb();
    const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder));
    return { categories: rows };
  },
});
