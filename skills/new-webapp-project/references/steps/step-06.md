# Step 6: Demo model, loaded once at startup

## Goal
Add a small trained demo model, the model catalog (the swap point for real models), and loading at startup, so
`readyz` can report whether the model is in memory. No Analyze endpoint yet (Step 7).

## Required deliverables
- A training script (e.g. `backend/scripts/train_demo_model.py`) that fits the demo model on synthetic data with a
  fixed seed and saves one model file into the artifact folder.
- `make model` runs it. The artifact folder is kept in git (e.g. a `.gitkeep`); the model file is git-ignored.
- An `artifact_dir` setting (`ARTIFACT_DIR`), documented in `.env.example`.
- A model catalog module (e.g. `app/model_catalog.py`): each entry has `id`, `title`, `file`, `version`, `inputs`
  (dictionary codes) and `outputs` (each with `code`, `label`, and `kind`: numeric with unit and precision, or
  categorical with its classes). A `DEFAULT_MODEL_ID` and a lookup that fails clearly for an unknown id.
- A model runtime module (e.g. `app/model_runtime.py`):
  - each model has a **handler** with `load(path)` and `run(model, values)`, so the runtime does not assume one ML
    library;
  - `load_model(id)` loads once and keeps it in memory; a missing file raises an error naming the path and saying
    "Run `make model`";
  - `is_loaded(id)` and `predict(id, values)` → a dict of **several outputs** (the catalog's `outputs`).
- Startup loads the dictionary, then the default model. `readyz` adds `model`, `model_id`, `model_version`, and
  returns 503 when storage is down **or** the model is not loaded.
- README: run `make model` before starting the API; what `readyz` now shows.

## Acceptance checks
1. `make test` passes. Tests train the model into a temp folder themselves, so `make test` needs no `make model`.
2. `make model` creates the model file; the API starts and `readyz` shows `model: "loaded"`, the model id and version.
3. Renaming the model file makes the API fail at startup with the "Run `make model`" message.
4. Tests added:
   - the model loads once (a second load reuses it);
   - one known input gives the expected value for **each** output (a number rounded to its precision, and a class);
   - at least one more input per categorical class gives that class;
   - a missing file raises the clear error, and startup fails without it;
   - `readyz` includes the model fields (a deliberate contract change to the Step 3 tests, said so in the PR);
   - `readyz` is 503 when the model is not loaded;
   - the integration test goes through the real startup, which loads the model.
5. CI passes on the PR.

## Default (MOSAIC's way)
The `cranial-demo` model took GOL and XCB and returned two outputs: the cranial index (XCB / GOL × 100, computed in
code, rounded to 0.1) and a class (dolichocranic / mesocranic / brachycranic) from a scikit-learn
`DecisionTreeClassifier` trained on synthetic indexes (seed 0), saved with joblib to `cranial_demo.joblib`.
(183, 140) → 76.5, mesocranic. During the step MOSAIC added per-model handlers and the catalog's `inputs`, because
real models may not be scikit-learn. MOSAIC's catalog did not list `outputs`; a new project adds them so the UI can
label each output (Step 12).

Reference: reference/step-06/ (plan.md, changes.txt, files/).

Adapt: the model id, its inputs, outputs, classes and known cases come from the interview. Do not copy the cranial
index or its classes.

## Swap notes
Depends on: model runtime, backend, storage (only through `readyz`).

- **ONNX, PyTorch, Keras or a rule-based model:** a new handler (`load`, `run`); the catalog entry names the file.
  Callers still use only `predict(id, values)`.
- **Model too big to train at build time:** the file is downloaded or mounted into `ARTIFACT_DIR`; `make model`
  fetches it instead of training. Tests still need a small stand-in model.
- **Node or Go backend:** keep the catalog + handler split; the model may run in a sidecar, but `readyz` must still
  report it.

Must not change:
- Loaded once at startup, not per request; a missing model stops startup with a clear message.
- `readyz` returns 503 when the model is not loaded, with the model fields in its body.
- `predict(id, values)` is the only entry point callers use; the model returns several named outputs.
- Swap point: `model_catalog` (and its handlers) is where real models go.
