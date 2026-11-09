import { test, expect } from "@playwright/test";

const email = `e2e-${Date.now()}@test.pistara`;
const password = "TestPass123!";

test.describe("customer journey", () => {
  test("register, complete profile, order, track and cancel", async ({ page }) => {
    // Register
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await page.getByLabel("Full name").fill("E2E Customer");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/profile/);

    // Complete profile (required before ordering)
    await page.getByLabel("Mobile").fill("9876501234");
    await page.getByLabel("Address line 1").fill("12 Test Street");
    await page.getByLabel("City").fill("Jaipur");
    await page.getByLabel("State", { exact: true }).fill("Rajasthan");
    await page.getByLabel("Pincode").fill("302001");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved")).toBeVisible();

    // Add to cart and check out
    await page.goto("/product/cashew-w320");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Quick Add/ }).click();
    await page.goto("/cart");
    await expect(page.getByText("Cashew W320")).toBeVisible();
    await page.getByRole("button", { name: /Place order/ }).click();

    // Success screen with order number and WhatsApp link
    await expect(page.getByRole("heading", { name: "Order placed!" })).toBeVisible();
    await expect(page.getByText(/PST-\d{4}-\d+/)).toBeVisible();
    const wa = page.getByRole("link", { name: /Continue on WhatsApp/ });
    await expect(wa).toHaveAttribute("href", /wa\.me\/\d+\?text=/);

    // Order appears in the list
    await page.getByRole("link", { name: "View my orders" }).click();
    await expect(page.getByText(/PST-\d{4}-\d+/)).toBeVisible();
    await expect(page.getByText("Pending")).toBeVisible();

    // Detail page: timeline + cancel
    await page.getByRole("link", { name: /PST-\d{4}-\d+/ }).click();
    await expect(page.getByText("Cashew W320")).toBeVisible();
    await page.getByRole("button", { name: "Cancel order" }).click();
    await expect(page.getByText("This order was cancelled.")).toBeVisible();
  });

  test("checkout requires a complete profile", async ({ page }) => {
    const bareEmail = `e2e-bare-${Date.now()}@test.pistara`;
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await page.getByLabel("Full name").fill("No Profile");
    await page.getByLabel("Email").fill(bareEmail);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/profile/);

    await page.goto("/product/premium-makhana");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Quick Add/ }).click();
    await page.goto("/cart");
    await page.getByRole("button", { name: /Place order/ }).click();
    // PROFILE_INCOMPLETE redirects back to the profile page
    await expect(page).toHaveURL(/\/profile/);
  });

  test("login with wrong password shows an error", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.locator("form").getByRole("button", { name: "Login" }).click();
    await expect(page.getByText(/invalid|incorrect/i)).toBeVisible();
  });

  test("change password works and the old password stops working", async ({ page }) => {
    const pwEmail = `e2e-pw-${Date.now()}@test.pistara`;
    const oldPw = "TestPass123!";
    const newPw = "NewPass456!";

    // Register a fresh account
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await page.getByLabel("Full name").fill("E2E Password");
    await page.getByLabel("Email").fill(pwEmail);
    await page.getByLabel("Password").fill(oldPw);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/profile/);

    // Change password from the profile card
    await page.getByLabel("Current password").fill(oldPw);
    await page.getByLabel("New password", { exact: true }).fill(newPw);
    await page.getByLabel("Confirm new password").fill(newPw);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Password changed")).toBeVisible();

    // Log out from the header dropdown
    await page.locator("header").getByRole("button", { name: "E2E" }).click();
    await page.getByRole("menuitem", { name: "Logout" }).click();
    await expect(page).toHaveURL(/\/$/);

    // Old password is rejected
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email").fill(pwEmail);
    await page.getByLabel("Password").fill(oldPw);
    await page.locator("form").getByRole("button", { name: "Login" }).click();
    await expect(page.getByText(/invalid|incorrect/i)).toBeVisible();

    // New password signs in
    await page.getByLabel("Password").fill(newPw);
    await page.locator("form").getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/profile/);
  });
});
