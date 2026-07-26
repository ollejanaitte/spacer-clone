from __future__ import annotations

import copy
import uuid
from pathlib import Path
from typing import Any

import pytest

from backend.app.atomic_json import AtomicJsonStore, JsonStoreConflictError
from backend.app.contract_document_store import (
    TARGET_FRAME_SCHEMA_ID,
    TARGET_SCHEMA_VERSION,
    ContractDocumentStore,
)
from backend.engine import run_analysis
from backend.engine.if3_checksum import sha256_content_checksum
from backend.engine.if3_normalizer import normalize_linear_static_result_resource
from backend.engine.if3_persistence import (
    If3PersistenceChecksumMissingError,
    If3PersistenceDuplicateError,
    If3PersistenceDuplicateRefError,
    If3PersistenceFrameConflictError,
    build_if3_result_sidecar_path,
    build_persisted_result_document_reference,
    load_if3_result_resource,
    persist_if3_result_with_ref,
    save_if3_result_resource,
    validate_no_duplicate_ref,
)

from .sample_models import cantilever_tip_load
from .test_if3_persistence import SOURCE_DOCUMENT_ID, explicit_metadata, normalized_resource

jsonschema = pytest.importorskip(
    "jsonschema", reason="jsonschema is required for IF3 persistence tests."
)


def frame_document_path(tmp_path: Path) -> Path:
    return tmp_path / "documents" / "frame.json"


def minimal_frame_document(**overrides: Any) -> dict[str, Any]:
    document: dict[str, Any] = {
        "schemaId": TARGET_FRAME_SCHEMA_ID,
        "schemaVersion": TARGET_SCHEMA_VERSION,
        "documentKind": "bridge-frame-analysis",
        "documentId": SOURCE_DOCUMENT_ID,
        "revisionId": 7,
    }
    document.update(overrides)
    return document


def test_build_persisted_result_document_reference_fields(tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)

    reference = build_persisted_result_document_reference(resource, frame_path)

    assert reference == {
        "documentKind": "persisted-result",
        "documentId": resource["resultId"],
        "revisionId": 1,
        "contentChecksum": resource["resultChecksum"],
        "uri": f"results/{resource['resultId']}.if3.json",
    }


def test_validate_no_duplicate_ref_rejects_duplicate_document_id() -> None:
    result_id = str(uuid.uuid4())
    existing = [
        {
            "documentKind": "persisted-result",
            "documentId": result_id,
            "revisionId": 1,
            "contentChecksum": sha256_content_checksum({"value": 1}),
            "uri": f"results/{result_id}.if3.json",
        }
    ]
    new_ref = copy.deepcopy(existing[0])

    with pytest.raises(If3PersistenceDuplicateRefError):
        validate_no_duplicate_ref(existing, new_ref)


def test_validate_no_duplicate_ref_rejects_duplicate_uri() -> None:
    first_id = str(uuid.uuid4())
    second_id = str(uuid.uuid4())
    uri = f"results/{first_id}.if3.json"
    existing = [
        {
            "documentKind": "persisted-result",
            "documentId": first_id,
            "revisionId": 1,
            "contentChecksum": sha256_content_checksum({"value": 1}),
            "uri": uri,
        }
    ]
    new_ref = {
        "documentKind": "persisted-result",
        "documentId": second_id,
        "revisionId": 1,
        "contentChecksum": sha256_content_checksum({"value": 2}),
        "uri": uri,
    }

    with pytest.raises(If3PersistenceDuplicateRefError):
        validate_no_duplicate_ref(existing, new_ref)


