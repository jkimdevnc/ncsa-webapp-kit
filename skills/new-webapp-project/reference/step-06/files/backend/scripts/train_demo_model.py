"""Train the demo model and save it to `<ARTIFACT_DIR>/cranial_demo.joblib`. Run it with `make model`.

The demo classifies a cranial index (XCB / GOL x 100) into the standard classes. It is a stand-in for the real MOSAIC
models: a trained file that the API loads and runs, nothing more. Synthetic data and a fixed seed keep it
reproducible.
"""

import joblib
import numpy as np
from sklearn.tree import DecisionTreeClassifier

from app.config import get_settings
from app.model_catalog import DEFAULT_MODEL_ID, require_model_spec

SEED = 0


def label(index: float) -> str:
    if index < 75:
        return "dolichocranic"
    if index < 80:
        return "mesocranic"
    return "brachycranic"


def train() -> DecisionTreeClassifier:
    rng = np.random.default_rng(SEED)
    indexes = rng.uniform(60, 95, size=2000)
    model = DecisionTreeClassifier(max_depth=3, random_state=SEED)
    model.fit(indexes.reshape(-1, 1), [label(i) for i in indexes])
    return model


def main() -> None:
    path = get_settings().artifact_dir / require_model_spec(DEFAULT_MODEL_ID).file
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(train(), path)
    print(f"saved {path}")


if __name__ == "__main__":
    main()
