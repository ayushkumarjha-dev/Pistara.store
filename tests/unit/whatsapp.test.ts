import { describe, expect, it } from "vitest";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "../../server-lib/whatsapp";

const order = {
  orderNumber: "PST-2026-0001",
  name: "Ananya Sharma",
  mobile: "9876543210",
  address: "12, Gandhi Maidan Road, Patna, Bihar - 800001",
  items: [
    { product: "Premium Makhana", variant: "500g", qty: 2, line: 1080 },
    { product: "Cashew W320", variant: "250g", qty: 1, line: 399 },
  ],
  subtotal: 1479,
  delivery: 50,
  total: 1529,
};

describe("whatsapp message", () => {
  it("matches the exact required format", () => {
    expect(buildWhatsAppMessage(order)).toBe(
      [
        "🛒 *New Order, Pistara*",
        "Order ID: PST-2026-0001",
        "",
        "*Customer Details*",
        "Name: Ananya Sharma",
        "Mobile: 9876543210",
        "Address: 12, Gandhi Maidan Road, Patna, Bihar - 800001",
        "",
        "*Order Items*",
        "1. Premium Makhana (500g) × 2 = ₹1080",
        "2. Cashew W320 (250g) × 1 = ₹399",
        "",
        "Subtotal: ₹1479",
        "Delivery: ₹50",
        "*Total: ₹1529*",
        "",
        "Please share the payment QR code. Thank you!",
      ].join("\n"),
    );
  });

  it("builds an encoded wa.me URL", () => {
    const url = buildWhatsAppUrl("919999999999", order);
    expect(url.startsWith("https://wa.me/919999999999?text=")).toBe(true);
    const text = decodeURIComponent(url.split("?text=")[1]);
    expect(text).toContain("PST-2026-0001");
    expect(text).toContain("Ananya Sharma");
    expect(text).toContain("*Total: ₹1529*");
  });

  it("handles a single item", () => {
    const msg = buildWhatsAppMessage({ ...order, items: [order.items[0]] });
    expect(msg).toContain("1. Premium Makhana (500g) × 2 = ₹1080");
    expect(msg).not.toContain("2.");
  });
});
