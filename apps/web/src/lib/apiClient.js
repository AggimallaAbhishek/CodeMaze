const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

async function request(path, { method = "GET", payload, token } = {}) {
  const headers = {
    Accept: "application/json"
  };

  if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: payload !== undefined ? JSON.stringify(payload) : undefined
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail ?? "Request failed.");
  }

  return data;
}

export function registerUser(payload) {
  return request("/auth/register", { method: "POST", payload });
}

export function loginUser(payload) {
  return request("/auth/login", { method: "POST", payload });
}

export function refreshAccessToken(refresh) {
  return request("/auth/refresh", { method: "POST", payload: refresh ? { refresh } : {} });
}

export function logoutUser(refresh, token) {
  return request("/auth/logout", {
    method: "POST",
    payload: refresh ? { refresh } : {},
    token
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

export function getGlobalLeaderboard(scope = "all_time") {
  return request(`/leaderboard?scope=${scope}`);
}
