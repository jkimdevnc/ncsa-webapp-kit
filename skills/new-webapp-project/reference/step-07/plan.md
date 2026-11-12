# Step 7: Analyze endpoint + Redis results + run log (hello-world size)

Status: done (PR #12, tag `step-7`).

## Context
This is the core of the slice: the browser sends a Workup's measurements once, the API runs the model right away,
keeps the result in Redis for a limited time (TTL) **without the entered values**, and returns it. Each Workup also
gets a run log of its analyses. The frontend comes in Steps 8–12; this step is the API only, tested with curl and
pytest.

Decisions:
- **Entered values are never stored** (2026-10-27). There is no `STORE_INPUT_VALUES` setting. If the PI later wants
  values kept, that's a change in `store.py`.
- Out-of-range values get **422** as a server-side guard, using the dictionary's possible ranges (Step 5). The UI will
  block them too.
- The response already has the async-ready shape `{id, status, result?, error?}`. Today the status is always final.

## What I build
1. **Swap points** (plain Python, as in CLAUDE.md):
   - `app/auth.py`: `current_user()` returns `"anonymous"`. CILogon replaces only this function later.
   - `app/runner.py`: `DirectRunner.run(model_id, values)` calls `model_runtime.predict()` while the request is being
     handled. A `QueueRunner` can replace it later.
   - `app/store.py`:
     - a `ResultStore` protocol with `save(record)` and `list_for_workup(workup_id)`
     - `RedisResultStore(redis, ttl)`:
       - The record goes to `mosaic:analysis:{id}` (JSON, with a TTL).
       - The id is added to `mosaic:workup:{workup_id}:analyses`, and that list's TTL is refreshed.
       - Expired records are skipped when listing.
2. **`app/config.py`**: `result_ttl_seconds` (`RESULT_TTL_SECONDS`, default 86400). `STORE_INPUT_VALUES` is removed
   from `.env.example` and ADR 0003.
3. **`POST /api/v1/analyses`**:
   - Request: `{workup_id, model_id?, values: {code: number}}`.
     - `workup_id` is an id the browser makes (letters, digits, `-`, up to 64 characters).
     - `model_id` defaults to `cranial-demo`.
   - **422, and nothing stored**, when:
     - the model is unknown
     - a variable the model needs is missing (e.g. no XCB)
     - a code isn't in the dictionary
     - a value is outside its possible range
   - On success it stores this record, which holds **no entered values**:
     - `schema_version: 1`, `id`, `workup_id`, `owner`, `created_at`
     - `model_id`, `model_version`, `dictionary_version`
     - `variables_used` (codes only), `outputs`
   - Response: `{id, status: "succeeded", result: outputs, error: null}`.
4. **`GET /api/v1/workups/{workup_id}/analyses`** returns the run log: the stored records for that Workup, oldest
   first. It's an empty list when there are none.
5. **Logging**: only the id, the model and the variable codes are logged, never request bodies or values.
6. **README**: a curl example for Analyze and the run log.

Tests added:
- **unit** (fakeredis):
  - success: 183/140 → 76.5, mesocranic
  - the stored record has no input values, but has `schema_version`, model and dictionary versions, `owner` and the
    codes used
  - **the logs contain no input values**
  - the TTL is set
  - 422 stores nothing, for: missing XCB, a value above or below its possible range, an unknown code, an unknown
    model, a bad workup id
  - values exactly at the range limits are accepted
  - the run log lists the run; a second run is added; another Workup's log is empty; expired results are skipped
- **integration** (real Redis): the same round trip, including the TTL (about 86400).

**Later (not now):** failed-run records, run-log ordering rules, `GET /analyses/{id}` and 404 on expiry.

## How you verify
```bash
docker compose up -d redis && make model
cd backend && uv run uvicorn app.main:app
curl -s -X POST localhost:8000/api/v1/analyses -H 'content-type: application/json' \
  -d '{"workup_id":"w1","values":{"GOL":183,"XCB":140}}'        # index 76.5, mesocranic
docker compose exec redis redis-cli get mosaic:analysis:<id>   # no 183 or 140 in it
docker compose exec redis redis-cli ttl mosaic:analysis:<id>   # about 86400
curl -s localhost:8000/api/v1/workups/w1/analyses              # the run log
# the same POST without XCB, or with XCB 250 → 422
```
- CI ✓ on the PR.
