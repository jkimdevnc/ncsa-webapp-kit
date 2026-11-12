import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = pytest.mark.integration


def test_readyz_is_200_against_the_real_redis(no_models_loaded):
    # No dependency override: this uses REDIS_URL, i.e. the Redis from `docker compose up -d redis`. `with` runs the
    # real startup, which loads the model.
    with TestClient(app) as client:
        response = client.get("/api/v1/readyz")

    assert response.json()["redis"] == "ok", "Is Redis running? Start it with: docker compose up -d redis"
    assert response.json()["model"] == "loaded"
    assert response.status_code == 200
