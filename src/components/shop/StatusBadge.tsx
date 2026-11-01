import type { OrderStatus } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PAYMENT_CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-gold/15 text-gold-foreground border-gold/40",
  PAYMENT_CONFIRMED: "bg-sage text-primary-deep border-primary/30",
  PACKED: "bg-sage text-primary-deep border-primary/30",
  SHIPPED: "bg-primary/10 text-primary border-primary/30",
  OUT_FOR_DELIVERY: "bg-primary/10 text-primary border-primary/30",
  DELIVERED: "bg-success/15 text-success border-success/40",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
