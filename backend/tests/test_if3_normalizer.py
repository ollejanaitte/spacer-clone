from __future__ import annotations

import copy
import uuid

import pytest

from backend.engine import run_analysis
from backend.engine.if3_checksum import sha256_content_checksum
from backend.engine.if3_normalizer import (
    IF3_SCHEMA_ID,
    IF3_SCHEMA_VERSION,
    build_unsupported_result_resource,
    normalize_linear_static_result_resource,
)
from backend.engine.if3_staleness import evaluate_if3_staleness

from .sample_models import cantilever_tip_load

jsonschema = pytest.importorskip(
    "jsonschema", reason="jsonschema is required for IF3 result schema tests."
)


SOURCE_DOCUMENT_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"


def explicit_metadata(project: dict) -> dict:
    return {
        "sourceDocumentId": SOURCE_DOCUMENT_ID,
        "sourceDocumentVersion": 7,
        "sourceContentChecksum": sha256_content_checksum(project),
        "analysisSettings": project["analysisSettings"],
        "loadContext": {
            "entries": [
                {
                    "kind": "loadCase",
                    "sourceId": load_case["id"],
                    "label": load_case["name"],
                    "definition": load_case,
                }
                for load_case in project["loadCases"]
            ]
        },
        "solverName": "scipy_sparse",
        "solverVersion": "0.3.0",
        "createdBy": {"actorId": "if3-test", "actorType": "tool"},
    }


def normalized_success() -> tuple[dict, dict, dict]:
    project = cantilever_tip_load()
    raw = run_analysis(copy.deepcopy(project))
    resource = normalize_linear_static_result_resource(
        raw,
        explicit_metadata(project),
        generated_at="2026-07-25T00:00:00.000Z",
    )
    return project, raw, resource


def assert_contract_valid(resource: dict) -> None:
    from backend.engine.if3_normalizer import load_if3_json_schema

    errors = sorted(
        jsonschema.Draft202012Validator(load_if3_json_schema()).iter_errors(resource),
        key=lambda error: list(error.path),
    )
    assert errors == []


def test_success_normalizes_linear_static_result_to_if3_resource() -> None:
    _, _, resource = normalized_success()

    assert resource["schemaId"] == IF3_SCHEMA_ID
    assert resource["schemaVersion"] == IF3_SCHEMA_VERSION
    assert resource["status"] == "SUCCEEDED"
    assert resource["diagnostics"] == []
    assert resource["sourceDocumentId"] == SOURCE_DOCUMENT_ID
    assert resource["sourceDocumentVersion"] == 7
    assert resource["resultKinds"] == ["nodeDisplacement", "supportReaction", "memberForce"]
    assert len(resource["payload"]["nodeDisplacement"]["rows"]) == 2
    assert len(resource["payload"]["supportReaction"]["rows"]) == 1
    assert len(resource["payload"]["memberForce"]["rows"]) == 1
    assert_contract_valid(resource)


def test_result_and_run_ids_are_backend_uuid4() -> None:
    _, _, resource = normalized_success()

    assert uuid.UUID(resource["resultId"]).version == 4
    assert uuid.UUID(resource["analysisRunId"]).version == 4


def test_load_context_and_legacy_entity_ids_are_deterministic_uuid_mapping() -> None:
    project, raw, _ = normalized_success()

    left = normalize_linear_static_result_resource(raw, explicit_metadata(project))
    right = normalize_linear_static_result_resource(raw, explicit_metadata(project))

    assert left["loadContext"] == right["loadContext"]
    assert left["payload"] == right["payload"]


def test_missing_metadata_fails_closed_but_preserves_contract_shape() -> None:
    raw = run_analysis(cantilever_tip_load())

    resource = normalize_linear_static_result_resource(raw, None)

    assert resource["status"] == "INVALID"
    assert {item["code"] for item in resource["diagnostics"]} >= {
        "MISSING_SOURCE_BINDING",
        "MISSING_ANALYSIS_SETTINGS",
        "MISSING_LOAD_CONTEXT",
    }
    assert_contract_valid(resource)


def test_malformed_checksum_fails_closed() -> None:
    project, raw, _ = normalized_success()
    metadata = explicit_metadata(project)
    metadata["sourceContentChecksum"] = {"algorithm": "sha256", "hexDigest": "ABC"}

    resource = normalize_linear_static_result_resource(raw, metadata)

    assert resource["status"] == "INVALID"
    assert any(item["path"] == "/sourceContentChecksum" for item in resource["diagnostics"])
    assert_contract_valid(resource)


