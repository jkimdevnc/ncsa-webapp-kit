"""Loads models once and runs them.

Each model has a handler with two functions, so any ML framework fits (scikit-learn, Keras, PyTorch, ONNX, ...):
- `load(path)` reads the trained file;
- `run(model, values)` turns entered values into the model's input and its output into the result.
Callers only use `predict(model_id, values)`, so swapping in a real model doesn't change them.
"""

from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib

from app.config import get_settings
from app.model_catalog import require_model_spec


@dataclass(frozen=True)
class Handler:
    load: Callable[[Path], Any]
    run: Callable[[Any, dict[str, float]], dict[str, Any]]


def _cranial_demo(model: Any, values: dict[str, float]) -> dict[str, Any]:
    index = round(values["XCB"] / values["GOL"] * 100, 1)
    return {"cranial_index": index, "cranial_class": str(model.predict([[index]])[0])}


HANDLERS: dict[str, Handler] = {
    "cranial-demo": Handler(load=joblib.load, run=_cranial_demo),
}

_loaded: dict[str, Any] = {}


def load_model(model_id: str) -> Any:
    """Load the model's file on first use and keep it in memory; later calls reuse it."""
    if model_id not in _loaded:
        spec = require_model_spec(model_id)
        path = get_settings().artifact_dir / spec.file
        if not path.exists():
            raise FileNotFoundError(f"Model '{model_id}' file not found: {path}. Run `make model` to build it.")
        _loaded[model_id] = HANDLERS[model_id].load(path)
    return _loaded[model_id]


def is_loaded(model_id: str) -> bool:
    return model_id in _loaded


def predict(model_id: str, values: dict[str, float]) -> dict[str, Any]:
    """Run a model on entered values (keyed by variable code) and return its outputs."""
    spec = require_model_spec(model_id)
    return HANDLERS[model_id].run(load_model(model_id), {code: values[code] for code in spec.inputs})
