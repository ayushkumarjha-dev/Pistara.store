import { desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { addresses, orders, users } from "../../../db/schema";
import { handler } from "../../../server-lib/http";
import { requireAdmin } from "../../../server-lib/auth";

export default handler({
  methods: ["GET"],
  handler: async ({ req, query }) => {
    await requireAdmin(req);
    const db = getDb();

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const q = typeof query.q === "string" ? query.q.trim() : "";

    const where = q
      ? or(like(users.name, `%${q}%`), like(users.email, `%${q}%`), like(users.mobile, `%${q}%`))
      : eq(users.role, "customer");

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "customer"));

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        mobile: users.mobile,
        createdAt: users.createdAt,
        city: addresses.city,
        orderCount: sql<number>`(select count(*) from ${orders} where ${orders.userId} = ${users.id})`,
        totalSpent: sql<number>`coalesce((select sum(${orders.total}) from ${orders} where ${orders.userId} = ${users.id} and ${orders.status} in ('PAYMENT_CONFIRMED','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED')), 0)`,
      })
      .from(users)
      .leftJoin(addresses, eq(addresses.userId, users.id))
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return { customers: rows, total: countRow?.count ?? 0, page, limit };
  },
});
