import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.redis_client import get_redis

pytestmark = pytest.mark.integration


def test_analyze_round_trip_against_the_real_redis(no_models_loaded):
    workup_id = f"test-{uuid.uuid4().hex}"
    redis = get_redis()

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/analyses", json={"workup_id": workup_id, "values": {"GOL": 183.7, "XCB": 140.3}}
        )
        log = client.get(f"/api/v1/workups/{workup_id}/analyses").json()

    analysis_id = response.json()["id"]
    key = f"mosaic:analysis:{analysis_id}"
    try:
        assert response.status_code == 200
        assert [r["id"] for r in log] == [analysis_id]
        raw = redis.get(key).decode()
        assert "183.7" not in raw and "140.3" not in raw
        assert 86000 < redis.ttl(key) <= 86400
    finally:
        redis.delete(key, f"mosaic:workup:{workup_id}:analyses")


# Review finding #6, against the real Redis: listing removes the ids of expired results from the run log.
def test_listing_removes_expired_ids_against_the_real_redis(no_models_loaded):
    workup_id = f"test-{uuid.uuid4().hex}"
    redis = get_redis()
    log_key = f"mosaic:workup:{workup_id}:analyses"

    with TestClient(app) as client:
        ids = [
            client.post("/api/v1/analyses", json={"workup_id": workup_id, "values": {"GOL": 183, "XCB": 140}}).json()[
                "id"
            ]
            for _ in range(2)
        ]
        redis.delete(f"mosaic:analysis:{ids[0]}")
        log = client.get(f"/api/v1/workups/{workup_id}/analyses").json()

    try:
        assert [r["id"] for r in log] == [ids[1]]
        assert redis.lrange(log_key, 0, -1) == [ids[1].encode()]
    finally:
        redis.delete(f"mosaic:analysis:{ids[1]}", log_key)
