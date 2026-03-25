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

  await page.route(`**/api/v1/levels/${levelId}/hint`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Swap positions 1 and 2 to reorder 3 and 1.",
        preview_move: { type: "swap", indices: [0, 1] },
        penalty_applied: 10,
        hints_used_total: 1
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
        total_xp: 172,
        progression: {
          level: 2,
          xp_total: 172,
          xp_into_level: 72,
          xp_for_next_level: 150,
          xp_to_next_level: 78,
          progress_ratio: 0.48
        },
        hints_used: 1,
        awarded_badges: [{ code: "first_clear", title: "First Clear" }],
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

  await page.route("**/api/v1/submissions/submission-1/replay", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "submission-1",
        level: {
          id: levelId,
          title: "Sorting Test",
          game_type: "sorting",
          difficulty: 1
        },
        moves: [
          { type: "swap", indices: [0, 1] },
          { type: "swap", indices: [1, 2] }
        ],
        optimal_moves: [
          { type: "swap", indices: [0, 1] },
          { type: "swap", indices: [1, 2] }
        ],
        diff: [
          { step: 1, correct: true },
          { step: 2, correct: true }
        ],
        score: 86,
        stars: 3,
        time_elapsed: 12,
        hints_used: 1,
        optimal_steps: 2,
        user_steps: 2,
        created_at: "2026-03-25T10:00:00Z"
      })
    });
  });

  await page.goto("/register");
  await page.getByLabel("Email").fill("new@example.com");
  await page.getByLabel("Username").fill("newuser");
  await page.getByLabel("Password").fill("StrongPass123!");
  await page.getByRole("button", { name: "Create Account" }).click();

  await page.goto(`/levels/${levelId}/sorting`);
  await page.getByRole("button", { name: "Use Hint (-10)" }).click();
  await expect(page.getByText("Swap positions 1 and 2 to reorder 3 and 1.")).toBeVisible();
  await page.getByRole("button", { name: "Select value 3 at position 1" }).click();
  await page.getByRole("button", { name: "Select value 1 at position 2" }).click();
  await page.getByRole("button", { name: "Select value 3 at position 2" }).click();
  await page.getByRole("button", { name: "Select value 2 at position 3" }).click();

  await page.getByRole("button", { name: "Submit Moves" }).click();
  await expect(page.getByRole("heading", { name: "Round Result" })).toBeVisible();
  await expect(page.getByText("First Clear")).toBeVisible();
  await page.getByRole("link", { name: "Review Replay" }).click();
  await expect(page.getByRole("heading", { name: "Sorting Test" })).toBeVisible();
  await expect(page.getByText("Aligned")).toBeVisible();
});
