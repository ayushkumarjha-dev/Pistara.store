import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { users } from "../../db/schema";
import { loginSchema } from "../../shared/schemas";
import { handler, HttpError } from "../../server-lib/http";
import { setSessionCookie, signSession } from "../../server-lib/auth";
import { checkRateLimit, clientIp, resetRateLimit } from "../../server-lib/rate-limit";

const GENERIC_ERROR = "Invalid email or password";

export default handler({
  methods: ["POST"],
  handler: async ({ req, res, body }) => {
    const data = loginSchema.parse(body);
    const ip = clientIp(req);
    const rlKey = `login:${ip}:${data.email}`;
    if (!(await checkRateLimit(rlKey))) {
      throw new HttpError(
        429,
        "RATE_LIMITED",
        "Too many failed attempts. Please try again in 15 minutes.",
      );
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    const ok = user && bcrypt.compareSync(data.password, user.passwordHash);
    if (!ok) throw new HttpError(401, "INVALID_CREDENTIALS", GENERIC_ERROR);

    await resetRateLimit(rlKey);
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
