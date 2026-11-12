# The stack: MOSAIC's defaults and how to swap

Every item has a default, which is MOSAIC's choice, and the files in `reference/` show that default. The user can
swap any item, either at the interview or just before the first step that uses it.

**Why swaps are allowed.** The framework's value is its *shape*, not MOSAIC's exact tools:
- small steps;
- a stable make interface;
- swap points;
- regression tests;
- stateless containers.

A project with a good reason to use Postgres or Vue should still get that shape.

| Item (`stack:` key) | Default | Typical swaps | First step that uses it |
|---|---|---|---|
| `persistence` | browser form + model run on the server + results kept briefly in memory (TTL), entered values never stored | server-save (persistent storage); frontend-only (model runs in the browser); desktop (Electron) | 2 |
| `backend` | FastAPI, Python, uv | Flask, Node/Express | 3 |
| `storage` | Redis 7, in memory (`--save "" --appendonly no`, `maxmemory 256mb`, `volatile-ttl`) | Postgres; Redis with AOF | 2 |
| `model_runtime` | scikit-learn, joblib file, loaded at startup | ONNX, PyTorch, a remote model service | 6 |
| `frontend` | React + Vite + TypeScript + TanStack Query; typed client from OpenAPI (openapi-typescript + openapi-fetch) | Vue, Svelte | 8 |
| `ui_kit` | plain Tailwind (minimal on purpose) | shadcn/ui | 8 |
| `linters` | ruff (lint + format); eslint + prettier; pre-commit | oxlint, biome | 1 |
| `test_runners` | pytest + fakeredis; Vitest + React Testing Library; Playwright | Jest, Cypress | 3 |
| `container` | multi-stage Dockerfiles (uv, Node), Caddy for static files + `/api` proxy, non-root | nginx | 13 |
| `registry` | GHCR (`ghcr.io/<owner>`) | Harbor | 14 |
| `deploy` | Kustomize; OrbStack k8s, then NCSA (Traefik, letsencrypt) | Helm, Argo CD, another cluster | 15 |
| `ci` | GitHub Actions | GitLab CI | 1b |
| `owner` / naming | the user's gh account; `<slug>-prototype` | an org (e.g. `ncsa`), another naming scheme | 1 |

## How to do a swap

1. **Before the step,** tell the user which later steps the swap is likely to touch. A full dependency map comes in
   ROADMAP item g. Until then, use the "Swap notes" in each step contract and common sense. For example, Redis →
   Postgres touches at least Steps 2, 3 (readyz), 7, 13, 15 and 16.
2. **Build the step** from the reference, rewriting only what the swap changes. Read the default's files first: they
   show what must keep working.
3. **Keep the stable interface.** This means:
   - the make target names (`lint`, `test`, `test-fast`, `test-be`, `test-fe`, `test-e2e`, `doctor`, `up`, `down`,
     `gen-api`, `check-openapi`, and the `test-e2e-*` targets);
   - the `/api/v1` paths and response shapes;
   - the livez and readyz probes;
   - the swap-point modules;
   - env-var config, logs to stdout, non-root containers, arm64 + amd64 images.
4. **Pass the same acceptance checks** as the default. Where a check doesn't apply to the swapped component, the
   contract names a replacement check. If it doesn't, propose one to the user before relying on it.
5. **Record the swap:**
   - a new ADR in `docs/decisions/`, saying what was chosen instead of what, why, and when to revisit it;
   - an entry in `project.yaml` under `swaps:`;
   - a line in the step plan's "Changes during the step".
6. **Update `make doctor`** with checks for the new component, such as Postgres being up. Remove the default's
   checks that no longer apply.

## Persistence mode swaps (bigger than the others)

- **Server-save.** Entered values are stored on purpose. Keep the rule that the server stores them only where
  `docs/decisions/` says. Replace "no entered values stored" checks with "values stored only in the declared place,
  and never logged".
- **Frontend-only.** There is no model on the server, and maybe no server at all. Steps 3, 6, 7, 9, 13, 15 and 16
  change a lot. Ask the user how far to go before starting.
- **Desktop (Electron).** Steps 13–16 are replaced by packaging. Plan it with the user first: it is close to a
  redesign.

For both of these bigger modes (frontend-only and desktop), stop and agree on a short written plan with the user
before Step 2.
