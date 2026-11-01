import { describe, expect, it } from "vitest";
import { canTransition, customerCanCancel, validateTransition } from "../../server-lib/order-status";
import { PIPELINE } from "../../server-lib/order-status";
import type { OrderStatus } from "../../shared/schemas";

describe("order status state machine", () => {
  it("allows every single-step forward move", () => {
    for (let i = 0; i < PIPELINE.length - 1; i++) {
      expect(canTransition(PIPELINE[i], PIPELINE[i + 1])).toBe(true);
    }
  });

  it("allows skipping forward", () => {
    expect(canTransition("PAYMENT_CONFIRMED", "SHIPPED")).toBe(true);
    expect(canTransition("PENDING", "DELIVERED")).toBe(true);
  });

  it("rejects backward moves", () => {
    expect(canTransition("PACKED", "PENDING")).toBe(false);
    expect(canTransition("SHIPPED", "PAYMENT_CONFIRMED")).toBe(false);
    expect(canTransition("DELIVERED", "SHIPPED")).toBe(false);
  });

  it("rejects no-op moves", () => {
    for (const s of PIPELINE) expect(canTransition(s, s)).toBe(false);
  });

  it("allows cancel from any non-final status", () => {
    for (const s of ["PENDING", "PAYMENT_CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY"] as OrderStatus[]) {
      expect(canTransition(s, "CANCELLED")).toBe(true);
    }
  });

  it("DELIVERED and CANCELLED are final", () => {
    for (const to of [...PIPELINE, "CANCELLED"] as OrderStatus[]) {
      expect(canTransition("DELIVERED", to)).toBe(false);
      expect(canTransition("CANCELLED", to)).toBe(false);
    }
  });

  it("SHIPPED requires courier name and tracking id", () => {
    expect(validateTransition("PACKED", "SHIPPED")?.code).toBe("SHIPPING_INFO_REQUIRED");
    expect(validateTransition("PACKED", "SHIPPED", { courierName: "Delhivery" })?.code).toBe("SHIPPING_INFO_REQUIRED");
    expect(validateTransition("PACKED", "SHIPPED", { courierName: "Delhivery", trackingId: "TRK123" })).toBeNull();
  });

  it("validateTransition reports final and invalid moves", () => {
    expect(validateTransition("DELIVERED", "CANCELLED")?.code).toBe("ORDER_FINAL");
    expect(validateTransition("SHIPPED", "PACKED")?.code).toBe("INVALID_TRANSITION");
    expect(validateTransition("PENDING", "PENDING")?.code).toBe("NO_CHANGE");
  });

  it("customer can cancel only PENDING / PAYMENT_CONFIRMED / PACKED", () => {
    expect(customerCanCancel("PENDING")).toBe(true);
    expect(customerCanCancel("PAYMENT_CONFIRMED")).toBe(true);
    expect(customerCanCancel("PACKED")).toBe(true);
    expect(customerCanCancel("SHIPPED")).toBe(false);
    expect(customerCanCancel("OUT_FOR_DELIVERY")).toBe(false);
    expect(customerCanCancel("DELIVERED")).toBe(false);
    expect(customerCanCancel("CANCELLED")).toBe(false);
  });
});
