import { config } from "dotenv";
config({ path: ".env.test", override: true });

import registerHandler from "../../api/auth/register";
import loginHandler from "../../api/auth/login";
import profileHandler from "../../api/profile";
import ordersHandler from "../../api/orders";
import productsHandler from "../../api/products/index";
import { CookieJar, call } from "./request";

let seq = 0;
const runId = crypto.randomUUID().slice(0, 8); // unique per test-file module instance

export async function createCustomer(overrides: { name?: string; email?: string; password?: string } = {}) {
  seq += 1;
  const email = overrides.email ?? `customer-${runId}-${seq}@test.pistara`;
  const password = overrides.password ?? "Password1";
  const jar = new CookieJar();
  const res = await call(registerHandler, {
    method: "POST",
    body: { name: overrides.name ?? `Test Customer ${seq}`, email, password },
    jar,
    headers: { "x-forwarded-for": `10.${seq % 250}.${(seq * 7) % 250}.${runId.charCodeAt(0)}` },
  });
  if (res.status !== 200) throw new Error(`createCustomer failed: ${JSON.stringify(res.body)}`);
  return { jar, user: res.body.data.user, email, password };
}

export async function loginAs(email: string, password: string, ip = "10.9.9.9") {
  const jar = new CookieJar();
  const res = await call(loginHandler, {
    method: "POST",
    body: { email, password },
    jar,
    headers: { "x-forwarded-for": ip },
  });
  return { jar, res };
}

export async function loginAsAdmin() {
  return loginAs(process.env.ADMIN_EMAIL!, process.env.ADMIN_INITIAL_PASSWORD!);
}

export async function completeProfile(jar: CookieJar) {
  const res = await call(profileHandler, {
    method: "PUT",
    jar,
    body: {
      name: "Test Customer",
      mobile: "9876543210",
      address: {
        line1: "12, Gandhi Maidan Road",
        line2: "Flat 4B",
        area: "Patna City",
        city: "Patna",
        state: "Bihar",
        pincode: "800001",
      },
    },
  });
  if (res.status !== 200) throw new Error(`completeProfile failed: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

/** Returns the first variant of the product with the given slug. */
export async function getVariant(productSlug: string, label: "250g" | "500g" | "1kg" = "250g") {
  const res = await call(productsHandler, { query: { q: productSlug.split("-")[0], limit: "50" } });
  const product = res.body.data.products.find((p: any) => p.slug === productSlug);
  if (!product) throw new Error(`product ${productSlug} not found`);
  const variant = product.variants.find((v: any) => v.label === label);
  if (!variant) throw new Error(`variant ${label} not found on ${productSlug}`);
  return { product, variant };
}

export async function createOrder(jar: CookieJar, items: { variantId: string; quantity: number }[]) {
  const res = await call(ordersHandler, { method: "POST", jar, body: { items } });
  return res;
}

/** Creates a customer with a complete profile and returns jar + ids. */
export async function customerWithProfile() {
  const c = await createCustomer();
  await completeProfile(c.jar);
  return c;
}
