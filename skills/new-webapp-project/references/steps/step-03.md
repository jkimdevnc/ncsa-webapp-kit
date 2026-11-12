# Step 3: API probes and the backend test framework

## Goal
Add the first backend code: an API with typed settings and the two Kubernetes health probes, plus the backend test
framework (unit and integration) that the regression suite grows from.

## Required deliverables
- A backend project with a lock file, pinned language version, and the dependencies for the API, the storage client
  and typed settings.
- Typed settings read from env vars (and the repo's `.env`): at least the storage URL and `LOG_LEVEL`, each with a
  working default. The app version comes from the project file, not a second copy.
- Everything under `/api/v1`:
  - `GET /api/v1/livez` → 200 whenever the process is up. It never checks dependencies, so a storage outage does not
    restart the pod.
  - `GET /api/v1/readyz` → `{status, <storage>, version}`: 200 when storage answers, 503 with `<storage>: "down"` when
    it does not.
  - Typed response models, so the probes appear in OpenAPI (needed by Step 9).
- One shared storage client with short timeouts (about 1 s), so `readyz` never hangs.
- Logs go to stdout.
- Tests in two layers: unit (storage faked, no Docker) and integration (marked, real storage from Compose).
  `make test-be` runs both; `make test-fast` skips integration.
- `make doctor`: the backend lock file matches the project file.
- README "Backend (API dev server)" section; `.env.example` documents each new setting.

## Acceptance checks
1. `make test` passes (backend layer now real).
2. With the dev server running, `GET /api/v1/readyz` returns 200 with storage `ok` and the version.
3. With the storage service stopped, `readyz` returns 503 with storage `down`, while `livez` stays 200. Starting it
   again brings `readyz` back to 200.
4. The API docs page (e.g. `/docs`) opens and lists both probes.
5. Tests added:
   - unit: `livez` is 200, and stays 200 when storage is down;
   - unit: `readyz` is 200 with storage `ok`, and 503 with storage `down`;
   - unit: settings come from env vars, and have a working default;
   - unit: the version comes from the project file;
   - integration: `readyz` is 200 against the real storage.
6. `make doctor` passes, including the lock-file check.

## Default (MOSAIC's way)
FastAPI with uvicorn, managed by `uv` (`backend/pyproject.toml`, `uv.lock`, Python 3.15). Settings in
`app/config.py` with `pydantic-settings` (`REDIS_URL`, `LOG_LEVEL`). Probes in `app/main.py`. One Redis client in
`app/redis_client.py` with 1 s timeouts. Tests in `backend/tests/unit/` (fakeredis) and `backend/tests/integration/`
(marked `integration`). During the step MOSAIC moved to Python 3.15, switched the test client to httpx2, and moved
`Depends()` into `Annotated[...]` for ruff's B008 rule.

Reference: reference/step-03/ (plan.md, changes.txt, files/).

Adapt: the readyz field name follows the storage (`redis`, `db`, ...), and the package name.

## Swap notes
Depends on: backend, storage/cache, test runners, linters.

- **Postgres:** the client becomes a connection pool with a short connect and statement timeout; `readyz` runs
  `SELECT 1`. The readyz field becomes `db`. Unit tests use a fake or an in-memory SQLite only if the queries are
  portable; otherwise mark them integration and run Postgres in CI (Step 4).
- **Node/Express or Go backend:** same endpoints and response shapes; the test runner changes (Jest/Vitest,
  `go test`), and `make test-be` / `make test-fast` keep their names.
- **Another settings library:** keep env vars as the only source of config in containers.

Must not change:
- The paths `/api/v1/livez` and `/api/v1/readyz`, and their status codes (`livez` never checks dependencies; `readyz`
  returns 503 when not ready, still with a JSON body naming what is down).
- All config from env vars; logs to stdout.
- The unit / integration split and the make target names.
