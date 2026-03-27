import { expect, test } from "@playwright/test";

import { mockAuthSession } from "./support/auth";

test("@mobile login screen remains usable on a touch viewport", async ({ page }) => {
  const authSession = await mockAuthSession(page);
  const user = {
    id: "mobile-login-user",
    email: "mobile-login@example.com",
    username: "mobilelogin",
    total_xp: 80
  };

  await page.route("**/api/v1/auth/login", async (route) => {
    authSession.setAuthenticatedUser(user, "mobile-login-access-token");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access: "mobile-login-access-token" })
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
  await page.getByLabel("Email").fill("mobile-login@example.com");
  await page.locator("#login-password").fill("StrongPass123!");
  await page.getByRole("button", { name: "Enter Arena" }).click();

  await expect(page).toHaveURL(/\/levels$/);
});

test("@mobile pathfinding controls remain usable on a touch viewport", async ({ page }) => {
  const authSession = await mockAuthSession(page);
  const user = {
    id: "mobile-maze-user",
    email: "mobile-maze@example.com",
    username: "mobilemaze",
    total_xp: 0
  };
  const levelId = "mobile-maze-level";

  await page.route("**/api/v1/auth/register", async (route) => {
    authSession.setAuthenticatedUser(user);
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ user, access: "mobile-maze-token" })
    });
  });

  await page.route(`**/api/v1/levels/${levelId}/start`, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ session_id: "sess_mobile_maze", expires_in: 1800 })
    });
  });

  await page.route(`**/api/v1/levels/${levelId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: levelId,
        title: "Mobile Maze",
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
        submission_id: "submission-mobile-maze",
        score: 92,
        stars: 3,
        optimal_steps: 5,
        user_steps: 5,
        xp_earned: 184,
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
  await page.getByLabel("Email").fill("mobile-maze@example.com");
  await page.getByLabel("Username").fill("mobilemaze");
  await page.getByLabel("Password").fill("StrongPass123!");
  await page.getByRole("button", { name: "Create Account" }).click();

  await page.goto(`/levels/${levelId}/pathfinding`);
  await page.getByRole("button", { name: /Cell 1,2/ }).click();
  await page.getByRole("button", { name: /Cell 1,3/ }).click();
  await page.getByRole("button", { name: /Cell 2,3/ }).click();
  await page.getByRole("button", { name: /Cell 3,3/ }).click();
  await page.getByRole("button", { name: "Submit Path" }).click();

  await expect(page.getByRole("dialog", { name: "Round Result" })).toBeVisible();
});

test("@mobile graph traversal controls remain usable on a touch viewport", async ({ page }) => {
  const authSession = await mockAuthSession(page);
  const user = {
    id: "mobile-graph-user",
    email: "mobile-graph@example.com",
    username: "mobilegraph",
    total_xp: 0
  };
  const levelId = "mobile-graph-level";

  await page.route("**/api/v1/auth/register", async (route) => {
    authSession.setAuthenticatedUser(user);
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ user, access: "mobile-graph-token" })
    });
  });

  await page.route(`**/api/v1/levels/${levelId}/start`, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ session_id: "sess_mobile_graph", expires_in: 1800 })
    });
  });

  await page.route(`**/api/v1/levels/${levelId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: levelId,
        title: "Mobile Graph",
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
        submission_id: "submission-mobile-graph",
        score: 88,
        stars: 3,
        optimal_steps: 4,
        user_steps: 4,
        xp_earned: 176,
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
  await page.getByLabel("Email").fill("mobile-graph@example.com");
  await page.getByLabel("Username").fill("mobilegraph");
  await page.getByLabel("Password").fill("StrongPass123!");
  await page.getByRole("button", { name: "Create Account" }).click();

  await page.goto(`/levels/${levelId}/graph-traversal`);
  await page.getByRole("button", { name: /Visit node B/ }).click();
  await page.getByRole("button", { name: /Visit node C/ }).click();
  await page.getByRole("button", { name: /Visit node D/ }).click();
  await page.getByRole("button", { name: "Submit Traversal" }).click();

  await expect(page.getByRole("dialog", { name: "Round Result" })).toBeVisible();
});
