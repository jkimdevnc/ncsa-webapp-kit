# Step 5: Data dictionary (versioned JSON + `GET /api/v1/dictionary`)

Status: done (PR #8, tag `step-5`).

## Context
The UI (Step 11) and the Analyze API (Step 7) both need to know which measurements exist and what values are
possible. That knowledge is **data, not code**: one versioned JSON file that later grows to the full set of variables
(323 in Figma) without code changes.

Decisions (2026-10-27):
- The range is the **possible range**, as in Figma screen 04. A value outside it is "Not possible", shown in red, and
  blocks Analyze. This replaces the earlier softer amber "usual range".
- **XCB: 100–200 mm**, matching Figma.
- **GOL, NOL, BNL get placeholder ranges**, flagged in the data as "to be confirmed by the PI":
  - GOL 150–220 mm
  - NOL 150–220 mm
  - BNL 80–120 mm
- Each variable also stores `precision: 0.1` (mm), from Figma, for a later "over-precise" warning. It isn't used
  yet.
- Four variables are kept. The strict minimum for the demo model is GOL + XCB, but all four are the first Cranium
  rows in Figma.

## What I build
1. **`backend/app/data/dictionary_v0.json`**:
   - `dictionary_version: "0.1.0"`
   - `variables`: GOL, NOL, BNL, XCB, each with `code`, `name`, `region` ("Cranium"), `group` ("Metric"), `unit`
     ("mm"), `precision` (0.1), `possible_range` (`{min, max}`) and `range_source`. `range_source` is
     "Figma wireframe 04" for XCB and "placeholder: to be confirmed by the PI" for the others.
2. **`backend/app/dictionary.py`**:
   - Pydantic models `Variable` and `Dictionary`, with validation: `min < max`, `precision > 0`, unique codes.
   - `load_dictionary()` reads the JSON once (cached).
3. **`backend/app/main.py`**:
   - `GET /api/v1/dictionary` returns the typed `Dictionary`, so it appears in OpenAPI for the Step 9 client.
   - The dictionary is loaded at startup (FastAPI lifespan), so a broken JSON file stops the API with a clear error.
4. **Tests** (`backend/tests/unit/test_dictionary.py`). These are contract tests, not counts:
   - The endpoint returns 200 with a version and a non-empty variable list.
   - Codes are unique. Every variable has unit `mm`, `min < max`, `precision > 0` and a `range_source`.
   - GOL and XCB exist, and XCB's possible range is 100–200 mm.
   - The loader rejects a file with duplicate codes and a file with `min >= max`.
5. **Build plan:** Steps 7, 11 and 12 updated to match these decisions:
   - Step 7: 422 for a value outside the possible range.
   - Step 11: a red "Not possible" message.
   - Step 12: Analyze is disabled while any value is out of bounds.

## How you verify
- `curl localhost:8000/api/v1/dictionary` lists GOL, NOL, BNL and XCB with version `0.1.0`, and XCB's range is
  100–200.
- The dictionary appears under `/docs`.
- Breaking the JSON (for example, a duplicate code) makes `uvicorn` fail at startup with a clear message.
- CI ✓ on the PR.
