"""Tests for the optional roadAlignment / spanLayout parsers (backward compatible)."""
from backend.engine.bridge_model import (
    parse_bridge_project,
    parse_road_alignment,
    parse_span_layout,
)


def test_parse_road_alignment_none_is_none():
    assert parse_road_alignment(None) is None


def test_parse_road_alignment_simple():
    a = parse_road_alignment(
        {
            "inputMode": "simple",
            "bridgeLength": 30.0,
            "points": [
                {"station": 0, "x": 0, "y": 0, "z": 0},
                {"station": 30, "x": 30, "y": 0, "z": 0},
            ],
        }
    )
    assert a is not None
    assert a.inputMode == "simple"
    assert a.bridgeLength == 30.0
    assert len(a.points) == 2


def test_parse_road_alignment_csv_three_points():
    a = parse_road_alignment(
        {
            "inputMode": "csv",
            "bridgeLength": 30.0,
            "points": [
                {"station": 0, "x": 0, "y": 0, "z": 0},
                {"station": 15, "x": 15, "y": 0, "z": 0},
                {"station": 30, "x": 30, "y": 0, "z": 0},
            ],
        }
    )
    assert a is not None
    assert a.inputMode == "csv"
    assert a.points[1].x == 15


def test_parse_span_layout_none_is_none():
    assert parse_span_layout(None) is None


def test_parse_span_layout_station():
    sl = parse_span_layout(
        {
            "inputMode": "station",
            "supports": [
                {"name": "A1", "type": "abutment", "station": 0},
                {"name": "P1", "type": "pier", "station": 15},
                {"name": "A2", "type": "abutment", "station": 30},
            ],
            "spans": [
                {"from": "A1", "to": "P1", "length": 15},
                {"from": "P1", "to": "A2", "length": 15},
            ],
        }
    )
    assert sl is not None
    assert sl.inputMode == "station"
    assert len(sl.supports) == 3
    assert sl.supports[1].type == "pier"
    assert len(sl.spans) == 2
    assert sl.spans[0].from_ == "A1"


def test_parse_bridge_project_without_alignment_keeps_legacy_compat():
    """Legacy payload without roadAlignment / spanLayout must still parse cleanly."""
    payload = {
        "id": "bridge-legacy",
        "name": "legacy",
        "schemaVersion": "0.1.0",
        "crossSection": {
            "lane_count": 2,
            "lane_width": 3.5,
            "median_width": 0,
            "sidewalk_width": 1.5,
            "barrier_width": 0.5,
        },
        "spans": [{"index": 1, "length": 30, "offset": 0}],
        "impactFactor": {"value": 0.0, "auto": True},
        "lines": [],
        "loads": [],
        "generationSettings": {"mesh_division": 10, "mesh_density": "standard"},
    }
    p = parse_bridge_project(payload)
    assert p.id == "bridge-legacy"
    assert p.roadAlignment is None
    assert p.spanLayout is None


def test_parse_bridge_project_with_csv_alignment_roundtrip():
    payload = {
        "id": "bridge-csv",
        "name": "csv",
        "schemaVersion": "0.1.0",
        "crossSection": {
            "lane_count": 2,
            "lane_width": 3.5,
            "median_width": 0,
            "sidewalk_width": 1.5,
            "barrier_width": 0.5,
        },
        "spans": [
            {"index": 1, "length": 15, "offset": 0},
            {"index": 2, "length": 15, "offset": 0},
        ],
        "impactFactor": {"value": 0.0, "auto": True},
        "lines": [],
        "loads": [],
        "generationSettings": {"mesh_division": 10, "mesh_density": "standard"},
        "roadAlignment": {
            "inputMode": "csv",
            "bridgeLength": 30,
            "points": [
                {"station": 0, "x": 0, "y": 0, "z": 0},
                {"station": 15, "x": 15, "y": 0, "z": 0},
                {"station": 30, "x": 30, "y": 0, "z": 0},
            ],
        },
        "spanLayout": {
            "inputMode": "station",
            "supports": [
                {"name": "A1", "type": "abutment", "station": 0},
                {"name": "A2", "type": "abutment", "station": 30},
            ],
            "spans": [{"from": "A1", "to": "A2", "length": 30}],
        },
    }
    p = parse_bridge_project(payload)
    assert p.roadAlignment is not None
    assert p.roadAlignment.inputMode == "csv"
    assert p.roadAlignment.points[1].x == 15
    assert p.spanLayout is not None
    assert p.spanLayout.supports[0].name == "A1"
    # to_dict にも出る
    d = p.to_dict()
    assert d["roadAlignment"]["points"][1]["x"] == 15
    assert d["spanLayout"]["supports"][0]["name"] == "A1"
