import { describe, expect, it } from "vitest";
import { config } from "dotenv";
config({ path: ".env.test", override: true });

import statsHandler from "../../api/admin/stats";
import adminProductsHandler from "../../api/admin/products/index";
import adminProductHandler from "../../api/admin/products/[id]";
import adminOrdersHandler from "../../api/admin/orders/index";
import adminOrderHandler from "../../api/admin/orders/[id]";
import adminCustomersHandler from "../../api/admin/customers/index";
import adminCustomerHandler from "../../api/admin/customers/[id]";
import adminSettingsHandler from "../../api/admin/settings";
import { call } from "../helpers/request";
import { createCustomer, loginAsAdmin } from "../helpers/factories";

const endpoints: {
  name: string;
  handler: any;
  method: string;
  query?: Record<string, string>;
  body?: unknown;
}[] = [
  { name: "GET /api/admin/stats", handler: statsHandler, method: "GET" },
  { name: "GET /api/admin/products", handler: adminProductsHandler, method: "GET" },
  { name: "POST /api/admin/products", handler: adminProductsHandler, method: "POST", body: {} },
  {
    name: "GET /api/admin/products/[id]",
    handler: adminProductHandler,
    method: "GET",
    query: { id: "x" },
  },
  {
    name: "PUT /api/admin/products/[id]",
    handler: adminProductHandler,
    method: "PUT",
    query: { id: "x" },
    body: {},
  },
  {
    name: "DELETE /api/admin/products/[id]",
    handler: adminProductHandler,
    method: "DELETE",
    query: { id: "x" },
  },
  { name: "GET /api/admin/orders", handler: adminOrdersHandler, method: "GET" },
  {
    name: "GET /api/admin/orders/[id]",
    handler: adminOrderHandler,
    method: "GET",
    query: { id: "x" },
  },
  {
    name: "PATCH /api/admin/orders/[id]",
    handler: adminOrderHandler,
    method: "PATCH",
    query: { id: "x" },
    body: {},
  },
  { name: "GET /api/admin/customers", handler: adminCustomersHandler, method: "GET" },
  {
    name: "GET /api/admin/customers/[id]",
    handler: adminCustomerHandler,
    method: "GET",
    query: { id: "x" },
  },
  { name: "GET /api/admin/settings", handler: adminSettingsHandler, method: "GET" },
  { name: "PUT /api/admin/settings", handler: adminSettingsHandler, method: "PUT", body: {} },
];

describe("admin authorization matrix", () => {
  it("every /api/admin/* endpoint returns 401 for anonymous", async () => {
    for (const ep of endpoints) {
      const res = await call(ep.handler, {
        method: ep.method as any,
        query: ep.query,
        body: ep.body,
      });
      expect(res.status, ep.name).toBe(401);
    }
  });

  it("every /api/admin/* endpoint returns 403 for a customer", async () => {
    const { jar } = await createCustomer();
    for (const ep of endpoints) {
      const res = await call(ep.handler, {
        method: ep.method as any,
        query: ep.query,
        body: ep.body,
        jar,
      });
      expect(res.status, ep.name).toBe(403);
    }
  });

  it("admin can reach the endpoints", async () => {
    const { jar } = await loginAsAdmin();
    const stats = await call(statsHandler, { jar });
    expect(stats.status).toBe(200);
    const products = await call(adminProductsHandler, { jar });
    expect(products.status).toBe(200);
  });
});
