# Step 8: Frontend scaffold + the Vitest framework

Status: done (PR #13, tag `step-8`).

## Context
The backend slice works (probes, dictionary, model, Analyze, run log). This step starts the frontend: a working
Vite + React app that talks to the API through the dev-server proxy, plus the frontend test framework and linters, so
every later screen (Steps 11–12) lands on a tested base. The only screen today is a **status panel** that reads
`/api/v1/readyz`: API, Redis and Model.

Decisions (approved 2026-10-27):
- **TypeScript 6.0**, not 7. typescript-eslint supports only TypeScript below 6.1 today.
- **Tailwind through its Vite plugin** (`@tailwindcss/vite`), so there's no PostCSS config.
- **The status panel uses a plain `fetch` in one small module, `src/api/readyz.ts`.** Step 9 replaces it with the
  typed client generated from OpenAPI; nothing else calls the API yet.
- **Tests mock `fetch` directly** (`vi.stubGlobal`), with no extra mocking library. Simpler is enough for one endpoint.
- **eslint and prettier run as local pre-commit hooks** that use the frontend's own `node_modules`, so `make lint`
  stays the one command for every check. That means `npm ci` in `frontend/` before linting, done by `make setup` and
  in CI.

## What I build
1. **Scaffold in `frontend/`** (the `.gitkeep` goes):
   - `package.json`: React 19, Vite 8, TanStack Query 5, Tailwind 4, TypeScript 6.0; scripts `dev`, `build`
     (`tsc && vite build`), `test` (`vitest run`), `lint` (eslint), `format` (prettier). `package-lock.json` is
     committed.
   - `.nvmrc` = `26` (the same Node as `make doctor` checks).
   - `vite.config.ts`: port 3000, proxy `/api` → `http://localhost:8000` (as in MLStopping), plus the Vitest settings
     (jsdom, a setup file that adds `jest-dom` matchers).
   - `tsconfig.json`, `index.html`, `src/main.tsx` (QueryClientProvider), `src/App.tsx`, `src/index.css`
     (`@import "tailwindcss"`).
2. **Status panel** (`src/components/StatusPanel.tsx` + `src/api/readyz.ts`):
   - `fetchReadyz()` returns the readyz body for both 200 and 503 (503 still carries the details), and throws only
     when the API can't be reached or the reply isn't readyz JSON.
   - `useQuery` refreshes it every 10 s.
   - Shows three rows, **API**, **Redis** and **Model**, each with a status word (`ok` / `not ready` / `unreachable`,
     `ok` / `down`, `loaded` / `not loaded`), plus the model id and version and the API version.
   - States: loading, ready, not ready (503: shows which part is down), and API unreachable (network error).
3. **Linters**: `eslint.config.js` (typescript-eslint, react-hooks), `.prettierrc` (width 120, like ruff), and two
   local hooks in `.pre-commit-config.yaml` for `frontend/` files. The old "added in Step 8" comment goes.
4. **Wiring**:
   - `Makefile`: `setup` also runs `npm ci` in `frontend/`; `test-fe` runs `npm test` there.
   - `scripts/doctor.sh`: a check that `frontend/node_modules` exists (hint: `make setup`).
   - CI: `actions/setup-node` with `node-version-file: frontend/.nvmrc` and the npm cache, then `npm ci`, before
     `make lint` and `make test`. The "Node is added in Step 8" comment goes.
5. **README**: how to run the frontend dev server, and the `frontend/` row filled in.

Tests added (Vitest + React Testing Library, mocked `fetch`):
- **ready**: 200 → API ok, Redis ok, Model loaded, with the model id and version.
- **not ready**: 503 with Redis down → API "not ready", Redis "down"; and 503 with the model not loaded → Model
  "not loaded".
- **network error**: `fetch` rejects → API "unreachable".
- **API down behind the dev proxy**: a 502 with no readyz body → API "unreachable".
- Elements are found by role and label (the CLAUDE.md rule), not CSS classes.

**Later (not now):** the typed OpenAPI client (Step 9), Playwright (Step 10), the Workup screen (Step 11), routing,
and the Caddy/Docker image for the frontend (Step 13).

## How you verify
```bash
make setup                                   # installs the hooks and frontend/node_modules
docker compose up -d redis && make model
cd backend && uv run uvicorn app.main:app    # terminal 1
cd frontend && npm run dev                   # terminal 2 → open http://localhost:3000
```
- The page shows API ok, Redis ok, Model loaded.
- `docker compose stop redis` → within about 10 s Redis shows "down" and the API "not ready". Start it again and it
  recovers.
- Stop uvicorn → the API shows "unreachable".
- `cd frontend && npm run build` passes.
- `make lint` and `make test` are green (backend + frontend), and CI ✓ on the PR.
