import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@test.pistara";
const ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD ?? "";

test.describe("admin panel", () => {
  test("anonymous visitors are redirected to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test("admin can sign in, see stats, manage products and orders", async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, "ADMIN_INITIAL_PASSWORD not set");

    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.locator("form").getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/profile/);

    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /Pistara.*Admin/ })).toBeVisible();
    await expect(page.getByText("Revenue")).toBeVisible();
    await expect(page.getByText("Sales, last 14 days")).toBeVisible();

    // Products table
    await page.getByRole("link", { name: "Products" }).click();
    await expect(page.getByText("Premium Makhana")).toBeVisible({ timeout: 15000 });

    // Create a product
    await page.getByRole("button", { name: "New product" }).click();
    await page.getByLabel("Name (EN)").fill("E2E Test Almonds");
    await page.getByLabel("Name (HI)").fill("बादाम");
    await page.getByLabel("Description (EN)").fill("Test product created by Playwright.");
    await page.getByLabel("Image URLs (one per line, first is primary)").fill("/images/cashew.jpg");
    await page.getByLabel("Price").first().fill("300");
    await page.getByLabel("MRP").first().fill("380");
    await page.getByLabel("Stock").first().fill("10");
    await page.getByRole("button", { name: "Save product" }).click();
    await expect(page.getByText("Product created")).toBeVisible();
    await expect(page.getByText("E2E Test Almonds")).toBeVisible({ timeout: 15000 });

    // New product is live on the storefront
    await page.goto("/shop?q=almonds");
    await expect(page.getByText("E2E Test Almonds").first()).toBeVisible({ timeout: 15000 });

    // Orders view loads with status filters
    await page.goto("/admin/orders");
    await expect(page.getByRole("button", { name: "All", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Delivered" }).click();
    await expect(page).toHaveURL(/status=DELIVERED/);

    // Settings round-trip
    await page.goto("/admin/settings");
    const delivery = page.getByLabel("Delivery charge (₹)");
    await expect(delivery).toHaveValue("50");
    await delivery.fill("60");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Delivery charge (₹)")).toHaveValue("60");
    // restore
    await page.getByLabel("Delivery charge (₹)").fill("50");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();
  });

  test("customers cannot call admin APIs", async ({ request }) => {
    const res = await request.get("/api/admin/stats");
    expect([401, 403]).toContain(res.status());
  });
});
