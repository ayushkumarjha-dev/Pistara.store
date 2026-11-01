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
  body: registerSchema,
  handler: async ({ req, res, body }) => {
    const ip = clientIp(req);
    if (!(await checkRateLimit(`register:${ip}`))) {
      throw new HttpError(429, "RATE_LIMITED", "Too many attempts. Please try again in 15 minutes.");
    }

    const db = getDb();
    const email = body.email; // already trimmed + lowercased by schema
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) throw new HttpError(409, "EMAIL_TAKEN", "An account with this email already exists");

    const isAdmin = email === (process.env.ADMIN_EMAIL || "").trim().toLowerCase() && email !== "";
    const now = Date.now();
    const id = crypto.randomUUID();
    await db.insert(users).values({
      id,
      name: body.name,
      email,
      passwordHash: bcrypt.hashSync(body.password, 10),
      role: isAdmin ? "admin" : "customer",
      createdAt: now,
      updatedAt: now,
    });

    const token = await signSession({ sub: id, role: isAdmin ? "admin" : "customer", email });
    setSessionCookie(res, token);

    return {
      user: { id, name: body.name, email, role: isAdmin ? "admin" : "customer", mobile: null },
      isComplete: false,
    };
  },
});
