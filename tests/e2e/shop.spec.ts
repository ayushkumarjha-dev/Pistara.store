import { test, expect } from "@playwright/test";

test.describe("storefront browsing", () => {
  test("home page shows featured products from the API", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Premium Makhana").first()).toBeVisible();
  });

  test("shop lists products and category filter works", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByText("Premium Makhana").first()).toBeVisible();
    await expect(page.getByText("Cashew W320").first()).toBeVisible();

    await page.getByRole("button", { name: "Cashew", exact: true }).click();
    await expect(page).toHaveURL(/category=cashew/);
    await expect(page.getByText("Cashew W320").first()).toBeVisible();
    await expect(page.getByText("Premium Makhana")).toHaveCount(0);
  });

  test("product page shows variants and quick add updates the cart", async ({ page }) => {
    await page.goto("/product/premium-makhana");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Premium Makhana" })).toBeVisible();
    await expect(page.getByRole("button", { name: /500g/ })).toBeVisible();

    await page.getByRole("button", { name: /500g/ }).click();
    await page.getByRole("button", { name: /Quick Add/ }).click();
    await expect(page.getByLabel(/Cart, 1 items?/)).toBeVisible();
  });

  test("search finds products by name", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Search").click();
    await page.getByPlaceholder(/Search/).fill("kishmish");
    await expect(page.getByText("Kishmish Green Raisins").first()).toBeVisible();
  });
});
