import type { OrderStatus } from "../shared/schemas";

// Pipeline order; CANCELLED is terminal and outside the forward pipeline.
export const PIPELINE: OrderStatus[] = [
  "PENDING",
  "PAYMENT_CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const FINAL: OrderStatus[] = ["DELIVERED", "CANCELLED"];

export function isFinal(status: OrderStatus): boolean {
  return FINAL.includes(status);
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  if (isFinal(from)) return false;
  if (to === "CANCELLED") return true; // cancel from any non-final status
  const fi = PIPELINE.indexOf(from);
  const ti = PIPELINE.indexOf(to);
  if (fi === -1 || ti === -1) return false;
  return ti > fi; // forward only; skipping ahead is allowed
}

export interface TransitionContext {
  courierName?: string;
  trackingId?: string;
}

/** Returns an error code/message if the transition is invalid, else null. */
export function validateTransition(
  from: OrderStatus,
  to: OrderStatus,
  ctx: TransitionContext = {},
): { code: string; message: string } | null {
  if (from === to) return { code: "NO_CHANGE", message: `Order is already ${to}` };
  if (isFinal(from)) return { code: "ORDER_FINAL", message: `A ${from} order cannot be changed` };
  if (!canTransition(from, to)) {
    return { code: "INVALID_TRANSITION", message: `Cannot move an order from ${from} to ${to}` };
  }
  if (to === "SHIPPED" && (!ctx.courierName || !ctx.trackingId)) {
    return {
      code: "SHIPPING_INFO_REQUIRED",
      message: "Courier name and tracking ID are required to mark an order as shipped",
    };
  }
  return null;
}

/** Customer may cancel only while PENDING, PAYMENT_CONFIRMED or PACKED. */
export function customerCanCancel(status: OrderStatus): boolean {
  return status === "PENDING" || status === "PAYMENT_CONFIRMED" || status === "PACKED";
}