def test_raw_failure_normalizes_to_failed_resource_with_solver_diagnostics() -> None:
    project = cantilever_tip_load()
    project["supports"] = []
    raw = run_analysis(copy.deepcopy(project))

    resource = normalize_linear_static_result_resource(raw, explicit_metadata(project))

    assert resource["status"] == "FAILED"
    assert resource["payload"] == {}
    assert any(item["code"] in {"MODEL_UNSTABLE", "SOLVER_ERROR"} for item in resource["diagnostics"])
    assert_contract_valid(resource)


def test_partial_raw_result_normalizes_to_partial() -> None:
    project, raw, _ = normalized_success()
    raw.pop("memberEndForces")

    resource = normalize_linear_static_result_resource(raw, explicit_metadata(project))

    assert resource["status"] == "PARTIAL"
    assert any(item["code"] == "PARTIAL_RAW_RESULT" for item in resource["diagnostics"])
    assert_contract_valid(resource)


def test_unsupported_raw_result_kind_fails_closed() -> None:
    project, raw, _ = normalized_success()
    raw["analysisSummary"]["analysisType"] = "eigen"

    resource = normalize_linear_static_result_resource(raw, explicit_metadata(project))

    assert resource["status"] == "UNSUPPORTED"
    assert any(item["code"] == "UNSUPPORTED_RESULT_KIND" for item in resource["diagnostics"])
    assert_contract_valid(resource)


def test_unsupported_raw_result_status_fails_closed_as_unsupported() -> None:
    project, raw, _ = normalized_success()
    raw["analysisSummary"]["status"] = "queued"

    resource = normalize_linear_static_result_resource(raw, explicit_metadata(project))

    assert resource["status"] == "UNSUPPORTED"
    assert any(item["code"] == "UNSUPPORTED_RAW_RESULT_STATUS" for item in resource["diagnostics"])
    assert_contract_valid(resource)


def test_unsupported_load_context_kind_fails_closed_as_unsupported() -> None:
    project, raw, _ = normalized_success()
    metadata = explicit_metadata(project)
    metadata["loadContext"]["entries"][0]["kind"] = "timeHistory"

    resource = normalize_linear_static_result_resource(raw, metadata)

    assert resource["status"] == "UNSUPPORTED"
    assert any(item["code"] == "UNSUPPORTED_LOAD_CONTEXT_KIND" for item in resource["diagnostics"])
    assert_contract_valid(resource)


def test_failed_raw_result_preserves_failed_precedence_over_unsupported_kind() -> None:
    project = cantilever_tip_load()
    project["supports"] = []
    raw = run_analysis(copy.deepcopy(project))
    raw["analysisSummary"]["analysisType"] = "eigen"

    resource = normalize_linear_static_result_resource(raw, explicit_metadata(project))

    assert resource["status"] == "FAILED"
    assert any(item["code"] == "UNSUPPORTED_RESULT_KIND" for item in resource["diagnostics"])
    assert_contract_valid(resource)


def test_non_finite_payload_value_fails_closed_without_json_non_finite_output() -> None:
    project, raw, _ = normalized_success()
    raw["displacements"][0]["uy"] = float("nan")

    resource = normalize_linear_static_result_resource(raw, explicit_metadata(project))

    assert resource["status"] == "INVALID"
    assert any(item["code"] == "INVALID_NUMERIC_RESULT" for item in resource["diagnostics"])
    assert_contract_valid(resource)


def test_diagnostics_are_deterministically_sorted() -> None:
    project, raw, _ = normalized_success()
    raw["displacements"][0]["uy"] = float("inf")
    metadata = explicit_metadata(project)
    metadata["sourceContentChecksum"] = {"algorithm": "sha256", "hexDigest": "not-valid"}
    metadata.pop("analysisSettings")

    left = normalize_linear_static_result_resource(raw, metadata)
    right = normalize_linear_static_result_resource(raw, metadata)

    comparable_left = [(item["path"], item["code"], item["message"]) for item in left["diagnostics"]]
    comparable_right = [(item["path"], item["code"], item["message"]) for item in right["diagnostics"]]
    assert comparable_left == sorted(comparable_left)
    assert comparable_left == comparable_right


