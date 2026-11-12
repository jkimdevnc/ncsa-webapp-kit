# 0001. Redis only, in memory, nothing on disk

- **Status:** Accepted (2026-10-23)

## Context

The PI may require that form data is not kept, and that analysis outputs are deleted after some period. Those rules
are not decided yet. The prototype needs somewhere to keep results briefly (for the run log), and nothing more.

## Decision

Use Redis as the only server-side store, with persistence switched off (`--save "" --appendonly no`) and a memory
cap (`--maxmemory 256mb --maxmemory-policy volatile-ttl`). Every key has a TTL (`RESULT_TTL_SECONDS`, default 24 h).
No Postgres.

All storage goes through `backend/app/store.py` (`ResultStore`). Keys use the `mosaic:` prefix, and every stored
record carries `schema_version`.

## Consequences

- A Redis restart clears all results. That is acceptable for the prototype.
- There is no durable history and no per-user listing beyond what is still in memory.

## Revisit when

- The PI sets retention rules that require keeping any data.
- Results need to survive restarts, or be listed per user over longer periods.
- Options: turn on Redis AOF for selected data, run a second persistent Redis, or add Postgres behind `ResultStore`.
