# Step 10: The Playwright E2E framework

Status: done (PR #15, tag `step-10`).

## Context
The backend has pytest and the frontend has Vitest, but nothing yet checks the whole slice the way a user sees it: a
real browser, the real frontend, the real API, and Redis. This step adds that layer with Playwright, plus one first
test. Later steps (the Workup screen, Analyze) add their user flows here. The same tests must later run unchanged
against the Docker Compose stack (Step 13) and Kubernetes (Stage 2), so the address they test is a setting.

Decisions (approved 2026-10-28):
- **Playwright starts the dev servers itself** (uvicorn on 8000, Vite on 3000) when `BASE_URL` isn't set. On the Mac
  it reuses servers that are already running; in CI it always starts fresh ones. Redis comes from Docker, as for the
  integration tests.
- **`BASE_URL` set → test that address and start nothing.** That's how Step 13 and Stage 2 will run the same tests.
- **Chromium only**, headless. Other browsers can be added later in one line.
- **`make test-e2e` builds the demo model first** (`make model`, about a second), because the API won't start
  without it, and CI doesn't build it otherwise.
- **The browser download goes into `make setup`** (`npx playwright install chromium`, about 150 MB, once per Mac).

## What I build
1. **Playwright in `frontend/`**:
   - `@playwright/test` as a dev dependency; scripts `test:e2e` (`playwright test`) and `report`
     (`playwright show-report`).
   - `playwright.config.ts`:
     - `testDir: "e2e"`, Chromium only, `baseURL` from `BASE_URL` or `http://localhost:3000`
     - `webServer` (only without `BASE_URL`): the API (`uv run uvicorn app.main:app` in `backend/`, waiting for
       `/api/v1/livez`) and Vite (`npm run dev`, waiting for port 3000); `reuseExistingServer` except in CI
     - reporters: `list` in the terminal and an `html` report (not opened automatically); a trace is kept on the
       first retry, and CI retries once
   - Vitest's `include` is limited to `src/**/*.test.{ts,tsx}`, so it doesn't pick up the Playwright files.
   - `tsconfig.json` and eslint also cover `e2e/` and `playwright.config.ts`, so they're type-checked and linted.
2. **The first test**, `e2e/status.spec.ts`: open `/`, and the status panel shows API "ok", Redis "ok" and Model
   "loaded". Elements are found by role and label (the CLAUDE.md rule).
3. **Wiring**:
   - `Makefile`: `setup` also installs Chromium; `test-e2e: model`, then `npm run test:e2e` in `frontend/`. It
     replaces the "no tests yet" placeholder.
   - CI: `npx playwright install --with-deps chromium` after `npm ci`. `make test` then runs the E2E test as well.
     When it fails, the HTML report and traces are uploaded as a CI artifact.
4. **README**: how to run the E2E tests, open the report, and run them against another address with `BASE_URL`.

Tests added:
- **E2E**: the app loads and shows API ok, Redis ok, Model loaded. With Redis stopped it fails ("Expected ok,
  Received not ready").

**Later (not now):** the Workup and Analyze flows (Steps 11–12), other browsers, running against Compose (Step 13)
and Kubernetes (Stage 2).

## How you verify
```bash
docker compose up -d redis
make setup                              # once: also downloads Chromium
make test-e2e                           # starts the API and Vite, runs the test headless, passes
cd frontend && npm run report           # the HTML report shows the test passed
```
- With the dev servers already running, `make test-e2e` reuses them.
- `make lint` and `make test` (BE + FE + check-openapi + E2E) are green, and CI ✓ on the PR.
