import { and, desc, eq, gte, like, lte, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { orderItems, orders } from "../../../db/schema";
import { ORDER_STATUSES } from "../../../shared/schemas";
import { handler } from "../../../server-lib/http";
import { requireAdmin } from "../../../server-lib/auth";

export default handler({
  methods: ["GET"],
  handler: async ({ req, query }) => {
    await requireAdmin(req);
    const db = getDb();

    const conditions: SQL[] = [];
    if (
      typeof query.status === "string" &&
      (ORDER_STATUSES as readonly string[]).includes(query.status)
    ) {
      conditions.push(eq(orders.status, query.status as (typeof ORDER_STATUSES)[number]));
    }
    if (typeof query.q === "string" && query.q.trim()) {
      const q = `%${query.q.trim()}%`;
      conditions.push(
        or(
          like(orders.orderNumber, q),
          like(orders.customerName, q),
          like(orders.customerMobile, q),
        )!,
      );
    }
    if (typeof query.from === "string" && query.from) {
      const fromMs = Date.parse(query.from);
      if (!Number.isNaN(fromMs)) conditions.push(gte(orders.createdAt, fromMs));
    }
    if (typeof query.to === "string" && query.to) {
      const toMs = Date.parse(query.to);
      if (!Number.isNaN(toMs)) conditions.push(lte(orders.createdAt, toMs + 86399999));
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));

    const where = conditions.length ? and(...conditions) : undefined;
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(where);
    const rows = await db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const ids = rows.map((o) => o.id);
    const items = ids.length
      ? await db
          .select()
          .from(orderItems)
          .where(sql`${orderItems.orderId} IN ${ids}`)
      : [];

    return {
      orders: rows.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) })),
      total: countRow?.count ?? 0,
      page,
      limit,
    };
  },
});
