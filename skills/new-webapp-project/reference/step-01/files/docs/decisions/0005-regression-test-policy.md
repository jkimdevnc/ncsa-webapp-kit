# 0005. Growing regression test suite, `make test` gate

- **Status:** Accepted (2026-10-23)

## Context

The prototype will be changed and extended many times. Each change risks breaking features that already work.

## Decision

- Every feature step adds automated tests, and `make test` runs all of them: backend (pytest, with fakeredis and real
  Redis), frontend components (Vitest), end-to-end browser flows (Playwright), and the OpenAPI contract check.
- A change is done only when `make test` passes. Existing tests are never deleted or weakened to make a change pass.
- CI runs `make test` on every push and pull request.
- Setup checks (tools, repo, Docker, Redis config) are separate: `make doctor`.

## Consequences

- Each step takes a little longer, and the suite protects every earlier feature from then on.

## Revisit when

- The suite becomes slow enough to discourage running it; then split it into fast and full runs.
