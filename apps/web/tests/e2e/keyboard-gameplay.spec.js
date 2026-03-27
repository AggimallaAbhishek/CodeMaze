import { expect, test } from "@playwright/test";

import { mockAuthSession } from "./support/auth";

async function registerUser(page, authSession, user, accessToken = "keyboard-access-token") {
  await page.route("**/api/v1/auth/register", async (route) => {
    authSession.setAuthenticatedUser(user, accessToken);
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ user, access: accessToken })
    });
  });

  await page.goto("/register");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Password").fill("StrongPass123!");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/levels$/);
}

test("sorting gameplay is keyboard-operable", async ({ page }) => {
  const authSession = await mockAuthSession(page);
  const user = {
    id: "keyboard-sorting-user",
    email: "keyboard-sorting@example.com",
    username: "keyboardsorting",
    total_xp: 0
  };
  const levelId = "keyboard-sorting-level";

  await page.route(`**/api/v1/levels/${levelId}/start`, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ session_id: "sess_keyboard_sorting", expires_in: 1800 })
    });
  });

  await page.route(`**/api/v1/levels/${levelId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: levelId,
        title: "Keyboard Sorting",
        game_type: "sorting",
        difficulty: 1,
        config: { algorithm: "selection", array: [3, 1, 2] },
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
        submission_id: "keyboard-sorting-submission",
        score: 90,
        stars: 3,
        optimal_steps: 2,
        user_steps: 2,
        xp_earned: 180,
        diff: [],
        score_breakdown: { base_score: 100, time_bonus: 10, hint_penalty: 0 }
      })
    });
  });

  await registerUser(page, authSession, user);
  await page.goto(`/levels/${levelId}/sorting`);

  await page.getByRole("button", { name: "Select value 3 at position 1" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Select value 3 at position 2" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Submit Moves" }).focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("dialog", { name: "Round Result" })).toBeVisible();
});

test("pathfinding gameplay is keyboard-operable", async ({ page }) => {
  const authSession = await mockAuthSession(page);
  const user = {
    id: "keyboard-maze-user",
    email: "keyboard-maze@example.com",
    username: "keyboardmaze",
    total_xp: 0
  };
  const levelId = "keyboard-maze-level";

  await page.route(`**/api/v1/levels/${levelId}/start`, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ session_id: "sess_keyboard_maze", expires_in: 1800 })
    });
  });

  await page.route(`**/api/v1/levels/${levelId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: levelId,
        title: "Keyboard Maze",
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
        submission_id: "keyboard-maze-submission",
        score: 92,
        stars: 3,
        optimal_steps: 5,
        user_steps: 5,
        xp_earned: 184,
        diff: [],
        optimal_moves: [],
        score_breakdown: { base_score: 100, time_bonus: 12, hint_penalty: 0 }
      })
    });
  });

  await registerUser(page, authSession, user);
  await page.goto(`/levels/${levelId}/pathfinding`);

  await page.getByRole("button", { name: /Cell 1,2/ }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /Cell 1,3/ }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /Cell 2,3/ }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /Cell 3,3/ }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Submit Path" }).focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("dialog", { name: "Round Result" })).toBeVisible();
});

test("graph traversal gameplay is keyboard-operable", async ({ page }) => {
  const authSession = await mockAuthSession(page);
  const user = {
    id: "keyboard-graph-user",
    email: "keyboard-graph@example.com",
    username: "keyboardgraph",
    total_xp: 0
  };
  const levelId = "keyboard-graph-level";

  await page.route(`**/api/v1/levels/${levelId}/start`, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ session_id: "sess_keyboard_graph", expires_in: 1800 })
    });
  });

  await page.route(`**/api/v1/levels/${levelId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: levelId,
        title: "Keyboard Graph",
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
        submission_id: "keyboard-graph-submission",
        score: 88,
        stars: 3,
        optimal_steps: 4,
        user_steps: 4,
        xp_earned: 176,
        diff: [],
        score_breakdown: { base_score: 100, time_bonus: 8, hint_penalty: 0 }
      })
    });
  });

  await registerUser(page, authSession, user);
  await page.goto(`/levels/${levelId}/graph-traversal`);

  await page.getByRole("button", { name: /Visit node B/ }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /Visit node C/ }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /Visit node D/ }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Submit Traversal" }).focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("dialog", { name: "Round Result" })).toBeVisible();
});
