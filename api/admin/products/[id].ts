import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { orderItems, productImages, products, productVariants } from "../../../db/schema";
import { productInputSchema } from "../../../shared/schemas";
import { handler, HttpError } from "../../../server-lib/http";
import { requireAdmin } from "../../../server-lib/auth";

export default handler({
  methods: ["GET", "PUT", "PATCH", "DELETE"],
  handler: async ({ req, body, query }) => {
    await requireAdmin(req);
    const db = getDb();
    const id = typeof query.id === "string" ? query.id : "";

    // GET /api/admin/products/[id] - Get single product
    if (req.method === "GET") {
      const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
      if (!product) throw new HttpError(404, "NOT_FOUND", "Product not found");

      const images = await db.select().from(productImages).where(eq(productImages.productId, id));
      const variants = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, id));
      return { product: { ...product, images, variants } };
    }

    // PATCH /api/admin/products/[id] - Toggle flags (e.g. isActive)
    if (req.method === "PATCH") {
      const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
      if (!product) throw new HttpError(404, "NOT_FOUND", "Product not found");

      const patch: Partial<typeof products.$inferInsert> = { updatedAt: Date.now() };
      const bodyIsObj = body && typeof body === "object";
      if (bodyIsObj && typeof (body as { isActive?: unknown }).isActive === "boolean") {
        patch.isActive = (body as { isActive: boolean }).isActive;
      }
      if (bodyIsObj && typeof (body as { isFeatured?: unknown }).isFeatured === "boolean") {
        patch.isFeatured = (body as { isFeatured: boolean }).isFeatured;
      }
      await db.update(products).set(patch).where(eq(products.id, id));

      const [updated] = await db.select().from(products).where(eq(products.id, id)).limit(1);
      const images = await db.select().from(productImages).where(eq(productImages.productId, id));
      const variants = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, id));
      return { product: { ...updated, images, variants } };
    }

    // DELETE /api/admin/products/[id] - Soft-delete if referenced by orders, else hard delete
    if (req.method === "DELETE") {
      const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
      if (!product) throw new HttpError(404, "NOT_FOUND", "Product not found");

      const [ref] = await db
        .select({ count: sql<number>`count(*)` })
        .from(orderItems)
        .where(eq(orderItems.productId, id))
        .limit(1);
      if ((ref?.count ?? 0) > 0) {
        await db
          .update(products)
          .set({ deletedAt: Date.now(), isActive: false, updatedAt: Date.now() })
          .where(eq(products.id, id));
        return { deleted: "soft" };
      }
      await db.delete(products).where(eq(products.id, id));
      return { deleted: "hard" };
    }

    // PUT /api/admin/products/[id] - Full update
    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!product) throw new HttpError(404, "NOT_FOUND", "Product not found");

    const data = productInputSchema.parse(body);
    const now = Date.now();
    await db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({
          categoryId: data.categoryId,
          name: data.name,
          nameHi: data.nameHi,
          description: data.description,
          descriptionHi: data.descriptionHi,
          benefits: data.benefits,
          rating: data.rating,
          reviewCount: data.reviewCount,
          isFeatured: data.isFeatured,
          isActive: data.isActive,
          updatedAt: now,
        })
        .where(eq(products.id, id));

      await tx.delete(productImages).where(eq(productImages.productId, id));
      if (data.images.length) {
        await tx.insert(productImages).values(
          data.images.map((img, i) => ({
            productId: id,
            url: img.url,
            sortOrder: img.sortOrder ?? i,
            isPrimary: img.isPrimary,
          })),
        );
      }

      const existing = await tx
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, id));
      const keepIds = new Set<string>();
      for (const v of data.variants) {
        const match = existing.find((e) => e.id === v.id || e.label === v.label);
        if (match) {
          keepIds.add(match.id);
          await tx
            .update(productVariants)
            .set({
              label: v.label,
              weightGrams: v.weightGrams,
              price: v.price,
              mrp: v.mrp,
              stock: v.stock,
              isActive: v.isActive,
            })
            .where(eq(productVariants.id, match.id));
        } else {
          await tx.insert(productVariants).values({
            productId: id,
            label: v.label,
            weightGrams: v.weightGrams,
            price: v.price,
            mrp: v.mrp,
            stock: v.stock,
            isActive: v.isActive,
          });
        }
      }
      for (const e of existing) {
        if (!keepIds.has(e.id))
          await tx.delete(productVariants).where(eq(productVariants.id, e.id));
      }
    });

    const [updated] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    const images = await db.select().from(productImages).where(eq(productImages.productId, id));
    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id));
    return { product: { ...updated, images, variants } };
  },
});
