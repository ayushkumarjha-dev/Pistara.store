import { and, asc, desc, eq, gte, like, lte, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../../db/client";
import { orderItems, orders, orderStatusHistory, productVariants } from "../../db/schema";
import { adminUpdateOrderSchema, ORDER_STATUSES, type OrderStatus } from "../../shared/schemas";
import { handler, HttpError } from "../../server-lib/http";
import { requireAdmin } from "../../server-lib/auth";
import { PIPELINE, validateTransition } from "../../server-lib/order-status";

export default handler({
  methods: ["GET", "PATCH"],
  handler: async ({ req, body, query }) => {
    await requireAdmin(req);
    const db = getDb();
    const id = query.id as string | undefined;

    // GET /api/admin/orders?id=xxx - Get single order
    if (req.method === "GET" && id) {
      const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found");

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      const history = await db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, order.id))
        .orderBy(asc(orderStatusHistory.createdAt));
      return { order, items, history };
    }

    // PATCH /api/admin/orders?id=xxx - Update order status
    if (req.method === "PATCH" && id) {
      const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found");

      const data = adminUpdateOrderSchema.parse(body);
      const from = order.status as OrderStatus;
      const to = data.status;

      const invalid = validateTransition(from, to, { courierName: data.courierName, trackingId: data.trackingId });
      if (invalid) {
        const status = invalid.code === "SHIPPING_INFO_REQUIRED" ? 400 : 409;
        throw new HttpError(status, invalid.code, invalid.message);
      }

      const needsDeduction =
        to !== "CANCELLED" && !order.stockDeducted && PIPELINE.indexOf(to) >= PIPELINE.indexOf("PAYMENT_CONFIRMED");

      await db.transaction(async (tx) => {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));

        if (needsDeduction) {
          for (const item of items) {
            const [variant] = await tx
              .select()
              .from(productVariants)
              .where(eq(productVariants.id, item.variantId))
              .limit(1);
            if (!variant || variant.stock < item.quantity) {
              throw new HttpError(
                409,
                "INSUFFICIENT_STOCK",
                `Not enough stock for ${item.productName} (${item.variantLabel}) — only ${variant?.stock ?? 0} left`,
              );
            }
          }
          for (const item of items) {
            await tx
              .update(productVariants)
              .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
              .where(eq(productVariants.id, item.variantId));
          }
        }

        if (to === "CANCELLED" && order.stockDeducted) {
          for (const item of items) {
            await tx
              .update(productVariants)
              .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
              .where(eq(productVariants.id, item.variantId));
          }
        }

        const now = Date.now();
        await tx
          .update(orders)
          .set({
            status: to,
            stockDeducted: to === "CANCELLED" ? false : needsDeduction ? true : order.stockDeducted,
            courierName: data.courierName ?? order.courierName,
            trackingId: data.trackingId ?? order.trackingId,
            trackingUrl: data.trackingUrl || order.trackingUrl,
            adminNote: data.note ?? order.adminNote,
            updatedAt: now,
          })
          .where(eq(orders.id, order.id));

        await tx.insert(orderStatusHistory).values({
          orderId: order.id,
          status: to,
          note: data.note ?? null,
          actor: "admin",
          createdAt: now,
        });
      });

      const [updated] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      const history = await db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, order.id))
        .orderBy(asc(orderStatusHistory.createdAt));
      return { order: updated, items, history };
    }

    // GET /api/admin/orders - List orders
    const conditions: SQL[] = [];
    if (typeof query.status === "string" && (ORDER_STATUSES as readonly string[]).includes(query.status)) {
      conditions.push(eq(orders.status, query.status as (typeof ORDER_STATUSES)[number]));
    }
    if (typeof query.q === "string" && query.q.trim()) {
      const q = `%${query.q.trim()}%`;
      conditions.push(
        or(like(orders.orderNumber, q), like(orders.customerName, q), like(orders.customerMobile, q))!,
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
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(where);
    const rows = await db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const ids = rows.map((o) => o.id);
    const items = ids.length
      ? await db.select().from(orderItems).where(sql`${orderItems.orderId} IN ${ids}`)
      : [];

    return {
      orders: rows.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) })),
      total: countRow?.count ?? 0,
      page,
      limit,
    };
  },
});
