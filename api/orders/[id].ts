import { asc, eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { orderItems, orders, orderStatusHistory } from "../../db/schema";
import { handler, HttpError } from "../../server-lib/http";
import { requireUser } from "../../server-lib/auth";

export default handler({
  methods: ["GET"],
  handler: async ({ req, query }) => {
    const session = await requireUser(req);
    const id = query.id;
    if (typeof id !== "string" || !id) throw new HttpError(400, "BAD_REQUEST", "Missing order id");

    const db = getDb();
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    // 404 (not 403) so order ids of other customers are not enumerable
    if (!order || order.userId !== session.sub) throw new HttpError(404, "NOT_FOUND", "Order not found");

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, order.id))
      .orderBy(asc(orderStatusHistory.createdAt));

    return { order, items, history };
  },
});
