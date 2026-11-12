# 0003. Form data stays in the browser until Analyze

- **Status:** Accepted (2026-10-23)

## Context

The Figma wireframes show "Saved on this device" (IA decision D1 is still open). The PI may require that entered
measurements are not stored on the server.

## Decision

Workups and their entries are saved only in the browser's `localStorage`, through one module:
`frontend/src/storage/workupStore.ts`. The measurements reach the server only in the single Analyze request. The
server never stores or logs them (`STORE_INPUT_VALUES=false`); a stored result keeps only the outputs and the codes of
the variables used.

## Consequences

- Clearing the browser's data loses unsent Workups. The same Workup is not available on another device.
- There is nothing on the server to delete when an analysis finishes or fails.

## Revisit when

- Workups must be shared across devices or users, or kept on the server (D1 decided as "server").
- Then: change `workupStore.ts` to call new API endpoints; the screens stay the same.
