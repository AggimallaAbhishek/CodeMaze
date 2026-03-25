import { expect, test } from "@playwright/test";

import { mockLoggedOutBootstrap } from "./support/auth";

test("loads profile progression and recent replays", async ({ page }) => {
  await mockLoggedOutBootstrap(page);
  await page.route("**/api/v1/auth/register", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "user-profile-1",
          email: "profile@example.com",
          username: "profileuser",
          total_xp: 240,
          progression: {
            level: 2,
            xp_total: 240,
            xp_into_level: 140,
            xp_for_next_level: 150,
            xp_to_next_level: 10,
            progress_ratio: 0.93
          },
          badges: [],
          stats: {
            solved_count: 1,
            best_score: 95,
            personal_best_count: 1
          }
        },
        access: "test-access-token"
      })
    });
  });

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "user-profile-1",
        email: "profile@example.com",
        username: "profileuser",
        total_xp: 240,
        is_verified: true,
        progression: {
          level: 2,
          xp_total: 240,
          xp_into_level: 140,
          xp_for_next_level: 150,
          xp_to_next_level: 10,
          progress_ratio: 0.93
        },
        badges: [
          {
            code: "first_clear",
            title: "First Clear",
            description: "Finish any puzzle with a non-zero score."
          }
        ],
        stats: {
          solved_count: 2,
          best_score: 95,
          personal_best_count: 2
        }
      })
    });
  });

  await page.route("**/api/v1/submissions/me?limit=12", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "submission-profile-1",
          level: {
            id: "level-1",
            title: "Sorting Sprint",
            game_type: "sorting",
            difficulty: 1
          },
          score: 95,
          stars: 3,
          time_elapsed: 8,
          hints_used: 0,
          is_best: true,
          optimal_steps: 2,
          user_steps: 2,
          created_at: "2026-03-25T10:00:00Z",
          diff: []
        }
      ])
    });
  });

  await page.goto("/register");
  await page.getByLabel("Email").fill("profile@example.com");
  await page.getByLabel("Username").fill("profileuser");
  await page.getByLabel("Password").fill("StrongPass123!");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/levels$/);

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "profileuser" })).toBeVisible();
  await expect(page.getByText("First Clear")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/replay/submission-profile-1");
});
