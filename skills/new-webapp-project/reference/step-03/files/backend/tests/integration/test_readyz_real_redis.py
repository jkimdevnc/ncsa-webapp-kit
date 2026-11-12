import pytest
from fastapi.testclient import TestClient

from app.main import app

pytestmark = pytest.mark.integration


def test_readyz_is_200_against_the_real_redis():
    # No dependency override: this uses REDIS_URL, i.e. the Redis from `docker compose up -d redis`.
    response = TestClient(app).get("/api/v1/readyz")

    assert response.status_code == 200, "Is Redis running? Start it with: docker compose up -d redis"
    assert response.json()["redis"] == "ok"
