"""Contract tests: they check the dictionary's shape and a few known variables, not counts, so adding variables later
doesn't break them."""

import json

import pytest
from pydantic import ValidationError

from app.dictionary import load_dictionary, read_dictionary


def test_endpoint_returns_the_versioned_dictionary(client):
    response = client.get("/api/v1/dictionary")

    assert response.status_code == 200
    body = response.json()
    assert body["dictionary_version"]
    assert body["variables"]


def test_every_variable_matches_the_contract():
    variables = load_dictionary().variables

    assert len({v.code for v in variables}) == len(variables)
    for v in variables:
        assert v.unit == "mm"
        assert v.precision > 0
        assert v.possible_range.min < v.possible_range.max
        assert v.range_source


def test_gol_and_xcb_exist_with_their_ranges():
    by_code = {v.code: v for v in load_dictionary().variables}

    assert "GOL" in by_code
    xcb = by_code["XCB"]
    assert (xcb.possible_range.min, xcb.possible_range.max) == (100, 200)


def _write(tmp_path, variables):
    path = tmp_path / "dictionary.json"
    path.write_text(json.dumps({"dictionary_version": "test", "variables": variables}))
    return path


def _variable(code, min_=100, max_=200):
    return {
        "code": code,
        "name": code,
        "region": "Cranium",
        "group": "Metric",
        "unit": "mm",
        "precision": 0.1,
        "possible_range": {"min": min_, "max": max_},
        "range_source": "test",
    }


def test_loader_rejects_duplicate_codes(tmp_path):
    path = _write(tmp_path, [_variable("GOL"), _variable("GOL")])

    with pytest.raises(ValidationError, match="duplicate variable codes: GOL"):
        read_dictionary(path)


def test_loader_rejects_a_range_with_min_not_below_max(tmp_path):
    path = _write(tmp_path, [_variable("XCB", min_=200, max_=100)])

    with pytest.raises(ValidationError, match="must be below max"):
        read_dictionary(path)
