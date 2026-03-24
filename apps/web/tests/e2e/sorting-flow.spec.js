import { expect, test } from "@playwright/test";

const levelId = "8beadb91-19af-4ea8-a1d8-1024ea0f3a77";

test("register, play sorting level, and view score overlay", async ({ page }) => {
  await page.route("**/api/v1/auth/register", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "user-1",
          email: "new@example.com",
          username: "newuser",
          total_xp: 0
        },
        access: "test-access-token",
        refresh: "test-refresh-token"
      })
    });
  });

  await page.route(`**/api/v1/levels/${levelId}/start`, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ session_id: "sess_123", expires_in: 1800 })
    });
  });

  await page.route(`**/api/v1/levels/${levelId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: levelId,
        title: "Sorting Test",
        game_type: "sorting",
        difficulty: 1,
        config: {
          algorithm: "selection",
          array: [3, 1, 2]
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
        submission_id: "submission-1",
        score: 86,
        stars: 3,
        optimal_steps: 2,
        user_steps: 2,
        xp_earned: 172,
        is_personal_best: true,
        diff: [
          { step: 1, correct: true },
          { step: 2, correct: true }
        ],
        score_breakdown: {
          base_score: 100,
          time_bonus: 18,
          hint_penalty: 0
        }
      })
    });
  });

  await page.goto("/register");
  await page.getByLabel("Email").fill("new@example.com");
  await page.getByLabel("Username").fill("newuser");
  await page.getByLabel("Password").fill("StrongPass123!");
  await page.getByRole("button", { name: "Create Account" }).click();

  await page.goto(`/levels/${levelId}/sorting`);
  await page.getByRole("button", { name: "Select value 3 at position 1" }).click();
  await page.getByRole("button", { name: "Select value 1 at position 2" }).click();
  await page.getByRole("button", { name: "Select value 3 at position 2" }).click();
  await page.getByRole("button", { name: "Select value 2 at position 3" }).click();

  await page.getByRole("button", { name: "Submit Moves" }).click();
  await expect(page.getByRole("heading", { name: "Round Result" })).toBeVisible();
  await expect(page.getByText("XP Earned:")).toBeVisible();
});
