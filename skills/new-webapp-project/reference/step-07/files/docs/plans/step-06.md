# Step 6: Demo ML model, loaded once at startup

Status: done (PR #9, tag `step-6`).

## Context
Step 7's Analyze endpoint needs a model to run. This step adds a small **demo scikit-learn model**, the
**model catalog** (the swap point where the real MOSAIC models go later), and loading at startup. `readyz` then
tells Kubernetes whether the model is in memory. No Analyze endpoint yet (that's Step 7).

What the demo does: from GOL and XCB it gives the **cranial index** (XCB / GOL × 100) and a **class**:
- dolichocranic below 75
- mesocranic from 75 to below 80
- brachycranic 80 and above

The index is the standard formula, computed in code and rounded to 0.1 (the dictionary's precision). The class comes
from a scikit-learn `DecisionTreeClassifier` trained on synthetic indexes (fixed seed), so the app really loads and
runs a trained model file. (183, 140) → 76.5, mesocranic.

## What I build
1. **Dependencies** (`backend/pyproject.toml`): `scikit-learn` and `joblib`.
2. **`backend/scripts/train_demo_model.py`**: `train()` fits the tree on synthetic indexes (seed 0); `main()` saves it
   to `<ARTIFACT_DIR>/cranial_demo.joblib`.
3. **`make model`** runs the script. `backend/ml_artifacts/` keeps a `.gitkeep`; the `.joblib` file is git-ignored.
4. **`app/config.py`**: `artifact_dir` setting (`ARTIFACT_DIR`, default `backend/ml_artifacts`).
5. **`app/model_catalog.py`**: `ModelSpec(id, title, file, version, inputs)`, `MODEL_CATALOG` with `cranial-demo`,
   `DEFAULT_MODEL_ID`, `require_model_spec(id)`.
6. **`app/model_runtime.py`**: `load_model(model_id)` loads once and keeps the model in memory; a missing file raises
   `FileNotFoundError` naming the path and saying "Run `make model`". `is_loaded(model_id)`.
   `predict(model_id, values)`.
7. **`app/main.py`**: the lifespan loads the default model after the dictionary; `readyz` adds `model`, `model_id` and
   `model_version`, and returns 503 when Redis is down **or** the model isn't loaded.
8. **Tests.** A session fixture trains the model into a temp folder, so tests need no `make model`.
   - The model loads once; (183, 140) → mesocranic 76.5, plus a dolichocranic and a brachycranic case; a missing file
     raises the clear error; startup fails without the file.
   - readyz tests expect the model fields (a deliberate contract change); readyz is 503 when the model isn't loaded.
9. **README**: `make model` before `uvicorn`, and what readyz now shows.

## Changes during the step
The real models may not be scikit-learn, so the runtime doesn't assume it:
- Each model has a **handler** in `model_runtime.py` with two functions: `load(path)` reads its trained file, and
  `run(model, values)` turns entered values into the model's input and its output into the result.
- The catalog lists each model's `inputs` (dictionary variable codes).
- Callers only use `predict(model_id, values)`. Adding a real model (Keras, PyTorch, ONNX, …) means its trained file,
  a catalog entry and a handler; nothing else changes.
- The Redis integration test now goes through the real startup, which loads the model.

## How you verify
- `make model` creates `backend/ml_artifacts/cranial_demo.joblib`.
- `uvicorn` starts, and `curl localhost:8000/api/v1/readyz` shows `"model": "loaded"`, `cranial-demo` and `0.1.0`.
- Rename the file, and `uvicorn` fails at startup with the "Run `make model`" message.
- CI ✓ on the PR.
