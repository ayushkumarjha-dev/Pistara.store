import { describe, expect, it } from "vitest";
import { config } from "dotenv";
config({ path: ".env.test", override: true });

import statsHandler from "../../api/admin/stats";
import adminCustomersHandler from "../../api/admin/customers/index";
import adminCustomerHandler from "../../api/admin/customers/[id]";
import adminSettingsHandler from "../../api/admin/settings";
import publicSettingsHandler from "../../api/settings";
import adminOrderHandler from "../../api/admin/orders/[id]";
import { call } from "../helpers/request";
import { loginAsAdmin, customerWithProfile, getVariant, createOrder } from "../helpers/factories";

describe("admin stats", () => {
  it("returns counts, revenue, low stock and a daily series", async () => {
    const { jar } = await loginAsAdmin();
    const customer = await customerWithProfile();
    const { variant } = await getVariant("premium-makhana", "250g");
    const res = await createOrder(customer.jar, [{ variantId: variant.id, quantity: 2 }]);
    const orderId = res.body.data.order.id;
    await call(adminOrderHandler, { method: "PATCH", jar, query: { id: orderId }, body: { status: "PAYMENT_CONFIRMED" } });

    const stats = await call(statsHandler, { jar, query: { range: "7" } });
    expect(stats.status).toBe(200);
    const d = stats.body.data;
    expect(d.totalOrders).toBeGreaterThanOrEqual(1);
    expect(d.revenue).toBeGreaterThanOrEqual(280 * 2 + 50);
    expect(d.totalCustomers).toBeGreaterThanOrEqual(1);
    expect(d.series).toHaveLength(7);
    expect(d.recentOrders.length).toBeGreaterThanOrEqual(1);
    // low stock: roasted-makhana 1kg has stock 4
    expect(d.lowStock.some((l: any) => l.productName === "Roasted Masala Makhana" && l.label === "1kg")).toBe(true);

    const stats30 = await call(statsHandler, { jar, query: { range: "30" } });
    expect(stats30.body.data.series).toHaveLength(30);
  });
});

describe("admin customers", () => {
  it("lists customers with order stats and never leaks password hashes", async () => {
    const { jar } = await loginAsAdmin();
    const customer = await customerWithProfile();
    const { variant } = await getVariant("cashew-w320", "250g");
    await createOrder(customer.jar, [{ variantId: variant.id, quantity: 1 }]);

    const list = await call(adminCustomersHandler, { jar });
    expect(list.status).toBe(200);
    const found = list.body.data.customers.find((c: any) => c.email === customer.email);
    expect(found).toBeTruthy();
    expect(found.orderCount).toBe(1);
    expect(found.city).toBe("Patna");
    expect(JSON.stringify(list.body)).not.toContain("passwordHash");
    expect(JSON.stringify(list.body)).not.toContain("$2"); // bcrypt hash prefix

    const detail = await call(adminCustomerHandler, { jar, query: { id: customer.user.id } });
    expect(detail.status).toBe(200);
    expect(detail.body.data.customer.email).toBe(customer.email);
    expect(detail.body.data.address.city).toBe("Patna");
    expect(detail.body.data.orders).toHaveLength(1);
    expect(JSON.stringify(detail.body)).not.toContain("passwordHash");
  });

  it("searches customers by name/email/mobile", async () => {
    const { jar } = await loginAsAdmin();
    const customer = await customerWithProfile();
    const res = await call(adminCustomersHandler, { jar, query: { q: customer.email } });
    expect(res.body.data.customers.some((c: any) => c.email === customer.email)).toBe(true);
  });
});

describe("admin settings", () => {
  it("updates settings reflected in the public endpoint; new delivery charge applies to new orders only", async () => {
    const { jar } = await loginAsAdmin();

    // Existing order at ₹50 delivery
    const c1 = await customerWithProfile();
    const { variant } = await getVariant("premium-makhana", "250g");
    const oldOrder = await createOrder(c1.jar, [{ variantId: variant.id, quantity: 1 }]);
    expect(oldOrder.body.data.order.deliveryCharge).toBe(50);

    // Admin changes delivery charge to ₹80
    const put = await call(adminSettingsHandler, {
      method: "PUT",
      jar,
      body: { whatsapp_number: "919999999999", delivery_charge: 80 },
    });
    expect(put.status).toBe(200);

    const pub = await call(publicSettingsHandler, {});
    expect(pub.body.data.settings.delivery_charge).toBe("80");

    // New order uses ₹80; old order unchanged
    const c2 = await customerWithProfile();
    const newOrder = await createOrder(c2.jar, [{ variantId: variant.id, quantity: 1 }]);
    expect(newOrder.body.data.order.deliveryCharge).toBe(80);
    expect(newOrder.body.data.order.total).toBe(280 + 80);

    const oldDetail = await call(adminOrderHandler, { jar, query: { id: oldOrder.body.data.order.id } });
    expect(oldDetail.body.data.order.deliveryCharge).toBe(50);
  });

  it("validates the WhatsApp number and delivery charge", async () => {
    const { jar } = await loginAsAdmin();
    const bad = await call(adminSettingsHandler, {
      method: "PUT",
      jar,
      body: { whatsapp_number: "not-a-number", delivery_charge: 50 },
    });
    expect(bad.status).toBe(400);
    const neg = await call(adminSettingsHandler, {
      method: "PUT",
      jar,
      body: { whatsapp_number: "919999999999", delivery_charge: -5 },
    });
    expect(neg.status).toBe(400);
  });
});
