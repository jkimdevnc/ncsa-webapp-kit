# Step 9: Typed client generated from OpenAPI + contract check

Status: done (PR #14, tag `step-9`).

## Context
CLAUDE.md and ADR 0004 say the frontend talks to the backend **only** through a typed client generated from the
API's OpenAPI spec. Step 8's status panel used a hand-written `fetch` and a hand-copied `Readyz` type, which would
drift silently when the API changes. This step makes the API spec the single source of truth: the frontend's types
are generated from it, and `make test` fails when the committed spec or the generated types are out of date. A
backend change that breaks the frontend then shows up as a failing check or a type error, not a runtime bug.

Decisions (approved 2026-10-27):
- **openapi-typescript 7 + openapi-fetch**, as ADR 0004 says. openapi-typescript declares support only for
  TypeScript 5, so `package.json` gets an npm `overrides` entry that lets it use our TypeScript 6.0. I tried it: the
  types generate and type-check.
- **The generated files are committed**: `frontend/openapi.json` (the spec) and `frontend/src/api/schema.d.ts` (the
  types). They are excluded from prettier and eslint, so they stay exactly as generated.
- **One command regenerates both**: `make gen-api`. `make check-openapi` regenerates into a temporary folder and
  fails with "run `make gen-api`" if anything differs.
- **The client looks up `fetch` on each call** (and uses the page's origin as its base URL). That keeps the status
  panel's tests unchanged: they still mock `fetch` the same way. I tried this too: the 5 tests pass as they are.

## What I build
1. **`backend/scripts/export_openapi.py`**: writes `app.openapi()` as JSON (2-space indent, trailing newline) to a
   path, by default `frontend/openapi.json`. It doesn't start the app, so it needs neither Redis nor the model.
2. **Frontend**:
   - `npm run gen:api` = `openapi-typescript openapi.json -o src/api/schema.d.ts`.
   - `src/api/client.ts`: the one `openapi-fetch` client, `createClient<paths>(…)`.
   - `src/api/readyz.ts` uses it: `client.GET("/api/v1/readyz")`. The `Readyz` type now comes from the generated
     schema (`components["schemas"]["Readyz"]`), not a hand-written copy. Behaviour is the same: a 503 still returns
     its readyz body, and anything else that isn't 200 throws.
   - `npm run typecheck` = `tsc`.
3. **Makefile**:
   - `gen-api`: export the spec, then `npm run gen:api`.
   - `check-openapi`: export and generate into a temp folder, `diff` against the committed files, and fail with a
     clear message. It replaces the "no check yet" placeholder.
   - `test-fe` also runs `npm run typecheck`.
4. **README**: "After changing the API, run `make gen-api` and commit both generated files." ADR 0004 already says
   this; I add the `make gen-api` name to it.

Tests added:
- **the contract check**: `make check-openapi`, run by `make test` (and so by CI).
- **frontend type-checking** as part of `make test-fe`.
- The status panel's 5 tests run unchanged against the typed client.

**Later (not now):** typed calls for the dictionary and Analyze (Steps 11–12, where they're first used).

## How you verify
```bash
make check-openapi              # passes: the committed spec and types match the API
cd frontend && npm run typecheck
```
- The demonstration (I run it and show you the output, then revert; nothing is committed):
  1. Rename a field in the backend's `Readyz` (e.g. `redis` → `redis_status`) without regenerating:
     `make check-openapi` fails, with "Run `make gen-api`". (`make test` stops even earlier, because the backend's
     probe tests also catch the rename.)
  2. Run `make gen-api`: `npm run typecheck` now flags `StatusPanel.tsx` and its test where they still use `redis`.
  3. Revert both.
- The status panel still shows API ok, Redis ok, Model loaded with the dev servers running.
- `make lint` and `make test` are green, and CI ✓ on the PR.
