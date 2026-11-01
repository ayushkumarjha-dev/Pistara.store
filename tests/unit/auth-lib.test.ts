import { describe, expect, it, beforeAll } from "vitest";
import { config } from "dotenv";
config({ path: ".env.test", override: true });

import { SESSION_COOKIE, clearSessionCookie, sessionCookie, signSession, verifySession } from "../../server-lib/auth";
import { formatOrderNumber } from "../../server-lib/order-number";

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-change-me-32-chars-minimum";
});

describe("JWT sessions", () => {
  it("signs and verifies a valid token", async () => {
    const token = await signSession({ sub: "user-1", role: "customer", email: "a@b.com" });
    const payload = await verifySession(token);
    expect(payload).toEqual({ sub: "user-1", role: "customer", email: "a@b.com" });
  });

  it("rejects a tampered token", async () => {
    const token = await signSession({ sub: "user-1", role: "customer", email: "a@b.com" });
    const tampered = token.slice(0, -2) + "xx";
    expect(await verifySession(tampered)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const { SignJWT } = await import("jose");
    const key = await crypto.subtle.importKey(
      "raw",
      Buffer.from(process.env.JWT_SECRET!, "utf8"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const expired = await new SignJWT({ role: "customer" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(key);
    expect(await verifySession(expired)).toBeNull();
  });
});

describe("session cookie flags", () => {
  it("sets HttpOnly, SameSite=Lax and 7-day Max-Age", () => {
    const c = sessionCookie("tok");
    expect(c).toContain(`${SESSION_COOKIE}=tok`);
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain(`Max-Age=${7 * 24 * 60 * 60}`);
  });
  it("clear cookie expires immediately", () => {
    expect(clearSessionCookie()).toContain("Max-Age=0");
  });
});

describe("order number formatting", () => {
  it("formats PST-YYYY-NNNN", () => {
    expect(formatOrderNumber(2026, 1)).toBe("PST-2026-0001");
    expect(formatOrderNumber(2026, 42)).toBe("PST-2026-0042");
    expect(formatOrderNumber(2026, 12345)).toBe("PST-2026-12345");
  });
});
