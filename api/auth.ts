import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { addresses, users } from "../db/schema";
import { changePasswordSchema, loginSchema, registerSchema } from "../shared/schemas";
import { handler, HttpError } from "../server-lib/http";
import { clearSession, requireUser, setSessionCookie, signSession } from "../server-lib/auth";
import { checkRateLimit, clientIp, resetRateLimit } from "../server-lib/rate-limit";

const GENERIC_ERROR = "Invalid email or password";

export default handler({
  methods: ["GET", "POST"],
  handler: async ({ req, res, body, query }) => {
    const action = (query.action as string) || "";

    // POST /api/auth?action=login
    if (req.method === "POST" && action === "login") {
      const data = loginSchema.parse(body);
      const ip = clientIp(req);
      const rlKey = `login:${ip}:${data.email}`;
      if (!(await checkRateLimit(rlKey))) {
        throw new HttpError(429, "RATE_LIMITED", "Too many failed attempts. Please try again in 15 minutes.");
      }

      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
      const ok = user && bcrypt.compareSync(data.password, user.passwordHash);
      if (!ok) throw new HttpError(401, "INVALID_CREDENTIALS", GENERIC_ERROR);

      await resetRateLimit(rlKey);
      const token = await signSession({ sub: user.id, role: user.role, email: user.email });
      setSessionCookie(res, token);

      return {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, mobile: user.mobile },
      };
    }

    // POST /api/auth?action=register
    if (req.method === "POST" && action === "register") {
      const data = registerSchema.parse(body);
      const ip = clientIp(req);
      if (!(await checkRateLimit(`register:${ip}`))) {
        throw new HttpError(429, "RATE_LIMITED", "Too many registration attempts. Please try again later.");
      }

      const db = getDb();
      const [existing] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
      if (existing) throw new HttpError(409, "EMAIL_EXISTS", "Email already registered");

      const now = Date.now();
      const passwordHash = bcrypt.hashSync(data.password, 10);
      const role = data.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase() ? "admin" : "customer";

      const [user] = await db
        .insert(users)
        .values({ email: data.email, passwordHash, role, name: data.name, mobile: null, createdAt: now, updatedAt: now })
        .returning();

      const token = await signSession({ sub: user.id, role: user.role, email: user.email });
      setSessionCookie(res, token);

      return {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, mobile: user.mobile },
      };
    }

    // POST /api/auth?action=logout
    if (req.method === "POST" && action === "logout") {
      clearSession(res);
      return { ok: true };
    }

    // POST /api/auth?action=change-password
    if (req.method === "POST" && action === "change-password") {
      const session = await requireUser(req);
      const data = changePasswordSchema.parse(body);
      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
      if (!user || !bcrypt.compareSync(data.currentPassword, user.passwordHash)) {
        throw new HttpError(401, "INVALID_PASSWORD", "Current password is incorrect");
      }

      const newHash = bcrypt.hashSync(data.newPassword, 10);
      await db.update(users).set({ passwordHash: newHash, updatedAt: Date.now() }).where(eq(users.id, session.sub));

      return { ok: true };
    }

    // GET /api/auth?action=me
    if (req.method === "GET" && action === "me") {
      const session = await requireUser(req);
      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
      if (!user) return { user: null };
      const [address] = await db.select().from(addresses).where(eq(addresses.userId, user.id)).limit(1);
      const isComplete = Boolean(
        user.name && user.mobile && address?.line1 && address?.city && address?.state && address?.pincode,
      );
      return {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, mobile: user.mobile },
        address: address ?? null,
        isComplete,
      };
    }

    throw new HttpError(404, "NOT_FOUND", "Invalid auth action");
  },
});
