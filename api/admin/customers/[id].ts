import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { addresses, orders, users } from "../../../db/schema";
import { handler, HttpError } from "../../../server-lib/http";
import { requireAdmin } from "../../../server-lib/auth";

export default handler({
  methods: ["GET"],
  handler: async ({ req, query }) => {
    await requireAdmin(req);
    const db = getDb();
    const id = typeof query.id === "string" ? query.id : "";

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new HttpError(404, "NOT_FOUND", "Customer not found");

    const [address] = await db.select().from(addresses).where(eq(addresses.userId, id)).limit(1);
    const orderHistory = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, id))
      .orderBy(desc(orders.createdAt));

    return {
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        createdAt: user.createdAt,
      },
      address: address ?? null,
      orders: orderHistory,
    };
  },
});