def test_staleness_evaluator_is_pure_and_reports_source_and_settings_changes() -> None:
    project, _, resource = normalized_success()
    before = copy.deepcopy(resource)
    metadata = explicit_metadata(project)
    stale = evaluate_if3_staleness(
        resource,
        source_document_id=SOURCE_DOCUMENT_ID,
        source_document_version=8,
        source_content_checksum=sha256_content_checksum({"changed": True}),
        analysis_settings_checksum=sha256_content_checksum({"changed": "settings"}),
        load_context=resource["loadContext"],
    )

    assert resource == before
    assert stale["status"] == "STALE"
    assert {item["code"] for item in stale["diagnostics"]} >= {
        "STALE_RESULT",
        "SOURCE_CHECKSUM_MISMATCH",
    }
    fresh = evaluate_if3_staleness(
        resource,
        source_document_id=metadata["sourceDocumentId"],
        source_document_version=metadata["sourceDocumentVersion"],
        source_content_checksum=metadata["sourceContentChecksum"],
        analysis_settings_checksum=resource["analysisSettingsChecksum"],
        load_context=resource["loadContext"],
    )
    assert fresh == {"status": "VALID", "diagnostics": []}


def test_normalizer_does_not_mutate_raw_result_or_metadata() -> None:
    project, raw, _ = normalized_success()
    metadata = explicit_metadata(project)
    raw_before = copy.deepcopy(raw)
    metadata_before = copy.deepcopy(metadata)

    normalize_linear_static_result_resource(raw, metadata)

    assert raw == raw_before
    assert metadata == metadata_before


def test_unsupported_result_resource_passes_json_schema() -> None:
    project = cantilever_tip_load()
    raw = run_analysis(copy.deepcopy(project))
    raw["analysisSummary"]["analysisType"] = "eigen"

    resource = build_unsupported_result_resource(
        raw,
        explicit_metadata(project),
        result_kind="eigen",
        generated_at="2026-07-25T00:00:00.000Z",
    )

    assert resource["status"] == "UNSUPPORTED"
    assert resource["payload"] == {}
    assert any(item["code"] == "UNSUPPORTED_RESULT_KIND" for item in resource["diagnostics"])
    assert_contract_valid(resource)


def test_unsupported_result_resource_fails_closed_without_source_metadata() -> None:
    project = cantilever_tip_load()
    raw = run_analysis(copy.deepcopy(project))
    raw["analysisSummary"]["analysisType"] = "response_spectrum"

    resource = build_unsupported_result_resource(raw, None, result_kind="responseSpectrum")

    assert resource["status"] == "INVALID"
    assert resource["payload"] == {}
    assert any(item["code"] == "MISSING_SOURCE_BINDING" for item in resource["diagnostics"])
    assert not any(item["code"] == "UNSUPPORTED_RESULT_KIND" for item in resource["diagnostics"])
    assert_contract_valid(resource)


def test_staleness_rejects_non_dict_resource() -> None:
    stale = evaluate_if3_staleness(
        "not-a-resource",
        source_document_id=SOURCE_DOCUMENT_ID,
        source_document_version=7,
        source_content_checksum=sha256_content_checksum({"x": 1}),
        analysis_settings_checksum=sha256_content_checksum({"y": 1}),
        load_context={"entries": []},
    )

    assert stale["status"] == "INVALID"
    assert any(item["code"] == "FRAME_RESULT_RESOURCE_INVALID" for item in stale["diagnostics"])


def test_staleness_reports_missing_envelope_fields() -> None:
    stale = evaluate_if3_staleness(
        {"schemaVersion": "0.1.0"},
        source_document_id=SOURCE_DOCUMENT_ID,
        source_document_version=7,
        source_content_checksum=sha256_content_checksum({"x": 1}),
        analysis_settings_checksum=sha256_content_checksum({"y": 1}),
        load_context={"entries": []},
    )

    assert stale["status"] == "INVALID"
    assert any(item["code"] == "RESULT_CHECKSUM_MISSING" for item in stale["diagnostics"])
    assert any(item["code"] == "FRAME_RESULT_UUID_INVALID" for item in stale["diagnostics"])


def test_staleness_reports_result_checksum_mismatch() -> None:
    _, _, resource = normalized_success()
    resource = copy.deepcopy(resource)
    resource["resultChecksum"] = sha256_content_checksum({"tampered": True})

    stale = evaluate_if3_staleness(
        resource,
        source_document_id=SOURCE_DOCUMENT_ID,
        source_document_version=resource["sourceDocumentVersion"],
        source_content_checksum=resource["sourceContentChecksum"],
        analysis_settings_checksum=resource["analysisSettingsChecksum"],
        load_context=resource["loadContext"],
    )

    assert stale["status"] == "INVALID"
    assert any(item["code"] == "RESULT_CHECKSUM_MISMATCH" for item in stale["diagnostics"])


