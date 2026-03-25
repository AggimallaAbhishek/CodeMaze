import { useAuthStore } from "../store/useAuthStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
let refreshPromise = null;

function getCsrfToken() {
  if (typeof document === "undefined") {
    return "";
  }

  const csrfCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("csrftoken="));
  if (!csrfCookie) {
    return "";
  }
  return decodeURIComponent(csrfCookie.split("=").slice(1).join("="));
}

async function sendRequest(path, { method = "GET", payload, token, requiresCsrf = false } = {}) {
  const headers = {
    Accept: "application/json"
  };

  if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const csrfToken = requiresCsrf ? getCsrfToken() : "";
  if (csrfToken) {
    headers["X-CSRFToken"] = csrfToken;
  }

  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: payload !== undefined ? JSON.stringify(payload) : undefined
  });
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail ?? "Request failed.");
  }

  return data;
}

async function performRefresh() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await sendRequest("/auth/refresh", {
        method: "POST",
        payload: {},
        requiresCsrf: true
      });
      const data = await parseResponse(response);
      useAuthStore.getState().setAccessToken(data.access);
      return data;
    })();
  }

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function request(path, { method = "GET", payload, token, skipAuthRetry = false, requiresCsrf } = {}) {
  const resolvedToken = token ?? useAuthStore.getState().accessToken;
  const shouldAttachCsrf = requiresCsrf ?? (path === "/auth/refresh" || path === "/auth/logout");
  let response = await sendRequest(path, {
    method,
    payload,
    token: resolvedToken,
    requiresCsrf: shouldAttachCsrf
  });

  if (response.status === 401 && !skipAuthRetry && !path.startsWith("/auth/")) {
    try {
      const refreshResult = await performRefresh();
      response = await sendRequest(path, {
        method,
        payload,
        token: refreshResult.access,
        requiresCsrf: shouldAttachCsrf
      });
    } catch (error) {
      useAuthStore.getState().clearAuthSession();
      throw error;
    }
  }

  return parseResponse(response);
}

export function registerUser(payload) {
  return request("/auth/register", { method: "POST", payload });
}

export function loginUser(payload) {
  return request("/auth/login", { method: "POST", payload });
}

export function googleAuth(payload) {
  return request("/auth/google", { method: "POST", payload });
}

export function refreshAccessToken() {
  return performRefresh();
}

export function logoutUser(token) {
  return request("/auth/logout", {
    method: "POST",
    payload: {},
    token,
    requiresCsrf: true,
    skipAuthRetry: true
  });
}

export function getCurrentUser(token) {
  return request("/users/me", { token });
}

export function getLevels({ gameType, difficulty, token } = {}) {
  const params = new URLSearchParams();
  if (gameType) {
    params.set("game_type", gameType);
  }
  if (difficulty) {
    params.set("difficulty", String(difficulty));
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return request(`/levels${query}`, { token });
}

export function getLevelById(levelId, token) {
  return request(`/levels/${levelId}`, { token });
}

export function startLevelSession(levelId, token) {
  return request(`/levels/${levelId}/start`, { method: "POST", token, payload: {} });
}

export function submitMoves(payload, token) {
  return request("/submissions", { method: "POST", payload, token });
}

export function requestLevelHint(levelId, payload, token) {
  return request(`/levels/${levelId}/hint`, { method: "POST", payload, token });
}

export function getMySubmissions(token, { levelId, best, limit } = {}) {
  const params = new URLSearchParams();
  if (levelId) {
    params.set("level_id", String(levelId));
  }
  if (best) {
    params.set("best", "true");
  }
  if (limit) {
    params.set("limit", String(limit));
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return request(`/submissions/me${query}`, { token });
}

export function getSubmissionReplay(submissionId, token) {
  return request(`/submissions/${submissionId}/replay`, { token });
}

export function getGlobalLeaderboard(scope = "all_time", token) {
  return request(`/leaderboard?scope=${scope}`, { token });
}

export function getLevelLeaderboard(levelId, scope = "all_time", token) {
  return request(`/leaderboard/levels/${levelId}?scope=${scope}`, { token });
}
