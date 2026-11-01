import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { orders, productVariants, products, users } from "../../db/schema";
import { handler, HttpError } from "../../server-lib/http";
import { requireAdmin } from "../../server-lib/auth";

const REVENUE_STATUSES = ["PAYMENT_CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

export default handler({
  methods: ["GET"],
  handler: async ({ req, query }) => {
    await requireAdmin(req);
    const db = getDb();
    const range = query.range === "30" ? 30 : 7;

    const [totals] = await db
      .select({
        totalOrders: sql<number>`count(*)`,
        revenue: sql<number>`coalesce(sum(case when ${orders.status} in (${sql.join(REVENUE_STATUSES.map((s) => sql`${s}`), sql`, `)}) then ${orders.total} else 0 end), 0)`,
        pendingOrders: sql<number>`coalesce(sum(case when ${orders.status} = 'PENDING' then 1 else 0 end), 0)`,
      })
      .from(orders);

    const [customerCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "customer"));

    const lowStock = await db
      .select({
        variantId: productVariants.id,
        productName: products.name,
        label: productVariants.label,
        stock: productVariants.stock,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(lte(productVariants.stock, 5), eq(productVariants.isActive, true), eq(products.isActive, true)));

    const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5);

    // Daily series for the last `range` days
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (range - 1));
    const sinceMs = since.getTime();

    const dailyRows = await db
      .select({
        day: sql<string>`strftime('%Y-%m-%d', ${orders.createdAt} / 1000, 'unixepoch')`,
        count: sql<number>`count(*)`,
        revenue: sql<number>`coalesce(sum(case when ${orders.status} in (${sql.join(REVENUE_STATUSES.map((s) => sql`${s}`), sql`, `)}) then ${orders.total} else 0 end), 0)`,
      })
      .from(orders)
      .where(gte(orders.createdAt, sinceMs))
      .groupBy(sql`strftime('%Y-%m-%d', ${orders.createdAt} / 1000, 'unixepoch')`);

    const byDay = new Map(dailyRows.map((r) => [r.day, r]));
    const series = Array.from({ length: range }, (_, i) => {
      const d = new Date(sinceMs + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const row = byDay.get(key);
      return { date: key, orders: row?.count ?? 0, revenue: row?.revenue ?? 0 };
    });

    return {
      totalOrders: totals?.totalOrders ?? 0,
      pendingOrders: totals?.pendingOrders ?? 0,
      revenue: totals?.revenue ?? 0,
      totalCustomers: customerCount?.count ?? 0,
      lowStock,
      recentOrders,
      series,
    };
  },
});
