# 0004. React + Vite, typed client generated from OpenAPI

- **Status:** Accepted (2026-10-23)

## Context

The frontend will be built largely with AI coding assistance, and MLStopping (the reference app) uses React + Vite +
TanStack Query + Tailwind.

## Decision

- React + Vite + TypeScript + TanStack Query + Tailwind.
- The frontend calls the backend **only** through a typed client generated from FastAPI's OpenAPI spec
  (`openapi-typescript` + `openapi-fetch`). `make check-openapi` fails when the committed spec is out of date.
- In development, Vite proxies `/api` to the backend; in Docker, Caddy does. Either way the browser sees one origin,
  so no CORS setup is needed.

## Consequences

- A backend change that breaks the frontend shows up as a type error, not a runtime bug.
- After changing the API, the client must be regenerated (`make gen-api`) and both generated files committed.

## Revisit when

- The team standardizes on another framework, or the generated client becomes a burden.
