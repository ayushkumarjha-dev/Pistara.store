import { describe, expect, it } from "vitest";
import { config } from "dotenv";
config({ path: ".env.test", override: true });

import productsHandler from "../../api/products/index";
import productDetailHandler from "../../api/products/[slug]";
import categoriesHandler from "../../api/categories";
import settingsHandler from "../../api/settings";
import profileHandler from "../../api/profile";
import { call } from "../helpers/request";
import { createCustomer } from "../helpers/factories";

describe("GET /api/products", () => {
  it("lists active products with images, variants and fromPrice", async () => {
    const res = await call(productsHandler, { query: { limit: "50" } });
    expect(res.status).toBe(200);
    const { products, total } = res.body.data;
    expect(total).toBe(8);
    for (const p of products) {
      expect(p.isActive).toBe(true);
      expect(p.deletedAt).toBeNull();
      expect(p.images.length).toBeGreaterThan(0);
      expect(p.variants.length).toBe(3);
      expect(p.fromPrice).toBe(Math.min(...p.variants.filter((v: any) => v.isActive).map((v: any) => v.price)));
    }
  });

  it("filters by category", async () => {
    const res = await call(productsHandler, { query: { category: "makhana", limit: "50" } });
    expect(res.body.data.total).toBe(3);
    for (const p of res.body.data.products) expect(p.name.toLowerCase()).toContain("makhana");
  });

  it("searches by name", async () => {
    const res = await call(productsHandler, { query: { q: "cashew", limit: "50" } });
    expect(res.body.data.total).toBe(2);
  });

  it("filters by price range", async () => {
    const res = await call(productsHandler, { query: { minPrice: "200", maxPrice: "300", limit: "50" } });
    for (const p of res.body.data.products) {
      expect(p.fromPrice).toBeGreaterThanOrEqual(200);
      expect(p.fromPrice).toBeLessThanOrEqual(300);
    }
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it("filters in-stock only", async () => {
    const res = await call(productsHandler, { query: { inStock: "true", limit: "50" } });
    for (const p of res.body.data.products) expect(p.totalStock).toBeGreaterThan(0);
  });

  it("sorts by price ascending and descending", async () => {
    const asc = await call(productsHandler, { query: { sort: "price-asc", limit: "50" } });
    const prices = asc.body.data.products.map((p: any) => p.fromPrice);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    const descRes = await call(productsHandler, { query: { sort: "price-desc", limit: "50" } });
    const dprices = descRes.body.data.products.map((p: any) => p.fromPrice);
    expect([...dprices].sort((a, b) => b - a)).toEqual(dprices);
  });

  it("paginates", async () => {
    const page1 = await call(productsHandler, { query: { page: "1", limit: "3" } });
    const page2 = await call(productsHandler, { query: { page: "2", limit: "3" } });
    expect(page1.body.data.products).toHaveLength(3);
    expect(page2.body.data.products).toHaveLength(3);
    const ids1 = page1.body.data.products.map((p: any) => p.id);
    const ids2 = page2.body.data.products.map((p: any) => p.id);
    expect(ids1.filter((id: string) => ids2.includes(id))).toHaveLength(0);
  });
});

describe("GET /api/products/[slug]", () => {
  it("returns the product with related products", async () => {
    const res = await call(productDetailHandler, { query: { slug: "premium-makhana" } });
    expect(res.status).toBe(200);
    expect(res.body.data.product.slug).toBe("premium-makhana");
    expect(res.body.data.product.variants).toHaveLength(3);
    expect(res.body.data.related.length).toBeGreaterThan(0);
    for (const r of res.body.data.related) expect(r.slug).not.toBe("premium-makhana");
  });

  it("404s for an unknown slug", async () => {
    const res = await call(productDetailHandler, { query: { slug: "does-not-exist" } });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/categories and /api/settings", () => {
  it("returns 3 seeded categories in order", async () => {
    const res = await call(categoriesHandler, {});
    expect(res.status).toBe(200);
    expect(res.body.data.categories.map((c: any) => c.slug)).toEqual(["makhana", "cashew", "dried-grapes"]);
  });

  it("returns public settings only", async () => {
    const res = await call(settingsHandler, {});
    expect(res.status).toBe(200);
    expect(res.body.data.settings.delivery_charge).toBe("50");
    expect(res.body.data.settings.whatsapp_number).toBe("919999999999");
  });
});

describe("GET/PUT /api/profile", () => {
  it("requires login", async () => {
    const res = await call(profileHandler, { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("saves a valid profile and flips isComplete", async () => {
    const { jar } = await createCustomer();
    const before = await call(profileHandler, { method: "GET", jar });
    expect(before.body.data.isComplete).toBe(false);

    const put = await call(profileHandler, {
      method: "PUT",
      jar,
      body: {
        name: "Full Name",
        mobile: "9876543210",
        address: { line1: "1 Main St", city: "Patna", state: "Bihar", pincode: "800001" },
      },
    });
    expect(put.status).toBe(200);
    expect(put.body.data.isComplete).toBe(true);
    expect(put.body.data.address.city).toBe("Patna");

    const after = await call(profileHandler, { method: "GET", jar });
    expect(after.body.data.isComplete).toBe(true);
    expect(after.body.data.user.mobile).toBe("9876543210");
  });

  it("rejects an invalid mobile", async () => {
    const { jar } = await createCustomer();
    const res = await call(profileHandler, {
      method: "PUT",
      jar,
      body: {
        name: "Full Name",
        mobile: "1234567890",
        address: { line1: "1 Main St", city: "Patna", state: "Bihar", pincode: "800001" },
      },
    });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid pincode", async () => {
    const { jar } = await createCustomer();
    const res = await call(profileHandler, {
      method: "PUT",
      jar,
      body: {
        name: "Full Name",
        mobile: "9876543210",
        address: { line1: "1 Main St", city: "Patna", state: "Bihar", pincode: "80001" },
      },
    });
    expect(res.status).toBe(400);
  });
});
