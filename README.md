# Algorithm Puzzle Game

Monorepo for the Algorithm Puzzle Game platform.

## Layout

- `apps/api`: Django + DRF API, auth, levels, submissions, leaderboard.
- `apps/web`: React + Vite frontend, sorting + pathfinding + graph traversal gameplay UI.
- `workers/engine`: Pure Python algorithm engine modules + tests.
- `infra`: Infra-related configs (expand for production stages).

## Quick Start

1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. API: `http://localhost:8000/api/v1`
4. Web: `http://localhost:5173`

## MVP Features (Phase 0 + 5)

- Auth-required sorting gameplay:
  - register/login/logout with JWT and refresh token cookie
  - level start with Redis-backed session token
  - sorting move submission + server-side validation
  - result overlay with score/stars/optimal-step diff
- Auth-required pathfinding gameplay:
  - BFS/Dijkstra-backed maze level configs
  - click-to-draw path with undo/redo/reset
  - path submission with server-side legal-path validation
  - optional optimal-path overlay after submission
- Auth-required graph traversal gameplay:
  - BFS/DFS-backed graph level configs
  - click-to-visit node order with undo/redo/reset
  - queue/stack teaching panel for traversal guidance
  - traversal submission with server-side canonical-order validation
- Auth hardening:
  - login brute-force lockout backed by cache counters
  - refresh/logout cookie flows guarded by CSRF token checks
  - email verification request/confirm endpoints
  - Google ID token exchange endpoint with verified-user provisioning
- Phase 5 progression + replay:
  - server-issued hints with session-tracked penalties
  - replay endpoint with side-by-side move comparison data
  - profile page data for XP, levels, badges, and recent submissions
  - global and per-level leaderboard scopes with user-rank payloads
- Idempotent sorting + pathfinding + graph seed commands for local bootstrap.

## Current Implementation Scope

- Phase 0 foundation complete in repo structure and CI baseline.
- Phase 1 sorting vertical slice implemented end-to-end.
- Phase 2 pathfinding vertical slice implemented end-to-end:
  - multi-mode levels API (sorting + pathfinding)
  - session start
  - submission validation/scoring
  - sorting + pathfinding gameplay UIs
- Phase 3 graph traversal vertical slice implemented end-to-end:
  - graph level API + seeding
  - BFS/DFS traversal gameplay UI
  - queue/stack teaching panel + traversal scoring
- Phase 4 auth/security hardening implemented:
  - JWT refresh cookie hardening + logout blacklisting
  - verification and OAuth endpoints
  - auth/security regression tests
- Phase 5 progression, leaderboard, hints, and replay implemented:
  - badge awarding + XP progression snapshots
  - server-tracked hint penalties on the submission pipeline
  - profile/history UI and replay comparison route
  - leaderboard scope switching and authenticated rank display

## Security Baseline

- JWT auth, password validation, secure headers.
- DRF throttling for auth + submission routes.
- Input validation and server-side move re-validation.
- Dependency/security scans in CI.

## Testing

- `workers/engine`: unit tests for sorting/pathfinding/graphs/validator.
- `apps/api`: API/service tests.
- `apps/web`: Vitest unit tests + Playwright E2E flows.

## Useful Commands

- `make up`: start full stack.
- `make api-test`: run backend tests.
- `make web-test`: run frontend unit tests.
- `make web-e2e`: run Playwright browser automation tests.

## Google Auth Env

Set these in `.env` before using Google sign-in:

- `GOOGLE_OAUTH_CLIENT_ID`: used by Django to validate Google token audience.
- `VITE_GOOGLE_CLIENT_ID`: used by React Google Sign-In UI.

For local development, both values should be the same Google OAuth Web Client ID.
