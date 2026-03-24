# Algorithm Puzzle Game

Monorepo for the Algorithm Puzzle Game platform.

## Layout

- `apps/api`: Django + DRF API, auth, levels, submissions, leaderboard.
- `apps/web`: React + Vite frontend, sorting vertical slice UI.
- `workers/engine`: Pure Python algorithm engine modules + tests.
- `infra`: Infra-related configs (expand for production stages).

## Quick Start

1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. API: `http://localhost:8000/api/v1`
4. Web: `http://localhost:5173`

## MVP Features (Phase 0 + 1)

- Auth-required sorting gameplay:
  - register/login/logout with JWT and refresh token cookie
  - level start with Redis-backed session token
  - sorting move submission + server-side validation
  - result overlay with score/stars/optimal-step diff
- Global and per-level leaderboard endpoints.
- Idempotent sorting level seed command for local bootstrap.

## Current Implementation Scope

- Phase 0 foundation complete in repo structure and CI baseline.
- Phase 1 sorting vertical slice implemented end-to-end:
  - sorting levels API
  - session start
  - submission validation/scoring
  - sorting gameplay UI

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
