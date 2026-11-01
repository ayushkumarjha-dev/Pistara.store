import { describe, expect, it } from "vitest";
import { config } from "dotenv";
config({ path: ".env.test", override: true });

import { eq } from "drizzle-orm";
import ordersHandler from "../../api/orders/index";
import orderDetailHandler from "../../api/orders/[id]";
import cancelHandler from "../../api/orders/[id]/cancel";
import { call, CookieJar } from "../helpers/request";
import { createCustomer, completeProfile, customerWithProfile, getVariant, createOrder } from "../helpers/factories";
import { getDb } from "../../db/client";
import { orders as ordersTable, productVariants } from "../../db/schema";

describe("POST /api/orders", () => {
  it("requires login", async () => {
    const res = await call(ordersHandler, { method: "POST", body: { items: [{ variantId: "x", quantity: 1 }] } });
    expect(res.status).toBe(401);
  });

  it("blocks checkout with an incomplete profile (422)", async () => {
    const { jar } = await createCustomer(); // no profile completed
    const { variant } = await getVariant("premium-makhana");
    const res = await createOrder(jar, [{ variantId: variant.id, quantity: 1 }]);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("PROFILE_INCOMPLETE");
  });

  it("creates an order with server-computed totals, ₹50 delivery, PENDING, stock untouched", async () => {
    const { jar } = await customerWithProfile();
    const { variant } = await getVariant("premium-makhana", "500g"); // ₹540, stock 30
    const { variant: v2 } = await getVariant("cashew-w320", "250g"); // ₹399

    const res = await createOrder(jar, [
      { variantId: variant.id, quantity: 2 },
      { variantId: v2.id, quantity: 1 },
    ]);
    expect(res.status).toBe(200);
    const { order, whatsappUrl } = res.body.data;
    expect(order.status).toBe("PENDING");
    expect(order.stockDeducted).toBe(false);
    expect(order.subtotal).toBe(540 * 2 + 399);
    expect(order.deliveryCharge).toBe(50);
    expect(order.total).toBe(540 * 2 + 399 + 50);
    expect(order.orderNumber).toMatch(/^PST-\d{4}-\d{4}$/);

    // WhatsApp URL
    expect(whatsappUrl.startsWith("https://wa.me/919999999999?text=")).toBe(true);
    const text = decodeURIComponent(whatsappUrl.split("?text=")[1]);
    expect(text).toContain(order.orderNumber);
    expect(text).toContain("Premium Makhana (500g) × 2 = ₹1080");
    expect(text).toContain("*Total: ₹1529*");

    // Stock NOT deducted at placement
    const db = getDb();
    const [v] = await db.select().from(productVariants).where(eq(productVariants.id, variant.id));
    expect(v.stock).toBe(30);
  });

  it("rejects insufficient stock with 409 naming the item", async () => {
    const { jar } = await customerWithProfile();
    const { variant } = await getVariant("roasted-makhana", "1kg"); // stock 4
    const res = await createOrder(jar, [{ variantId: variant.id, quantity: 5 }]);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
    expect(res.body.error.message).toContain("Roasted Masala Makhana");
  });

  it("rejects quantity above 20", async () => {
    const { jar } = await customerWithProfile();
    const { variant } = await getVariant("premium-makhana");
    const res = await createOrder(jar, [{ variantId: variant.id, quantity: 21 }]);
    expect(res.status).toBe(400);
  });

  it("rejects an unknown/inactive variant", async () => {
    const { jar } = await customerWithProfile();
    const res = await createOrder(jar, [{ variantId: "nonexistent", quantity: 1 }]);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ITEM_UNAVAILABLE");
  });

  it("issues unique sequential order numbers under concurrency", async () => {
    const { jar } = await customerWithProfile();
    const { variant } = await getVariant("black-raisins", "250g");
    const results = await Promise.all(
      Array.from({ length: 5 }, () => createOrder(jar, [{ variantId: variant.id, quantity: 1 }])),
    );
    for (const r of results) expect(r.status).toBe(200);
    const numbers = results.map((r) => r.body.data.order.orderNumber);
    expect(new Set(numbers).size).toBe(5);
    const seqs = numbers.map((n: string) => Number(n.split("-")[2])).sort((a, b) => a - b);
    for (let i = 1; i < seqs.length; i++) expect(seqs[i]).toBe(seqs[i - 1] + 1);
  });

  it("keeps price snapshots even after a product price change", async () => {
    const { jar } = await customerWithProfile();
    const { variant } = await getVariant("kishmish-green-raisins", "250g");
    const res = await createOrder(jar, [{ variantId: variant.id, quantity: 1 }]);
    const orderId = res.body.data.order.id;

    // Admin edits the price directly in DB
    const db = getDb();
    await db.update(productVariants).set({ price: 9999 }).where(eq(productVariants.id, variant.id));

    const detail = await call(orderDetailHandler, { jar, query: { id: orderId } });
    expect(detail.body.data.items[0].unitPrice).toBe(199); // snapshot unchanged
    expect(detail.body.data.order.total).toBe(199 + 50);
  });
});

