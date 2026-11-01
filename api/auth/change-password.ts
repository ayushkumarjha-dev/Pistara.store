import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { users } from "../../db/schema";
import { changePasswordSchema } from "../../shared/schemas";
import { handler, HttpError } from "../../server-lib/http";
import { requireUser } from "../../server-lib/auth";

export default handler({
  methods: ["POST"],
  body: changePasswordSchema,
  handler: async ({ req, body }) => {
    const session = await requireUser(req);
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
    if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Please sign in to continue");

    if (!bcrypt.compareSync(body.currentPassword, user.passwordHash)) {
      throw new HttpError(400, "WRONG_PASSWORD", "Your current password is incorrect");
    }
    if (body.currentPassword === body.newPassword) {
      throw new HttpError(400, "SAME_PASSWORD", "New password must be different from the current one");
    }

    await db
      .update(users)
      .set({ passwordHash: bcrypt.hashSync(body.newPassword, 10), updatedAt: Date.now() })
      .where(eq(users.id, user.id));

    return { ok: true };
  },
});
