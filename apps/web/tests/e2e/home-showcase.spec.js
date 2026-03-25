import { expect, test } from "@playwright/test";

import { mockAuthSession } from "./support/auth";

test("renders the adapted home showcase and switches arena tabs", async ({ page }) => {
  await mockAuthSession(page);

  await page.route("**/api/v1/levels", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "sorting-level",
          title: "Sorting Sprint",
          game_type: "sorting",
          difficulty: 1,
          order_index: 1
        },
        {
          id: "maze-level",
          title: "Maze Matrix",
          game_type: "pathfinding",
          difficulty: 2,
          order_index: 2
        },
        {
          id: "graph-level",
          title: "Traversal Nexus",
          game_type: "graph_traversal",
          difficulty: 3,
          order_index: 3
        }
      ])
    });
  });

  await page.route("**/api/v1/leaderboard?scope=weekly", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        entries: [
          { rank: 1, user_id: "u1", username: "graphguru", score: 980 },
          { rank: 2, user_id: "u2", username: "sortsage", score: 920 }
        ]
      })
    });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Algorithms/i })).toBeVisible();
  await expect(page.getByText("Sorting Game")).toBeVisible();

  await page.getByRole("tab", { name: "Pathfinding" }).click();
  await expect(page.getByRole("heading", { name: "Maze Routing Bay" })).toBeVisible();

  await page.getByRole("tab", { name: "Graph" }).click();
  await expect(page.getByRole("heading", { name: "Traversal Ops Room" })).toBeVisible();
});
