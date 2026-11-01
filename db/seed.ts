// Idempotent seed: admin user, categories, products, settings. Safe to run twice.
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb } from "./client";
import { categories, products, productImages, productVariants, settings, users } from "./schema";
import { seedCategories, seedProducts, seedSettings } from "./seed-data";

export async function seed() {
  const db = getDb();
  const now = Date.now();

  // Admin user
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "";
  if (adminEmail && adminPassword) {
    const [existing] = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    if (!existing) {
      await db.insert(users).values({
        name: "Pistara Admin",
        email: adminEmail,
        passwordHash: bcrypt.hashSync(adminPassword, 10),
        role: "admin",
        createdAt: now,
        updatedAt: now,
      });
      console.log(`Seeded admin: ${adminEmail}`);
    }
  } else {
    console.warn("ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD not set — skipping admin seed");
  }

  // Categories
  const categoryIds = new Map<string, string>();
  for (const c of seedCategories) {
    const [existing] = await db.select().from(categories).where(eq(categories.slug, c.slug)).limit(1);
    if (existing) {
      categoryIds.set(c.slug, existing.id);
    } else {
      const id = crypto.randomUUID();
      await db.insert(categories).values({ id, ...c });
      categoryIds.set(c.slug, id);
    }
  }

  // Products (+ images, variants)
  for (const p of seedProducts) {
    const [existing] = await db.select().from(products).where(eq(products.slug, p.slug)).limit(1);
    if (existing) continue;
    const id = crypto.randomUUID();
    await db.insert(products).values({
      id,
      categoryId: categoryIds.get(p.category)!,
      name: p.name,
      nameHi: p.nameHi,
      slug: p.slug,
      description: p.description,
      rating: p.rating,
      reviewCount: p.reviewCount,
      isFeatured: p.isFeatured,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(productImages).values(
      p.images.map((url, i) => ({ productId: id, url, sortOrder: i, isPrimary: i === 0 })),
    );
    await db.insert(productVariants).values(
      p.variants.map((sv) => ({ productId: id, ...sv, isActive: true })),
    );
  }

  // Settings (WHATSAPP_NUMBER env overrides the default)
  const merged = { ...seedSettings };
  if (process.env.WHATSAPP_NUMBER) merged.whatsapp_number = process.env.WHATSAPP_NUMBER;
  for (const [key, value] of Object.entries(merged)) {
    await db.insert(settings).values({ key, value, updatedAt: now }).onConflictDoNothing();
  }

  console.log("Seed complete");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
