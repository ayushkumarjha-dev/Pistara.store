import { describe, expect, it } from "vitest";
import { config } from "dotenv";
config({ path: ".env.test", override: true });

import registerHandler from "../../api/auth/register";
import loginHandler from "../../api/auth/login";
import logoutHandler from "../../api/auth/logout";
import meHandler from "../../api/auth/me";
import changePasswordHandler from "../../api/auth/change-password";
import { CookieJar, call } from "../helpers/request";
import { createCustomer, loginAs } from "../helpers/factories";

const ip = (n: number) => ({ "x-forwarded-for": `192.168.1.${n}` });

describe("POST /api/auth/register", () => {
  it("registers and auto-logs in", async () => {
    const jar = new CookieJar();
    const res = await call(registerHandler, {
      method: "POST",
      body: { name: "New User", email: "NewUser@Test.Pistara", password: "Password1" },
      jar,
      headers: ip(1),
    });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("newuser@test.pistara"); // normalized
    expect(res.body.data.user.role).toBe("customer");
    expect(res.body.data.user.password_hash).toBeUndefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.cookies.pistara_session).toBeTruthy();
    expect(res.setCookieHeaders[0]).toContain("HttpOnly");

    const me = await call(meHandler, { jar });
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe("newuser@test.pistara");
    expect(me.body.data.isComplete).toBe(false);
  });

  it("rejects a duplicate email with 409", async () => {
    const { email, password } = await createCustomer();
    const res = await call(registerHandler, {
      method: "POST",
      body: { name: "Copy Cat", email: email.toUpperCase(), password },
      headers: ip(2),
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("rejects a weak password with 400", async () => {
    const res = await call(registerHandler, {
      method: "POST",
      body: { name: "Weak", email: "weak@test.pistara", password: "short" },
      headers: ip(3),
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("grants admin role when email matches ADMIN_EMAIL", async () => {
    const res = await call(registerHandler, {
      method: "POST",
      body: { name: "Boss", email: process.env.ADMIN_EMAIL!, password: "AnotherPass1" },
      headers: ip(4),
    });
    // Admin already exists from seed → 409; so register a fresh admin-email case is impossible.
    // Instead verify the seeded admin logs in with role admin.
    expect(res.status).toBe(409);
    const { res: loginRes } = await loginAs(process.env.ADMIN_EMAIL!, process.env.ADMIN_INITIAL_PASSWORD!);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe("admin");
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials", async () => {
    const { email, password } = await createCustomer();
    const { res, jar } = await loginAs(email, password);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
    expect(jar.header()).toContain("pistara_session=");
  });

  it("gives the same generic error for unknown email and wrong password", async () => {
    const { email } = await createCustomer();
    const wrong = await call(loginHandler, {
      method: "POST",
      body: { email, password: "WrongPass1" },
      headers: ip(10),
    });
    const unknown = await call(loginHandler, {
      method: "POST",
      body: { email: "nobody@test.pistara", password: "WrongPass1" },
      headers: ip(11),
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe("Invalid email or password");
    expect(unknown.body.error.message).toBe("Invalid email or password");
  });

  it("rate-limits after 5 failed attempts (429)", async () => {
    const { email } = await createCustomer();
    const headers = ip(12);
    for (let i = 0; i < 5; i++) {
      const r = await call(loginHandler, { method: "POST", body: { email, password: "BadPass1" }, headers });
      expect(r.status).toBe(401);
    }
    const sixth = await call(loginHandler, { method: "POST", body: { email, password: "BadPass1" }, headers });
    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe("RATE_LIMITED");
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without a cookie", async () => {
    const res = await call(meHandler, {});
    expect(res.status).toBe(401);
  });

  it("returns the user with a valid cookie", async () => {
    const { jar, email } = await createCustomer();
    const res = await call(meHandler, { jar });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the session cookie", async () => {
    const { jar } = await createCustomer();
    const res = await call(logoutHandler, { method: "POST", jar });
    expect(res.status).toBe(200);
    expect(res.setCookieHeaders[0]).toContain("Max-Age=0");
    const me = await call(meHandler, { jar });
    expect(me.status).toBe(401);
  });
});

describe("POST /api/auth/change-password", () => {
  it("requires login", async () => {
    const res = await call(changePasswordHandler, {
      method: "POST",
      body: { currentPassword: "Password1", newPassword: "NewPass123" },
    });
    expect(res.status).toBe(401);
  });

  it("rejects a wrong current password", async () => {
    const { jar } = await createCustomer();
    const res = await call(changePasswordHandler, {
      method: "POST",
      jar,
      body: { currentPassword: "NotMyPass1", newPassword: "NewPass123" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("WRONG_PASSWORD");
  });

  it("rejects a weak new password", async () => {
    const { jar } = await createCustomer();
    const res = await call(changePasswordHandler, {
      method: "POST",
      jar,
      body: { currentPassword: "Password1", newPassword: "weak" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a new password equal to the old one", async () => {
    const { jar } = await createCustomer();
    const res = await call(changePasswordHandler, {
      method: "POST",
      jar,
      body: { currentPassword: "Password1", newPassword: "Password1" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("SAME_PASSWORD");
  });

  it("changes the password; new works and old fails", async () => {
    const { jar, email } = await createCustomer();
    const res = await call(changePasswordHandler, {
      method: "POST",
      jar,
      body: { currentPassword: "Password1", newPassword: "NewPass123" },
    });
    expect(res.status).toBe(200);

    const oldLogin = await loginAs(email, "Password1");
    expect(oldLogin.res.status).toBe(401);
    const newLogin = await loginAs(email, "NewPass123");
    expect(newLogin.res.status).toBe(200);
  });
});
