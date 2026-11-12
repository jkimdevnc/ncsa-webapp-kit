# Step 11: Workup screen (data stays in the browser, hello-world size)

Status: done (PR #16, tag `step-11`).

## Context
This is the first real screen: a Workup where the user names the case and enters measurements. Following ADR 0003,
**everything typed stays in the browser** (`localStorage`) until Analyze (Step 12); nothing goes to the API while
typing. The fields come from the data dictionary (`GET /api/v1/dictionary`), so adding variables later is a data
change, not a code change. A value outside its possible range shows the red "Not possible" error from Figma screen 04
(`134:10356`). Analyze, the result and the run log come in Step 12.

Decisions (approved 2026-10-28):
- **One Workup on this device**, kept under one `localStorage` key. A Workups list page is later; when it comes,
  only `workupStore.ts` and the hook change.
- **A Workup is `{schema_version: 1, id, name, values}`.** `id` is a random UUID made in the browser (Step 12 sends
  it as `workup_id`). `values` holds what was typed, as text, so a half-typed value like `183.` survives a reload.
- **The error appears while typing** and clears as soon as the value is valid (Figma screens 04 and 12). The text is
  "Not possible: outside 100–200 mm." Figma's second sentence ("Fix it or Skip it to run the Analysis.") waits for
  Skip and Analyze. Text that isn't a number shows "Not a number."
- **The status panel stays**, below the Workup, as a small footer.
- **Layout from screen 04, plain Tailwind**: one section per region and group ("Cranium · Metric"), and one row per
  variable: name, code, an input with "mm · 0.1" beside it, and the error under the row. No rail, Skip, warnings,
  import or reference panel yet.

## What I build
1. **`src/storage/workupStore.ts`**: the only module that touches `localStorage` (CLAUDE.md swap point).
   - `loadWorkup(): Workup | null` and `saveWorkup(workup): void`, under the key `mosaic:workup`.
   - Every access is in try/catch. If storage is unavailable (private mode, full, blocked) or holds something that
     isn't a valid Workup, `load` returns `null` and `save` does nothing, so the page still works for this visit.
2. **`src/workup/useWorkup.ts`**: the hook. It starts from the stored Workup or a new one, and saves on every
   change (`setName`, `setValue(code, text)`).
3. **`src/workup/validation.ts`**: `valueError(text, variable)` returns `null` for empty or in-range values (limits
   included), "Not a number." or "Not possible: outside {min}–{max} {unit}." The UI and Step 12's Analyze button use
   it.
4. **`src/api/dictionary.ts`**: `fetchDictionary()` through the typed client (Step 9). It's loaded once per page load
   (`useQuery`, no refetching), so typing makes no API calls.
5. **`src/workup/WorkupPage.tsx`**:
   - The name: a text input labelled "Workup name", defaulting to "Untitled Workup".
   - The measurement rows, built from the dictionary. Each input is labelled with the variable's name and code;
     when it has an error it gets `aria-invalid` and the error (red, under the row) is linked by
     `aria-describedby`.
   - Loading and error states for the dictionary ("Couldn't load the variables. Is the API running?").
   - `App.tsx` shows `WorkupPage`, then the status panel.

Tests added:
- **Vitest**:
  - `valueError`: no error inside the range or at its limits; the error below and above it; "Not a number."; empty
    is fine.
  - `workupStore`: saves and loads a Workup; returns `null` when nothing is stored or the stored data is broken;
    **doesn't throw when `localStorage` throws** (on read and on write); new ids are valid `workup_id`s.
  - `WorkupPage` (mocked `fetch`): builds a field per dictionary variable; XCB 312 shows the "Not possible" error
    and marks the field invalid; fixing it clears the error; renaming and typing are saved; the page shows the
    stored Workup after a remount; the API is called only for the dictionary, never while typing; a dictionary load
    error is shown.
- **E2E** (`e2e/workup.spec.ts`, real API): rename; enter GOL 183 and XCB 312 → the error is visible; reload → the
  name and values are still there; **while typing, no request to `/api` carries the values, and the only `/api`
  requests are the status panel's `GET readyz`** (checked by watching every request). It fails if typing calls the
  API.

**Later (not now):** a Workups list page, Skip/Un-skip, a progress line, "Saved on this device · HH:MM", the
over-precise warning, and the Figma styling.

## How you verify
```bash
docker compose up -d redis
make test-e2e                  # or run the dev servers and open http://localhost:3000
```
In the browser:
- Rename the Workup; enter GOL 183 and XCB 312 → "Not possible: outside 100–200 mm." under XCB.
- Change XCB to 140 → the error clears.
- Reload → the name and values are still there.
- DevTools → Network while typing: no requests except the status panel's `readyz` every 10 s.
- `make lint` and `make test` are green, and CI ✓ on the PR.
