import { expect, test } from "@playwright/test";

const levelId = "4d83b1b3-f410-4fa2-b5e7-1783eb963088";

test("register, play graph traversal level, and view result overlay", async ({ page }) => {
  await page.route("**/api/v1/auth/register", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "user-3",
          email: "graph@example.com",
          username: "graphuser",
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
      body: JSON.stringify({ session_id: "sess_graph_123", expires_in: 1800 })
    });
  });

  await page.route(`**/api/v1/levels/${levelId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: levelId,
        title: "Graph Traversal Test",
        game_type: "graph_traversal",
        difficulty: 2,
        config: {
          adjacency: {
            A: ["B", "C"],
            B: ["D"],
            C: [],
            D: []
          },
          start: "A",
          mode: "bfs",
          positions: {
            A: [50, 12],
            B: [20, 34],
            C: [80, 34],
            D: [50, 66]
          }
        },
        optimal_steps: 4,
        order_index: 1
      })
    });
  });

  await page.route("**/api/v1/submissions", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        submission_id: "submission-graph-1",
        score: 88,
        stars: 3,
        optimal_steps: 4,
        user_steps: 4,
        xp_earned: 176,
        is_personal_best: true,
        diff: [],
        score_breakdown: {
          base_score: 100,
          time_bonus: 8,
          hint_penalty: 0
        }
      })
    });
  });

  await page.goto("/register");
  await page.getByLabel("Email").fill("graph@example.com");
  await page.getByLabel("Username").fill("graphuser");
  await page.getByLabel("Password").fill("StrongPass123!");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/levels$/);

  await page.goto(`/levels/${levelId}/graph-traversal`);
  await page.getByRole("button", { name: /Visit node B/ }).click();
  await page.getByRole("button", { name: /Visit node C/ }).click();
  await page.getByRole("button", { name: /Visit node D/ }).click();

  await page.getByRole("button", { name: "Submit Traversal" }).click();
  await expect(page.getByRole("heading", { name: "Round Result" })).toBeVisible();
  await expect(page.getByText("XP Earned:")).toBeVisible();
});
