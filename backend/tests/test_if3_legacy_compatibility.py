from __future__ import annotations

from backend.engine.if3_legacy_compatibility import (
    OLD_ANALYSIS_RESULT_POLICY,
    classify_if3_compatibility,
    evaluate_write_target_eligibility,
)

SOURCE_DOCUMENT_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
RESULT_ID = "550e8400-e29b-41d4-a716-446655440000"
RUN_ID = "550e8400-e29b-41d4-a716-446655440001"
LOAD_CONTEXT_ID = "550e8400-e29b-41d4-a716-446655440003"


def checksum(hex_digest: str = "a" * 64) -> dict:
    return {"algorithm": "sha256", "hexDigest": hex_digest}


def valid_resource() -> dict:
    return {
        "schemaId": "spacer.contracts.frame-analysis-result-resource",
        "schemaVersion": "0.1.0",
        "resultId": RESULT_ID,
        "analysisRunId": RUN_ID,
        "sourceDocumentId": SOURCE_DOCUMENT_ID,
        "sourceDocumentVersion": 3,
        "sourceContentChecksum": checksum(),
        "status": "SUCCEEDED",
        "generatedAt": "2026-07-25T10:00:00.000Z",
        "solverName": "scipy_sparse",
        "solverVersion": "0.1.0",
        "analysisSettingsChecksum": checksum("b" * 64),
        "loadContext": {
            "entries": [
                {
                    "kind": "loadCase",
                    "id": LOAD_CONTEXT_ID,
                    "label": "LC1",
                    "checksum": checksum("c" * 64),
                }
            ],
            "requestChecksum": checksum("d" * 64),
        },
        "provenance": {
            "createdAt": "2026-07-25T10:00:00.000Z",
            "createdBy": {"actorId": "user-1", "actorType": "user"},
            "producer": {"toolId": "spacer-backend", "toolVersion": "0.1.0"},
        },
        "diagnostics": [],
        "resultKinds": ["nodeDisplacement", "supportReaction", "memberForce"],
        "payload": {
            "nodeDisplacement": {"schemaVersion": "0.1.0", "rows": []},
            "supportReaction": {"schemaVersion": "0.1.0", "rows": []},
            "memberForce": {"schemaVersion": "0.1.0", "rows": []},
        },
        "resultChecksum": checksum("e" * 64),
    }


def complete_write_target_metadata() -> dict:
    return {
        "sourceDocumentId": SOURCE_DOCUMENT_ID,
        "sourceDocumentVersion": 3,
        "sourceContentChecksumHex": "a" * 64,
        "analysisSettingsChecksumHex": "b" * 64,
        "provenanceCreatedAt": "2026-07-25T10:00:00.000Z",
        "provenanceActorId": "user-1",
        "provenanceProducerToolId": "spacer-backend",
        "provenanceProducerToolVersion": "0.1.0",
        "solverName": "scipy_sparse",
        "solverVersion": "0.1.0",
    }


def legacy_raw_result() -> dict:
    return {
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


def test_current_if3_resource_remains_authoritative() -> None:
    assessment = classify_if3_compatibility(
        resource=valid_resource(),
        availability_status="VALID",
    )

    assert assessment["policy"] == OLD_ANALYSIS_RESULT_POLICY
    assert assessment["compatibilityClass"] == "IF3_COMPATIBLE_CURRENT"
    assert assessment["gate"]["authoritativeOutputAllowed"] is True
    assert assessment["consumerCapabilities"]["csv"]["exportable"] is True
    assert assessment["writeTarget"]["eligible"] is False


def test_stale_resource_blocks_authoritative_export() -> None:
    resource = valid_resource()
    resource["status"] = "STALE"
    assessment = classify_if3_compatibility(resource=resource, availability_status="STALE")

    assert assessment["compatibilityClass"] == "STALE"
    assert assessment["gate"]["authoritativeOutputAllowed"] is False
    assert assessment["consumerCapabilities"]["viewer"]["displayable"] is True
    assert assessment["consumerCapabilities"]["print"]["formalPrintable"] is False


def test_legacy_raw_without_metadata_is_quarantined() -> None:
    assessment = classify_if3_compatibility(raw_result=legacy_raw_result())

    assert assessment["compatibilityClass"] == "LEGACY_INSUFFICIENT_PROVENANCE"
    assert assessment["gate"]["authoritativeOutputAllowed"] is False
    assert assessment["writeTarget"]["eligible"] is False
    assert any(item["code"] == "MISSING_PROVENANCE" for item in assessment["diagnostics"])
    assert "provenanceCreatedAt" in evaluate_write_target_eligibility({}).get("missingFields", [])


def test_write_target_requires_explicit_metadata_and_never_invents_provenance() -> None:
    incomplete = evaluate_write_target_eligibility({"solverName": "scipy_sparse"})
    assert incomplete["eligible"] is False
    assert "Provenance is not invented" in incomplete["diagnostics"][0]["message"]

    complete = evaluate_write_target_eligibility(complete_write_target_metadata())
    assert complete["eligible"] is True

    assessment = classify_if3_compatibility(
        raw_result=legacy_raw_result(),
        write_target_metadata=complete_write_target_metadata(),
    )
    assert assessment["compatibilityClass"] == "LEGACY_SAFELY_CONSUMABLE"
    assert assessment["gate"]["authoritativeOutputAllowed"] is False
    assert assessment["writeTarget"]["eligible"] is True


def test_legacy_time_history_is_non_authoritative() -> None:
    assessment = classify_if3_compatibility(
        legacy_time_history={
            "meta": {
                "analysisId": "th-legacy",
                "status": "success",
                "method": "newmark_beta",
                "timeStep": 0.01,
                "duration": 1,
                "sampleCount": 2,
            },
            "time": [0, 0.01],
            "displacements": {},
            "velocities": {},
            "accelerations": {},
        }
    )

    assert assessment["compatibilityClass"] == "LEGACY_INSUFFICIENT_PROVENANCE"
    assert assessment["gate"]["authoritativeOutputAllowed"] is False
    assert any(item["code"] == "LEGACY_TIME_HISTORY_COMPATIBILITY" for item in assessment["diagnostics"])


def test_missing_required_members_are_blocked() -> None:
    resource = valid_resource()
    resource["resultKinds"] = ["nodeDisplacement"]
    resource["payload"] = {"nodeDisplacement": resource["payload"]["nodeDisplacement"]}
    assessment = classify_if3_compatibility(resource=resource, availability_status="VALID")

    assert assessment["compatibilityClass"] == "MISSING_REQUIRED_MEMBERS"
    assert assessment["gate"]["authoritativeOutputAllowed"] is False
