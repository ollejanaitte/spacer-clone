from __future__ import annotations

import copy
import os
import uuid
from pathlib import Path
from typing import Any

import pytest

from backend.app.atomic_json import (
    AtomicJsonStore,
    IoHooks,
    JsonStoreIoError,
    default_io_hooks,
    serialize_json,
)
from backend.app.contract_document_store import (
    TARGET_FRAME_SCHEMA_ID,
    TARGET_ROAD_SCHEMA_ID,
    TARGET_SCHEMA_VERSION,
    ContractDocumentStore,
    LegacyWriteForbiddenError,
    TargetValidationError,
)
from backend.engine import run_analysis
from backend.engine.if3_checksum import sha256_content_checksum
from backend.engine.if3_normalizer import normalize_linear_static_result_resource
from backend.engine.if3_persistence import (
    If3PersistenceChecksumMalformedError,
    If3PersistenceChecksumMismatchError,
    If3PersistenceChecksumMissingError,
    If3PersistenceDuplicateError,
    If3PersistenceMalformedIdError,
    If3PersistenceMalformedJsonError,
    If3PersistenceReadError,
    If3PersistenceSchemaError,
    If3PersistenceStorageError,
    If3PersistenceUnsupportedSchemaVersionError,
    build_if3_result_sidecar_path,
    load_if3_result_resource,
    save_if3_result_resource,
    validate_if3_result_id,
)

from .sample_models import cantilever_tip_load

