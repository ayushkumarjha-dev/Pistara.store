import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { productImages, products, productVariants } from "../../db/schema";
import { handler, HttpError } from "../../server-lib/http";

export default handler({
  methods: ["GET"],
  handler: async ({ query }) => {
    const slug = query.slug;
    if (typeof slug !== "string" || !slug) throw new HttpError(400, "BAD_REQUEST", "Missing product slug");

    const db = getDb();
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.isActive, true), isNull(products.deletedAt)))
      .limit(1);
    if (!product) throw new HttpError(404, "NOT_FOUND", "Product not found");

    const images = await db.select().from(productImages).where(eq(productImages.productId, product.id));
    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, product.id));

    const related = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.categoryId, product.categoryId),
          ne(products.id, product.id),
          eq(products.isActive, true),
          isNull(products.deletedAt),
        ),
      )
      .limit(4);

    const relatedIds = related.map((r) => r.id);
    const relatedImages = relatedIds.length
      ? await db.select().from(productImages).where(sql`${productImages.productId} IN ${relatedIds}`)
      : [];
    const relatedVariants = relatedIds.length
      ? await db.select().from(productVariants).where(sql`${productVariants.productId} IN ${relatedIds}`)
      : [];

    const withPrices = (p: typeof product) => {
      const vs = relatedVariants.filter((v) => v.productId === p.id && v.isActive);
      return {
        ...p,
        images: relatedImages.filter((i) => i.productId === p.id).sort((a, b) => a.sortOrder - b.sortOrder),
        fromPrice: vs.length ? Math.min(...vs.map((v) => v.price)) : null,
      };
    };

    return {
      product: {
        ...product,
        images: images.sort((a, b) => a.sortOrder - b.sortOrder),
        variants: variants.sort((a, b) => a.weightGrams - b.weightGrams),
      },
      related: related.map(withPrices),
    };
  },
});
