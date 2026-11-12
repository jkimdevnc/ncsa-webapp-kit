# Step 13: The full stack in Docker Compose (end of Stage 1)

## Goal
Run the whole stack in containers: storage, `api` and `web` (a web server that serves the built frontend and passes
`/api` to the API). This is the shape Kubernetes runs in Stage 2, and the same E2E suite runs against it.

## Required deliverables
- `backend/Dockerfile` (multi-stage) and `.dockerignore`:
  - the build stage installs locked, non-dev dependencies and builds the demo model into the image, so it starts on
    its own (`ARTIFACT_DIR` can still point at a mounted folder later);
  - the run stage has no build tools and no tests; it runs as a fixed non-root uid (e.g. `10001`), with a read-only
    root filesystem and an in-memory `/tmp`.
- `frontend/Dockerfile`, `.dockerignore` and the web server config:
  - build stage: install and build the frontend;
  - run stage: the web server on `:8080`, no automatic HTTPS, no admin endpoint; `/api/*` goes to `api:8000`;
    everything else is the built app, falling back to `index.html`; non-root.
- `docker-compose.yml` adds `api` and `web` next to the storage service:
  - `api`: storage URL by service name; waits for storage to be healthy; health check on `readyz`; no published port;
  - `web`: published on `127.0.0.1:8080`; waits for `api`; health check on `/`;
  - starting only the storage service still works, for dev-server work.
- Make targets: `make up` (build, start, wait until healthy), `make down`, `make logs`, and
  `make test-e2e-local-stack` (the E2E suite with `BASE_URL=http://localhost:8080`, on **one worker**, with
  `E2E_RESTART_STORAGE` set to the command that restarts this stack's storage, e.g. `docker compose restart redis`).
- A second CI job, `stack`: build both images, `make up`, `make test-e2e-local-stack`, upload the report on failure.
  A red `stack` means "do not merge".
- A new E2E test (`e2e/storage-restart.spec.ts`), skipped unless `E2E_RESTART_STORAGE` is set.
- README: "Run the full stack locally" and the `stack` check under CI.

## Acceptance checks
1. `make up` → every service healthy (`docker compose ps`).
2. http://localhost:8080: the whole flow works (entry → Analyze → result → run log).
3. `make test-e2e-local-stack` passes: the whole E2E suite against the containers, including the restart test.
4. `docker compose exec api id -u` prints the non-root uid; the web container is non-root too.
5. `make doctor`, `make lint` and `make test` pass; CI shows `ci` and `stack` passing on the PR.
6. `make down` stops everything.
7. Test added (E2E): Analyze once → run log has 1 entry → restart storage → reload → **the run log is empty** (nothing
   was on disk) **while the `<entity>`'s name and values are still there** (they live in the browser). The dev-server
   E2E run and the `ci` job skip it.

## Default (MOSAIC's way)
Images built from `ghcr.io/astral-sh/uv:python3.15-trixie-slim` → `python:3.15-slim-trixie`, and
`node:26-trixie-slim` → `caddy:2-alpine` with `frontend/Caddyfile` (`auto_https off`, admin off). The env var was
`E2E_RESTART_REDIS`, first a flag (`1`); Step 15 changed it to the restart command. A new project uses the command form
from the start. The test file was `e2e/redis-restart.spec.ts`. `.editorconfig` got tabs for the Caddyfile.

Reference: reference/step-13/ (plan.md, changes.txt, files/).

Adapt: image names (`<slug>-api`, `<slug>-web`), the storage service name, the restart command.

## Swap notes
Depends on: persistence mode, storage, backend, frontend, container/web server, CI.

- **nginx instead of Caddy:** an `nginx.conf` with `location /api/ { proxy_pass http://api:8000; }` and
  `try_files $uri /index.html`; use an unprivileged nginx image on 8080.
- **Postgres (persistent store):** a named volume; the restart test becomes "after restarting the database, the run
  log **still** has the run (and the `<entity>` is still in the browser)", plus a check that expired rows are not
  shown. A migration runs before `api` starts (an init container or entrypoint step).
- **Node or Go backend:** a different build stage; the same non-root, read-only rules.

Must not change:
- Service names `api` and `web`, `web` on 8080, `/api` proxied to `api:8000`, `api` not published.
- Containers run as non-root; settings come from env vars.
- `make up`, `make down`, `make logs`, `make test-e2e-local-stack`; the same E2E files as the dev-server run.
- Under the default mode: a storage restart empties the run log.
