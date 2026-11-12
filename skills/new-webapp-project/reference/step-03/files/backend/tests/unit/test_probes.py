from app.config import app_version


def test_livez_is_200(client):
    response = client.get("/api/v1/livez")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_livez_stays_200_when_redis_is_down(client, redis_server):
    redis_server.connected = False

    assert client.get("/api/v1/livez").status_code == 200


def test_readyz_is_200_when_redis_answers(client):
    response = client.get("/api/v1/readyz")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "redis": "ok", "version": app_version()}


def test_readyz_is_503_when_redis_is_down(client, redis_server):
    redis_server.connected = False

    response = client.get("/api/v1/readyz")

    assert response.status_code == 503
    assert response.json() == {"status": "not ready", "redis": "down", "version": app_version()}
