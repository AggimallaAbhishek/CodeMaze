import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = __ENV.API_BASE_URL;

export const options = {
  scenarios: {
    smoke: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 5),
      duration: __ENV.DURATION || "2m"
    }
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"]
  }
};

if (!baseUrl) {
  throw new Error("API_BASE_URL is required");
}

export default function () {
  const health = http.get(`${baseUrl}/healthz`);
  check(health, { "healthz returns 200": (response) => response.status === 200 });

  const levels = http.get(`${baseUrl}/levels`);
  check(levels, { "levels returns 200": (response) => response.status === 200 });

  const leaderboard = http.get(`${baseUrl}/leaderboard?scope=weekly`);
  check(leaderboard, { "leaderboard returns 200": (response) => response.status === 200 });

  sleep(1);
}
