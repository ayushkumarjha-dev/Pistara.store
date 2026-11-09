import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { orderItems, orders, orderStatusHistory, productVariants } from "../../../db/schema";
import type { OrderStatus } from "../../../shared/schemas";
import { handler, HttpError } from "../../../server-lib/http";
import { requireUser } from "../../../server-lib/auth";
import { customerCanCancel } from "../../../server-lib/order-status";

export default handler({
  methods: ["POST"],
  handler: async ({ req, query }) => {
    const session = await requireUser(req);
    const db = getDb();
    const id = typeof query.id === "string" ? query.id : "";

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order || order.userId !== session.sub)
      throw new HttpError(404, "NOT_FOUND", "Order not found");

    if (!customerCanCancel(order.status as OrderStatus)) {
      throw new HttpError(
        409,
        "CANNOT_CANCEL",
        "This order can no longer be cancelled online. Please contact us on WhatsApp for help.",
      );
    }

    await db.transaction(async (tx) => {
      if (order.stockDeducted) {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
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
        .set({ status: "CANCELLED", stockDeducted: false, updatedAt: now })
        .where(eq(orders.id, order.id));
      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        status: "CANCELLED",
        note: "Cancelled by customer",
        actor: "customer",
        createdAt: now,
      });
    });

    const [updated] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    return { order: updated };
  },
});