describe("GET /api/orders and /api/orders/[id]", () => {
  it("lists only the current user's orders, newest first", async () => {
    const a = await customerWithProfile();
    const b = await customerWithProfile();
    const { variant } = await getVariant("premium-makhana", "250g");
    await createOrder(a.jar, [{ variantId: variant.id, quantity: 1 }]);
    await createOrder(a.jar, [{ variantId: variant.id, quantity: 1 }]);
    await createOrder(b.jar, [{ variantId: variant.id, quantity: 1 }]);

    const listA = await call(ordersHandler, { method: "GET", jar: a.jar });
    expect(listA.body.data.orders).toHaveLength(2);
    const listB = await call(ordersHandler, { method: "GET", jar: b.jar });
    expect(listB.body.data.orders).toHaveLength(1);
    const created = listA.body.data.orders.map((o: any) => o.createdAt);
    expect([...created].sort((x, y) => y - x)).toEqual(created);
  });

  it("returns order detail with items and history; 404 for another user's order", async () => {
    const a = await customerWithProfile();
    const b = await customerWithProfile();
    const { variant } = await getVariant("premium-makhana", "250g");
    const res = await createOrder(a.jar, [{ variantId: variant.id, quantity: 1 }]);
    const orderId = res.body.data.order.id;

    const detail = await call(orderDetailHandler, { jar: a.jar, query: { id: orderId } });
    expect(detail.status).toBe(200);
    expect(detail.body.data.items).toHaveLength(1);
    expect(detail.body.data.history).toHaveLength(1);
    expect(detail.body.data.history[0].actor).toBe("customer");

    const other = await call(orderDetailHandler, { jar: b.jar, query: { id: orderId } });
    expect(other.status).toBe(404);
  });
});

describe("POST /api/orders/[id]/cancel", () => {
  it("cancels a PENDING order (no stock restore needed)", async () => {
    const { jar } = await customerWithProfile();
    const { variant } = await getVariant("premium-makhana", "250g");
    const res = await createOrder(jar, [{ variantId: variant.id, quantity: 2 }]);
    const orderId = res.body.data.order.id;

    const db = getDb();
    const [before] = await db.select().from(productVariants).where(eq(productVariants.id, variant.id));
    const cancel = await call(cancelHandler, { method: "POST", jar, query: { id: orderId } });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.order.status).toBe("CANCELLED");

    // Stock was never deducted, so it must be unchanged
    const [v] = await db.select().from(productVariants).where(eq(productVariants.id, variant.id));
    expect(v.stock).toBe(before.stock);
  });

  it("restores stock when cancelling after deduction", async () => {
    const { jar } = await customerWithProfile();
    const { variant } = await getVariant("cashew-roasted-salted", "250g"); // stock 40
    const res = await createOrder(jar, [{ variantId: variant.id, quantity: 3 }]);
    const orderId = res.body.data.order.id;

    // Simulate admin confirming payment (stock deducted)
    const db = getDb();
    await db
      .update(productVariants)
      .set({ stock: 40 - 3 })
      .where(eq(productVariants.id, variant.id));
    await db
      .update(ordersTable)
      .set({ status: "PAYMENT_CONFIRMED", stockDeducted: true })
      .where(eq(ordersTable.id, orderId));

    const cancel = await call(cancelHandler, { method: "POST", jar, query: { id: orderId } });
    expect(cancel.status).toBe(200);
    const [v] = await db.select().from(productVariants).where(eq(productVariants.id, variant.id));
    expect(v.stock).toBe(40); // restored
  });

  it("rejects cancel from SHIPPED and later, and double-cancel", async () => {
    const { jar } = await customerWithProfile();
    const { variant } = await getVariant("premium-makhana", "250g");
    const res = await createOrder(jar, [{ variantId: variant.id, quantity: 1 }]);
    const orderId = res.body.data.order.id;
    const db = getDb();

    for (const status of ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const) {
      await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, orderId));
      const r = await call(cancelHandler, { method: "POST", jar, query: { id: orderId } });
      expect(r.status).toBe(409);
      expect(r.body.error.code).toBe("CANNOT_CANCEL");
    }

    await db.update(ordersTable).set({ status: "CANCELLED" }).where(eq(ordersTable.id, orderId));
    const again = await call(cancelHandler, { method: "POST", jar, query: { id: orderId } });
    expect(again.status).toBe(409);
  });

  it("cannot cancel another user's order (404)", async () => {
    const a = await customerWithProfile();
    const b = await customerWithProfile();
    const { variant } = await getVariant("premium-makhana", "250g");
    const res = await createOrder(a.jar, [{ variantId: variant.id, quantity: 1 }]);
    const r = await call(cancelHandler, { method: "POST", jar: b.jar, query: { id: res.body.data.order.id } });
    expect(r.status).toBe(404);
  });
});
