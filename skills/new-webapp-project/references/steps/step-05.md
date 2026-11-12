# Step 5: Data dictionary (versioned data + `GET /api/v1/dictionary`)

## Goal
Describe the variables a user can enter as **data, not code**: one versioned file that the API serves and that both
Analyze (Step 7) and the entry screen (Step 11) use. Adding variables later is a data change only.

## Required deliverables
- A versioned dictionary file in the backend (e.g. `backend/app/data/dictionary_v0.json`) with:
  - `dictionary_version` (semver, e.g. `"0.1.0"`);
  - `variables`: a list, each with `code`, `label`, `unit`, `precision` (> 0), `possible_range` (`{min, max}`), and
    optional `section` (for grouping on screen) and optional `range_source` (where the range came from, or
    "placeholder: to be confirmed").
- A loader with a typed schema and validation: `min < max`, `precision > 0`, unique codes, `section` optional. It
  reads the file once (cached).
- The dictionary is loaded at startup, so a broken file stops the API with a clear error naming the problem.
- `GET /api/v1/dictionary` returns the typed dictionary, so it appears in OpenAPI for the Step 9 client.
- Variables come from the interview (the toy domain). Placeholder ranges are marked as such in the data.
- README: what the dictionary is and how to add a variable.

## Acceptance checks
1. `make test` passes.
2. `GET /api/v1/dictionary` returns 200 with the version and the interview's variables, each with its range.
3. The dictionary appears in the API docs page.
4. Breaking the file (e.g. a duplicate code) makes the API fail at startup with a clear message.
5. Tests added (contract tests, not counts):
   - the endpoint returns 200 with a version and a non-empty variable list;
   - codes are unique; every variable has a unit, `min < max`, `precision > 0`;
   - a variable without `section` is valid, and one with `section` keeps it;
   - one or two named variables exist with their expected range (the ones the demo model needs);
   - the loader rejects a file with duplicate codes, and a file with `min >= max`.
6. CI passes on the PR.

## Default (MOSAIC's way)
MOSAIC's `backend/app/data/dictionary_v0.json` (version `0.1.0`) held four cranial measurements (GOL, NOL, BNL, XCB)
in mm with `precision: 0.1`. It used `name` (not `label`) and two grouping fields, `region` ("Cranium") and `group`
("Metric"), instead of one `section`. XCB's range came from a Figma wireframe; the others were placeholders "to be
confirmed by the PI". `backend/app/dictionary.py` had pydantic models `Variable` and `Dictionary` and a cached
`load_dictionary()`, loaded in the FastAPI lifespan. Decision: the range is the **possible** range (a value outside
it is "Not possible" and blocks Analyze), not a softer "usual" range. Tests in
`backend/tests/unit/test_dictionary.py`.

Reference: reference/step-05/ (plan.md, changes.txt, files/).

Adapt: all variable codes, labels, units, ranges and sections come from the interview. Do not copy GOL/XCB, mm or
"Cranium".

## Swap notes
Depends on: backend, owner/naming (the domain).

- **Postgres:** keep the dictionary as a versioned file in the repo (it is reference data, not user data). Loading
  it into a table is a later choice; if done, the file stays the source and the endpoint shape stays the same.
- **Node or Go backend:** the schema becomes zod/TypeBox or Go structs; same validation rules and startup failure.
- **Categorical inputs (if the interview has any):** add `type: "number" | "category"` and `options` for categories,
  and validate them; numeric variables keep `precision` and `possible_range`.

Must not change:
- `GET /api/v1/dictionary` and its typed shape (`dictionary_version`, `variables[]`).
- Variables are data, not code; a bad file fails startup, never a request.
- The possible range is the hard limit used by Analyze (422) and the UI (blocking error).
