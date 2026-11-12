# Step 12: Analyze in the UI + result + run log

Status: done (PR #17, tag `step-12`).

## Context
This closes the slice: the Workup's measurements, kept in the browser since Step 11, are sent **once**, in the
Analyze request. The API runs the model and keeps the result (never the values) in Redis, and the page shows the
result and the Workup's run log. The E2E test of this flow becomes the main regression test.

The code review of 2026-10-28 found 10 issues. None blocks Steps 12–13, so they go in one `fix/` PR after Step 13 and
before Stage 2 (decided 2026-10-28). This step doesn't touch them.

Decisions (approved 2026-10-28):
- **Analyze sends only the values the model needs** (GOL and XCB), not every filled field: the least data leaves the
  browser. The model's inputs are a frontend constant next to the Analyze call, with a comment pointing to
  `backend/app/model_catalog.py`; the API's 422 stays the real guard. A `GET /models` endpoint is later.
- **The Analyze button is enabled** only when every model input is filled and no field on the page shows an error,
  and it's disabled while a request is running.
- **The result** shows the model's outputs generically (e.g. "Cranial class: mesocranic", "Cranial index: 76.5"),
  so a real model with other outputs needs no UI change.
- **The run log** lists the Workup's runs, oldest first as the API returns them: time, model and version, outputs.
  It reloads after each Analyze.
- **Errors**: a 422 shows the API's messages (e.g. "XCB is not possible: outside 100–200 mm"); a network error shows
  "Couldn't reach the API." The entered values stay in the browser either way.

## What I build
1. **`src/api/analyses.ts`**: `analyze(workupId, values)` (`POST /api/v1/analyses`) and `fetchRunLog(workupId)`
   (`GET /api/v1/workups/{id}/analyses`), through the typed client. `MODEL_ID = "cranial-demo"` (sent explicitly)
   and `MODEL_INPUTS = ["GOL", "XCB"]`.
2. **`src/workup/AnalyzePanel.tsx`**: the Analyze button, the result, the error, and the run log (`useMutation`,
   `useQuery`, run log invalidated on success). `WorkupPage` shows it below the measurements.
3. README: the page description (the Workup, Analyze and the run log, the status panel).

Tests added:
- **Vitest**:
  - the button is disabled with GOL or XCB empty or out of range, another field in error, or a value that isn't a
    number, and enabled when both are valid;
  - Analyze sends exactly `workup_id`, `model_id` and GOL and XCB as numbers (not NOL), then shows the result, and
    the run log goes from 1 to 2 entries;
  - a 422 shows the API's message; a network error shows "Couldn't reach the API."
- **E2E** (`e2e/analyze.spec.ts`, the main regression flow): enter GOL 183, XCB 140 → Analyze → "mesocranic" and
  "76.5" → the run log has 1 entry → Analyze again → 2 entries. Both POST bodies have the Workup's id and exactly
  `{GOL: 183, XCB: 140}` as values, and **no other request carries the values** (only the POSTs have a body, and
  no request has a query string). A second test: Analyze stays disabled with XCB 312.
- **Deliberate test changes** (CLAUDE.md rule 3): the page now also loads the run log (a GET with the Workup's id,
  no values), so:
  - Step 11's `workup.spec.ts` (only `GET readyz` while typing) becomes **only GETs, with no body and no query
    string**. Searching URLs for "183" could also match the random hex Workup id by chance.
  - Step 11's `WorkupPage.test.tsx` (exactly one fetch, the dictionary) becomes **only GETs, none carrying the
    values**.

**Later (not now):** polling for a job queue, failed-run records, choosing a model, a `GET /models` endpoint, and
the 10 review fixes (after Step 13).

## How you verify
```bash
docker compose up -d redis
make test-e2e
```
With the dev servers, at http://localhost:3000:
- GOL 183, XCB 140 → Analyze → "Cranial class: mesocranic", "Cranial index: 76.5"; the run log has 1 entry.
- Analyze again → 2 entries. XCB 312 → the button is disabled.
- DevTools → Network: only the POST carries the values.
- `docker compose exec redis redis-cli --scan --pattern 'mosaic:analysis:*'` then `get` one: no 183 or 140.
- `make lint` and `make test` are green, and CI ✓ on the PR.

Note: Step 12 changes no backend code, so a dev API you already have running is fine for `make test-e2e`. Restart it
if it was started before Step 7.
