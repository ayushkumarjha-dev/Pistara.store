// Typed fetch helpers for the Pistara API (Vercel serverless functions under /api).
// All requests are same-origin and send the session cookie.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "include",
      ...init,
      ...(init?.body ? { headers: { "content-type": "application/json" } } : {}),
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Could not reach the server. Check your connection.");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = json?.error;
    throw new ApiError(res.status, err?.code ?? "UNKNOWN", err?.message ?? "Something went wrong", err?.details);
  }
  return json?.data as T;
}

export const apiGet = <T>(path: string) => request<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
  request<T>(path, body === undefined ? { method: "POST" } : { method: "POST", body: JSON.stringify(body) });
export const apiPut = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const apiPatch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const apiDelete = <T>(path: string) => request<T>(path, { method: "DELETE" });

// ---- API shapes (mirror the backend responses) ----

export interface ApiCategory {
  id: string;
  name: string;
  nameHi: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
}

export interface ApiVariant {
  id: string;
  productId: string;
  label: "250g" | "500g" | "1kg";
  weightGrams: number;
  price: number;
  mrp: number;
  stock: number;
  isActive: boolean;
}

export interface ApiImage {
  id: string;
  productId: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ApiProduct {
  id: string;
  categoryId: string;
  categorySlug?: string;
  name: string;
  nameHi: string;
  slug: string;
  description: string;
  descriptionHi: string;
  benefits: string;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isActive: boolean;
  images: ApiImage[];
  variants: ApiVariant[];
  fromPrice: number | null;
  totalStock?: number;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  mobile: string | null;
}

export interface ApiAddress {
  id: string;
  userId: string;
  line1: string;
  line2: string | null;
  area: string | null;
  city: string;
  state: string;
  pincode: string;
}

export interface MeResponse {
  user: ApiUser | null;
  address?: ApiAddress | null;
  isComplete?: boolean;
}

export type OrderStatus =
  | "PENDING"
  | "PAYMENT_CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export interface ApiOrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl: string | null;
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  courierName: string | null;
  trackingId: string | null;
  trackingUrl: string | null;
  adminNote: string | null;
  stockDeducted: boolean;
  createdAt: number;
  updatedAt: number;
  items?: ApiOrderItem[];
}

export interface ApiHistoryRow {
  id: string;
  orderId: string;
  status: string;
  note: string | null;
  actor: "customer" | "admin" | "system";
  createdAt: number;
}
