#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request


API_BASE_URL = os.getenv("API_BASE_URL", "").rstrip("/")
WEB_BASE_URL = os.getenv("WEB_BASE_URL", "").rstrip("/")
SMOKE_EMAIL = os.getenv("SMOKE_EMAIL", "smoke-bot@example.com")
SMOKE_USERNAME = os.getenv("SMOKE_USERNAME", "smokebot")
SMOKE_PASSWORD = os.getenv("SMOKE_PASSWORD", "StrongPass123!")
SMOKE_RETRY_ATTEMPTS = int(os.getenv("SMOKE_RETRY_ATTEMPTS", "18"))
SMOKE_RETRY_DELAY_SECONDS = float(os.getenv("SMOKE_RETRY_DELAY_SECONDS", "10"))
SMOKE_RESPONSE_PREVIEW_CHARS = int(os.getenv("SMOKE_RESPONSE_PREVIEW_CHARS", "240"))


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def log(message: str) -> None:
    print(f"[smoke] {message}", flush=True)


def preview_text(value: str, *, limit: int = SMOKE_RESPONSE_PREVIEW_CHARS) -> str:
    text = value.strip()
    if len(text) <= limit:
        return text
    return f"{text[:limit]}..."


def parse_response_payload(raw: str, content_type: str | None):
    if not raw:
        return None

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        return {
            "detail": "Response body was not valid JSON.",
            "content_type": content_type or "",
            "raw_body": preview_text(raw),
            "parse_error": str(exc),
        }


def format_payload(payload) -> str:
    if payload is None:
        return "null"
    if isinstance(payload, (dict, list)):
        return json.dumps(payload, sort_keys=True, default=str)
    return str(payload)


def request_url(
    url: str,
    *,
    method: str = "GET",
    payload: dict | None = None,
    token: str | None = None,
    accept: str = "application/json",
):
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Accept": accept}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8", errors="replace")
            content_type = response.headers.get("Content-Type", "")
            return response.status, parse_response_payload(raw, content_type)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        content_type = exc.headers.get("Content-Type", "") if exc.headers else ""
        parsed_payload = parse_response_payload(raw, content_type)
        if parsed_payload is None:
            parsed_payload = {
                "detail": "HTTP error response with an empty body.",
                "content_type": content_type,
            }
        return exc.code, parsed_payload
    except urllib.error.URLError as exc:
        return 0, {"detail": "Network error during request.", "reason": str(exc.reason)}
    except TimeoutError:
        return 0, {"detail": "Request timed out."}


def request(path: str, *, method: str = "GET", payload: dict | None = None, token: str | None = None):
    if not API_BASE_URL:
        fail("API_BASE_URL is required for smoke.py")

    return request_url(f"{API_BASE_URL}{path}", method=method, payload=payload, token=token)


def wait_for_check(
    name: str,
    fetch,
    *,
    is_ready,
    attempts: int = SMOKE_RETRY_ATTEMPTS,
    delay_seconds: float = SMOKE_RETRY_DELAY_SECONDS,
):
    last_status = None
    last_payload = None

    for attempt in range(1, attempts + 1):
        status, payload = fetch()
        last_status = status
        last_payload = payload

        if is_ready(status, payload):
            if attempt > 1:
                log(f"{name} became ready on attempt {attempt}/{attempts}")
            return status, payload

        log(f"{name} attempt {attempt}/{attempts} returned status={status} payload={format_payload(payload)}")
        if attempt < attempts:
            time.sleep(delay_seconds)

    fail(
        f"{name} did not become ready after {attempts} attempts. "
        f"Last status={last_status} payload={format_payload(last_payload)}"
    )


def selection_sort_moves(values: list[int]) -> list[dict]:
    arr = list(values)
    moves = []
    for index in range(len(arr)):
        min_index = index
        for cursor in range(index + 1, len(arr)):
            if arr[cursor] < arr[min_index]:
                min_index = cursor
        if min_index != index:
            arr[index], arr[min_index] = arr[min_index], arr[index]
            moves.append({"type": "swap", "indices": [index, min_index]})
    return moves


