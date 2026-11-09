import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import {
  addresses,
  orderCounters,
  orderItems,
  orders,
  orderStatusHistory,
  productImages,
  products,
  productVariants,
  settings,
  users,
} from "../../db/schema";
import { createOrderSchema } from "../../shared/schemas";
import { handler, HttpError } from "../../server-lib/http";
import { requireUser } from "../../server-lib/auth";
import { formatOrderNumber } from "../../server-lib/order-number";
import { buildWhatsAppUrl } from "../../server-lib/whatsapp";

export default handler({
  methods: ["GET", "POST"],
  body: createOrderSchema,
  handler: async ({ req, body }) => {
    const session = await requireUser(req);
    const db = getDb();

    // GET /api/orders - List current user's orders (newest first)
    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, session.sub))
        .orderBy(desc(orders.createdAt));
      const ids = rows.map((o) => o.id);
      const items = ids.length
        ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids))
        : [];
      return {
        orders: rows.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) })),
      };
    }

    // POST /api/orders - Create order
    const [user] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
    const [address] = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, session.sub))
      .limit(1);
    const isComplete = Boolean(
      user?.name &&
      user?.mobile &&
      address?.line1 &&
      address?.city &&
      address?.state &&
      address?.pincode,
    );
    if (!user || !isComplete) {
      throw new HttpError(
        422,
        "PROFILE_INCOMPLETE",
        "Please complete your profile and address before ordering",
      );
    }

    const [deliveryRow] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "delivery_charge"))
      .limit(1);
    const deliveryCharge = Number(deliveryRow?.value ?? 50);
    const [waRow] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "whatsapp_number"))
      .limit(1);
    const whatsappNumber = waRow?.value ?? "";

    const variantIds = body.items.map((i) => i.variantId);
    const variants = await db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.id, variantIds));
    const productIds = [...new Set(variants.map((v) => v.productId))];
    const prods = productIds.length
      ? await db.select().from(products).where(inArray(products.id, productIds))
      : [];
    const images = productIds.length
      ? await db.select().from(productImages).where(inArray(productImages.productId, productIds))
      : [];

    const lines = body.items.map((item) => {
      const variant = variants.find((v) => v.id === item.variantId);
      const product = variant ? prods.find((p) => p.id === variant.productId) : undefined;
      if (!variant || !product || !variant.isActive || !product.isActive || product.deletedAt) {
        throw new HttpError(409, "ITEM_UNAVAILABLE", "An item in your cart is no longer available");
      }
      if (variant.stock < item.quantity) {
        throw new HttpError(
          409,
          "INSUFFICIENT_STOCK",
          `Not enough stock for ${product.name} (${variant.label}) - only ${variant.stock} left`,
        );
      }
      const image =
        images.find((i) => i.productId === product.id && i.isPrimary) ??
        images.find((i) => i.productId === product.id);
      return {
        product,
        variant,
        quantity: item.quantity,
        unitPrice: variant.price,
        lineTotal: variant.price * item.quantity,
        imageUrl: image?.url ?? null,
      };
    });

    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const total = subtotal + deliveryCharge;
    const addressText = [
      address!.line1,
      address!.line2,
      address!.area,
      address!.city,
      address!.state,
      address!.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    const order = await db.transaction(async (tx) => {
      const year = new Date().getFullYear();
      await tx
        .insert(orderCounters)
        .values({ year, lastNumber: 1 })
        .onConflictDoUpdate({
          target: orderCounters.year,
          set: { lastNumber: sql`${orderCounters.lastNumber} + 1` },
        });
      const [counter] = await tx
        .select()
        .from(orderCounters)
        .where(eq(orderCounters.year, year))
        .limit(1);
      const orderNumber = formatOrderNumber(year, counter!.lastNumber);

      const now = Date.now();
      const orderId = crypto.randomUUID();
      await tx.insert(orders).values({
        id: orderId,
        orderNumber,
        userId: session.sub,
        status: "PENDING",
        subtotal,
        deliveryCharge,
        total,
        customerName: user.name,
        customerMobile: user.mobile!,
        customerAddress: addressText,
        stockDeducted: false,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(orderItems).values(
        lines.map((l) => ({
          orderId,
          productId: l.product.id,
          variantId: l.variant.id,
          productName: l.product.name,
          variantLabel: l.variant.label,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.lineTotal,
          imageUrl: l.imageUrl,
        })),
      );
      await tx.insert(orderStatusHistory).values({
        orderId,
        status: "PENDING",
        note: "Order placed",
        actor: "customer",
        createdAt: now,
      });

      const [created] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      return created!;
    });

    const whatsappUrl = buildWhatsAppUrl(whatsappNumber, {
      orderNumber: order.orderNumber,
      name: user.name,
      mobile: user.mobile!,
      address: addressText,
      items: lines.map((l) => ({
        product: l.product.name,
        variant: l.variant.label,
        qty: l.quantity,
        line: l.lineTotal,
      })),
      subtotal,
      delivery: deliveryCharge,
      total,
    });

    return { order, whatsappUrl };
  },
});
