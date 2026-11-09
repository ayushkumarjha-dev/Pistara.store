import { describe, expect, it } from "vitest";
import { config } from "dotenv";
config({ path: ".env.test", override: true });

import adminProductsHandler from "../../api/admin/products/index";
import adminProductHandler from "../../api/admin/products/[id]";
import publicProductsHandler from "../../api/products/index";
import { call, type CookieJar } from "../helpers/request";
import { loginAsAdmin, customerWithProfile, getVariant, createOrder } from "../helpers/factories";

async function categoryId(jar: CookieJar, slug: string) {
  const list = await call(adminProductsHandler, { jar });
  void list;
  const categoriesHandler = (await import("../../api/categories")).default;
  const cats = await call(categoriesHandler, {});
  return cats.body.data.categories.find((c: any) => c.slug === slug).id as string;
}

const sampleProduct = (categoryId: string) => ({
  categoryId,
  name: "Test Almonds",
  nameHi: "बादाम",
  description: "Crunchy California almonds.",
  isFeatured: false,
  isActive: true,
  images: [
    { url: "https://example.com/almonds-1.jpg", sortOrder: 0, isPrimary: true },
    { url: "https://example.com/almonds-2.jpg", sortOrder: 1, isPrimary: false },
  ],
  variants: [
    { label: "250g", weightGrams: 250, price: 300, mrp: 380, stock: 20, isActive: true },
    { label: "500g", weightGrams: 500, price: 580, mrp: 720, stock: 10, isActive: true },
    { label: "1kg", weightGrams: 1000, price: 1100, mrp: 1400, stock: 5, isActive: true },
  ],
});

describe("admin products CRUD", () => {
  it("creates a product with images and variants, visible in the public list", async () => {
    const { jar } = await loginAsAdmin();
    const catId = await categoryId(jar, "cashew");
    const res = await call(adminProductsHandler, {
      method: "POST",
      jar,
      body: sampleProduct(catId),
    });
    expect(res.status).toBe(200);
    expect(res.body.data.product.slug).toBe("test-almonds");

    const pub = await call(publicProductsHandler, { query: { q: "almonds", limit: "50" } });
    expect(pub.body.data.total).toBe(1);
    expect(pub.body.data.products[0].images).toHaveLength(2);
    expect(pub.body.data.products[0].fromPrice).toBe(300);
  });

  it("auto-generates unique slugs for duplicate names", async () => {
    const { jar } = await loginAsAdmin();
    const catId = await categoryId(jar, "cashew");
    const named = { ...sampleProduct(catId), name: "Unique Slug Almonds" };
    const r1 = await call(adminProductsHandler, { method: "POST", jar, body: named });
    const r2 = await call(adminProductsHandler, { method: "POST", jar, body: named });
    expect(r1.body.data.product.slug).toBe("unique-slug-almonds");
    expect(r2.body.data.product.slug).toBe("unique-slug-almonds-2");
  });

  it("edits a product: change price, remove a variant, change primary image", async () => {
    const { jar } = await loginAsAdmin();
    const catId = await categoryId(jar, "cashew");
    const created = await call(adminProductsHandler, {
      method: "POST",
      jar,
      body: sampleProduct(catId),
    });
    const id = created.body.data.product.id;

    const updated = await call(adminProductHandler, {
      method: "PUT",
      jar,
      query: { id },
      body: {
        ...sampleProduct(catId),
        name: "Test Almonds Premium",
        images: [
          { url: "https://example.com/almonds-2.jpg", sortOrder: 0, isPrimary: true },
          { url: "https://example.com/almonds-1.jpg", sortOrder: 1, isPrimary: false },
        ],
        variants: [
          { label: "250g", weightGrams: 250, price: 350, mrp: 420, stock: 15, isActive: true },
          { label: "500g", weightGrams: 500, price: 660, mrp: 800, stock: 8, isActive: true },
        ],
      },
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data.product.name).toBe("Test Almonds Premium");
    expect(updated.body.data.product.variants).toHaveLength(2);
    expect(updated.body.data.product.variants.find((v: any) => v.label === "250g").price).toBe(350);
    const primary = updated.body.data.product.images.find((i: any) => i.isPrimary);
    expect(primary.url).toBe("https://example.com/almonds-2.jpg");
  });

  it("hard-deletes a product that was never ordered", async () => {
    const { jar } = await loginAsAdmin();
    const catId = await categoryId(jar, "cashew");
    const created = await call(adminProductsHandler, {
      method: "POST",
      jar,
      body: sampleProduct(catId),
    });
    const id = created.body.data.product.id;

    const del = await call(adminProductHandler, { method: "DELETE", jar, query: { id } });
    expect(del.body.data.deleted).toBe("hard");
    const got = await call(adminProductHandler, { jar, query: { id } });
    expect(got.status).toBe(404);
  });

  it("soft-deletes a product that appears in an order, hiding it from the shop", async () => {
    const { jar: adminJar } = await loginAsAdmin();
    const customer = await customerWithProfile();
    const { product, variant } = await getVariant("black-raisins", "250g");
    await createOrder(customer.jar, [{ variantId: variant.id, quantity: 1 }]);

    const del = await call(adminProductHandler, {
      method: "DELETE",
      jar: adminJar,
      query: { id: product.id },
    });
    expect(del.body.data.deleted).toBe("soft");

    const pub = await call(publicProductsHandler, { query: { q: "black", limit: "50" } });
    expect(pub.body.data.products.find((p: any) => p.id === product.id)).toBeUndefined();
  });

  it("rejects invalid image URLs", async () => {
    const { jar } = await loginAsAdmin();
    const catId = await categoryId(jar, "cashew");
    const bad = sampleProduct(catId);
    bad.images = [{ url: "javascript:alert(1)", sortOrder: 0, isPrimary: true }];
    const res = await call(adminProductsHandler, { method: "POST", jar, body: bad });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
