import { expect, test } from "@playwright/test";

import { mockAuthSession } from "./support/auth";

async function exerciseCatalogSurfaces(page) {
  const authSession = await mockAuthSession(page);
  const user = {
    id: "ui-surface-user",
    email: "ui@example.com",
    username: "uistrategist",
    total_xp: 920,
    is_verified: true,
    progression: {
      level: 4,
      xp_into_level: 90,
      xp_for_next_level: 120,
      xp_to_next_level: 30
    },
    badges: [
      {
        code: "first_clear",
        title: "First Clear",
        description: "Finish any puzzle with a non-zero score."
      }
    ],
    stats: {
      solved_count: 6,
      best_score: 100,
      personal_best_count: 2
    }
  };

  await page.route("**/api/v1/auth/login", async (route) => {
    authSession.setAuthenticatedUser(user, "ui-access-token");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access: "ui-access-token" })
    });
  });

  await page.route("**/api/v1/levels", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "sort-1", title: "Bubble Basics", game_type: "sorting", difficulty: 1, order_index: 1 },
        { id: "maze-1", title: "Weighted Corridor", game_type: "pathfinding", difficulty: 3, order_index: 1 },
        { id: "graph-1", title: "Frontier Order", game_type: "graph_traversal", difficulty: 2, order_index: 1 }
      ])
    });
  });

  await page.route("**/api/v1/submissions/me?limit=12", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "submission-sort-1",
          level: { id: "sort-1", title: "Bubble Basics", game_type: "sorting" },
          score: 96,
          stars: 3,
          is_best: true
        },
        {
          id: "submission-graph-1",
          level: { id: "graph-1", title: "Frontier Order", game_type: "graph_traversal" },
          score: 88,
          stars: 2,
          is_best: false
        }
      ])
    });
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("ui@example.com");
  await page.locator("#login-password").fill("StrongPass123!");
  await page.getByRole("button", { name: "Enter Arena" }).click();

  await expect(page).toHaveURL(/\/levels$/);
  await expect(page.getByRole("heading", { name: /Choose the Arena/i })).toBeVisible();

  await page.getByRole("tab", { name: /Pathfinding/i }).click();
  await expect(page.locator(".levels-spotlight-headline")).toHaveText("Map the shortest route before the maze maps you.");
  await expect(page.getByRole("heading", { name: "Weighted Corridor" })).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "uistrategist" })).toBeVisible();
  await page.getByRole("tab", { name: "Graph" }).click();
  await expect(page.getByRole("cell", { name: "Frontier Order" })).toBeVisible();
  await expect(page.getByText("First Clear")).toBeVisible();
}

test("levels spotlight and profile filters remain interactive", async ({ page }) => {
  await exerciseCatalogSurfaces(page);
});

test("@mobile levels spotlight and profile filters remain interactive on touch layouts", async ({ page }) => {
  await exerciseCatalogSurfaces(page);
});
