"""The models this API can run. The only place model files are named.

Adding a real model (any ML framework) means: put its trained file in ARTIFACT_DIR, add an entry here, and add its
handler (how to load the file and how to run it) in `model_runtime.py`. Callers only use the model id.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class ModelSpec:
    id: str
    title: str
    file: str
    version: str
    inputs: tuple[str, ...]  # dictionary variable codes the model needs


MODEL_CATALOG: dict[str, ModelSpec] = {
    "cranial-demo": ModelSpec(
        id="cranial-demo",
        title="Cranial index (demo)",
        file="cranial_demo.joblib",
        version="0.1.0",
        inputs=("GOL", "XCB"),
    ),
}

# Loaded at startup; the API doesn't take traffic without it.
DEFAULT_MODEL_ID = "cranial-demo"


def require_model_spec(model_id: str) -> ModelSpec:
    spec = MODEL_CATALOG.get(model_id)
    if spec is None:
        raise KeyError(f"Unknown model '{model_id}'. Available: {', '.join(sorted(MODEL_CATALOG))}.")
    return spec
