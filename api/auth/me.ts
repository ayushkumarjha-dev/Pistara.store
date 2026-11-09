import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { addresses, users } from "../../db/schema";
import { handler } from "../../server-lib/http";
import { requireUser } from "../../server-lib/auth";

export default handler({
  methods: ["GET"],
  handler: async ({ req }) => {
    const session = await requireUser(req);
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
    if (!user) return { user: null, address: null, isComplete: false };
    const [address] = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, user.id))
      .limit(1);
    const isComplete = Boolean(
      user.name &&
      user.mobile &&
      address?.line1 &&
      address?.city &&
      address?.state &&
      address?.pincode,
    );
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
      },
      address: address ?? null,
      isComplete,
    };
  },
});
