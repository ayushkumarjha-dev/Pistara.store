import { z } from "zod";

// ---- primitives ----
export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one number");

export const mobileSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const pincodeSchema = z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode");

export const imageUrlSchema = z
  .string()
  .min(1, "Enter a valid URL")
  .refine(
    (u) => /^https?:\/\//i.test(u) || u.startsWith("/"),
    "Image URL must start with http://, https:// or /",
  );

// ---- auth ----
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ---- profile ----
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  mobile: mobileSchema,
  address: z.object({
    line1: z.string().trim().min(3, "Address line 1 is required"),
    line2: z.string().trim().max(120).optional().or(z.literal("")),
    area: z.string().trim().max(120).optional().or(z.literal("")),
    city: z.string().trim().min(2, "City is required"),
    state: z.string().trim().min(2, "State is required"),
    pincode: pincodeSchema,
  }),
});
export type ProfileInput = z.infer<typeof profileSchema>;

// ---- orders ----
export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, "Cart is empty")
    .max(50),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const ORDER_STATUSES = [
  "PENDING",
  "PAYMENT_CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const adminUpdateOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
  courierName: z.string().trim().max(80).optional(),
  trackingId: z.string().trim().max(80).optional(),
  trackingUrl: z.string().url().max(500).optional().or(z.literal("")),
});
export type AdminUpdateOrderInput = z.infer<typeof adminUpdateOrderSchema>;

// ---- admin products ----
export const variantInputSchema = z.object({
  id: z.string().optional(),
  label: z.enum(["250g", "500g", "1kg"]),
  weightGrams: z.number().int().positive(),
  price: z.number().int().positive(),
  mrp: z.number().int().positive(),
  stock: z.number().int().min(0),
  isActive: z.boolean().default(true),
});

export const productInputSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  nameHi: z.string().trim().max(120).default(""),
  description: z.string().trim().max(2000).default(""),
  descriptionHi: z.string().trim().max(2000).default(""),
  benefits: z.string().trim().max(2000).default(""),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().min(0).default(0),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  images: z
    .array(
      z.object({
        url: imageUrlSchema,
        sortOrder: z.number().int().min(0).default(0),
        isPrimary: z.boolean().default(false),
      }),
    )
    .max(10)
    .default([]),
  variants: z.array(variantInputSchema).min(1, "Add at least one variant").max(10),
});
export type ProductInput = z.infer<typeof productInputSchema>;

// ---- admin settings ----
export const adminSettingsSchema = z.object({
  whatsapp_number: z
    .string()
    .regex(/^\d{10,15}$/, "WhatsApp number must be digits only, with country code"),
  delivery_charge: z.number().int().min(0, "Delivery charge cannot be negative"),
  store_name: z.string().trim().min(1).max(80).optional(),
  contact_email: z.string().trim().email().optional().or(z.literal("")),
  contact_phone: z.string().trim().max(20).optional(),
  store_address: z.string().trim().max(300).optional(),
  hero_headline: z.string().trim().max(200).optional(),
  hero_subtitle: z.string().trim().max(300).optional(),
  announcement_text: z.string().trim().max(300).optional(),
});
export type AdminSettingsInput = z.infer<typeof adminSettingsSchema>;
