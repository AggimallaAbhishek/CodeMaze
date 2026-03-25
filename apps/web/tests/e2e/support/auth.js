export async function mockAuthSession(page) {
  let currentUser = null;
  let currentAccessToken = "test-access-token";

  await page.route("**/api/v1/auth/refresh", async (route) => {
    if (currentUser) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access: currentAccessToken
        })
      });
      return;
    }

    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        detail: "No active refresh session."
      })
    });
  });

  await page.route("**/api/v1/users/me", async (route) => {
    if (!currentUser) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          detail: "Authentication credentials were not provided."
        })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentUser)
    });
  });

  return {
    setAuthenticatedUser(user, accessToken = "test-access-token") {
      currentUser = user;
      currentAccessToken = accessToken;
    },
    clearAuthenticatedUser() {
      currentUser = null;
    }
  };
}
