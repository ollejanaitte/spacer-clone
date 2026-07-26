from __future__ import annotations

import copy
import uuid
from pathlib import Path
from typing import Any

import pytest

from backend.app.atomic_json import AtomicJsonStore
from backend.app.contract_document_store import (
    TARGET_FRAME_SCHEMA_ID,
    TARGET_SCHEMA_VERSION,
    ContractDocumentStore,
)
from backend.engine.if3_availability import (
    If3AvailabilityStatus,
    build_if3_availability_catalog,
    pick_if3_availability_status,
    validate_persisted_result_reference_shape,
)
from backend.engine.if3_checksum import sha256_content_checksum
from backend.engine.if3_persistence import (
    build_persisted_result_document_reference,
    save_if3_result_resource,
)

from .sample_models import cantilever_tip_load
from .test_if3_persistence import SOURCE_DOCUMENT_ID, normalized_resource


def frame_document_path(tmp_path: Path) -> Path:
    return tmp_path / "documents" / "frame.json"


def minimal_frame_document(**overrides: Any) -> dict[str, Any]:
    project = cantilever_tip_load()
    load_definitions = [
        {
            "id": load_case["id"],
            "sourceId": load_case["id"],
            "label": load_case["name"],
            "definition": load_case,
        }
        for load_case in project.get("loadCases", [])
    ]
    document: dict[str, Any] = {
        "schemaId": TARGET_FRAME_SCHEMA_ID,
        "schemaVersion": TARGET_SCHEMA_VERSION,
        "documentKind": "bridge-frame-analysis",
        "documentId": SOURCE_DOCUMENT_ID,
        "revisionId": 7,
        "contentChecksum": sha256_content_checksum({"binding": "current"}),
        "analysisSettings": project["analysisSettings"],
        "loadDefinitions": load_definitions,
    }
    document.update(overrides)
    return document


def persist_resource(
    tmp_path: Path,
    resource: dict[str, Any],
    *,
    frame_document: dict[str, Any] | None = None,
) -> tuple[ContractDocumentStore, Path, dict[str, Any], dict[str, Any]]:
    store = ContractDocumentStore()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    frame_doc = frame_document or minimal_frame_document()
    saved = store.save_frame_document(frame_path, frame_doc, create_only=True)
    reference = store.persist_if3_result_with_ref(
        frame_path,
        resource,
        frame_doc,
        expected_frame_checksum=saved.checksum,
    )
    return store, frame_path, store.read_document(frame_path), reference


def test_availability_catalog_empty_when_refs_absent(tmp_path: Path) -> None:
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    frame_document = minimal_frame_document()

    catalog = build_if3_availability_catalog(frame_document, frame_path)

    assert catalog == []


def test_availability_catalog_treats_missing_refs_field_as_empty(tmp_path: Path) -> None:
    frame_document = minimal_frame_document()
    frame_document.pop("persistedResultRefs", None)
    frame_path = frame_document_path(tmp_path)

    catalog = build_if3_availability_catalog(frame_document, frame_path)

    assert catalog == []


def aligned_resource(*, status: str | None = None) -> tuple[dict[str, Any], dict[str, Any]]:
    frame_document = minimal_frame_document()
    resource = copy.deepcopy(normalized_resource())
    resource["sourceDocumentId"] = frame_document["documentId"]
    resource["sourceDocumentVersion"] = frame_document["revisionId"]
    resource["sourceContentChecksum"] = frame_document["contentChecksum"]
    resource["analysisSettingsChecksum"] = sha256_content_checksum(frame_document["analysisSettings"])
    if status is not None:
        resource["status"] = status
    checksum_target = copy.deepcopy(resource)
    checksum_target.pop("resultChecksum", None)
    resource["resultChecksum"] = sha256_content_checksum(checksum_target)
    return resource, frame_document


def test_availability_catalog_reports_valid_resource(tmp_path: Path) -> None:
    resource, frame_document = aligned_resource()

    _, frame_path, frame_document, reference = persist_resource(
        tmp_path,
        resource,
        frame_document=frame_document,
    )

    catalog = build_if3_availability_catalog(frame_document, frame_path)

    assert [item["resultId"] for item in catalog] == sorted(item["resultId"] for item in catalog)
    assert catalog[0]["status"] == If3AvailabilityStatus.VALID.value
    assert catalog[0]["reference"] == reference
    assert catalog[0]["diagnostics"] == []


def test_availability_catalog_reports_missing_sidecar(tmp_path: Path) -> None:
    resource = normalized_resource()
    reference = build_persisted_result_document_reference(resource, frame_document_path(tmp_path))
    frame_document = minimal_frame_document(persistedResultRefs=[reference])
    frame_path = frame_document_path(tmp_path)

    catalog = build_if3_availability_catalog(frame_document, frame_path)

    assert catalog[0]["status"] == If3AvailabilityStatus.MISSING.value
    assert any(item["code"] == "PERSISTED_RESULT_SIDECAR_MISSING" for item in catalog[0]["diagnostics"])