def bubble_sort_moves(values: list[int]) -> list[dict]:
    arr = list(values)
    moves = []
    for upper_bound in range(len(arr) - 1, 0, -1):
        for index in range(upper_bound):
            if arr[index] > arr[index + 1]:
                arr[index], arr[index + 1] = arr[index + 1], arr[index]
                moves.append({"type": "swap", "indices": [index, index + 1]})
    return moves


def build_sorting_moves(level: dict) -> list[dict]:
    config = level.get("config", {})
    algorithm = config.get("algorithm", "selection")
    values = config.get("array", [])
    if algorithm == "bubble":
        return bubble_sort_moves(values)
    return selection_sort_moves(values)


def register_or_login() -> tuple[str, dict]:
    log("Registering or logging in smoke user")
    status, payload = request(
        "/auth/register",
        method="POST",
        payload={
            "email": SMOKE_EMAIL,
            "username": SMOKE_USERNAME,
            "password": SMOKE_PASSWORD,
        },
    )
    if status == 201 and payload:
        log("Smoke user registered successfully")
        return payload["access"], payload["user"]

    status, payload = request(
        "/auth/login",
        method="POST",
        payload={"email": SMOKE_EMAIL, "password": SMOKE_PASSWORD},
    )
    if status != 200 or not payload:
        fail(f"Unable to register/login smoke user: {status} {payload}")

    log("Smoke user logged in successfully")
    access = payload["access"]
    status, user_payload = request("/users/me", token=access)
    if status != 200 or not user_payload:
        fail(f"Unable to load smoke user profile: {status} {user_payload}")
    return access, user_payload


def main() -> None:
    log("Starting staging smoke checks")
    if WEB_BASE_URL:
        wait_for_check(
            "web",
            lambda: request_url(WEB_BASE_URL, accept="text/html"),
            is_ready=lambda status, _payload: status == 200,
        )

    wait_for_check(
        "/healthz",
        lambda: request("/healthz"),
        is_ready=lambda status, payload: status == 200 and isinstance(payload, dict) and payload.get("status") == "ok",
    )
    wait_for_check(
        "/readyz",
        lambda: request("/readyz"),
        is_ready=lambda status, payload: status == 200 and isinstance(payload, dict) and payload.get("status") == "ready",
    )

    access, _user = register_or_login()

    status, leaderboard = request("/leaderboard?scope=weekly", token=access)
    if status != 200:
        fail(f"Leaderboard smoke failed with status {status}: {leaderboard}")

    status, levels = request("/levels", token=access)
    if status != 200 or not isinstance(levels, list) or not levels:
        fail(f"Levels smoke failed with status {status}: {levels}")

    sorting_level = next((level for level in levels if level.get("game_type") == "sorting"), None)
    if not sorting_level:
        fail("No sorting level available for smoke submission")

    status, level = request(f"/levels/{sorting_level['id']}", token=access)
    if status != 200:
        fail(f"Unable to load sorting level: {status} {level}")

    status, session = request(f"/levels/{sorting_level['id']}/start", method="POST", payload={}, token=access)
    if status != 201 or not session:
        fail(f"Unable to start sorting session: {status} {session}")

    moves = build_sorting_moves(level)
    status, submission = request(
        "/submissions",
        method="POST",
        token=access,
        payload={
            "session_id": session["session_id"],
            "level_id": sorting_level["id"],
            "moves": moves,
            "hints_used": 0,
            "time_elapsed": 0,
        },
    )
    if status != 201 or not submission:
        fail(f"Unable to submit sorting smoke run: {status} {submission}")

    submission_id = submission.get("submission_id")
    status, replay = request(f"/submissions/{submission_id}/replay", token=access)
    if status != 200 or not replay:
        fail(f"Replay smoke failed with status {status}: {replay}")

    print(
        json.dumps(
            {
                "status": "ok",
                "api_base_url": API_BASE_URL,
                "web_base_url": WEB_BASE_URL,
                "submission_id": submission_id,
                "leaderboard_entries": len(leaderboard.get("entries", [])),
            }
        )
    )


if __name__ == "__main__":
    main()
