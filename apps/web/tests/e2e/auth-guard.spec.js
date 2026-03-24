import { expect, test } from "@playwright/test";

test("redirects unauthenticated users to login page", async ({ page }) => {
  await page.goto("/levels");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
});
