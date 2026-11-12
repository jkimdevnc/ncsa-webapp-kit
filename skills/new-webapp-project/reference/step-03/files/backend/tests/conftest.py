import fakeredis
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.redis_client import get_redis


@pytest.fixture
def redis_server():
    """An in-memory fake Redis server. Set `connected = False` to simulate Redis being down."""
    return fakeredis.FakeServer()


@pytest.fixture
def client(redis_server):
    """An API client whose Redis is fakeredis, so unit tests need no Docker."""
    app.dependency_overrides[get_redis] = lambda: fakeredis.FakeRedis(server=redis_server)
    yield TestClient(app)
    app.dependency_overrides.clear()
