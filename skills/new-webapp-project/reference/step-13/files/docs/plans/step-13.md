# Step 13: Local full stack in Docker Compose (the end of Stage 1)

Status: done (PR #18, tag `step-13`).

## Context
Until now the API and the frontend ran as dev servers, with only Redis in Docker. This step runs **the whole stack
in containers**: `redis`, `api` and `web` (Caddy serving the built frontend and proxying `/api`). That's the shape
Kubernetes will run in Stage 2. The same Playwright suite runs against it through `BASE_URL` (Step 10). The app's
code shouldn't change: settings already come from env vars, and the frontend calls the API on its own origin. If the
containers expose a problem the dev servers hid, I fix it here and say so.

Decisions (approved 2026-10-28):
- **The demo model is trained during the API image build**, so the image starts on its own. `ARTIFACT_DIR` can still
  point at a mounted folder later, for real models.
- **Base images**: `ghcr.io/astral-sh/uv:python3.15-trixie-slim` to build, then `python:3.15-slim-trixie` to run
  (no uv, no compilers, no tests in the final image). The frontend uses `node:26-trixie-slim` to build, then
  `caddy:2-alpine`.
- **Both containers run as non-root**, the API with a read-only root filesystem (and `/tmp` in memory).
- **Plain HTTP on `http://localhost:8080`**, bound to localhost only. No TLS locally; the Ingress handles TLS in
  Stage 2.
- **CI gets a second job, `stack`**: it builds both images (on GitHub's amd64 runners, so the amd64 build is checked
  too), starts the stack, and runs the E2E suite against it. Like `ci`, a red `stack` check means "do not merge".
- **The "restart Redis" E2E test runs only against a stack it may restart.** It's skipped unless
  `E2E_RESTART_REDIS` is set, which only `make test-e2e-local-stack` and the `stack` CI job do. The dev-server E2E
  run and the `ci` job (whose Redis is a service container) skip it.

## What I build
1. **`backend/Dockerfile`** (multi-stage) + `backend/.dockerignore`:
   - Build stage: `uv sync --frozen --no-dev`, copy `app/` and `scripts/`, run `scripts/train_demo_model.py` into
     `/app/ml_artifacts`.
   - Run stage: copy the venv, `app/`, `pyproject.toml` (the API reads its version from it) and the model; user
     `10001`; `ARTIFACT_DIR=/app/ml_artifacts`; `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
2. **`frontend/Dockerfile`** + `frontend/Caddyfile` + `frontend/.dockerignore`:
   - Build stage: `npm ci`, `npm run build`.
   - Run stage: Caddy on `:8080` with `auto_https off` and the admin endpoint off. `/api/*` goes to `api:8000`; everything else is the built
     app, falling back to `index.html`. A non-root user, with Caddy's data and config folders writable.
3. **`docker-compose.yml`**: `api` and `web` services next to the existing `redis`.
   - `api`: `REDIS_URL=redis://redis:6379/0`; waits for Redis to be healthy; health check on `readyz`; no published
     port (only `web` reaches it).
   - `web`: `127.0.0.1:8080:8080`; waits for `api` to be healthy; health check on `/`.
   - `docker compose up -d redis` still starts only Redis, for dev-server work.
4. **Makefile**: `make up` (`docker compose up -d --build --wait`), `make down`, `make logs`, and
   `make test-e2e-local-stack` (the Playwright suite with `BASE_URL=http://localhost:8080` and `E2E_RESTART_REDIS=1`,
   on **one worker**, so the Redis restart can't wipe results under tests running beside it).
5. **`.github/workflows/ci.yml`**: the `stack` job (Node, Chromium, `make up`, `make test-e2e-local-stack`, the
   report uploaded on failure).
6. **README**: "Run the full stack locally" (up, open, logs, down, the E2E run), and the `stack` check under CI.
7. `.editorconfig`: tabs for the Caddyfile (Caddy's own format).

Tests added:
- **The whole E2E suite** (status, Workup, Analyze) now also runs against the containers, locally and in CI.
- **E2E** `e2e/redis-restart.spec.ts`: Analyze once → the run log has 1 entry → `docker compose restart redis` →
  reload → **the run log is empty** (nothing was saved to disk) **while the Workup's name and values are still there**
  (they live in the browser). The dev-server E2E run skips it.

**Later (not now):** multi-arch images pushed to GHCR (Step 14), TLS, mounting real model files, and the 10 review
fixes (after this step, before Stage 2).

## How you verify
```bash
docker compose down              # stops the dev Redis; the stack starts its own
make up                          # builds and starts redis, api, web; waits until all are healthy
docker compose ps                # every service "healthy"
open http://localhost:8080       # the whole flow: Workup → Analyze → result → run log
make test-e2e-local-stack        # the E2E suite against the containers, incl. the Redis restart test
make doctor                      # all ✓
make down
```
- `docker compose exec api id -u` → `10001` (not root).
- `make lint` and `make test` are green, and CI ✓ (`ci` and `stack`) on the PR.
