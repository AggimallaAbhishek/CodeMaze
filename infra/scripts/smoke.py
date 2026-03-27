#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


API_BASE_URL = os.getenv("API_BASE_URL", "").rstrip("/")
WEB_BASE_URL = os.getenv("WEB_BASE_URL", "").rstrip("/")
SMOKE_EMAIL = os.getenv("SMOKE_EMAIL", "smoke-bot@example.com")
SMOKE_USERNAME = os.getenv("SMOKE_USERNAME", "smokebot")
SMOKE_PASSWORD = os.getenv("SMOKE_PASSWORD", "StrongPass123!")


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def request(path: str, *, method: str = "GET", payload: dict | None = None, token: str | None = None):
    if not API_BASE_URL:
        fail("API_BASE_URL is required for smoke.py")

    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Accept": "application/json"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(f"{API_BASE_URL}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        payload = json.loads(raw) if raw else {}
        return exc.code, payload


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
        return payload["access"], payload["user"]

    status, payload = request(
        "/auth/login",
        method="POST",
        payload={"email": SMOKE_EMAIL, "password": SMOKE_PASSWORD},
    )
    if status != 200 or not payload:
        fail(f"Unable to register/login smoke user: {status} {payload}")

    access = payload["access"]
    status, user_payload = request("/users/me", token=access)
    if status != 200 or not user_payload:
        fail(f"Unable to load smoke user profile: {status} {user_payload}")
    return access, user_payload


def main() -> None:
    if WEB_BASE_URL:
        web_request = urllib.request.Request(WEB_BASE_URL, headers={"Accept": "text/html"})
        with urllib.request.urlopen(web_request, timeout=20) as response:
            if response.status != 200:
                fail(f"Web smoke failed with status {response.status}")

    for path in ["/healthz", "/readyz"]:
        status, payload = request(path)
        if status != 200:
            fail(f"{path} failed with status {status}: {payload}")

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
