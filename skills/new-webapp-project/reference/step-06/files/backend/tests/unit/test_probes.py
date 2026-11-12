from app.config import app_version
from app.model_catalog import DEFAULT_MODEL_ID, require_model_spec


def _readyz(status, redis, model):
    spec = require_model_spec(DEFAULT_MODEL_ID)
    return {
        "status": status,
        "redis": redis,
        "model": model,
        "model_id": spec.id,
        "model_version": spec.version,
        "version": app_version(),
    }


def test_livez_is_200(client):
    response = client.get("/api/v1/livez")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_livez_stays_200_when_redis_is_down(client, redis_server):
    redis_server.connected = False

    assert client.get("/api/v1/livez").status_code == 200


def test_readyz_is_200_when_redis_answers_and_the_model_is_loaded(client):
    response = client.get("/api/v1/readyz")

    assert response.status_code == 200
    assert response.json() == _readyz("ready", "ok", "loaded")


def test_readyz_is_503_when_redis_is_down(client, redis_server):
    redis_server.connected = False

    response = client.get("/api/v1/readyz")

    assert response.status_code == 503
    assert response.json() == _readyz("not ready", "down", "loaded")


def test_readyz_is_503_when_the_model_is_not_loaded(client, no_models_loaded):
    response = client.get("/api/v1/readyz")

    assert response.status_code == 503
    assert response.json() == _readyz("not ready", "ok", "not loaded")
