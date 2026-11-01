import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { orderItems, productImages, products, productVariants } from "../../../db/schema";
import { productInputSchema } from "../../../shared/schemas";
import { handler, HttpError } from "../../../server-lib/http";
import { requireAdmin } from "../../../server-lib/auth";

export default handler({
  methods: ["GET", "PUT", "DELETE"],
  handler: async ({ req, body, query }) => {
    await requireAdmin(req);
    const id = query.id;
    if (typeof id !== "string" || !id) throw new HttpError(400, "BAD_REQUEST", "Missing product id");

    const db = getDb();
    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!product) throw new HttpError(404, "NOT_FOUND", "Product not found");

    if (req.method === "GET") {
      const images = await db.select().from(productImages).where(eq(productImages.productId, id));
      const variants = await db.select().from(productVariants).where(eq(productVariants.productId, id));
      return { product: { ...product, images, variants } };
    }

    if (req.method === "DELETE") {
      // Soft delete if the product appears in any order, else hard delete
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
      await db.delete(products).where(eq(products.id, id)); // images/variants cascade
      return { deleted: "hard" };
    }

    // PUT — replace product fields, images and variants transactionally
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
          data.images.map((img, i) => ({ productId: id, url: img.url, sortOrder: img.sortOrder ?? i, isPrimary: img.isPrimary })),
        );
      }

      // Keep variant rows that are referenced by orders (snapshot uses ids, but
      // keep stock continuity): update existing by label, insert new, delete removed.
      const existing = await tx.select().from(productVariants).where(eq(productVariants.productId, id));
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
        if (!keepIds.has(e.id)) await tx.delete(productVariants).where(eq(productVariants.id, e.id));
      }
    });

    const [updated] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    const images = await db.select().from(productImages).where(eq(productImages.productId, id));
    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, id));
    return { product: { ...updated, images, variants } };
  },
});
