import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { users } from "../../db/schema";
import { registerSchema } from "../../shared/schemas";
import { handler, HttpError } from "../../server-lib/http";
import { setSessionCookie, signSession } from "../../server-lib/auth";
import { checkRateLimit, clientIp } from "../../server-lib/rate-limit";

export default handler({
  methods: ["POST"],
  handler: async ({ req, res, body }) => {
    const data = registerSchema.parse(body);
    const ip = clientIp(req);
    if (!(await checkRateLimit(`register:${ip}`))) {
      throw new HttpError(
        429,
        "RATE_LIMITED",
        "Too many registration attempts. Please try again later.",
      );
    }

    const db = getDb();
    const [existing] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existing) throw new HttpError(409, "EMAIL_TAKEN", "Email already registered");

    const now = Date.now();
    const passwordHash = bcrypt.hashSync(data.password, 10);
    const role =
      data.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase() ? "admin" : "customer";

    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        passwordHash,
        role,
        name: data.name,
        mobile: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const token = await signSession({ sub: user.id, role: user.role, email: user.email });
    setSessionCookie(res, token);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
      },
    };
  },
});
