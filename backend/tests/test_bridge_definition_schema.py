from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

jsonschema = pytest.importorskip(
    "jsonschema", reason="jsonschema is required for schema validation tests."
)

SCHEMAS_DIR = Path(__file__).resolve().parents[2] / "schemas"
BRIDGE_DEFINITION_SCHEMA_PATH = SCHEMAS_DIR / "bridge-definition.schema.json"


def _load_bridge_definition_schema() -> dict:
    return json.loads(BRIDGE_DEFINITION_SCHEMA_PATH.read_text(encoding="utf-8"))


def _validator() -> jsonschema.Draft202012Validator:
    schema = _load_bridge_definition_schema()
    jsonschema.Draft202012Validator.check_schema(schema)
    return jsonschema.Draft202012Validator(schema)


def _minimal_bridge_definition() -> dict:
    return {
        "schemaVersion": "1.0.0",
        "id": "bd-minimal-1",
        "name": "Minimal Bridge Definition",
        "source": {
            "kind": "manual",
        },
        "coordinatePolicy": {
            "policyId": "wizard-default",
            "frame": "bridge-local",
            "axisConvention": "x-longitudinal-y-transverse-z-up",
            "units": {"length": "m", "angle": "deg"},
        },
        "alignmentRefs": [
            {
                "alignmentId": "alignment-1",
                "originStation": 0.0,
                "totalLength": 30.0,
            }
        ],
        "stations": [
            {
                "id": "st-0",
                "station": 0.0,
                "label": "No.0+000.00",
                "cumulativeDistance": 0.0,
                "role": "origin",
            },
            {
                "id": "st-30",
                "station": 30.0,
                "label": "No.0+030.00",
                "cumulativeDistance": 30.0,
            },
        ],
        "spans": [
            {
                "id": "span-1",
                "index": 1,
                "startStation": 0.0,
                "endStation": 30.0,
                "length": 30.0,
            }
        ],
        "supports": [
            {
                "id": "support-start",
                "station": 0.0,
                "kind": "fixed",
                "substructureKind": "abutment",
            },
            {
                "id": "support-end",
                "station": 30.0,
                "kind": "pinned",
                "substructureKind": "abutment",
            },
        ],
        "superstructure": {
            "kind": "slab_girder_grid",
        },
        "girders": [
            {
                "id": "girder-1",
                "label": "G1",
                "role": "main",
                "offset": -5.0,
                "spanIds": ["span-1"],
            },
            {
                "id": "girder-2",
                "label": "G2",
                "role": "main",
                "offset": 0.0,
                "spanIds": ["span-1"],
            },
            {
                "id": "girder-3",
                "label": "G3",
                "role": "main",
                "offset": 5.0,
                "spanIds": ["span-1"],
            },
        ],
        "crossBeams": [],
        "bearings": [],
        "deck": {
            "id": "deck-1",
            "width": 12.0,
            "thickness": 0.25,
            "kind": "steel_composite",
        },
        "loads": [],
        "generationSettings": {
            "meshDivision": 4,
            "meshDensity": "standard",
            "defaultMaterialId": "MAT1",
            "defaultSectionId": "SEC1",
        },
        "metadata": {
            "createdAt": "2026-07-09T00:00:00.000Z",
            "notes": "Phase 4.5 Step 2 minimal fixture",
        },
    }


def test_bridge_definition_schema_exists() -> None:
    assert BRIDGE_DEFINITION_SCHEMA_PATH.exists()
    schema = _load_bridge_definition_schema()
    assert schema["title"] == "BridgeDefinition"
    assert schema["properties"]["schemaVersion"]["const"] == "1.0.0"


def test_minimal_bridge_definition_passes_schema_validation() -> None:
    validator = _validator()
    payload = _minimal_bridge_definition()
    errors = list(validator.iter_errors(payload))
    assert errors == [], errors


def test_bridge_definition_schema_rejects_missing_required_top_level_key() -> None:
    validator = _validator()
    payload = copy.deepcopy(_minimal_bridge_definition())
    del payload["spans"]

    errors = list(validator.iter_errors(payload))
    assert errors
    assert any("spans" in error.message for error in errors)


def test_bridge_definition_schema_rejects_invalid_source_kind() -> None:
    validator = _validator()
    payload = copy.deepcopy(_minimal_bridge_definition())
    payload["source"] = {"kind": "wizard", "bridgeProjectId": "bp-1"}

    errors = list(validator.iter_errors(payload))
    assert errors


def test_bridge_definition_schema_validates_spans_supports_girders_structure() -> None:
    validator = _validator()
    payload = copy.deepcopy(_minimal_bridge_definition())

    payload["spans"][0]["length"] = 0.0
    errors = list(validator.iter_errors(payload))
    assert errors
    assert any(list(error.path)[-1:] == ["length"] for error in errors)

    payload = copy.deepcopy(_minimal_bridge_definition())
    payload["supports"][0]["kind"] = "invalid_support"
    errors = list(validator.iter_errors(payload))
    assert errors
    assert any(list(error.path)[-1:] == ["kind"] for error in errors)

    payload = copy.deepcopy(_minimal_bridge_definition())
    del payload["girders"][0]["spanIds"]
    errors = list(validator.iter_errors(payload))
    assert errors
    assert any("spanIds" in error.message for error in errors)


def test_bridge_definition_schema_rejects_additional_properties() -> None:
    validator = _validator()
    payload = copy.deepcopy(_minimal_bridge_definition())
    payload["unexpectedField"] = True

    errors = list(validator.iter_errors(payload))
    assert errors
    assert any("Additional properties" in error.message for error in errors)

    payload = copy.deepcopy(_minimal_bridge_definition())
    payload["spans"][0]["extraSpanField"] = 1
    errors = list(validator.iter_errors(payload))
    assert errors
    assert any("Additional properties" in error.message for error in errors)
