#!/usr/bin/env python3
"""Phase 7-02 WP-A: AnalysisDocument JSON Schema validation tests.

Validates the FROZEN analysis-document.schema.json and checks a minimal
AnalysisDocument instance (empty envelope shape) against it.
"""

import json
from pathlib import Path

import pytest

jsonschema = pytest.importorskip("jsonschema")

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO_ROOT / "schemas" / "contracts" / "v0.1" / "analysis-document.schema.json"


@pytest.fixture(scope="module")
def analysis_document_schema():
    with SCHEMA_PATH.open(encoding="utf-8") as file:
        return json.load(file)


def test_schema_file_is_valid_json(analysis_document_schema):
    assert analysis_document_schema["properties"]["schemaId"]["const"] == "spacer.contracts.analysis-document"
    assert analysis_document_schema["properties"]["schemaVersion"]["const"] == "1.0.0"
    assert analysis_document_schema["properties"]["documentKind"]["const"] == "analysis-document"
    jsonschema.Draft202012Validator.check_schema(analysis_document_schema)


def test_schema_constraints(analysis_document_schema):
    assert analysis_document_schema["properties"]["schemaId"]["const"] == "spacer.contracts.analysis-document"
    assert analysis_document_schema["properties"]["schemaVersion"]["const"] == "1.0.0"
    assert analysis_document_schema["properties"]["documentKind"]["const"] == "analysis-document"
    statuses = analysis_document_schema["properties"]["analysisStatus"]["enum"]
    assert "NOT_AUTHORIZED" in statuses
    assert "STALE" in statuses


def _minimal_document() -> dict:
    return {
        "schemaId": "spacer.contracts.analysis-document",
        "schemaVersion": "1.0.0",
        "documentKind": "analysis-document",
        "documentId": "11111111-1111-4111-8111-111111111111",
        "projectId": "p-1",
        "revisionId": 1,
        "status": "DRAFT",
        "contentChecksum": "a" * 64,
        "modelChecksum": "b" * 64,
        "provenance": {"createdAt": "2026-08-13T00:00:00.000Z", "createdBy": "test", "producer": "spacer-analysis-module"},
        "timestamps": {"updatedAt": "2026-08-13T00:00:00.000Z", "derivedAt": None},
        "sourceReferences": {
            "bridgeLayout": {"bridgeId": "B-1", "documentVersion": "1", "layoutFingerprint": "f"},
            "superstructure": None,
            "substructure": None,
            "loadFingerprint": None,
            "solverSettingsFingerprint": None,
        },
        "coordinateContext": {"entityId": "22222222-2222-4222-8222-222222222222"},
        "unitContext": {"length": "m"},
        "nodes": [],
        "members": [],
        "materials": [],
        "sections": [],
        "supports": [],
        "releases": [],
        "rigidLinks": [],
        "mpc": [],
        "bearings": [],
        "springs": [],
        "foundationSprings": [],
        "loadCases": [],
        "nodalLoads": [],
        "memberLoads": [],
        "loadCombinations": [],
        "analysisSettings": {"analysisType": "linear_static", "solver": "scipy_sparse"},
        "analysisStatus": "NOT_RUN",
        "resultReferences": [],
        "validation": {"ok": True},
        "revision": {"revisionId": 1},
    }


def test_minimal_document_validates(analysis_document_schema):
    validator = jsonschema.Draft202012Validator(analysis_document_schema)
    document = _minimal_document()
    errors = list(validator.iter_errors(document))
    assert errors == []


def test_bad_document_rejected(analysis_document_schema):
    validator = jsonschema.Draft202012Validator(analysis_document_schema)
    document = _minimal_document()
    document["schemaId"] = "wrong.schema"
    errors = list(validator.iter_errors(document))
    assert len(errors) >= 1
