# Step 10: The end-to-end (E2E) browser test framework

## Goal
Add a test layer that checks the whole slice the way a user sees it: a real browser, the real frontend, the real API
and storage. The same tests must later run unchanged against Compose and Kubernetes, so the address is a setting.

## Required deliverables
- An E2E test runner in `frontend/` (e.g. Playwright) with an `e2e/` test folder and scripts to run the tests and
  open the report.
- Config:
  - the base URL comes from `BASE_URL`, with a local default;
  - **`BASE_URL` not set**: the runner starts the API and frontend dev servers itself, on **their own ports** (not the
    ones a developer uses), waiting for `/api/v1/livez` and the frontend port; it starts fresh servers every time;
  - **`BASE_URL` set**: test that address and start nothing;
  - one browser (Chromium), headless; a terminal reporter and an HTML report; a trace on retry; one retry in CI.
- The component test runner ignores the E2E folder; the type-checker and linter cover it.
- The first test, `e2e/status.spec.ts`: open `/`, and the status panel shows API ok, storage ok, Model loaded.
  Elements found by role and label.
- `make setup` installs the browser; `make test-e2e` builds the model first (`make model`), then runs the E2E suite.
  `make test` now includes `test-e2e`.
- CI installs the browser (with its system packages) and uploads the HTML report and traces when E2E fails.
- README: how to run the E2E tests, open the report, and run against another address with `BASE_URL`.

## Acceptance checks
1. With the storage service running, `make test-e2e` starts its own servers, runs headless and passes.
2. The HTML report shows the test passed.
3. With the storage service stopped, the test fails with a readable message (e.g. "Expected ok, Received not ready").
4. Setting `BASE_URL` to a running app makes the suite test it without starting servers.
5. `make lint` and `make test` (backend + frontend + `check-openapi` + E2E) pass; CI passes on the PR.
6. Test added: E2E "the app loads and the status panel shows everything ready".

## Default (MOSAIC's way)
Playwright with `playwright.config.ts`, `testDir: "e2e"`, Chromium only. At first it reused running dev servers on
8000/3000 outside CI; a later review fix (#19) made it always start fresh servers on 8001/3001, so a stale dev API
cannot hide a bug. A new project starts with the fixed behavior. `make setup` runs
`npx playwright install chromium`; CI runs `npx playwright install --with-deps chromium`. Vitest's `include` was
limited to `src/**/*.test.{ts,tsx}`.

Reference: reference/step-10/ (plan.md, changes.txt, files/); the later config is in reference/step-14/files/.

Adapt: the storage label in the status assertion.

## Swap notes
Depends on: test runners, frontend, backend (how its dev server starts), CI.

- **Cypress instead of Playwright:** `baseUrl` from `BASE_URL`; start servers with `start-server-and-test` when it is
  not set. Network checks in Steps 11–12 use `cy.intercept`.
- **Vue or another frontend:** no change to the tests themselves; only the dev-server command.
- **Backend not Python:** the web-server command changes; it still waits for `/api/v1/livez`.

Must not change:
- `make test-e2e`, and `BASE_URL` as the one switch between "start servers" and "test this address".
- The same E2E files run against dev servers, Compose, local Kubernetes and the staging cluster.
- E2E tests select by role and label; `make test` includes E2E.
