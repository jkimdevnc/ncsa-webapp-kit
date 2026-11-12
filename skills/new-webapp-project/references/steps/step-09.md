# Step 9: Typed API client generated from OpenAPI, and the contract check

## Goal
Make the API's OpenAPI spec the single source of truth for the frontend: the client types are generated from it, and
`make test` fails when the committed spec or the generated types are out of date.

## Required deliverables
- A backend script that exports the OpenAPI spec as stable JSON (fixed indent, trailing newline) to a path, by
  default `frontend/openapi.json`. It must not need storage or the model to run.
- A frontend generator script (e.g. `npm run gen:api`) that writes the types (e.g. `frontend/src/api/schema.d.ts`).
- One typed client module (e.g. `src/api/client.ts`), using the page's origin as base URL and looking up `fetch` on
  each call (so tests can mock it).
- The `readyz` module from Step 8 now uses the typed client, and its type comes from the generated schema, not a
  hand-written copy. Behavior is unchanged.
- Both generated files are committed and excluded from the formatter and linter.
- `make gen-api`: export the spec, then generate the types.
- `make check-openapi`: export and generate into a temp folder, diff against the committed files, and fail with
  "run `make gen-api`" if anything differs. `make test` runs it (so CI does too).
- A frontend type-check script, run by `make test-fe`.
- README and the frontend ADR: "After changing the API, run `make gen-api` and commit both generated files."

## Acceptance checks
1. `make check-openapi` passes on a clean tree; `make test` and `make lint` pass; CI passes on the PR.
2. The status panel's existing tests pass unchanged against the typed client.
3. Demonstration (run, show the output, then revert; nothing committed):
   - rename a field in the readyz response model without regenerating → `make check-openapi` fails with
     "run `make gen-api`";
   - run `make gen-api` → the frontend type-check flags every place that still uses the old field;
   - revert both.
4. The status panel still shows API ok, storage ok, Model loaded with the dev servers running.
5. Tests added: the contract check itself (`make check-openapi` in `make test`), and type-checking in `make test-fe`.

## Default (MOSAIC's way)
`backend/scripts/export_openapi.py` writes `app.openapi()`. openapi-typescript 7 generates `schema.d.ts`, and
openapi-fetch makes the client (`createClient<paths>`). openapi-typescript declared support only for TypeScript 5, so
`package.json` has an npm `overrides` entry for TypeScript 6.0. The Makefile's `check-openapi` later used
`npm exec --no` (review fix) so it never downloads a tool.

Reference: reference/step-09/ (plan.md, changes.txt, files/).

Adapt: nothing domain-specific.

## Swap notes
Depends on: backend, frontend, test runners.

- **Backend without built-in OpenAPI (Express, Go):** generate the spec from route schemas (e.g. zod-to-openapi,
  swaggo) or keep a hand-written spec checked by a test that compares it with the routes. The export script and
  `make check-openapi` stay.
- **Vue or another frontend:** openapi-typescript + openapi-fetch work unchanged; or use orval / openapi-generator.
- **Generated client instead of types only:** commit the generated folder; same diff check.

Must not change:
- The frontend talks to the backend only through the typed client generated from the spec.
- `make gen-api` and `make check-openapi` names; the check runs inside `make test` and fails with a clear message.
- The generated files are committed and never hand-edited.
