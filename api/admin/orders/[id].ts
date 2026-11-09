import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { orderItems, orders, orderStatusHistory, productVariants } from "../../../db/schema";
import { adminUpdateOrderSchema, type OrderStatus } from "../../../shared/schemas";
import { handler, HttpError } from "../../../server-lib/http";
import { requireAdmin } from "../../../server-lib/auth";
import { PIPELINE, validateTransition } from "../../../server-lib/order-status";

export default handler({
  methods: ["GET", "PATCH"],
  handler: async ({ req, body, query }) => {
    await requireAdmin(req);
    const db = getDb();
    const id = typeof query.id === "string" ? query.id : "";

    // GET /api/admin/orders/[id] - Get single order with items + history
    if (req.method === "GET") {
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

    // PATCH /api/admin/orders/[id] - Update order status
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found");

    const data = adminUpdateOrderSchema.parse(body);
    const from = order.status as OrderStatus;
    const to = data.status;

    const invalid = validateTransition(from, to, {
      courierName: data.courierName,
      trackingId: data.trackingId,
    });
    if (invalid) {
      const status = invalid.code === "SHIPPING_INFO_REQUIRED" ? 400 : 409;
      throw new HttpError(status, invalid.code, invalid.message);
    }

    const needsDeduction =
      to !== "CANCELLED" &&
      !order.stockDeducted &&
      PIPELINE.indexOf(to) >= PIPELINE.indexOf("PAYMENT_CONFIRMED");

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
  },
});
