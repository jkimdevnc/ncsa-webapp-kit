# Step 8: Frontend scaffold and the component test framework

## Goal
Start the frontend: a working app that talks to the API through the dev-server proxy, with its linters and component
test framework, so every later screen lands on a tested base. The only screen is a status panel that reads `readyz`.

## Required deliverables
- A frontend project in `frontend/` with a committed lock file and scripts `dev`, `build` (type-check + bundle),
  `test`, `lint`, `format`.
- A pinned Node version file (e.g. `.nvmrc`), the same major that `make doctor` checks.
- A dev server on a fixed port (e.g. 3000) that proxies `/api` to the API dev server (e.g. `localhost:8000`).
- A data-fetching layer with caching and refetch (e.g. TanStack Query).
- A status panel component and one small API module for `readyz` (plain `fetch` is fine here; Step 9 replaces it):
  - it returns the readyz body for both 200 and 503, and throws only when the API cannot be reached or the reply is not
    readyz JSON;
  - it refreshes about every 10 s;
  - rows **API**, **storage** and **Model**, each with a status word (`ok` / `not ready` / `unreachable`, `ok` /
    `down`, `loaded` / `not loaded`), plus the model id and version and the API version;
  - states: loading, ready, not ready (shows what is down), unreachable.
- Linters and formatter for the frontend, run as pre-commit hooks, so `make lint` stays the one command.
- Wiring: `make setup` installs the frontend packages; `make test-fe` runs the component tests; `make doctor` checks
  the packages are installed (hint: `make setup`); CI installs the Node version from the file, with its cache, and the
  packages before `make lint` and `make test`.
- README: how to run the frontend dev server.

## Acceptance checks
1. `make lint` and `make test` pass (backend + frontend); CI passes on the PR.
2. With the dev servers running, the page shows API ok, storage ok, Model loaded.
3. Stopping the storage service shows storage "down" and API "not ready" within about 10 s; starting it recovers.
4. Stopping the API shows API "unreachable".
5. The production build passes.
6. Tests added (component tests, `fetch` mocked):
   - ready: 200 → API ok, storage ok, Model loaded, with the model id and version;
   - not ready: 503 with storage down → API "not ready", storage "down"; 503 with the model not loaded → Model
     "not loaded";
   - network error → API "unreachable";
   - a 502 with no readyz body (API down behind the dev proxy) → API "unreachable";
   - elements are found by role and label, not CSS classes.

## Default (MOSAIC's way)
React 19, Vite 8, TanStack Query 5, Tailwind 4 through `@tailwindcss/vite`, TypeScript 6.0 (not 7, for
typescript-eslint). Vitest with jsdom and `jest-dom`; tests stub `fetch` with `vi.stubGlobal`. Files:
`vite.config.ts` (port 3000, `/api` proxy), `src/api/readyz.ts`, `src/components/StatusPanel.tsx` and its test,
`eslint.config.js`, `.prettierrc` (width 120, like ruff), local pre-commit hooks that use `frontend/node_modules`.
The row label was "Redis".

Reference: reference/step-08/ (plan.md, changes.txt, files/).

Adapt: the storage row label and the readyz field name follow the storage choice (Step 3).

## Swap notes
Depends on: frontend, UI kit, linters, test runners, CI.

- **shadcn/ui instead of plain Tailwind:** add it on top of Tailwind; the status rows may use its components. Tests
  still select by role and label.
- **Vue + Vite:** Vue Test Utils or Testing Library for Vue with Vitest; TanStack Query for Vue or a composable. Same
  states and tests.
- **Jest instead of Vitest:** `make test-fe` calls Jest; same tests.
- **Biome instead of eslint + prettier:** one hook instead of two; `make lint` unchanged.
- **Postgres:** only the row label changes ("Database").

Must not change:
- The frontend calls the API only on its own origin under `/api/v1` (the dev proxy makes that work).
- A 503 readyz still shows details; a network error or non-readyz reply shows "unreachable".
- `make setup`, `make lint`, `make test-fe` names; tests select by role and label.
