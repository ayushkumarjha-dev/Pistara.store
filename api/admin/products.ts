import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { orderItems, productImages, products, productVariants } from "../../db/schema";
import { productInputSchema } from "../../shared/schemas";
import { handler, HttpError } from "../../server-lib/http";
import { requireAdmin } from "../../server-lib/auth";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(db: ReturnType<typeof getDb>, name: string): Promise<string> {
  const base = slugify(name) || "product";
  let slug = base;
  let i = 1;
  for (;;) {
    const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
    if (!existing) return slug;
    slug = `${base}-${++i}`;
  }
}

export default handler({
  methods: ["GET", "POST", "PUT", "DELETE"],
  handler: async ({ req, body, query }) => {
    await requireAdmin(req);
    const db = getDb();
    const id = query.id as string | undefined;

    // GET /api/admin/products?id=xxx - Get single product
    if (req.method === "GET" && id) {
      const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
      if (!product) throw new HttpError(404, "NOT_FOUND", "Product not found");

      const images = await db.select().from(productImages).where(eq(productImages.productId, id));
      const variants = await db.select().from(productVariants).where(eq(productVariants.productId, id));
      return { product: { ...product, images, variants } };
    }

    // DELETE /api/admin/products?id=xxx - Delete product
    if (req.method === "DELETE" && id) {
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

    // PUT /api/admin/products?id=xxx - Update product
    if (req.method === "PUT" && id) {
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
            data.images.map((img, i) => ({ productId: id, url: img.url, sortOrder: img.sortOrder ?? i, isPrimary: img.isPrimary })),
          );
        }

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
    }

    // GET /api/admin/products - List all products
    if (req.method === "GET") {
      const rows = await db.select().from(products).orderBy(desc(products.createdAt));
      const ids = rows.map((r) => r.id);
      const images = ids.length
        ? await db.select().from(productImages).where(sql`${productImages.productId} IN ${ids}`)
        : [];
      const variants = ids.length
        ? await db.select().from(productVariants).where(sql`${productVariants.productId} IN ${ids}`)
        : [];
      return {
        products: rows.map((p) => ({
          ...p,
          images: images.filter((i) => i.productId === p.id).sort((a, b) => a.sortOrder - b.sortOrder),
          variants: variants.filter((v) => v.productId === p.id).sort((a, b) => a.weightGrams - b.weightGrams),
        })),
      };
    }

    // POST /api/admin/products - Create product
    const data = productInputSchema.parse(body);
    const now = Date.now();
    const newId = crypto.randomUUID();
    const slug = await uniqueSlug(db, data.name);

    await db.transaction(async (tx) => {
      await tx.insert(products).values({
        id: newId,
        categoryId: data.categoryId,
        name: data.name,
        nameHi: data.nameHi,
        slug,
        description: data.description,
        descriptionHi: data.descriptionHi,
        benefits: data.benefits,
        rating: data.rating,
        reviewCount: data.reviewCount,
        isFeatured: data.isFeatured,
        isActive: data.isActive,
        createdAt: now,
        updatedAt: now,
      });
      if (data.images.length) {
        await tx.insert(productImages).values(
          data.images.map((img, i) => ({ productId: newId, url: img.url, sortOrder: img.sortOrder ?? i, isPrimary: img.isPrimary })),
        );
      }
      await tx.insert(productVariants).values(
        data.variants.map((v) => ({
          productId: newId,
          label: v.label,
          weightGrams: v.weightGrams,
          price: v.price,
          mrp: v.mrp,
          stock: v.stock,
          isActive: v.isActive,
        })),
      );
    });

    const [created] = await db.select().from(products).where(eq(products.id, newId)).limit(1);
    return { product: created };
  },
});
