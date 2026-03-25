import { expect, test } from "@playwright/test";

import { mockAuthSession } from "./support/auth";

test("validates login fields, toggles password visibility, and signs in", async ({ page }) => {
  const authSession = await mockAuthSession(page);
  const user = {
    id: "login-user-1",
    email: "login@example.com",
    username: "loginuser",
    total_xp: 40
  };

  await page.route("**/api/v1/auth/login", async (route) => {
    authSession.setAuthenticatedUser(user, "login-access-token");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access: "login-access-token" })
    });
  });

  await page.route("**/api/v1/levels", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([])
    });
  });

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Welcome Back/i })).toBeVisible();

  await page.getByRole("button", { name: "Enter Arena" }).click();
  await expect(page.getByText("Email is required.")).toBeVisible();
  await expect(page.getByText("Password is required.")).toBeVisible();

  await page.getByLabel("Email").fill("invalid-email");
  await page.locator("#login-password").fill("short");
  await page.getByRole("button", { name: "Enter Arena" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();

  const passwordInput = page.locator("#login-password");
  await expect(passwordInput).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(passwordInput).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(passwordInput).toHaveAttribute("type", "password");

  await page.getByLabel("Email").fill("login@example.com");
  await page.locator("#login-password").fill("StrongPass123");
  await page.getByRole("button", { name: "Enter Arena" }).click();

  await expect(page).toHaveURL(/\/levels$/);
});
