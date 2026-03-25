import { expect, test } from "@playwright/test";

import { mockAuthSession } from "./support/auth";

test("redirects unauthenticated users to login page", async ({ page }) => {
  await mockAuthSession(page);
  await page.goto("/levels");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
});
