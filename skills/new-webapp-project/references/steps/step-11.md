# Step 11: The `<entity>` entry screen (data stays in the browser)

## Goal
The first real screen: the user names an `<entity>` and enters values. The fields are built from the data
dictionary, and under the default persistence mode everything typed stays in the browser until Analyze (Step 12).

## Required deliverables
- A browser storage module (e.g. `src/storage/<entity>Store.ts`), the **only** module that touches browser storage
  (the CLAUDE.md swap point):
  - `load<Entity>()` returns the stored `<entity>` or `null`; `save<Entity>(x)` stores it, under the key
    `<slug>:<entity>`;
  - an `<entity>` is `{schema_version: 1, id, name, values}`; `values` holds the typed text, so a half-typed value
    like `12.` survives a reload;
  - every access is in try/catch: if storage is unavailable or holds invalid data, `load` returns `null` and `save`
    does nothing, so the page still works;
  - new ids match the API's `<entity>_id` pattern, made without APIs that need a secure context (plain HTTP must work);
    a stored id that does not match gets a new one;
  - two open tabs stay in step (listen to the storage event).
- A hook or composable that starts from the stored `<entity>` or a new one and saves on every change.
- A validation function `valueError(text, variable)`: `null` for empty or in-range values (limits included),
  "Not a number." or "Not possible: outside {min}–{max} {unit}."
- A dictionary API module through the typed client, loaded once per page load (no refetching while typing).
- The page:
  - a name input labelled "`<Entity>` name", with a default name;
  - one input per dictionary variable, **grouped by `section` when present** (one heading per section; no heading
    when no variable has one), labelled with the variable's label and code, with unit and precision beside it;
  - an invalid field gets `aria-invalid` and its error message linked by `aria-describedby`; the error shows while
    typing and clears when the value is valid;
  - loading and error states for the dictionary;
  - the status panel stays, as a small footer.

## Acceptance checks
1. `make lint` and `make test` pass; CI passes on the PR.
2. In the browser: rename; enter an out-of-range value → the "Not possible" error appears under that field; fix it →
   the error clears; reload → the name and values are still there.
3. While typing, no request to `/api` carries the values (DevTools → Network).
4. Tests added (component):
   - `valueError`: no error inside the range or at its limits; errors below and above; "Not a number."; empty is fine;
   - the store saves and loads; returns `null` for nothing stored or broken data; does not throw when browser
     storage throws (read and write); new ids are valid `<entity>_id`s; a bad stored id is replaced;
   - the page builds a field per dictionary variable, with section headings when sections exist; an out-of-range
     value shows the error and marks the field invalid; fixing clears it; renaming and typing are saved; the stored
     `<entity>` is shown after a remount; the API is called only for the dictionary, never while typing; a dictionary
     load error is shown.
5. Test added (E2E, real API): rename, enter an out-of-range value → error visible; reload → name and values kept;
   **watching every request, none to `/api` carries the values** while typing.

## Default (MOSAIC's way)
The entity was a "Workup": `src/storage/workupStore.ts` (key `mosaic:workup`), `src/workup/useWorkup.ts`,
`validation.ts`, `WorkupPage.tsx`, `src/api/dictionary.ts`, `e2e/workup.spec.ts`. Sections came from region + group
("Cranium · Metric"). Error text "Not possible: outside 100–200 mm." from a Figma screen. One `<entity>` per device;
a list page was left for later. The secure-context id fix, the bad-id fix and the two-tab sync came in review-fix
PR #19; a new project builds them in here.

Reference: reference/step-11/ (plan.md, changes.txt, files/); the hardened store is in reference/step-14/files/.

Adapt: "Workup" → `<entity>`, `mosaic:` → `<slug>:`, the sample values in tests come from the interview's variables.

## Swap notes
Depends on: persistence mode, frontend, UI kit, test runners.

- **Server-save persistence mode:** the store module calls `GET`/`PUT /api/v1/<entity>s/{id}` (debounced) instead of
  browser storage; the "no request carries the values while typing" test becomes "values go only to the
  `<entity>` save endpoint, never to Analyze logs or query strings".
- **shadcn/ui:** use its Input, Label and form message; keep `aria-invalid` and `aria-describedby`.
- **Vue:** a composable replaces the hook; same tests with Testing Library for Vue.

Must not change:
- Fields come from the dictionary; adding a variable needs no code change.
- Only the store module touches browser storage; it never throws.
- Under the default mode, nothing typed leaves the browser before Analyze.
- Errors are tied to fields by `aria-*`; tests select by role and label.
