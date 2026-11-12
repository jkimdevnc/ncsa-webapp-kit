import fakeredis
import joblib
import pytest
from fastapi.testclient import TestClient

from app import model_runtime
from app.config import get_settings
from app.main import app
from app.model_catalog import DEFAULT_MODEL_ID, require_model_spec
from app.redis_client import get_redis
from scripts.train_demo_model import train


@pytest.fixture(scope="session", autouse=True)
def artifact_dir(tmp_path_factory):
    """Train the demo model into a temp folder once per run, so tests don't need `make model`."""
    path = tmp_path_factory.mktemp("ml_artifacts")
    joblib.dump(train(), path / require_model_spec(DEFAULT_MODEL_ID).file)
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(get_settings(), "artifact_dir", path)
        yield path


@pytest.fixture
def no_models_loaded(monkeypatch):
    """Start with nothing in memory, as a fresh API process does. Restored after the test."""
    monkeypatch.setattr(model_runtime, "_loaded", {})


@pytest.fixture
def redis_server():
    """An in-memory fake Redis server. Set `connected = False` to simulate Redis being down."""
    return fakeredis.FakeServer()


@pytest.fixture
def client(redis_server):
    """An API client whose Redis is fakeredis, so unit tests need no Docker. The default model is loaded, as after a
    normal startup."""
    model_runtime.load_model(DEFAULT_MODEL_ID)
    app.dependency_overrides[get_redis] = lambda: fakeredis.FakeRedis(server=redis_server)
    yield TestClient(app)
    app.dependency_overrides.clear()