def test_staleness_reports_unsupported_schema_version() -> None:
    _, _, resource = normalized_success()
    resource = copy.deepcopy(resource)
    resource["schemaVersion"] = "9.9.9"

    stale = evaluate_if3_staleness(
        resource,
        source_document_id=SOURCE_DOCUMENT_ID,
        source_document_version=resource["sourceDocumentVersion"],
        source_content_checksum=resource["sourceContentChecksum"],
        analysis_settings_checksum=resource["analysisSettingsChecksum"],
        load_context=resource["loadContext"],
    )

    assert stale["status"] == "UNSUPPORTED"
    assert any(item["code"] == "UNSUPPORTED_RESULT_VERSION" for item in stale["diagnostics"])


def test_staleness_reports_unsupported_solver_version() -> None:
    _, _, resource = normalized_success()
    resource = copy.deepcopy(resource)
    resource["solverVersion"] = "99.0.0"

    stale = evaluate_if3_staleness(
        resource,
        source_document_id=SOURCE_DOCUMENT_ID,
        source_document_version=resource["sourceDocumentVersion"],
        source_content_checksum=resource["sourceContentChecksum"],
        analysis_settings_checksum=resource["analysisSettingsChecksum"],
        load_context=resource["loadContext"],
    )

    assert stale["status"] == "UNSUPPORTED"
    assert any(
        item["code"] == "UNSUPPORTED_RESULT_VERSION" and item["path"] == "/solverVersion"
        for item in stale["diagnostics"]
    )


def test_staleness_handles_malformed_checksums_without_raising() -> None:
    _, _, resource = normalized_success()
    resource = copy.deepcopy(resource)
    resource["sourceContentChecksum"] = {"algorithm": "sha256", "hexDigest": "not-valid"}
    resource["analysisSettingsChecksum"] = "bad"

    stale = evaluate_if3_staleness(
        resource,
        source_document_id=SOURCE_DOCUMENT_ID,
        source_document_version=resource["sourceDocumentVersion"],
        source_content_checksum={"algorithm": "sha256", "hexDigest": "also-bad"},
        analysis_settings_checksum={"algorithm": "sha256", "hexDigest": "still-bad"},
        load_context=resource["loadContext"],
    )

    assert stale["status"] == "INVALID"
    assert any(item["code"] == "CONTENT_CHECKSUM_INVALID" for item in stale["diagnostics"])
    assert any(item["code"] == "CURRENT_SOURCE_BINDING_INVALID" for item in stale["diagnostics"])


def test_staleness_diagnostics_are_deduped_and_deterministically_ordered() -> None:
    _, _, resource = normalized_success()

    stale = evaluate_if3_staleness(
        resource,
        source_document_id=SOURCE_DOCUMENT_ID,
        source_document_version=8,
        source_content_checksum=sha256_content_checksum({"changed": True}),
        analysis_settings_checksum=sha256_content_checksum({"changed": "settings"}),
        load_context=resource["loadContext"],
    )
    duplicate = evaluate_if3_staleness(
        resource,
        source_document_id=SOURCE_DOCUMENT_ID,
        source_document_version=8,
        source_content_checksum=sha256_content_checksum({"changed": True}),
        analysis_settings_checksum=sha256_content_checksum({"changed": "settings"}),
        load_context=resource["loadContext"],
    )

    comparable = [(item["path"], item["code"], item["message"]) for item in stale["diagnostics"]]
    assert comparable == sorted(comparable)
    assert stale == duplicate
    assert len(stale["diagnostics"]) == len({(item["path"], item["code"], item["message"]) for item in stale["diagnostics"]})


def test_staleness_evaluator_does_not_mutate_resource_input() -> None:
    _, _, resource = normalized_success()
    before = copy.deepcopy(resource)

    evaluate_if3_staleness(
        resource,
        source_document_id=SOURCE_DOCUMENT_ID,
        source_document_version=resource["sourceDocumentVersion"],
        source_content_checksum=resource["sourceContentChecksum"],
        analysis_settings_checksum=resource["analysisSettingsChecksum"],
        load_context=resource["loadContext"],
    )

    assert resource == before
