import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { addresses, users } from "../db/schema";
import { profileSchema } from "../shared/schemas";
import { handler } from "../server-lib/http";
import { requireUser } from "../server-lib/auth";

export default handler({
  methods: ["GET", "PUT"],
  handler: async ({ req, body }) => {
    const session = await requireUser(req);
    const db = getDb();

    if (req.method === "GET") {
      const [user] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
      const [address] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.userId, session.sub))
        .limit(1);
      const isComplete = Boolean(
        user?.name &&
        user?.mobile &&
        address?.line1 &&
        address?.city &&
        address?.state &&
        address?.pincode,
      );
      return {
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              mobile: user.mobile,
            }
          : null,
        address: address ?? null,
        isComplete,
      };
    }

    const data = profileSchema.parse(body);
    const now = Date.now();
    await db
      .update(users)
      .set({ name: data.name, mobile: data.mobile, updatedAt: now })
      .where(eq(users.id, session.sub));
    await db
      .insert(addresses)
      .values({
        userId: session.sub,
        line1: data.address.line1,
        line2: data.address.line2 || null,
        area: data.address.area || null,
        city: data.address.city,
        state: data.address.state,
        pincode: data.address.pincode,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: addresses.userId,
        set: {
          line1: data.address.line1,
          line2: data.address.line2 || null,
          area: data.address.area || null,
          city: data.address.city,
          state: data.address.state,
          pincode: data.address.pincode,
          updatedAt: now,
        },
      });

    const [user] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
    const [address] = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, session.sub))
      .limit(1);
    return {
      user: {
        id: user!.id,
        name: user!.name,
        email: user!.email,
        role: user!.role,
        mobile: user!.mobile,
      },
      address,
      isComplete: true,
    };
  },
});
