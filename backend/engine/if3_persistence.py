from __future__ import annotations

import copy
import uuid
from json import JSONDecodeError
from pathlib import Path
from typing import Any, Protocol

from backend.app.atomic_json import (
    AtomicJsonStore,
    AtomicJsonError,
    JsonSerializationError,
    JsonStoreConflictError,
    JsonStoreIoError,
    StoreResult,
    read_json,
)
from backend.engine.if3_checksum import sha256_content_checksum, validate_content_checksum
from backend.engine.if3_normalizer import (
    IF3_SCHEMA_VERSION,
    UUID_PATTERN,
    load_if3_json_schema,
    validate_if3_result_resource,
)

IF3_RESULT_SIDECAR_SUFFIX = ".if3.json"
PERSISTED_RESULT_DOCUMENT_KIND = "persisted-result"
PERSISTED_RESULT_REVISION_ID = 1


class If3FramePersistenceStore(Protocol):
    def save_if3_result_resource(
        self,
        frame_document_path: Path,
        resource: dict[str, Any],
    ) -> StoreResult: ...

    def save_frame_document(
        self,
        path: Path,
        document: Any,
        *,
        create_only: bool = False,
        expected_checksum: str | None = None,
    ) -> StoreResult: ...


class If3PersistenceError(Exception):
    """Base error for IF3 result sidecar persistence."""

    code: str = "IF3_PERSISTENCE_ERROR"

    def __init__(self, message: str, *, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.cause = cause


class If3PersistenceInvalidResourceError(If3PersistenceError):
    code = "INVALID_RESOURCE"


class If3PersistenceMalformedIdError(If3PersistenceError):
    code = "MALFORMED_RESULT_ID"


class If3PersistencePathError(If3PersistenceError):
    code = "PATH_TRAVERSAL"


class If3PersistenceDuplicateError(If3PersistenceError):
    code = "DUPLICATE_RESULT"


class If3PersistenceChecksumMissingError(If3PersistenceError):
    code = "RESULT_CHECKSUM_MISSING"


class If3PersistenceChecksumMalformedError(If3PersistenceError):
    code = "RESULT_CHECKSUM_MALFORMED"


class If3PersistenceChecksumMismatchError(If3PersistenceError):
    code = "RESULT_CHECKSUM_MISMATCH"


class If3PersistenceReadError(If3PersistenceError):
    code = "READ_ERROR"


class If3PersistenceMalformedJsonError(If3PersistenceError):
    code = "MALFORMED_JSON"


class If3PersistenceSchemaError(If3PersistenceError):
    code = "SCHEMA_VALIDATION_ERROR"


class If3PersistenceUnsupportedSchemaVersionError(If3PersistenceError):
    code = "UNSUPPORTED_SCHEMA_VERSION"


class If3PersistenceStorageError(If3PersistenceError):
    code = "STORAGE_ERROR"


class If3PersistenceDuplicateRefError(If3PersistenceError):
    code = "DUPLICATE_REFERENCE"


class If3PersistenceFrameConflictError(If3PersistenceError):
    code = "FRAME_CHECKSUM_CONFLICT"


def build_if3_results_directory(frame_document_path: Path) -> Path:
    return frame_document_path.parent / "results"


def validate_if3_result_id(result_id: str) -> str:
    if not isinstance(result_id, str) or not result_id.strip():
        raise If3PersistenceMalformedIdError("resultId must be a non-empty string.")
    normalized = result_id.strip()
    if normalized != result_id:
        raise If3PersistenceMalformedIdError("resultId must not contain leading or trailing whitespace.")
    if any(separator in normalized for separator in ("/", "\\")):
        raise If3PersistenceMalformedIdError("resultId must not contain path separators.")
    if ".." in normalized:
        raise If3PersistenceMalformedIdError("resultId must not contain parent-directory segments.")
    if Path(normalized).is_absolute():
        raise If3PersistenceMalformedIdError("resultId must not be an absolute path.")
    if UUID_PATTERN.match(normalized) is None:
        raise If3PersistenceMalformedIdError("resultId must be a valid UUID.")
    try:
        parsed = uuid.UUID(normalized)
    except ValueError as exc:
        raise If3PersistenceMalformedIdError("resultId must be a valid UUID.") from exc
    return str(parsed)


def build_if3_result_sidecar_path(frame_document_path: Path, result_id: str) -> Path:
    validated_id = validate_if3_result_id(result_id)
    results_dir = build_if3_results_directory(frame_document_path)
    sidecar_path = results_dir / f"{validated_id}{IF3_RESULT_SIDECAR_SUFFIX}"
    _assert_sidecar_within_results_directory(sidecar_path, results_dir)
    return sidecar_path


def _assert_sidecar_within_results_directory(sidecar_path: Path, results_dir: Path) -> None:
    try:
        resolved_sidecar = sidecar_path.resolve()
        resolved_results = results_dir.resolve()
    except OSError as exc:
        raise If3PersistencePathError(
            f"Unable to resolve IF3 result sidecar path: {sidecar_path}"
        ) from exc
    if resolved_results not in resolved_sidecar.parents and resolved_sidecar.parent != resolved_results:
        raise If3PersistencePathError(
            f"Resolved IF3 result sidecar escapes results directory: {sidecar_path}"
        )


def validate_if3_result_resource_for_persistence(resource: Any) -> None:
    if not isinstance(resource, dict):
        raise If3PersistenceInvalidResourceError("FrameAnalysisResultResource must be a JSON object.")

    schema_version = resource.get("schemaVersion")
    if schema_version != IF3_SCHEMA_VERSION:
        raise If3PersistenceUnsupportedSchemaVersionError(
            f"schemaVersion must be {IF3_SCHEMA_VERSION}, got {schema_version!r}."
        )

    semantic_diagnostics = validate_if3_result_resource(resource)
    if semantic_diagnostics:
        codes = ", ".join(sorted({str(item.get("code", "UNKNOWN")) for item in semantic_diagnostics}))
        raise If3PersistenceInvalidResourceError(
            f"FrameAnalysisResultResource failed semantic validation: {codes}."
        )

    _verify_result_checksum(resource)
    _validate_json_schema(resource)


def save_if3_result_resource(
    store: AtomicJsonStore,
    frame_document_path: Path,
    resource: dict[str, Any],
) -> StoreResult:
    resource_before = copy.deepcopy(resource)
    validate_if3_result_resource_for_persistence(resource)

    result_id = resource.get("resultId")
    if not isinstance(result_id, str):
        raise If3PersistenceMalformedIdError("resultId must be present on the resource envelope.")
    sidecar_path = build_if3_result_sidecar_path(frame_document_path, result_id)
    payload = copy.deepcopy(resource)

    try:
        result = store.store(sidecar_path, payload, create_only=True)
    except JsonStoreConflictError as exc:
        if exc.code == "ALREADY_EXISTS":
            raise If3PersistenceDuplicateError(
                f"IF3 result sidecar already exists: {sidecar_path}",
                cause=exc,
            ) from exc
        raise If3PersistenceStorageError(exc.message, cause=exc) from exc
    except (JsonStoreIoError, JsonSerializationError) as exc:
        raise If3PersistenceStorageError(str(exc), cause=exc) from exc
    except AtomicJsonError as exc:
        raise If3PersistenceStorageError(str(exc), cause=exc) from exc

    if resource != resource_before:
        raise If3PersistenceInvalidResourceError("Persistence must not mutate caller input.")
    return result


def load_if3_result_resource(
    frame_document_path: Path,
    result_id: str,
) -> dict[str, Any]:
    sidecar_path = build_if3_result_sidecar_path(frame_document_path, result_id)

    try:
        raw = read_json(sidecar_path)
    except FileNotFoundError as exc:
        raise If3PersistenceReadError(
            f"IF3 result sidecar does not exist: {sidecar_path}",
            cause=exc,
        ) from exc
    except JSONDecodeError as exc:
        raise If3PersistenceMalformedJsonError(
            f"IF3 result sidecar contains malformed JSON: {sidecar_path}",
            cause=exc,
        ) from exc
    except OSError as exc:
        raise If3PersistenceReadError(
            f"Unable to read IF3 result sidecar: {sidecar_path}",
            cause=exc,
        ) from exc

    validate_if3_result_resource_for_persistence(raw)
    return copy.deepcopy(raw)


def _validate_json_schema(resource: dict[str, Any]) -> None:
    try:
        import jsonschema
    except ImportError as exc:
        raise If3PersistenceSchemaError(
            "jsonschema is required to validate FrameAnalysisResultResource sidecars."
        ) from exc

    validator = jsonschema.Draft202012Validator(load_if3_json_schema())
    errors = sorted(validator.iter_errors(resource), key=lambda error: list(error.path))
    if errors:
        messages = "; ".join(error.message for error in errors)
        raise If3PersistenceSchemaError(
            f"FrameAnalysisResultResource failed JSON Schema validation: {messages}"
        )


def _verify_result_checksum(resource: dict[str, Any]) -> None:
    stored_checksum = resource.get("resultChecksum")
    if stored_checksum is None:
        raise If3PersistenceChecksumMissingError(
            "resultChecksum is required for IF3 result persistence."
        )
    if not validate_content_checksum(stored_checksum):
        raise If3PersistenceChecksumMalformedError(
            "resultChecksum must be a sha256 content checksum."
        )

    checksum_target = copy.deepcopy(resource)
    checksum_target.pop("resultChecksum", None)
    try:
        recomputed = sha256_content_checksum(checksum_target)
    except Exception as exc:
        raise If3PersistenceChecksumMalformedError(
            "resultChecksum could not be recomputed from the resource envelope."
        ) from exc

    if recomputed != stored_checksum:
        raise If3PersistenceChecksumMismatchError(
            "resultChecksum does not match the normalized resource envelope."
        )


def build_persisted_result_uri(result_id: str) -> str:
    validated_id = validate_if3_result_id(result_id)
    return f"results/{validated_id}{IF3_RESULT_SIDECAR_SUFFIX}"


def build_persisted_result_document_reference(
    resource: dict[str, Any],
    frame_document_path: Path,
) -> dict[str, Any]:
    del frame_document_path  # URI is relative to the frame document directory.
    result_id = resource.get("resultId")
    if not isinstance(result_id, str):
        raise If3PersistenceMalformedIdError("resultId must be present on the resource envelope.")
    validate_if3_result_id(result_id)
    result_checksum = resource.get("resultChecksum")
    if not validate_content_checksum(result_checksum):
        raise If3PersistenceChecksumMissingError(
            "resultChecksum is required for persisted result references."
        )
    return {
        "documentKind": PERSISTED_RESULT_DOCUMENT_KIND,
        "documentId": result_id,
        "revisionId": PERSISTED_RESULT_REVISION_ID,
        "contentChecksum": copy.deepcopy(result_checksum),
        "uri": build_persisted_result_uri(result_id),
    }


def validate_no_duplicate_ref(
    existing_refs: list[dict[str, Any]] | None,
    new_ref: dict[str, Any],
) -> None:
    refs = existing_refs if isinstance(existing_refs, list) else []
    new_document_id = new_ref.get("documentId")
    new_uri = new_ref.get("uri")
    for index, ref in enumerate(refs):
        if not isinstance(ref, dict):
            continue
        if isinstance(new_document_id, str) and ref.get("documentId") == new_document_id:
            raise If3PersistenceDuplicateRefError(
                f"Duplicate persisted result documentId at persistedResultRefs[{index}]."
            )
        if isinstance(new_uri, str) and ref.get("uri") == new_uri:
            raise If3PersistenceDuplicateRefError(
                f"Duplicate persisted result uri at persistedResultRefs[{index}]."
            )


def persist_if3_result_with_ref(
    store: If3FramePersistenceStore,
    frame_document_path: Path,
    resource: dict[str, Any],
    frame_document: dict[str, Any],
    *,
    expected_frame_checksum: str,
) -> dict[str, Any]:
    resource_before = copy.deepcopy(resource)
    frame_before = copy.deepcopy(frame_document)

    reference = build_persisted_result_document_reference(resource, frame_document_path)
    existing_refs = frame_document.get("persistedResultRefs")
    if existing_refs is None:
        refs: list[dict[str, Any]] = []
    elif isinstance(existing_refs, list):
        refs = copy.deepcopy(existing_refs)
    else:
        refs = []
    validate_no_duplicate_ref(refs, reference)

    store.save_if3_result_resource(frame_document_path, resource)

    updated_frame = copy.deepcopy(frame_document)
    refs.append(reference)
    updated_frame["persistedResultRefs"] = refs

    try:
        store.save_frame_document(
            frame_document_path,
            updated_frame,
            expected_checksum=expected_frame_checksum,
        )
    except JsonStoreConflictError as exc:
        if exc.code == "CHECKSUM_MISMATCH":
            raise If3PersistenceFrameConflictError(exc.message, cause=exc) from exc
        raise If3PersistenceStorageError(exc.message, cause=exc) from exc
    except (JsonStoreIoError, JsonSerializationError) as exc:
        raise If3PersistenceStorageError(str(exc), cause=exc) from exc
    except AtomicJsonError as exc:
        raise If3PersistenceStorageError(str(exc), cause=exc) from exc

    if resource != resource_before or frame_document != frame_before:
        raise If3PersistenceInvalidResourceError("Persistence must not mutate caller input.")
    return reference


__all__ = [
    "IF3_RESULT_SIDECAR_SUFFIX",
    "PERSISTED_RESULT_DOCUMENT_KIND",
    "PERSISTED_RESULT_REVISION_ID",
    "If3FramePersistenceStore",
    "If3PersistenceChecksumMalformedError",
    "If3PersistenceChecksumMismatchError",
    "If3PersistenceChecksumMissingError",
    "If3PersistenceDuplicateError",
    "If3PersistenceDuplicateRefError",
    "If3PersistenceError",
    "If3PersistenceFrameConflictError",
    "If3PersistenceInvalidResourceError",
    "If3PersistenceMalformedIdError",
    "If3PersistenceMalformedJsonError",
    "If3PersistencePathError",
    "If3PersistenceReadError",
    "If3PersistenceSchemaError",
    "If3PersistenceStorageError",
    "If3PersistenceUnsupportedSchemaVersionError",
    "build_if3_result_sidecar_path",
    "build_if3_results_directory",
    "build_persisted_result_document_reference",
    "build_persisted_result_uri",
    "load_if3_result_resource",
    "persist_if3_result_with_ref",
    "save_if3_result_resource",
    "validate_if3_result_id",
    "validate_if3_result_resource_for_persistence",
    "validate_no_duplicate_ref",
]