def test_availability_catalog_reports_invalid_reference_shape(tmp_path: Path) -> None:
    frame_document = minimal_frame_document(
        persistedResultRefs=[
            {
                "documentKind": "persisted-result",
                "documentId": "not-a-uuid",
                "revisionId": 1,
                "contentChecksum": {"algorithm": "sha256", "hexDigest": "0" * 64},
                "uri": "results/not-a-uuid.if3.json",
            }
        ]
    )

    catalog = build_if3_availability_catalog(frame_document, frame_document_path(tmp_path))

    assert catalog[0]["status"] == If3AvailabilityStatus.INVALID.value
    assert validate_persisted_result_reference_shape(frame_document["persistedResultRefs"][0])


def test_availability_catalog_reports_unsupported_reference_kind(tmp_path: Path) -> None:
    result_id = str(uuid.uuid4())
    frame_document = minimal_frame_document(
        persistedResultRefs=[
            {
                "documentKind": "bridge-frame-analysis",
                "documentId": result_id,
                "revisionId": 1,
                "contentChecksum": sha256_content_checksum({"value": 1}),
                "uri": f"results/{result_id}.if3.json",
            }
        ]
    )

    catalog = build_if3_availability_catalog(frame_document, frame_document_path(tmp_path))

    assert catalog[0]["status"] == If3AvailabilityStatus.UNSUPPORTED.value


def test_availability_catalog_reports_stale_resource(tmp_path: Path) -> None:
    resource = normalized_resource()
    resource = copy.deepcopy(resource)
    resource["sourceDocumentVersion"] = 6
    checksum_target = copy.deepcopy(resource)
    checksum_target.pop("resultChecksum", None)
    resource["resultChecksum"] = sha256_content_checksum(checksum_target)

    _, frame_path, frame_document, _ = persist_resource(tmp_path, resource)

    catalog = build_if3_availability_catalog(frame_document, frame_path)

    assert catalog[0]["status"] == If3AvailabilityStatus.STALE.value


def test_availability_catalog_reports_failed_resource_status(tmp_path: Path) -> None:
    resource, frame_document = aligned_resource(status="FAILED")

    _, frame_path, frame_document, _ = persist_resource(
        tmp_path,
        resource,
        frame_document=frame_document,
    )

    catalog = build_if3_availability_catalog(frame_document, frame_path)

    assert catalog[0]["status"] == If3AvailabilityStatus.FAILED.value


def test_availability_catalog_reports_partial_resource_status(tmp_path: Path) -> None:
    resource, frame_document = aligned_resource(status="PARTIAL")

    _, frame_path, frame_document, _ = persist_resource(
        tmp_path,
        resource,
        frame_document=frame_document,
    )

    catalog = build_if3_availability_catalog(frame_document, frame_path)

    assert catalog[0]["status"] == If3AvailabilityStatus.PARTIAL.value


def test_availability_status_precedence_missing_over_stale() -> None:
    assert (
        pick_if3_availability_status(
            If3AvailabilityStatus.STALE.value,
            If3AvailabilityStatus.MISSING.value,
        )
        == If3AvailabilityStatus.MISSING.value
    )


def test_availability_status_precedence_failed_over_stale() -> None:
    assert (
        pick_if3_availability_status(
            If3AvailabilityStatus.STALE.value,
            If3AvailabilityStatus.FAILED.value,
        )
        == If3AvailabilityStatus.FAILED.value
    )


def test_availability_status_precedence_partial_over_valid() -> None:
    assert (
        pick_if3_availability_status(
            If3AvailabilityStatus.VALID.value,
            If3AvailabilityStatus.PARTIAL.value,
        )
        == If3AvailabilityStatus.PARTIAL.value
    )


def test_availability_catalog_order_is_deterministic_by_result_id(tmp_path: Path) -> None:
    first = normalized_resource(result_id="6ba7b810-9dad-11d1-80b4-00c04fd430c8")
    second = normalized_resource(result_id="7c9e6679-7425-40de-944b-e07fc1f90ae7")
    store = ContractDocumentStore()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    frame_document = minimal_frame_document()
    saved = store.save_frame_document(frame_path, frame_document, create_only=True)
    checksum = saved.checksum

    for resource in (second, first):
        aligned, frame_document = aligned_resource()
        aligned["resultId"] = resource["resultId"]
        aligned["analysisRunId"] = resource["analysisRunId"]
        checksum_target = copy.deepcopy(aligned)
        checksum_target.pop("resultChecksum", None)
        aligned["resultChecksum"] = sha256_content_checksum(checksum_target)
        frame_document = store.read_document(frame_path)
        checksum = store.checksum_for(frame_path)
        store.persist_if3_result_with_ref(
            frame_path,
            aligned,
            frame_document,
            expected_frame_checksum=checksum,
        )

    frame_document = store.read_document(frame_path)
    catalog = build_if3_availability_catalog(frame_document, frame_path)

    assert [item["resultId"] for item in catalog] == [
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    ]


def test_availability_catalog_does_not_mutate_frame_document(tmp_path: Path) -> None:
    resource = normalized_resource()
    _, frame_path, frame_document, _ = persist_resource(tmp_path, resource)
    before = copy.deepcopy(frame_document)

    build_if3_availability_catalog(frame_document, frame_path)

    assert frame_document == before


def test_orphan_sidecars_are_not_listed(tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    save_if3_result_resource(AtomicJsonStore(), frame_path, resource)
    frame_document = minimal_frame_document()

    catalog = build_if3_availability_catalog(frame_document, frame_path)

    assert catalog == []
