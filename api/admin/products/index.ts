import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { productImages, products, productVariants } from "../../../db/schema";
import { productInputSchema } from "../../../shared/schemas";
import { handler, HttpError } from "../../../server-lib/http";
import { requireAdmin } from "../../../server-lib/auth";

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
  methods: ["GET", "POST"],
  handler: async ({ req, body }) => {
    await requireAdmin(req);
    const db = getDb();

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

    const data = productInputSchema.parse(body);
    const now = Date.now();
    const id = crypto.randomUUID();
    const slug = await uniqueSlug(db, data.name);

    await db.transaction(async (tx) => {
      await tx.insert(products).values({
        id,
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
          data.images.map((img, i) => ({ productId: id, url: img.url, sortOrder: img.sortOrder ?? i, isPrimary: img.isPrimary })),
        );
      }
      await tx.insert(productVariants).values(
        data.variants.map((v) => ({
          productId: id,
          label: v.label,
          weightGrams: v.weightGrams,
          price: v.price,
          mrp: v.mrp,
          stock: v.stock,
          isActive: v.isActive,
        })),
      );
    });

    const [created] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return { product: created };
  },
});
