# 0002. Run the model directly in the API, no job queue

- **Status:** Accepted (2026-10-23)

## Context

The MOSAIC model is expected to be small and fast. A job queue with separate workers (as in MLStopping) adds moving
parts that the prototype does not need yet.

## Decision

`POST /api/v1/analyses` runs the model while handling the request (`DirectRunner` in `backend/app/runner.py`) and
returns the finished result. The model is loaded once at startup and reused.

The API contract is ready for asynchronous jobs anyway: the response is always `{id, status, result?, error?}`, and
`GET /api/v1/analyses/{id}` always exists. The frontend polls only while the status is `queued` or `running`, which
never happens today.

## Consequences

- One fewer service (no worker), and results appear in the same request.
- A slow model would hold an API thread for the whole analysis.

## Revisit when

- An analysis takes more than about 2 seconds, or uses a lot of memory or a GPU.
- Many analyses need to run in parallel, or batch requests are added.
- Then: add a `QueueRunner` using MLStopping's RQ pattern on the same Redis. The POST returns `queued` and the
  frontend polls (no SSE). The frontend and E2E tests should not need to change.