jsonschema = pytest.importorskip(
    "jsonschema", reason="jsonschema is required for IF3 persistence tests."
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


def normalized_resource(*, result_id: str | None = None) -> dict[str, Any]:
    project = cantilever_tip_load()
    raw = run_analysis(copy.deepcopy(project))
    kwargs: dict[str, Any] = {
        "generated_at": "2026-07-25T00:00:00.000Z",
    }
    if result_id is not None:
        kwargs["result_id"] = result_id
    return normalize_linear_static_result_resource(
        raw,
        explicit_metadata(project),
        **kwargs,
    )


def frame_document_path(tmp_path: Path) -> Path:
    return tmp_path / "documents" / "frame.json"


@pytest.fixture
def store() -> AtomicJsonStore:
    return AtomicJsonStore()


def test_save_valid_resource_writes_exact_sidecar_path(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)

    result = save_if3_result_resource(store, frame_path, resource)

    expected_path = frame_path.parent / "results" / f"{resource['resultId']}.if3.json"
    assert result.path == expected_path
    assert expected_path.exists()
    assert expected_path.parent.name == "results"


def test_save_creates_results_directory(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    assert not frame_path.parent.exists()

    save_if3_result_resource(store, frame_path, resource)

    assert (frame_path.parent / "results").is_dir()


def test_save_uses_deterministic_serialization(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)

    first = save_if3_result_resource(store, frame_path, resource)
    on_disk = first.path.read_bytes()

    assert on_disk == serialize_json(resource)


def test_save_does_not_mutate_caller_input(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    before = copy.deepcopy(resource)
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)

    save_if3_result_resource(store, frame_path, resource)

    assert resource == before


def test_save_rejects_duplicate_without_overwrite(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    save_if3_result_resource(store, frame_path, resource)

    with pytest.raises(If3PersistenceDuplicateError) as exc_info:
        save_if3_result_resource(store, frame_path, resource)

    assert exc_info.value.code == "DUPLICATE_RESULT"
    loaded = load_if3_result_resource(frame_path, resource["resultId"])
    assert loaded == resource


@pytest.mark.parametrize(
    "result_id",
    [
        "../escape",
        "../../outside",
        "/etc/passwd",
        "not-a-uuid",
        "",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8/extra",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8\\extra",
    ],
)
def test_malformed_result_id_rejected(result_id: str, tmp_path: Path) -> None:
    frame_path = frame_document_path(tmp_path)

    with pytest.raises(If3PersistenceMalformedIdError):
        validate_if3_result_id(result_id)

    with pytest.raises(If3PersistenceMalformedIdError):
        build_if3_result_sidecar_path(frame_path, result_id)

    with pytest.raises(If3PersistenceMalformedIdError):
        load_if3_result_resource(frame_path, result_id)


def test_invalid_schema_resource_rejected_on_save(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    resource = copy.deepcopy(resource)
    resource.pop("provenance")
    checksum_target = copy.deepcopy(resource)
    checksum_target.pop("resultChecksum", None)
    resource["resultChecksum"] = sha256_content_checksum(checksum_target)
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)

    with pytest.raises(If3PersistenceSchemaError):
        save_if3_result_resource(store, frame_path, resource)


def test_checksum_missing_rejected_on_save(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    resource = copy.deepcopy(resource)
    resource.pop("resultChecksum")
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)

    with pytest.raises(If3PersistenceChecksumMissingError):
        save_if3_result_resource(store, frame_path, resource)


def test_checksum_malformed_rejected_on_save(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    resource = copy.deepcopy(resource)
    resource["resultChecksum"] = {"algorithm": "sha256", "hexDigest": "not-valid"}
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)

    with pytest.raises(If3PersistenceChecksumMalformedError):
        save_if3_result_resource(store, frame_path, resource)


def test_checksum_mismatch_rejected_on_save(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    resource = copy.deepcopy(resource)
    resource["resultChecksum"] = sha256_content_checksum({"tampered": True})
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)

    with pytest.raises(If3PersistenceChecksumMismatchError):
        save_if3_result_resource(store, frame_path, resource)


def test_write_failure_is_fail_closed(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)

    def failing_open(target: Path) -> Any:
        raise OSError("temp write failed")

    faulty_store = AtomicJsonStore(
        io=IoHooks(
            file_fsync=os.fsync,
            replace=os.replace,
            unlink=os.unlink,
            fsync_directory=default_io_hooks().fsync_directory,
            open_write=failing_open,
        )
    )

    with pytest.raises(If3PersistenceStorageError):
        save_if3_result_resource(faulty_store, frame_path, resource)

    sidecar_path = build_if3_result_sidecar_path(frame_path, resource["resultId"])
    assert not sidecar_path.exists()


def test_load_round_trip(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    save_if3_result_resource(store, frame_path, resource)

    loaded = load_if3_result_resource(frame_path, resource["resultId"])

    assert loaded == resource


def test_load_missing_file_rejected(tmp_path: Path) -> None:
    frame_path = frame_document_path(tmp_path)

    with pytest.raises(If3PersistenceReadError):
        load_if3_result_resource(frame_path, str(uuid.uuid4()))


def test_load_malformed_json_rejected(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    sidecar_path = build_if3_result_sidecar_path(frame_path, resource["resultId"])
    sidecar_path.parent.mkdir(parents=True, exist_ok=True)
    sidecar_path.write_text("{not-json", encoding="utf-8")

    with pytest.raises(If3PersistenceMalformedJsonError):
        load_if3_result_resource(frame_path, resource["resultId"])


def test_load_invalid_schema_rejected(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    sidecar_path = build_if3_result_sidecar_path(frame_path, resource["resultId"])
    invalid = copy.deepcopy(resource)
    invalid.pop("provenance")
    checksum_target = copy.deepcopy(invalid)
    checksum_target.pop("resultChecksum", None)
    invalid["resultChecksum"] = sha256_content_checksum(checksum_target)
    store.store(sidecar_path, invalid, create_only=True)

    with pytest.raises(If3PersistenceSchemaError):
        load_if3_result_resource(frame_path, resource["resultId"])


def test_load_checksum_missing_rejected(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    sidecar_path = build_if3_result_sidecar_path(frame_path, resource["resultId"])
    missing_checksum = copy.deepcopy(resource)
    missing_checksum.pop("resultChecksum")
    store.store(sidecar_path, missing_checksum, create_only=True)

    with pytest.raises(If3PersistenceChecksumMissingError):
        load_if3_result_resource(frame_path, resource["resultId"])


def test_load_checksum_malformed_rejected(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    sidecar_path = build_if3_result_sidecar_path(frame_path, resource["resultId"])
    malformed = copy.deepcopy(resource)
    malformed["resultChecksum"] = "bad"
    store.store(sidecar_path, malformed, create_only=True)

    with pytest.raises(If3PersistenceChecksumMalformedError):
        load_if3_result_resource(frame_path, resource["resultId"])


def test_load_checksum_mismatch_rejected(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    sidecar_path = build_if3_result_sidecar_path(frame_path, resource["resultId"])
    mismatched = copy.deepcopy(resource)
    mismatched["resultChecksum"] = sha256_content_checksum({"tampered": True})
    store.store(sidecar_path, mismatched, create_only=True)

    with pytest.raises(If3PersistenceChecksumMismatchError):
        load_if3_result_resource(frame_path, resource["resultId"])


def test_load_tampered_payload_rejected(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    save_if3_result_resource(store, frame_path, resource)
    sidecar_path = build_if3_result_sidecar_path(frame_path, resource["resultId"])
    tampered = copy.deepcopy(resource)
    tampered["solverName"] = "tampered"
    store.store(sidecar_path, tampered)

    with pytest.raises(If3PersistenceChecksumMismatchError):
        load_if3_result_resource(frame_path, resource["resultId"])


def test_load_unsupported_schema_version_rejected(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    sidecar_path = build_if3_result_sidecar_path(frame_path, resource["resultId"])
    unsupported = copy.deepcopy(resource)
    unsupported["schemaVersion"] = "9.9.9"
    checksum_target = copy.deepcopy(unsupported)
    checksum_target.pop("resultChecksum", None)
    unsupported["resultChecksum"] = sha256_content_checksum(checksum_target)
    store.store(sidecar_path, unsupported, create_only=True)

    with pytest.raises(If3PersistenceUnsupportedSchemaVersionError):
        load_if3_result_resource(frame_path, resource["resultId"])


def test_load_returns_independent_object(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    save_if3_result_resource(store, frame_path, resource)

    first = load_if3_result_resource(frame_path, resource["resultId"])
    second = load_if3_result_resource(frame_path, resource["resultId"])

    assert first == second
    first["solverName"] = "mutated"
    assert second["solverName"] != "mutated"


def test_load_is_deterministic_across_repeated_reads(store: AtomicJsonStore, tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    save_if3_result_resource(store, frame_path, resource)

    loads = [
        load_if3_result_resource(frame_path, resource["resultId"])
        for _ in range(3)
    ]

    assert loads[0] == loads[1] == loads[2]


def test_contract_document_store_if3_result_round_trip(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)

    saved = store.save_if3_result_resource(frame_path, resource)
    loaded = store.load_if3_result_resource(frame_path, resource["resultId"])

    assert saved.path.name == f"{resource['resultId']}.if3.json"
    assert loaded == resource


def test_contract_document_store_preserves_road_frame_apis(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    road_path = tmp_path / "road.json"
    frame_path = tmp_path / "frame.json"
    road_document = {
        "schemaId": TARGET_ROAD_SCHEMA_ID,
        "schemaVersion": TARGET_SCHEMA_VERSION,
        "documentKind": "road-design",
        "documentId": SOURCE_DOCUMENT_ID,
        "revisionId": 1,
    }
    frame_document = {
        "schemaId": TARGET_FRAME_SCHEMA_ID,
        "schemaVersion": TARGET_SCHEMA_VERSION,
        "documentKind": "bridge-frame-analysis",
        "documentId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "revisionId": 1,
    }

    store.save_road_document(road_path, road_document, create_only=True)
    store.save_frame_document(frame_path, frame_document, create_only=True)

    assert store.read_document(road_path)["schemaId"] == TARGET_ROAD_SCHEMA_ID
    assert store.read_document(frame_path)["schemaId"] == TARGET_FRAME_SCHEMA_ID

    with pytest.raises(LegacyWriteForbiddenError):
        store.save_road_document(
            tmp_path / "legacy-road.json",
            {
                "liner": {"importerSchemaVersion": "0.1.0"},
                "bridges": [],
                "coordinateSystem": {
                    "horizontal": {"unit": "m"},
                    "vertical": {"unit": "m"},
                },
                "id": "p1",
                "name": "legacy",
            },
            create_only=True,
        )

    bad_road = copy.deepcopy(road_document)
    bad_road["schemaVersion"] = "9.0.0"
    with pytest.raises(TargetValidationError):
        store.save_road_document(tmp_path / "bad-road.json", bad_road, create_only=True)


def test_contract_document_store_if3_duplicate_rejected(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    store.save_if3_result_resource(frame_path, resource)

    with pytest.raises(If3PersistenceDuplicateError):
        store.save_if3_result_resource(frame_path, resource)


def test_atomic_store_io_error_surfaces_as_storage_error(tmp_path: Path) -> None:
    resource = normalized_resource()
    frame_path = frame_document_path(tmp_path)
    frame_path.parent.mkdir(parents=True)
    sidecar_path = build_if3_result_sidecar_path(frame_path, resource["resultId"])

    def failing_replace(
        src: str | os.PathLike[str],
        dst: str | os.PathLike[str],
    ) -> None:
        raise OSError("replace failed")

    faulty_store = AtomicJsonStore(
        io=IoHooks(
            file_fsync=os.fsync,
            replace=failing_replace,
            unlink=os.unlink,
            fsync_directory=default_io_hooks().fsync_directory,
        )
    )

    with pytest.raises(If3PersistenceStorageError) as exc_info:
        save_if3_result_resource(faulty_store, frame_path, resource)

    assert exc_info.value.cause is not None
    assert isinstance(exc_info.value.cause, JsonStoreIoError)
    assert not sidecar_path.exists()
