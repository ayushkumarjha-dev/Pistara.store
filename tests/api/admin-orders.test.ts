import { describe, expect, it } from "vitest";
import { config } from "dotenv";
config({ path: ".env.test", override: true });

import { eq } from "drizzle-orm";
import adminOrdersHandler from "../../api/admin/orders/index";
import adminOrderHandler from "../../api/admin/orders/[id]";
import { call, type CookieJar } from "../helpers/request";
import { customerWithProfile, getVariant, createOrder, loginAsAdmin } from "../helpers/factories";
import { getDb } from "../../db/client";
import { productVariants } from "../../db/schema";

async function setupOrder(
  variantSlug = "premium-makhana",
  label: "250g" | "500g" | "1kg" = "250g",
  qty = 2,
) {
  const customer = await customerWithProfile();
  const { variant } = await getVariant(variantSlug, label);
  const res = await createOrder(customer.jar, [{ variantId: variant.id, quantity: qty }]);
  const admin = await loginAsAdmin();
  return { customer, variant, order: res.body.data.order, adminJar: admin.jar };
}

const patch = (jar: CookieJar, id: string, body: unknown) =>
  call(adminOrderHandler, { method: "PATCH", jar, query: { id }, body });

describe("admin order pipeline", () => {
  it("walks the full pipeline with history rows and single stock deduction", async () => {
    const { variant, order, adminJar } = await setupOrder("premium-makhana", "250g", 2); // stock 40
    const db = getDb();

    const confirm = await patch(adminJar, order.id, { status: "PAYMENT_CONFIRMED" });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.order.stockDeducted).toBe(true);
    let [v] = await db.select().from(productVariants).where(eq(productVariants.id, variant.id));
    expect(v.stock).toBe(38); // deducted exactly once

    const packed = await patch(adminJar, order.id, { status: "PACKED" });
    expect(packed.status).toBe(200);
    [v] = await db.select().from(productVariants).where(eq(productVariants.id, variant.id));
    expect(v.stock).toBe(38); // not deducted again

    const shipped = await patch(adminJar, order.id, {
      status: "SHIPPED",
      courierName: "Delhivery",
      trackingId: "DLV123456",
    });
    expect(shipped.status).toBe(200);
    expect(shipped.body.data.order.courierName).toBe("Delhivery");
    expect(shipped.body.data.order.trackingId).toBe("DLV123456");

    const ofd = await patch(adminJar, order.id, { status: "OUT_FOR_DELIVERY" });
    expect(ofd.status).toBe(200);
    const delivered = await patch(adminJar, order.id, { status: "DELIVERED" });
    expect(delivered.status).toBe(200);

    const statuses = delivered.body.data.history.map((h: any) => h.status);
    expect(statuses).toEqual([
      "PENDING",
      "PAYMENT_CONFIRMED",
      "PACKED",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ]);
  });

  it("deducts stock when skipping straight to a later status", async () => {
    const { variant, order, adminJar } = await setupOrder("cashew-w320", "500g", 1); // stock 30
    const res = await patch(adminJar, order.id, {
      status: "SHIPPED",
      courierName: "BlueDart",
      trackingId: "BD999",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.order.stockDeducted).toBe(true);
    const db = getDb();
    const [v] = await db.select().from(productVariants).where(eq(productVariants.id, variant.id));
    expect(v.stock).toBe(29);
  });

  it("rejects PAYMENT_CONFIRMED with insufficient stock (409, nothing changes)", async () => {
    const { variant, order, adminJar } = await setupOrder("roasted-makhana", "1kg", 4); // stock 4, order takes all
    const db = getDb();
    // Someone else buys the stock in the meantime
    await db.update(productVariants).set({ stock: 1 }).where(eq(productVariants.id, variant.id));

    const res = await patch(adminJar, order.id, { status: "PAYMENT_CONFIRMED" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
    expect(res.body.error.message).toContain("Roasted Masala Makhana");

    const [o] = await db
      .select()
      .from((await import("../../db/schema")).orders)
      .where(eq((await import("../../db/schema")).orders.id, order.id));
    expect(o.status).toBe("PENDING");
    expect(o.stockDeducted).toBe(false);
    const [v] = await db.select().from(productVariants).where(eq(productVariants.id, variant.id));
    expect(v.stock).toBe(1);
  });

  it("rejects SHIPPED without courier/tracking (400)", async () => {
    const { order, adminJar } = await setupOrder();
    await patch(adminJar, order.id, { status: "PAYMENT_CONFIRMED" });
    await patch(adminJar, order.id, { status: "PACKED" });
    const res = await patch(adminJar, order.id, { status: "SHIPPED" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("SHIPPING_INFO_REQUIRED");
  });

  it("rejects backward moves", async () => {
    const { order, adminJar } = await setupOrder();
    await patch(adminJar, order.id, { status: "PAYMENT_CONFIRMED" });
    const res = await patch(adminJar, order.id, { status: "PENDING" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
  });

  it("admin cancel restores stock only when deducted", async () => {
    // Case 1: deducted → restore
    const s1 = await setupOrder("premium-makhana", "250g", 2);
    const db = getDb();
    const [before1] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, s1.variant.id));
    await patch(s1.adminJar, s1.order.id, { status: "PAYMENT_CONFIRMED" });
    const c1 = await patch(s1.adminJar, s1.order.id, {
      status: "CANCELLED",
      note: "Customer requested",
    });
    expect(c1.status).toBe(200);
    let [v] = await db.select().from(productVariants).where(eq(productVariants.id, s1.variant.id));
    expect(v.stock).toBe(before1.stock); // restored to pre-deduction level

    // Case 2: not deducted → nothing to restore
    const s2 = await setupOrder("cashew-w320", "250g", 1);
    const [before2] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, s2.variant.id));
    const c2 = await patch(s2.adminJar, s2.order.id, { status: "CANCELLED" });
    expect(c2.status).toBe(200);
    [v] = await db.select().from(productVariants).where(eq(productVariants.id, s2.variant.id));
    expect(v.stock).toBe(before2.stock);
  });

  it("a delivered order cannot be changed", async () => {
    const { order, adminJar } = await setupOrder();
    await patch(adminJar, order.id, { status: "PAYMENT_CONFIRMED" });
    await patch(adminJar, order.id, { status: "DELIVERED" });
    const res = await patch(adminJar, order.id, { status: "CANCELLED" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ORDER_FINAL");
  });
});

describe("admin orders list", () => {
  it("filters by status, searches by number/name/mobile, paginates", async () => {
    const a = await setupOrder();
    const b = await setupOrder();
    await patch(a.adminJar, a.order.id, { status: "PAYMENT_CONFIRMED" });

    const pending = await call(adminOrdersHandler, {
      jar: a.adminJar,
      query: { status: "PENDING", limit: "50" },
    });
    expect(pending.body.data.orders.every((o: any) => o.status === "PENDING")).toBe(true);

    const byNumber = await call(adminOrdersHandler, {
      jar: a.adminJar,
      query: { q: a.order.orderNumber },
    });
    expect(byNumber.body.data.orders).toHaveLength(1);
    expect(byNumber.body.data.orders[0].id).toBe(a.order.id);

    const byMobile = await call(adminOrdersHandler, {
      jar: a.adminJar,
      query: { q: "9876543210" },
    });
    expect(byMobile.body.data.orders.length).toBeGreaterThanOrEqual(2);

    const page = await call(adminOrdersHandler, {
      jar: a.adminJar,
      query: { page: "1", limit: "1" },
    });
    expect(page.body.data.orders).toHaveLength(1);
    expect(page.body.data.total).toBeGreaterThanOrEqual(2);
  });
});
