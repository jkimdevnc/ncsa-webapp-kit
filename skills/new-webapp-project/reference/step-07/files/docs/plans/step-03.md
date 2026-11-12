# Step 3: FastAPI probes + the pytest framework

Status: done (PR #5, tag `step-3`). Rebuilt afterwards from the overview build plan and PR #5.

## Context
The first backend code: a FastAPI app with the Kubernetes health checks, typed settings, and the pytest framework that
the regression suite grows from.
- `livez` says the process is up, and never checks dependencies, so a Redis outage doesn't restart the pod.
- `readyz` says the API can serve requests, and returns 503 to take the pod out of the load balancer.

## What I build
1. **Backend project**: `backend/pyproject.toml` and `uv.lock` (uv, Python 3.15). Dependencies: fastapi, uvicorn,
   redis, pydantic-settings. Dev: pytest, fakeredis, httpx2.
2. **`app/config.py`**: typed `pydantic-settings` (`REDIS_URL`, `LOG_LEVEL`) from env vars or the repo's `.env`. The
   version is read from `pyproject.toml`.
3. **`app/main.py`**, everything under `/api/v1`:
   - `GET /livez` → 200 whenever the process is up.
   - `GET /readyz` → `{status, redis, version}`: 200 when Redis answers, 503 with `redis: down` when it doesn't.
   - Typed response models (ready for the Step 9 client). Logs go to stdout.
4. **`app/redis_client.py`**: one shared client with 1 s timeouts, so readyz doesn't hang. Tests swap in fakeredis.
5. **Tests**: `tests/unit/` (fakeredis, no Docker) and `tests/integration/` (marked `integration`, real Redis).
   `make test-be` runs both; `make test-fast` skips integration.
6. **`make doctor`**: `backend/uv.lock` matches `pyproject.toml`. README "Backend (API dev server)" section;
   `.env.example` documents `LOG_LEVEL`.

Tests added:
- unit: livez is 200, and stays 200 when Redis is down; readyz is 200 with `redis: ok`, and 503 with `redis: down`;
  settings come from env vars with a working default; the version comes from `pyproject.toml`.
- integration: readyz is 200 against the real Redis.

## How you verify
- `cd backend && uv run uvicorn app.main:app --reload`.
- `curl -i localhost:8000/api/v1/readyz` → 200 with `redis: ok`.
- `docker compose stop redis` → readyz 503 with `redis: down`, while livez stays 200. `docker compose start redis` →
  200 again.
- `/docs` opens.
- `make test` is green.

## Changes during the step
- Python **3.12 → 3.15**, the latest stable release (3.16 is still alpha). Every compiled package the plan needs has
  3.15 wheels for Mac arm64 and Linux amd64/arm64.
- **httpx → httpx2** for the test client, because Starlette deprecated httpx there.
- `Depends()` moved into `Annotated[...]` to satisfy ruff's B008 rule.
