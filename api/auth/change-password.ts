import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { users } from "../../db/schema";
import { changePasswordSchema } from "../../shared/schemas";
import { handler, HttpError } from "../../server-lib/http";
import { requireUser } from "../../server-lib/auth";

export default handler({
  methods: ["POST"],
  handler: async ({ req, body }) => {
    const session = await requireUser(req);
    const data = changePasswordSchema.parse(body);

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
    if (!user || !bcrypt.compareSync(data.currentPassword, user.passwordHash)) {
      throw new HttpError(400, "WRONG_PASSWORD", "Current password is incorrect");
    }
    if (data.newPassword === data.currentPassword) {
      throw new HttpError(
        400,
        "SAME_PASSWORD",
        "New password must be different from your current password",
      );
    }

    const newHash = bcrypt.hashSync(data.newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: Date.now() })
      .where(eq(users.id, session.sub));

    return { ok: true };
  },
});
