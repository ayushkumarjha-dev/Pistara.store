import { and, asc, desc, eq, gte, isNull, like, lte, ne, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/client";
import { categories, productImages, products, productVariants } from "../db/schema";
import { handler, HttpError } from "../server-lib/http";

const PAGE_SIZE_DEFAULT = 12;

export default handler({
  methods: ["GET"],
  handler: async ({ query }) => {
    const db = getDb();
    const slug = query.slug as string | undefined;

    // GET /api/products?slug=xxx - Get product by slug
    if (slug) {
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
    }

    // GET /api/products - List/search products
    const q = typeof query.q === "string" ? query.q.trim() : "";
    const category = typeof query.category === "string" ? query.category : "";
    const sort = typeof query.sort === "string" ? query.sort : "featured";
    const minPrice = Number(query.minPrice);
    const maxPrice = Number(query.maxPrice);
    const inStock = query.inStock === "true";
    const featured = query.featured === "true";
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || PAGE_SIZE_DEFAULT));

    const conditions: SQL[] = [eq(products.isActive, true), isNull(products.deletedAt)];
    if (category) {
      const [cat] = await db.select().from(categories).where(eq(categories.slug, category)).limit(1);
      if (!cat) return { products: [], total: 0, page, limit };
      conditions.push(eq(products.categoryId, cat.id));
    }
    if (q) conditions.push(like(products.name, `%${q}%`));
    if (featured) conditions.push(eq(products.isFeatured, true));

    const rows = await db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(sort === "name" ? asc(products.name) : desc(products.createdAt));

    const ids = rows.map((r) => r.id);
    const images = ids.length
      ? await db.select().from(productImages).where(sql`${productImages.productId} IN ${ids}`)
      : [];
    const variants = ids.length
      ? await db.select().from(productVariants).where(sql`${productVariants.productId} IN ${ids}`)
      : [];

    let list = rows.map((p) => {
      const vs = variants
        .filter((v) => v.productId === p.id)
        .sort((a, b) => a.weightGrams - b.weightGrams);
      const activeVs = vs.filter((v) => v.isActive);
      const fromPrice = activeVs.length ? Math.min(...activeVs.map((v) => v.price)) : null;
      const totalStock = activeVs.reduce((s, v) => s + v.stock, 0);
      return {
        ...p,
        images: images
          .filter((i) => i.productId === p.id)
          .sort((a, b) => a.sortOrder - b.sortOrder),
        variants: vs,
        fromPrice,
        totalStock,
      };
    });

    if (Number.isFinite(minPrice) && minPrice > 0) list = list.filter((p) => p.fromPrice !== null && p.fromPrice >= minPrice);
    if (Number.isFinite(maxPrice) && maxPrice > 0) list = list.filter((p) => p.fromPrice !== null && p.fromPrice <= maxPrice);
    if (inStock) list = list.filter((p) => p.totalStock > 0);

    if (sort === "price-asc") list.sort((a, b) => (a.fromPrice ?? 0) - (b.fromPrice ?? 0));
    if (sort === "price-desc") list.sort((a, b) => (b.fromPrice ?? 0) - (a.fromPrice ?? 0));
    if (sort === "rating") list.sort((a, b) => b.rating - a.rating);

    const total = list.length;
    const paged = list.slice((page - 1) * limit, page * limit);

    return { products: paged, total, page, limit };
  },
});
