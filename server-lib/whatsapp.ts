export interface WhatsAppOrderItem {
  product: string;
  variant: string;
  qty: number;
  line: number;
}

export interface WhatsAppOrderData {
  orderNumber: string;
  name: string;
  mobile: string;
  address: string;
  items: WhatsAppOrderItem[];
  subtotal: number;
  delivery: number;
  total: number;
}

export function buildWhatsAppMessage(o: WhatsAppOrderData): string {
  const lines = o.items.map((it, i) => `${i + 1}. ${it.product} (${it.variant}) × ${it.qty} = ₹${it.line}`);
  return [
    "🛒 *New Order, Pistara*",
    `Order ID: ${o.orderNumber}`,
    "",
    "*Customer Details*",
    `Name: ${o.name}`,
    `Mobile: ${o.mobile}`,
    `Address: ${o.address}`,
    "",
    "*Order Items*",
    ...lines,
    "",
    `Subtotal: ₹${o.subtotal}`,
    `Delivery: ₹${o.delivery}`,
    `*Total: ₹${o.total}*`,
    "",
    "Please share the payment QR code. Thank you!",
  ].join("\n");
}

export function buildWhatsAppUrl(whatsappNumber: string, o: WhatsAppOrderData): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(buildWhatsAppMessage(o))}`;
}