def test_persist_if3_result_with_ref_success(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    frame_document = minimal_frame_document()
    saved_frame = store.save_frame_document(frame_path, frame_document, create_only=True)
    resource = normalized_resource()

    reference = persist_if3_result_with_ref(
        store,
        frame_path,
        resource,
        frame_document,
        expected_frame_checksum=saved_frame.checksum,
    )

    assert reference["documentId"] == resource["resultId"]
    loaded_frame = store.read_document(frame_path)
    assert loaded_frame["persistedResultRefs"] == [reference]
    assert load_if3_result_resource(frame_path, resource["resultId"]) == resource


def test_persist_if3_result_with_ref_cas_conflict_leaves_orphan_sidecar(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    frame_document = minimal_frame_document()
    saved_frame = store.save_frame_document(frame_path, frame_document, create_only=True)
    resource = normalized_resource()

    with pytest.raises(If3PersistenceFrameConflictError):
        persist_if3_result_with_ref(
            store,
            frame_path,
            resource,
            frame_document,
            expected_frame_checksum="0" * 64,
        )

    sidecar_path = build_if3_result_sidecar_path(frame_path, resource["resultId"])
    assert sidecar_path.exists()
    loaded_frame = store.read_document(frame_path)
    assert loaded_frame.get("persistedResultRefs") is None


def test_persist_if3_result_with_ref_does_not_mutate_inputs(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    frame_document = minimal_frame_document()
    saved_frame = store.save_frame_document(frame_path, frame_document, create_only=True)
    resource = normalized_resource()
    resource_before = copy.deepcopy(resource)
    frame_before = copy.deepcopy(frame_document)

    persist_if3_result_with_ref(
        store,
        frame_path,
        resource,
        frame_document,
        expected_frame_checksum=saved_frame.checksum,
    )

    assert resource == resource_before
    assert frame_document == frame_before


def test_persist_if3_result_with_ref_no_sidecar_or_ref_on_sidecar_step_failure(
    tmp_path: Path,
) -> None:
    store = ContractDocumentStore()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    frame_document = minimal_frame_document()
    saved_frame = store.save_frame_document(frame_path, frame_document, create_only=True)
    resource = normalized_resource()
    resource = copy.deepcopy(resource)
    resource.pop("resultChecksum")

    with pytest.raises(If3PersistenceChecksumMissingError):
        persist_if3_result_with_ref(
            store,
            frame_path,
            resource,
            frame_document,
            expected_frame_checksum=saved_frame.checksum,
        )

    sidecar_path = build_if3_result_sidecar_path(frame_path, resource["resultId"])
    assert not sidecar_path.exists()
    loaded_frame = store.read_document(frame_path)
    assert loaded_frame.get("persistedResultRefs") is None


def test_persist_if3_result_with_ref_treats_absent_refs_as_empty(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    frame_document = minimal_frame_document()
    saved_frame = store.save_frame_document(frame_path, frame_document, create_only=True)
    resource = normalized_resource()

    reference = persist_if3_result_with_ref(
        store,
        frame_path,
        resource,
        frame_document,
        expected_frame_checksum=saved_frame.checksum,
    )

    loaded_frame = store.read_document(frame_path)
    assert loaded_frame["persistedResultRefs"] == [reference]


def test_persist_if3_result_with_ref_rejects_duplicate_sidecar_before_frame_write(
    tmp_path: Path,
) -> None:
    store = ContractDocumentStore()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    frame_document = minimal_frame_document()
    saved_frame = store.save_frame_document(frame_path, frame_document, create_only=True)
    resource = normalized_resource()
    save_if3_result_resource(AtomicJsonStore(), frame_path, resource)

    with pytest.raises(If3PersistenceDuplicateError):
        persist_if3_result_with_ref(
            store,
            frame_path,
            resource,
            frame_document,
            expected_frame_checksum=saved_frame.checksum,
        )

    loaded_frame = store.read_document(frame_path)
    assert loaded_frame.get("persistedResultRefs") is None


def test_persist_if3_result_with_ref_rejects_duplicate_reference(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    first_resource = normalized_resource()
    frame_document = minimal_frame_document()
    saved_frame = store.save_frame_document(frame_path, frame_document, create_only=True)

    first_ref = persist_if3_result_with_ref(
        store,
        frame_path,
        first_resource,
        frame_document,
        expected_frame_checksum=saved_frame.checksum,
    )
    updated_frame = store.read_document(frame_path)

    with pytest.raises(If3PersistenceDuplicateRefError):
        validate_no_duplicate_ref(updated_frame["persistedResultRefs"], first_ref)


def test_persist_if3_result_with_ref_rejects_duplicate_reference_without_writing_sidecar(
    tmp_path: Path,
) -> None:
    store = ContractDocumentStore()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    resource = normalized_resource()
    reference = build_persisted_result_document_reference(resource, frame_path)
    frame_document = minimal_frame_document(persistedResultRefs=[reference])
    saved_frame = store.save_frame_document(frame_path, frame_document, create_only=True)
    sidecar_path = build_if3_result_sidecar_path(frame_path, resource["resultId"])
    assert not sidecar_path.exists()

    with pytest.raises(If3PersistenceDuplicateRefError):
        persist_if3_result_with_ref(
            store,
            frame_path,
            resource,
            frame_document,
            expected_frame_checksum=saved_frame.checksum,
        )

    assert not sidecar_path.exists()
    loaded_frame = store.read_document(frame_path)
    assert loaded_frame["persistedResultRefs"] == [reference]
