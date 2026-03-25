export async function mockLoggedOutBootstrap(page) {
  await page.route("**/api/v1/auth/refresh", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        detail: "No active refresh session."
      })
    });
  });
}
