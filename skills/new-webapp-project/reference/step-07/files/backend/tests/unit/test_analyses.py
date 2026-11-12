"""Analyze and the run log. The key promise: entered values are used once and never stored or logged."""

import logging

import fakeredis
import pytest

from app.dictionary import load_dictionary
from app.model_catalog import DEFAULT_MODEL_ID, require_model_spec

# Values with a decimal point, so they can't show up by chance inside a hex id.
GOL, XCB = 183.7, 140.3


@pytest.fixture
def redis(redis_server):
    """A view of the same fake Redis the API writes to."""
    return fakeredis.FakeRedis(server=redis_server)


def _analyze(client, workup_id="w1", **values):
    return client.post("/api/v1/analyses", json={"workup_id": workup_id, "values": values})


def test_analyze_returns_the_result(client):
    response = _analyze(client, GOL=183, XCB=140)

    assert response.status_code == 200
    body = response.json()
    assert body["id"]
    assert body["status"] == "succeeded"
    assert body["result"] == {"cranial_index": 76.5, "cranial_class": "mesocranic"}
    assert body["error"] is None


def test_stored_record_has_versions_and_codes_but_no_entered_values(client, redis):
    analysis_id = _analyze(client, GOL=GOL, XCB=XCB, NOL=180.9, BNL=101.1).json()["id"]

    raw = redis.get(f"mosaic:analysis:{analysis_id}").decode()
    for value in ("183.7", "140.3", "180.9", "101.1"):
        assert value not in raw
    record = client.get("/api/v1/workups/w1/analyses").json()[0]
    assert record["schema_version"] == 1
    assert record["owner"] == "anonymous"
    assert record["model_id"] == DEFAULT_MODEL_ID
    assert record["model_version"] == require_model_spec(DEFAULT_MODEL_ID).version
    assert record["dictionary_version"] == load_dictionary().dictionary_version
    assert set(record["variables_used"]) == {"GOL", "XCB"}
    assert record["outputs"]["cranial_class"]


def test_logs_contain_no_entered_values(client, caplog):
    caplog.set_level(logging.DEBUG)

    assert _analyze(client, GOL=GOL, XCB=XCB).status_code == 200
    assert _analyze(client, GOL=GOL, XCB=250.5).status_code == 422

    for value in ("183.7", "140.3", "250.5"):
        assert value not in caplog.text


def test_result_and_run_log_expire(client, redis):
    analysis_id = _analyze(client, GOL=183, XCB=140).json()["id"]

    assert 0 < redis.ttl(f"mosaic:analysis:{analysis_id}") <= 86400
    assert 0 < redis.ttl("mosaic:workup:w1:analyses") <= 86400


@pytest.mark.parametrize(
    "body",
    [
        pytest.param({"workup_id": "w1", "values": {"GOL": 183}}, id="missing XCB"),
        pytest.param({"workup_id": "w1", "values": {"GOL": 183, "XCB": 250}}, id="XCB above its possible range"),
        pytest.param({"workup_id": "w1", "values": {"GOL": 183, "XCB": 99.9}}, id="XCB below its possible range"),
        pytest.param({"workup_id": "w1", "values": {"GOL": 183, "XCB": 140, "ABC": 1}}, id="unknown code"),
        pytest.param({"workup_id": "w1", "model_id": "nope", "values": {"GOL": 183, "XCB": 140}}, id="unknown model"),
        pytest.param({"workup_id": "w 1/x", "values": {"GOL": 183, "XCB": 140}}, id="bad workup id"),
    ],
)
def test_invalid_input_is_422_and_stores_nothing(client, redis, body):
    response = client.post("/api/v1/analyses", json=body)

    assert response.status_code == 422
    assert redis.keys("mosaic:*") == []


def test_values_at_the_range_limits_are_accepted(client):
    assert _analyze(client, GOL=150, XCB=100).status_code == 200
    assert _analyze(client, GOL=220, XCB=200).status_code == 200


def test_run_log_lists_each_run_of_the_workup(client):
    assert client.get("/api/v1/workups/w1/analyses").json() == []

    first = _analyze(client, GOL=183, XCB=140).json()["id"]
    second = _analyze(client, GOL=190, XCB=130).json()["id"]
    _analyze(client, workup_id="w2", GOL=183, XCB=140)

    log = client.get("/api/v1/workups/w1/analyses").json()
    assert [r["id"] for r in log] == [first, second]
    assert [r["outputs"]["cranial_class"] for r in log] == ["mesocranic", "dolichocranic"]


def test_run_log_skips_expired_results(client, redis):
    first = _analyze(client, GOL=183, XCB=140).json()["id"]
    second = _analyze(client, GOL=190, XCB=130).json()["id"]
    redis.delete(f"mosaic:analysis:{first}")

    assert [r["id"] for r in client.get("/api/v1/workups/w1/analyses").json()] == [second]
