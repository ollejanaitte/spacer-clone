from __future__ import annotations

from pathlib import Path

import pytest

from backend.app.atomic_json import JsonStoreConflictError
from backend.app.contract_document_store import (
    TARGET_FRAME_SCHEMA_ID,
    TARGET_ROAD_SCHEMA_ID,
    TARGET_SCHEMA_VERSION,
    ContractDocumentStore,
    LegacyWriteForbiddenError,
    TargetValidationError,
)


def _minimal_road_document() -> dict:
    return {
        "schemaId": TARGET_ROAD_SCHEMA_ID,
        "schemaVersion": TARGET_SCHEMA_VERSION,
        "documentKind": "road-design",
        "documentId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "revisionId": 1,
    }


def _minimal_frame_document() -> dict:
    return {
        "schemaId": TARGET_FRAME_SCHEMA_ID,
        "schemaVersion": TARGET_SCHEMA_VERSION,
        "documentKind": "bridge-frame-analysis",
        "documentId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "revisionId": 1,
    }


def test_contract_store_writes_target_road_only(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    path = tmp_path / "road.json"
    result = store.save_road_document(path, _minimal_road_document(), create_only=True)
    assert path.exists()
    assert result.checksum == store.checksum_for(path)
    loaded = store.read_document(path)
    assert loaded["schemaId"] == TARGET_ROAD_SCHEMA_ID
    assert loaded["schemaVersion"] == TARGET_SCHEMA_VERSION


def test_contract_store_writes_target_frame_only(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    path = tmp_path / "frame.json"
    result = store.save_frame_document(path, _minimal_frame_document(), create_only=True)
    assert result.bytes_written > 0
    loaded = store.read_document(path)
    assert loaded["schemaId"] == TARGET_FRAME_SCHEMA_ID


def test_contract_store_rejects_legacy_importer_payload(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    legacy = {
        "liner": {"importerSchemaVersion": "0.1.0"},
        "bridges": [],
        "coordinateSystem": {"horizontal": {"unit": "m"}, "vertical": {"unit": "m"}},
        "id": "p1",
        "name": "legacy",
    }
    with pytest.raises(LegacyWriteForbiddenError):
        store.save_road_document(tmp_path / "legacy.json", legacy, create_only=True)


def test_contract_store_rejects_legacy_project_model(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    legacy = {
        "schemaVersion": 1,
        "project": {"id": "p1"},
        "units": {},
        "nodes": [],
        "members": [],
        "analysisSettings": {},
    }
    with pytest.raises(LegacyWriteForbiddenError):
        store.save_frame_document(tmp_path / "legacy.json", legacy, create_only=True)


def test_contract_store_rejects_wrong_schema_version(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    document = _minimal_road_document()
    document["schemaVersion"] = "9.0.0"
    with pytest.raises(TargetValidationError):
        store.save_road_document(tmp_path / "road.json", document, create_only=True)


def test_contract_store_create_only_conflict(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    path = tmp_path / "road.json"
    store.save_road_document(path, _minimal_road_document(), create_only=True)
    with pytest.raises(JsonStoreConflictError):
        store.save_road_document(path, _minimal_road_document(), create_only=True)


def test_contract_store_round_trip_checksum_stable(tmp_path: Path) -> None:
    store = ContractDocumentStore()
    path = tmp_path / "frame.json"
    first = store.save_frame_document(path, _minimal_frame_document(), create_only=True)
    loaded = store.read_document(path)
    second = store.save_frame_document(
        path,
        loaded,
        expected_checksum=first.checksum,
    )
    assert first.checksum == store.checksum_for(path)
    assert second.checksum == first.checksum
