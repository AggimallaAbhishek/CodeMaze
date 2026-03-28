import { expect, test } from "@playwright/test";

import { mockAuthSession } from "./support/auth";

async function seedThemeFixtures(page) {
  const authSession = await mockAuthSession(page);
  authSession.setAuthenticatedUser(
    {
      id: "theme-user",
      email: "theme@example.com",
      username: "themepilot",
      total_xp: 840,
      is_verified: true,
      progression: {
        level: 4,
        xp_into_level: 55,
        xp_for_next_level: 120,
        xp_to_next_level: 65
      },
      badges: [],
      stats: {
        solved_count: 6,
        best_score: 100,
        personal_best_count: 2
      }
    },
    "theme-access-token"
  );

  await page.route("**/api/v1/levels", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "sort-1", title: "Bubble Basics", game_type: "sorting", difficulty: 1, order_index: 1 },
        { id: "maze-1", title: "Weighted Corridor", game_type: "pathfinding", difficulty: 3, order_index: 2 },
        { id: "graph-1", title: "Frontier Order", game_type: "graph_traversal", difficulty: 2, order_index: 3 }
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
        ],
        user_rank: { rank: 8, score: 640 }
      })
    });
  });
}

async function currentTheme(page) {
  return page.locator("html").evaluate((element) => element.dataset.theme);
}

test("theme toggle persists across reloads and page transitions", async ({ page }) => {
  await seedThemeFixtures(page);
  await page.goto("/");

  const initialTheme = await currentTheme(page);
  const nextTheme = initialTheme === "dark" ? "light" : "dark";

  await page
    .getByRole("button", {
      name: initialTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    })
    .click();

  await expect.poll(() => currentTheme(page)).toBe(nextTheme);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("codemaze-theme"))).toBe(nextTheme);

  await page.reload();
  await expect.poll(() => currentTheme(page)).toBe(nextTheme);

  await page.goto("/levels");
  await expect(page.getByRole("heading", { name: /Choose the Arena/i })).toBeVisible();
  await expect.poll(() => currentTheme(page)).toBe(nextTheme);
});

test("@mobile theme toggle remains reachable on compact layouts", async ({ page }) => {
  await seedThemeFixtures(page);
  await page.goto("/");

  const initialTheme = await currentTheme(page);
  const nextTheme = initialTheme === "dark" ? "light" : "dark";

  await expect(
    page.getByRole("button", {
      name: initialTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    })
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: initialTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    })
    .click();

  await expect.poll(() => currentTheme(page)).toBe(nextTheme);
});
