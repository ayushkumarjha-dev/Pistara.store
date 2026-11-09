import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const ts = (name: string) => integer(name).notNull();

export const users = sqliteTable(
  "users",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["customer", "admin"] })
      .notNull()
      .default("customer"),
    mobile: text("mobile"),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const addresses = sqliteTable(
  "addresses",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    line1: text("line1").notNull(),
    line2: text("line2"),
    area: text("area"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    pincode: text("pincode").notNull(),
    updatedAt: ts("updated_at"),
  },
  (t) => [uniqueIndex("addresses_user_unique").on(t.userId)],
);

export const categories = sqliteTable(
  "categories",
  {
    id: id(),
    name: text("name").notNull(),
    nameHi: text("name_hi").notNull(),
    slug: text("slug").notNull(),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("categories_slug_unique").on(t.slug)],
);

export const products = sqliteTable(
  "products",
  {
    id: id(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    name: text("name").notNull(),
    nameHi: text("name_hi").notNull().default(""),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    descriptionHi: text("description_hi").notNull().default(""),
    benefits: text("benefits").notNull().default(""),
    rating: real("rating").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    deletedAt: integer("deleted_at"),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [
    uniqueIndex("products_slug_unique").on(t.slug),
    index("products_category_idx").on(t.categoryId),
  ],
);

export const productImages = sqliteTable(
  "product_images",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const productVariants = sqliteTable(
  "product_variants",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    label: text("label", { enum: ["250g", "500g", "1kg"] }).notNull(),
    weightGrams: integer("weight_grams").notNull(),
    price: integer("price").notNull(),
    mrp: integer("mrp").notNull(),
    stock: integer("stock").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [
    index("product_variants_product_idx").on(t.productId),
    check("product_variants_stock_nonneg", sql`${t.stock} >= 0`),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: id(),
    orderNumber: text("order_number").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    status: text("status", {
      enum: [
        "PENDING",
        "PAYMENT_CONFIRMED",
        "PACKED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ],
    })
      .notNull()
      .default("PENDING"),
    subtotal: integer("subtotal").notNull(),
    deliveryCharge: integer("delivery_charge").notNull(),
    total: integer("total").notNull(),
    customerName: text("customer_name").notNull(),
    customerMobile: text("customer_mobile").notNull(),
    customerAddress: text("customer_address").notNull(),
    courierName: text("courier_name"),
    trackingId: text("tracking_id"),
    trackingUrl: text("tracking_url"),
    adminNote: text("admin_note"),
    stockDeducted: integer("stock_deducted", { mode: "boolean" }).notNull().default(false),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [
    uniqueIndex("orders_order_number_unique").on(t.orderNumber),
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    variantId: text("variant_id").notNull(),
    productName: text("product_name").notNull(),
    variantLabel: text("variant_label").notNull(),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: integer("line_total").notNull(),
    imageUrl: text("image_url"),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderStatusHistory = sqliteTable(
  "order_status_history",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    note: text("note"),
    actor: text("actor", { enum: ["customer", "admin", "system"] }).notNull(),
    createdAt: ts("created_at"),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId)],
);

export const orderCounters = sqliteTable("order_counters", {
  year: integer("year").primaryKey(),
  lastNumber: integer("last_number").notNull().default(0),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: ts("updated_at"),
});

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: integer("window_start").notNull(),
});
