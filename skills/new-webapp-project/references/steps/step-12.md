# Step 12: Analyze in the UI, the result and the run log

## Goal
Close the slice: the `<entity>`'s values are sent **once**, in the Analyze request; the page shows each model output
and the `<entity>`'s run log. The E2E test of this flow becomes the main regression test.

## Required deliverables
- An analyses API module through the typed client: `analyze(<entity>Id, values)` (`POST /api/v1/analyses`) and
  `fetchRunLog(<entity>Id)` (`GET /api/v1/<entity>s/{id}/analyses`).
- Analyze sends **only the values the model needs** (its inputs), as numbers, plus `<entity>_id` and `model_id`. The
  model's inputs live as a frontend constant next to the call, with a comment pointing to the backend model catalog;
  the API's 422 stays the real guard.
- An Analyze panel below the fields:
  - the Analyze button is enabled only when every model input is filled and no field on the page shows an error; it
    is disabled while a request runs;
  - the result shows **each output** generically: its label and value (numbers at their precision, with unit;
    categories as their class), so a model with other outputs needs no UI change;
  - the run log lists the runs oldest first: time, model and version, outputs; it reloads after each Analyze;
  - errors: a 422 shows the API's messages; a network error shows "Couldn't reach the API." The values stay in the
    browser either way.
- README: the page description (entry, Analyze, result, run log, status panel).

## Acceptance checks
1. `make lint` and `make test` pass; CI passes on the PR.
2. In the browser: enter valid inputs → Analyze → every output is shown → run log has 1 entry → Analyze again → 2.
   An out-of-range input disables the button.
3. DevTools → Network: only the Analyze POST carries the values. The stored record (inspect storage) holds none of them.
4. Tests added (component):
   - the button is disabled with a model input empty, out of range or not a number, or another field in error; enabled
     when all inputs are valid;
   - Analyze sends exactly `<entity>_id`, `model_id` and the model's inputs as numbers (not other filled fields), then
     shows every output, and the run log goes from 1 to 2 entries;
   - a 422 shows the API's message; a network error shows "Couldn't reach the API."
5. Tests added (E2E, the main flow): enter a known case → Analyze → the expected outputs → run log 1 → Analyze again →
   2. Both POST bodies carry the `<entity>` id and exactly the model's inputs; **no other request has a body or a
   query string**. A second test: Analyze stays disabled with an out-of-range value.
6. Deliberate test changes (say so in the PR): the page now also loads the run log (a GET with the id, no values), so
   Step 11's "only the status request while typing" checks become "only GETs, with no body and no query string".

## Default (MOSAIC's way)
`src/api/analyses.ts` (`MODEL_ID = "cranial-demo"`, `MODEL_INPUTS = ["GOL", "XCB"]`), `src/workup/AnalyzePanel.tsx`
with `useMutation`/`useQuery` (run log invalidated on success), `Analyze.test.tsx`, `e2e/analyze.spec.ts`. Known case
GOL 183, XCB 140 → "Cranial class: mesocranic", "Cranial index: 76.5". MOSAIC checked "no query string" rather than
searching URLs for "183", because the random hex id could contain it by chance.

Reference: reference/step-12/ (plan.md, changes.txt, files/).

Adapt: the model id, inputs, known case and output labels come from Step 6 and the interview. If the catalog lists
`outputs` (Step 6), labels can come from the API instead of a constant.

## Swap notes
Depends on: persistence mode, frontend, UI kit, test runners.

- **Server-save persistence mode:** Analyze may send only the `<entity>_id` and let the server read the stored
  values; then the E2E check becomes "values go only to the `<entity>` save endpoint".
- **Queue runner later:** the panel polls `GET /api/v1/analyses/{id}` until `status` is final; the response shape
  already allows it.
- **Vue / shadcn:** same behavior and tests, different components.

Must not change:
- Values leave the browser once, in the Analyze POST body, only the model's inputs.
- The result shows every output generically; the run log reloads after Analyze.
- The main E2E flow and its "no other request carries values" check.
