# Step 7: Analyze endpoint, stored results and run log (API only)

## Goal
Analyze runs the model on the entered values and returns a result. The server keeps the result for a limited time
and never stores or logs the entered values. Each `<entity>` gets a run log of its analyses. No UI yet (Steps 11–12).

## Required deliverables
- Swap points, each in its own module:
  - `auth`: `current_user()` returns `"anonymous"` (login replaces only this function later);
  - `runner`: `DirectRunner.run(model_id, values)` calls `predict()` during the request (a queue runner can replace it);
  - `store`: a `ResultStore` interface with `save(record)` and `list_for_<entity>(<entity>_id, owner)`, and one
    implementation for the chosen storage.
- A `result_ttl_seconds` setting (`RESULT_TTL_SECONDS`, default 86400), or the retention setting for a persistent store.
- `POST /api/v1/analyses`:
  - request `{<entity>_id, model_id?, values: {code: number}}`; `<entity>_id` is made by the browser (letters, digits,
    `-`, at most 64 characters); `model_id` defaults to the catalog default; at most a fixed number of values (e.g. 200);
  - response `{id, status, result?, error?}` (the async-ready shape; today `status` is always `"succeeded"` and
    `result` holds the model's outputs).
- The stored record holds **no entered values**: `schema_version: 1`, `id`, `<entity>_id`, `owner`, `created_at`,
  `model_id`, `model_version`, `dictionary_version`, `variables_used` (codes only), `outputs`.
- Storage keys (or table names) use the `<slug>:` prefix, e.g. `<slug>:analysis:{id}` and
  `<slug>:<entity>:{id}:analyses`.
- `GET /api/v1/<entity>s/{<entity>_id}/analyses`: the run log, oldest first, only the caller's runs; an empty list when
  there are none. Expired ids are dropped from the log, and the log is capped (e.g. 100 runs).
- Logging: only the analysis id, model and variable codes; never request bodies or values.
- `docs/decisions/`: the "entered data" ADR says values are never stored (no setting to turn it on).
- README: a curl example for Analyze and the run log.

## Acceptance checks
1. `make test` passes.
2. A curl POST with valid values returns 200 with every model output; the stored record contains none of the entered
   numbers; its TTL is about `RESULT_TTL_SECONDS`; the run log lists the run.
3. Tests added (unit, with faked storage):
   - success: a known input gives the expected outputs;
   - the stored record has no entered values, but has `schema_version`, model and dictionary versions, `owner` and
     the codes used;
   - the logs contain no entered values (capture the log output and search it);
   - the TTL (or expiry time) is set;
   - 422 **and nothing stored** for: a missing required variable, a value above and below its possible range, an
     unknown code, an unknown model, a bad `<entity>_id`, too many values;
   - values exactly at the range limits are accepted;
   - run log: lists the run, a second run is added, another `<entity>`'s log is empty, expired results are skipped,
     another owner's runs are not listed, the log is capped.
4. Integration (real storage): the same round trip, including the TTL.

## Default (MOSAIC's way)
`app/auth.py`, `app/runner.py`, `app/store.py` (`RedisResultStore`), `app/analyses.py` (router). The entity was the
"Workup", so the field was `workup_id` and the run log was `GET /api/v1/workups/{workup_id}/analyses`. Keys
`mosaic:analysis:{id}` (JSON with TTL) and the list `mosaic:workup:{id}:analyses` (its TTL refreshed). 422 errors
name the field, e.g. "XCB is not possible: outside 100–200 mm". MOSAIC added the owner filter, expired-id cleanup,
the 100-run cap and the 200-value limit later, in a review-fix PR (#19); a new project builds them in here.

Reference: reference/step-07/ (plan.md, changes.txt, files/); the hardened store is in reference/step-14/files/.

Adapt: `workup` → `<entity>`, `mosaic:` → `<slug>:`, the model id and the known case.

## Swap notes
Depends on: persistence mode, storage, model runtime, backend.

- **Postgres:** an `analyses` table with `expires_at` (from the retention setting) and a cleanup job or a
  `WHERE expires_at > now()` filter. The TTL test becomes "expired rows are not returned" (and "cleanup removes
  them"). Use a `<slug>_` table prefix or a schema instead of a key prefix. A migration tool comes with it.
- **Server-save persistence mode:** entered values are stored only in the declared place (e.g. an `<entity>` table),
  never in the analysis record or logs; the "no entered values" tests then check the record and the logs only.
- **Queue runner later:** only `runner` changes; `status` can then be `"queued"`/`"running"`.

Must not change:
- `POST /api/v1/analyses` and the run-log path, and the `{id, status, result?, error?}` response shape.
- 422 with nothing stored for every invalid input.
- No entered values in stored records or logs (under any persistence mode, for the analysis record).
- The `auth`, `runner` and `store` swap-point modules; `schema_version` on records; the `<slug>:` prefix.
