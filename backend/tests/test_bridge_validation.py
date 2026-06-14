from __future__ import annotations

import json
from pathlib import Path

import pytest

from backend.engine.bridge_model import BridgeDomainError, parse_bridge_project


SCHEMAS_DIR = Path(__file__).resolve().parents[2] / "schemas"
EXAMPLES_DIR = Path(__file__).resolve().parents[2] / "examples"


def _validate_schema(payload, schema_path: Path) -> None:
    try:
        from jsonschema import Draft202012Validator  # type: ignore
    except ImportError:
        pytest.skip("jsonschema not installed")
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema)
    errors = list(validator.iter_errors(payload))
    assert not errors, errors


def test_bridge_schema_exists():
    path = SCHEMAS_DIR / "bridge.schema.json"
    assert path.exists()
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["title"] == "Bridge Domain Model"


def test_generated_fem_schema_exists():
    path = SCHEMAS_DIR / "generated-fem.schema.json"
    assert path.exists()
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["title"] == "Generated FEM model summary"


def test_examples_match_bridge_schema():
    schema = SCHEMAS_DIR / "bridge.schema.json"
    for example in ["bridge-simple-2lane.json", "bridge-2span-3girder.json", "bridge-load-line.json"]:
        path = EXAMPLES_DIR / example
        assert path.exists(), example
        payload = json.loads(path.read_text(encoding="utf-8"))
        _validate_schema(payload, schema)


def test_examples_parse_to_bridge_project():
    for example in ["bridge-simple-2lane.json", "bridge-2span-3girder.json", "bridge-load-line.json"]:
        path = EXAMPLES_DIR / example
        payload = json.loads(path.read_text(encoding="utf-8"))
        project = parse_bridge_project(payload)
        assert project.id
        assert project.spans


def test_invalid_impact_factor_value():
    payload = {
        "id": "b1",
        "name": "b",
        "schemaVersion": "0.1.0",
        "crossSection": {
            "lane_count": 2,
            "lane_width": 3.5,
            "median_width": 0,
            "sidewalk_width": 0,
            "barrier_width": 0,
        },
        "spans": [{"index": 1, "length": 10.0, "offset": 0.0}],
        "impactFactor": {"value": 1.5, "auto": False},
        "lines": [],
        "loads": [],
        "generationSettings": {"mesh_division": 2, "mesh_density": "coarse"},
    }
    with pytest.raises(BridgeDomainError):
        parse_bridge_project(payload)


def test_invalid_load_type():
    payload = {
        "id": "b1",
        "name": "b",
        "schemaVersion": "0.1.0",
        "crossSection": {
            "lane_count": 2,
            "lane_width": 3.5,
            "median_width": 0,
            "sidewalk_width": 0,
            "barrier_width": 0,
        },
        "spans": [{"index": 1, "length": 10.0, "offset": 0.0}],
        "impactFactor": {"value": 0.0, "auto": True},
        "lines": [],
        "loads": [{"id": "x", "type": "bad_type", "name": "x", "magnitude": 1.0, "direction": "X"}],
        "generationSettings": {"mesh_division": 2, "mesh_density": "coarse"},
    }
    with pytest.raises(BridgeDomainError):
        parse_bridge_project(payload)
