from __future__ import annotations

import copy

import pytest

from backend.app.reports import (
    If3AuthoritativeExportBlockedError,
    build_authoritative_result_exports_from_if3,
    build_result_exports,
    evaluate_if3_authoritative_export_gate,
    evaluate_if3_print_catalog,
)
from backend.engine.if3_checksum import sha256_content_checksum

from .test_if3_persistence import SOURCE_DOCUMENT_ID, normalized_resource


def frame_source_document(resource: dict) -> dict:
    return {
        "documentId": resource["sourceDocumentId"],
        "revisionId": resource["sourceDocumentVersion"],
        "contentChecksum": resource["sourceContentChecksum"],
    }


def test_authoritative_export_gate_allows_valid_if3_resource() -> None:
    resource = normalized_resource()
    gate = evaluate_if3_authoritative_export_gate(
        resource,
        "VALID",
        source_document=frame_source_document(resource),
    )

    assert gate["state"] == "VALID"
    assert gate["authoritativeOutputAllowed"] is True
    assert gate["resultRef"]["resultId"] == resource["resultId"]


@pytest.mark.parametrize("availability_status", ["STALE", "MISSING", "INVALID", "UNSUPPORTED", "FAILED", "PARTIAL"])
def test_authoritative_export_gate_blocks_non_valid_availability(availability_status: str) -> None:
    resource = normalized_resource()
    gate = evaluate_if3_authoritative_export_gate(
        resource,
        availability_status,
        source_document=frame_source_document(resource),
    )

    assert gate["authoritativeOutputAllowed"] is False


def test_authoritative_export_gate_rejects_raw_analysis_result() -> None:
    resource = normalized_resource()
    legacy = {
        "projectId": "legacy-project",
        "schemaVersion": "1.0.0",
        "analysisSummary": {
            "analysisType": "linear_static",
            "status": "success",
            "startedAt": "2026-07-25T00:00:00.000Z",
            "finishedAt": "2026-07-25T00:00:00.100Z",
            "durationMs": 100,
            "nodeCount": 1,
            "memberCount": 1,
            "loadCaseCount": 1,
            "totalDof": 6,
            "freeDof": 3,
            "constrainedDof": 3,
            "solver": "scipy_sparse",
        },
        "displacements": [],
        "reactions": [],
        "memberEndForces": [],
        "warnings": [],
        "errors": [],
    }

    gate = evaluate_if3_authoritative_export_gate(legacy, "VALID")

    assert gate["authoritativeOutputAllowed"] is False
    assert any(item["code"] == "RAW_ANALYSIS_RESULT_REJECTED" for item in gate["diagnostics"])


def test_build_authoritative_result_exports_from_if3_matches_transient_csv_shape() -> None:
    resource = normalized_resource()
    source_document = frame_source_document(resource)
    authoritative_exports = build_authoritative_result_exports_from_if3(
        resource,
        "VALID",
        source_document=source_document,
    )
    transient_exports = build_result_exports(
        {
            "projectId": resource["sourceDocumentId"],
            "schemaVersion": "1.0.0",
            "analysisSummary": {
                "analysisType": "linear_static",
                "status": "success",
                "startedAt": resource["generatedAt"],
                "finishedAt": resource["generatedAt"],
                "durationMs": 0,
                "nodeCount": 1,
                "memberCount": 1,
                "loadCaseCount": 1,
                "totalDof": 0,
                "freeDof": 0,
                "constrainedDof": 0,
                "solver": "scipy_sparse",
            },
            "displacements": [
                {
                    "loadCaseId": "LC1",
                    "nodeId": resource["payload"]["nodeDisplacement"]["rows"][0]["entityId"],
                    "ux": resource["payload"]["nodeDisplacement"]["rows"][0]["values"]["ux"],
                    "uy": resource["payload"]["nodeDisplacement"]["rows"][0]["values"]["uy"],
                    "uz": resource["payload"]["nodeDisplacement"]["rows"][0]["values"]["uz"],
                    "rx": 0,
                    "ry": 0,
                    "rz": 0,
                }
            ],
            "reactions": [],
            "memberEndForces": [],
            "warnings": [],
            "errors": [],
        }
    )

    assert set(authoritative_exports.keys()) == set(transient_exports.keys())
    assert "displacements.csv" in authoritative_exports
    assert authoritative_exports["displacements.csv"].startswith("case_id,node_id")
    assert '"schemaId": "spacer.contracts.frame-analysis-result-resource"' in authoritative_exports["result.json"]


def test_build_authoritative_result_exports_from_if3_fail_closed_for_stale() -> None:
    resource = normalized_resource()
    with pytest.raises(If3AuthoritativeExportBlockedError) as exc_info:
        build_authoritative_result_exports_from_if3(
            resource,
            "STALE",
            source_document=frame_source_document(resource),
        )

    assert exc_info.value.gate["authoritativeOutputAllowed"] is False


def test_if3_print_catalog_reports_missing_required_member() -> None:
    resource = normalized_resource()
    resource["resultKinds"] = ["nodeDisplacement", "supportReaction"]
    resource["payload"].pop("memberForce")

    catalog = evaluate_if3_print_catalog(resource)

    assert catalog["ready"] is False
    assert any(
        item["code"] == "PRINT_CATALOG_REQUIRED_RESULT_MISSING"
        for item in catalog["diagnostics"]
    )
    with pytest.raises(If3AuthoritativeExportBlockedError) as exc_info:
        build_authoritative_result_exports_from_if3(
            resource,
            "VALID",
            source_document=frame_source_document(resource),
        )
    assert exc_info.value.gate["authoritativeOutputAllowed"] is False


def test_if3_print_catalog_reports_unsupported_declared_kind() -> None:
    resource = normalized_resource()
    resource["resultKinds"] = [*resource["resultKinds"], "modal"]
    resource["payload"]["modal"] = {"schemaVersion": "0.1.0", "rows": []}

    catalog = evaluate_if3_print_catalog(resource)

    assert catalog["ready"] is False
    assert any(
        item["code"] == "PRINT_CATALOG_RESULT_KIND_UNSUPPORTED"
        for item in catalog["diagnostics"]
    )


def test_authoritative_export_gate_does_not_mutate_inputs() -> None:
    resource = copy.deepcopy(normalized_resource())
    source_document = frame_source_document(resource)
    resource_snapshot = copy.deepcopy(resource)
    source_snapshot = copy.deepcopy(source_document)

    evaluate_if3_authoritative_export_gate(
        resource,
        "VALID",
        source_document=source_document,
    )

    assert resource == resource_snapshot
    assert source_document == source_snapshot
    assert sha256_content_checksum(resource) == sha256_content_checksum(resource_snapshot)
