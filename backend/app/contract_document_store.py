from __future__ import annotations

from pathlib import Path
from typing import Any

from backend.app.atomic_json import (
    AtomicJsonStore,
    JsonStoreConflictError,
    StoreResult,
    checksum_for_path,
    read_json,
)

TARGET_ROAD_SCHEMA_ID = "spacer.contracts.road-design-document"
TARGET_FRAME_SCHEMA_ID = "spacer.contracts.bridge-frame-analysis-document"
TARGET_SCHEMA_VERSION = "0.1.0"


class ContractDocumentStoreError(Exception):
    """Base error for target contract document persistence."""


class LegacyWriteForbiddenError(ContractDocumentStoreError):
    """Legacy formats must never be written by the target store."""


class TargetValidationError(ContractDocumentStoreError):
    """Target document failed write-path validation."""


def _is_plain_dict(value: Any) -> bool:
    return isinstance(value, dict)


def _looks_like_legacy(value: Any) -> bool:
    if not _is_plain_dict(value):
        return False
    if "liner" in value and "bridges" in value and "coordinateSystem" in value:
        return True
    if (
        "project" in value
        and "units" in value
        and "nodes" in value
        and "members" in value
        and "analysisSettings" in value
        and value.get("schemaId") != TARGET_FRAME_SCHEMA_ID
    ):
        return True
    return False


def _validate_target_document(document: Any, *, expected_schema_id: str) -> None:
    if not _is_plain_dict(document):
        raise TargetValidationError("Target document must be a JSON object.")
    if _looks_like_legacy(document):
        raise LegacyWriteForbiddenError(
            "Refusing to write legacy format; write-target only."
        )
    if document.get("schemaId") != expected_schema_id:
        raise TargetValidationError(
            f"schemaId must be {expected_schema_id}, got {document.get('schemaId')!r}."
        )
    if document.get("schemaVersion") != TARGET_SCHEMA_VERSION:
        raise TargetValidationError(
            f"schemaVersion must be {TARGET_SCHEMA_VERSION}, got {document.get('schemaVersion')!r}."
        )


class ContractDocumentStore:
    """Backend write-target store for Phase 0 Road/Frame documents via AtomicJsonStore."""

    def __init__(self, store: AtomicJsonStore | None = None) -> None:
        self._store = store or AtomicJsonStore()

    def save_road_document(
        self,
        path: Path,
        document: Any,
        *,
        create_only: bool = False,
        expected_checksum: str | None = None,
    ) -> StoreResult:
        _validate_target_document(document, expected_schema_id=TARGET_ROAD_SCHEMA_ID)
        return self._store.store(
            path,
            document,
            create_only=create_only,
            expected_checksum=expected_checksum,
        )

    def save_frame_document(
        self,
        path: Path,
        document: Any,
        *,
        create_only: bool = False,
        expected_checksum: str | None = None,
    ) -> StoreResult:
        _validate_target_document(document, expected_schema_id=TARGET_FRAME_SCHEMA_ID)
        return self._store.store(
            path,
            document,
            create_only=create_only,
            expected_checksum=expected_checksum,
        )

    def read_document(self, path: Path) -> Any:
        return read_json(path)

    def checksum_for(self, path: Path) -> str:
        return checksum_for_path(path)


__all__ = [
    "ContractDocumentStore",
    "ContractDocumentStoreError",
    "LegacyWriteForbiddenError",
    "TARGET_FRAME_SCHEMA_ID",
    "TARGET_ROAD_SCHEMA_ID",
    "TARGET_SCHEMA_VERSION",
    "TargetValidationError",
    "JsonStoreConflictError",
]
