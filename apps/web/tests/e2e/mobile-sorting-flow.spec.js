import { expect, test } from "@playwright/test";

import { mockLoggedOutBootstrap } from "./support/auth";

const levelId = "sorting-mobile-level";

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true
});

test("sorting controls remain usable on a mobile viewport", async ({ page }) => {
  await mockLoggedOutBootstrap(page);
  await page.route("**/api/v1/auth/register", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "user-mobile-1",
          email: "mobile@example.com",
          username: "mobileuser",
          total_xp: 0
        },
        access: "test-access-token"
      })
    });
  });

  await page.route(`**/api/v1/levels/${levelId}/start`, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ session_id: "sess_mobile_123", expires_in: 1800 })
    });
  });

  await page.route(`**/api/v1/levels/${levelId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: levelId,
        title: "Sorting Mobile Test",
        game_type: "sorting",
        difficulty: 1,
        config: {
          algorithm: "selection",
          array: [4, 1, 3, 2]
        },
        optimal_steps: 2,
        order_index: 1
      })
    });
  });

  await page.route("**/api/v1/submissions", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        submission_id: "submission-mobile-1",
        score: 90,
        stars: 3,
        optimal_steps: 2,
        user_steps: 2,
        xp_earned: 180,
        total_xp: 180,
        progression: {
          level: 2,
          xp_total: 180,
          xp_into_level: 80,
          xp_for_next_level: 150,
          xp_to_next_level: 70,
          progress_ratio: 0.53
        },
        hints_used: 0,
        awarded_badges: [],
        is_personal_best: true,
        diff: [],
        score_breakdown: {
          base_score: 100,
          time_bonus: 10,
          hint_penalty: 0
        }
      })
    });
  });

  await page.goto("/register");
  await page.getByLabel("Email").fill("mobile@example.com");
  await page.getByLabel("Username").fill("mobileuser");
  await page.getByLabel("Password").fill("StrongPass123!");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/levels$/);

  await page.goto(`/levels/${levelId}/sorting`);
  await expect(page.getByRole("button", { name: "Select value 4 at position 1" })).toBeVisible();
  await expect(page.locator(".sorting-canvas-wrapper")).toBeVisible();

  await page.getByRole("button", { name: "Select value 4 at position 1" }).click();
  await page.getByRole("button", { name: "Select value 1 at position 2" }).click();
  await page.getByRole("button", { name: "Select value 4 at position 2" }).click();
  await page.getByRole("button", { name: "Select value 3 at position 3" }).click();

  await page.getByRole("button", { name: "Submit Moves" }).click();
  await expect(page.getByRole("heading", { name: "Round Result" })).toBeVisible();
});
