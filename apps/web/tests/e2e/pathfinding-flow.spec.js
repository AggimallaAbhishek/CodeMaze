import { expect, test } from "@playwright/test";

const levelId = "27a0f188-aa56-4a82-9cd6-c11b218b2b90";

test("register, play pathfinding maze, and view result overlay", async ({ page }) => {
  await page.route("**/api/v1/auth/register", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "user-2",
          email: "maze@example.com",
          username: "mazeuser",
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
      body: JSON.stringify({ session_id: "sess_maze_123", expires_in: 1800 })
    });
  });

  await page.route(`**/api/v1/levels/${levelId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: levelId,
        title: "Maze Test",
        game_type: "pathfinding",
        difficulty: 2,
        config: {
          grid: [
            [0, 0, 0],
            [1, 1, 0],
            [0, 0, 0]
          ],
          start: [0, 0],
          end: [2, 2],
          weighted: false,
          mode: "bfs"
        },
        optimal_steps: 5,
        order_index: 1
      })
    });
  });

  await page.route("**/api/v1/submissions", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        submission_id: "submission-maze-1",
        score: 92,
        stars: 3,
        optimal_steps: 5,
        user_steps: 5,
        xp_earned: 184,
        is_personal_best: true,
        diff: [],
        optimal_moves: [
          { type: "path_cell", cell: [0, 0] },
          { type: "path_cell", cell: [0, 1] },
          { type: "path_cell", cell: [0, 2] },
          { type: "path_cell", cell: [1, 2] },
          { type: "path_cell", cell: [2, 2] }
        ],
        score_breakdown: {
          base_score: 100,
          time_bonus: 12,
          hint_penalty: 0
        }
      })
    });
  });

  await page.goto("/register");
  await page.getByLabel("Email").fill("maze@example.com");
  await page.getByLabel("Username").fill("mazeuser");
  await page.getByLabel("Password").fill("StrongPass123!");
  await page.getByRole("button", { name: "Create Account" }).click();

  await page.goto(`/levels/${levelId}/pathfinding`);
  await page.getByRole("button", { name: "Cell 1,2" }).click();
  await page.getByRole("button", { name: "Cell 1,3" }).click();
  await page.getByRole("button", { name: "Cell 2,3" }).click();
  await page.getByRole("button", { name: "Cell 3,3" }).click();

  await page.getByRole("button", { name: "Submit Path" }).click();
  await expect(page.getByRole("heading", { name: "Round Result" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show Optimal Path" })).toBeVisible();
});
