import { describe, expect, it } from "vitest";
import {
  emailSchema,
  imageUrlSchema,
  mobileSchema,
  passwordSchema,
  pincodeSchema,
  registerSchema,
} from "../../shared/schemas";

describe("mobile schema", () => {
  it("accepts valid Indian mobiles", () => {
    expect(mobileSchema.safeParse("9876543210").success).toBe(true);
    expect(mobileSchema.safeParse("6123456789").success).toBe(true);
  });
  it("rejects invalid mobiles", () => {
    for (const m of ["1234567890", "5876543210", "987654321", "98765432109", "98765 43210", "abcdefghij"]) {
      expect(mobileSchema.safeParse(m).success).toBe(false);
    }
  });
});

describe("pincode schema", () => {
  it("accepts 6 digits", () => expect(pincodeSchema.safeParse("800001").success).toBe(true));
  it("rejects non-6-digit values", () => {
    for (const p of ["80001", "8000011", "80 0001", "abcdef"]) {
      expect(pincodeSchema.safeParse(p).success).toBe(false);
    }
  });
});

describe("password schema", () => {
  it("requires 8+ chars, a letter and a number", () => {
    expect(passwordSchema.safeParse("Password1").success).toBe(true);
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("allletters").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
  });
});

describe("email normalization", () => {
  it("trims and lowercases", () => {
    expect(emailSchema.parse("  User@Example.COM ")).toBe("user@example.com");
  });
  it("rejects invalid emails", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
  it("register schema normalizes email", () => {
    const parsed = registerSchema.parse({ name: "Ab", email: "A@B.COM", password: "Password1" });
    expect(parsed.email).toBe("a@b.com");
  });
});

describe("image URL schema", () => {
  it("accepts http/https URLs", () => {
    expect(imageUrlSchema.safeParse("https://example.com/a.jpg").success).toBe(true);
    expect(imageUrlSchema.safeParse("http://example.com/a.jpg").success).toBe(true);
  });
  it("accepts root-relative paths (seeded catalog images use them)", () => {
    expect(imageUrlSchema.safeParse("/images/makhana.jpg").success).toBe(true);
  });
  it("rejects non-http URLs and junk", () => {
    for (const u of ["ftp://x.com/a.jpg", "javascript:alert(1)", "notaurl", "relative/path.jpg"]) {
      expect(imageUrlSchema.safeParse(u).success).toBe(false);
    }
  });
});
