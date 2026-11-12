import pytest
from fastapi.testclient import TestClient

from app import model_runtime
from app.config import get_settings
from app.main import app
from app.model_catalog import DEFAULT_MODEL_ID
from app.model_runtime import HANDLERS, Handler, is_loaded, load_model, predict


def test_model_is_loaded_once(no_models_loaded, monkeypatch):
    real = HANDLERS[DEFAULT_MODEL_ID]
    loads = []
    counting = Handler(load=lambda path: loads.append(path) or real.load(path), run=real.run)
    monkeypatch.setitem(HANDLERS, DEFAULT_MODEL_ID, counting)

    first = load_model(DEFAULT_MODEL_ID)
    second = load_model(DEFAULT_MODEL_ID)

    assert first is second
    assert len(loads) == 1
    assert is_loaded(DEFAULT_MODEL_ID)


@pytest.mark.parametrize(
    ("gol", "xcb", "index", "cranial_class"),
    [
        (183, 140, 76.5, "mesocranic"),
        (190, 130, 68.4, "dolichocranic"),
        (170, 145, 85.3, "brachycranic"),
    ],
)
def test_demo_model_gives_index_and_class(gol, xcb, index, cranial_class):
    result = predict(DEFAULT_MODEL_ID, {"GOL": gol, "XCB": xcb})

    assert result == {"cranial_index": index, "cranial_class": cranial_class}


def test_predict_ignores_variables_the_model_does_not_use():
    result = predict(DEFAULT_MODEL_ID, {"GOL": 183, "XCB": 140, "NOL": 180, "BNL": 100})

    assert result["cranial_class"] == "mesocranic"


def test_missing_model_file_raises_a_clear_error(no_models_loaded, monkeypatch, tmp_path):
    monkeypatch.setattr(get_settings(), "artifact_dir", tmp_path)

    with pytest.raises(FileNotFoundError, match="make model"):
        load_model(DEFAULT_MODEL_ID)


def test_startup_fails_when_the_model_file_is_missing(no_models_loaded, monkeypatch, tmp_path):
    monkeypatch.setattr(get_settings(), "artifact_dir", tmp_path)

    with pytest.raises(FileNotFoundError, match="make model"), TestClient(app):
        pass
    assert not model_runtime.is_loaded(DEFAULT_MODEL_ID)
