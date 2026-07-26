from __future__ import annotations

import copy
import uuid
from enum import Enum
from pathlib import Path
from typing import Any

from backend.engine.if3_checksum import sha256_content_checksum, validate_content_checksum
from backend.engine.if3_diagnostics import dedupe_diagnostics, diagnostic, sort_diagnostics
from backend.engine.if3_normalizer import IF3_UUID_NAMESPACE, UUID_PATTERN
from backend.engine.if3_persistence import (
    PERSISTED_RESULT_DOCUMENT_KIND,
    PERSISTED_RESULT_REVISION_ID,
    If3PersistenceChecksumMismatchError,
    If3PersistenceChecksumMissingError,
    If3PersistenceMalformedIdError,
    If3PersistenceMalformedJsonError,
    If3PersistenceReadError,
    If3PersistenceSchemaError,
    If3PersistenceUnsupportedSchemaVersionError,
    build_persisted_result_uri,
    load_if3_result_resource,
    validate_if3_result_id,
)
from backend.engine.if3_staleness import evaluate_if3_staleness


class If3AvailabilityStatus(str, Enum):
    VALID = "VALID"
    STALE = "STALE"
    MISSING = "MISSING"
    INVALID = "INVALID"
    UNSUPPORTED = "UNSUPPORTED"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"


IF3_AVAILABILITY_STATUSES = frozenset(status.value for status in If3AvailabilityStatus)

_STATUS_PRECEDENCE: tuple[If3AvailabilityStatus, ...] = (
    If3AvailabilityStatus.MISSING,
    If3AvailabilityStatus.UNSUPPORTED,
    If3AvailabilityStatus.INVALID,
    If3AvailabilityStatus.FAILED,
    If3AvailabilityStatus.STALE,
    If3AvailabilityStatus.PARTIAL,
    If3AvailabilityStatus.VALID,
)

_STATUS_RANK = {status: index for index, status in enumerate(_STATUS_PRECEDENCE)}


def pick_if3_availability_status(*candidates: str) -> str:
    best = If3AvailabilityStatus.VALID
    for candidate in candidates:
        try:
            status = If3AvailabilityStatus(candidate)
        except ValueError:
            status = If3AvailabilityStatus.INVALID
        if _STATUS_RANK[status] < _STATUS_RANK[best]:
            best = status
    return best.value


def extract_frame_binding_context(frame_document: dict[str, Any]) -> dict[str, Any]:
    analysis_settings = frame_document.get("analysisSettings")
    load_definitions = frame_document.get("loadDefinitions")
    entries: list[dict[str, Any]] = []
    if isinstance(load_definitions, list):
        for item in load_definitions:
            if not isinstance(item, dict):
                continue
            kind = "loadCase"
            source_id = item.get("sourceId") or item.get("id")
            if not isinstance(source_id, str) or not source_id.strip():
                continue
            label = item.get("label") if isinstance(item.get("label"), str) else source_id
            entry_id = item.get("id")
            if not isinstance(entry_id, str) or UUID_PATTERN.match(entry_id) is None:
                entry_id = str(uuid.uuid5(IF3_UUID_NAMESPACE, f"loadContext:{kind}:{source_id}"))
            definition = item.get("definition")
            if definition is None:
                definition = {"kind": kind, "sourceId": source_id, "label": label}
            entries.append(
                {
                    "kind": kind,
                    "id": entry_id,
                    "checksum": sha256_content_checksum(definition),
                }
            )
    entries.sort(key=lambda entry: (str(entry.get("kind", "")), str(entry.get("id", ""))))
    return {
        "source_document_id": frame_document.get("documentId"),
        "source_document_version": frame_document.get("revisionId"),
        "source_content_checksum": frame_document.get("contentChecksum"),
        "analysis_settings_checksum": sha256_content_checksum(analysis_settings),
        "load_context": {"entries": entries},
    }


def validate_persisted_result_reference_shape(ref: Any) -> list[dict[str, Any]]:
    diagnostics: list[dict[str, Any]] = []
    if not isinstance(ref, dict):
        diagnostics.append(
            diagnostic(
                "PERSISTED_RESULT_REFERENCE_INVALID",
                "persistedResultRefs entry must be an object.",
                path="/persistedResultRefs",
            )
        )
        return diagnostics

    document_kind = ref.get("documentKind")
    if document_kind != PERSISTED_RESULT_DOCUMENT_KIND:
        diagnostics.append(
            diagnostic(
                "PERSISTED_RESULT_REFERENCE_KIND_INVALID",
                f"documentKind must be {PERSISTED_RESULT_DOCUMENT_KIND!r}.",
                path="/documentKind",
            )
        )

    document_id = ref.get("documentId")
    if not isinstance(document_id, str):
        diagnostics.append(
            diagnostic(
                "PERSISTED_RESULT_REFERENCE_ID_INVALID",
                "documentId must be a UUID string.",
                path="/documentId",
            )
        )
    else:
        try:
            validate_if3_result_id(document_id)
        except If3PersistenceMalformedIdError as exc:
            diagnostics.append(
                diagnostic(
                    "PERSISTED_RESULT_REFERENCE_ID_INVALID",
                    exc.message,
                    path="/documentId",
                )
            )

    revision_id = ref.get("revisionId")
    if revision_id != PERSISTED_RESULT_REVISION_ID:
        diagnostics.append(
            diagnostic(
                "PERSISTED_RESULT_REFERENCE_REVISION_INVALID",
                f"revisionId must be {PERSISTED_RESULT_REVISION_ID}.",
                path="/revisionId",
            )
        )

    if not validate_content_checksum(ref.get("contentChecksum")):
        diagnostics.append(
            diagnostic(
                "PERSISTED_RESULT_REFERENCE_CHECKSUM_INVALID",
                "contentChecksum must be a sha256 content checksum.",
                path="/contentChecksum",
            )
        )

    uri = ref.get("uri")
    if not isinstance(uri, str) or not uri.strip():
        diagnostics.append(
            diagnostic(
                "PERSISTED_RESULT_REFERENCE_URI_INVALID",
                "uri must be a non-empty relative path.",
                path="/uri",
            )
        )
    elif isinstance(document_id, str):
        try:
            expected_uri = build_persisted_result_uri(document_id)
        except If3PersistenceMalformedIdError as exc:
            diagnostics.append(
                diagnostic(
                    "PERSISTED_RESULT_REFERENCE_URI_INVALID",
                    exc.message,
                    path="/uri",
                )
            )
        else:
            if uri != expected_uri:
                diagnostics.append(
                    diagnostic(
                        "PERSISTED_RESULT_REFERENCE_URI_INVALID",
                        f"uri must be {expected_uri!r}.",
                        path="/uri",
                    )
                )
            elif ".." in uri.split("/") or uri.startswith("/") or "\\" in uri:
                diagnostics.append(
                    diagnostic(
                        "PERSISTED_RESULT_REFERENCE_URI_INVALID",
                        "uri must be a safe relative path.",
                        path="/uri",
                    )
                )

    return sort_diagnostics(dedupe_diagnostics(diagnostics))


def evaluate_persisted_result_availability(
    reference: Any,
    frame_document_path: Path,
    *,
    binding: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ref_copy = copy.deepcopy(reference) if isinstance(reference, dict) else reference
    shape_diagnostics = validate_persisted_result_reference_shape(reference)
    result_id = reference.get("documentId") if isinstance(reference, dict) else ""
    if not isinstance(result_id, str):
        result_id = ""

    statuses: list[str] = []
    diagnostics: list[dict[str, Any]] = list(shape_diagnostics)
    if shape_diagnostics:
        if any(item["code"] == "PERSISTED_RESULT_REFERENCE_KIND_INVALID" for item in shape_diagnostics):
            statuses.append(If3AvailabilityStatus.UNSUPPORTED.value)
        else:
            statuses.append(If3AvailabilityStatus.INVALID.value)
        return _availability_entry(
            result_id=result_id,
            reference=ref_copy,
            status=pick_if3_availability_status(*statuses),
            diagnostics=diagnostics,
        )

    try:
        resource = load_if3_result_resource(frame_document_path, result_id)
    except If3PersistenceReadError as exc:
        statuses.append(If3AvailabilityStatus.MISSING.value)
        diagnostics.append(
            diagnostic(
                "PERSISTED_RESULT_SIDECAR_MISSING",
                exc.message,
                path="/uri",
            )
        )
        return _availability_entry(
            result_id=result_id,
            reference=ref_copy,
            status=pick_if3_availability_status(*statuses),
            diagnostics=diagnostics,
        )
    except (
        If3PersistenceMalformedJsonError,
        If3PersistenceSchemaError,
        If3PersistenceUnsupportedSchemaVersionError,
        If3PersistenceChecksumMissingError,
        If3PersistenceChecksumMismatchError,
    ) as exc:
        statuses.append(If3AvailabilityStatus.INVALID.value)
        diagnostics.append(
            diagnostic(
                "PERSISTED_RESULT_SIDECAR_INVALID",
                exc.message,
                path="/uri",
            )
        )
        return _availability_entry(
            result_id=result_id,
            reference=ref_copy,
            status=pick_if3_availability_status(*statuses),
            diagnostics=diagnostics,
        )

    if resource.get("resultId") != result_id:
        statuses.append(If3AvailabilityStatus.INVALID.value)
        diagnostics.append(
            diagnostic(
                "PERSISTED_RESULT_IDENTITY_MISMATCH",
                "Sidecar resultId does not match the reference documentId.",
                path="/documentId",
            )
        )

    ref_checksum = reference.get("contentChecksum") if isinstance(reference, dict) else None
    if validate_content_checksum(ref_checksum) and resource.get("resultChecksum") != ref_checksum:
        statuses.append(If3AvailabilityStatus.INVALID.value)
        diagnostics.append(
            diagnostic(
                "PERSISTED_RESULT_CHECKSUM_MISMATCH",
                "Reference contentChecksum does not match the sidecar resultChecksum.",
                path="/contentChecksum",
            )
        )

    binding_context = binding or {}
    staleness = evaluate_if3_staleness(
        resource,
        source_document_id=binding_context.get("source_document_id"),
        source_document_version=binding_context.get("source_document_version"),
        source_content_checksum=binding_context.get("source_content_checksum"),
        analysis_settings_checksum=binding_context.get("analysis_settings_checksum"),
        load_context=binding_context.get("load_context", {"entries": []}),
    )
    statuses.append(staleness["status"])
    diagnostics.extend(staleness.get("diagnostics", []))

    resource_status = resource.get("status")
    if resource_status == "FAILED":
        statuses.append(If3AvailabilityStatus.FAILED.value)
    elif resource_status == "PARTIAL":
        statuses.append(If3AvailabilityStatus.PARTIAL.value)
    elif resource_status == "INVALID":
        statuses.append(If3AvailabilityStatus.INVALID.value)
    elif resource_status == "UNSUPPORTED":
        statuses.append(If3AvailabilityStatus.UNSUPPORTED.value)

    return _availability_entry(
        result_id=result_id,
        reference=ref_copy,
        status=pick_if3_availability_status(*statuses),
        diagnostics=sort_diagnostics(dedupe_diagnostics(diagnostics)),
    )


def build_if3_availability_catalog(
    frame_document: dict[str, Any],
    frame_document_path: Path,
) -> list[dict[str, Any]]:
    frame_before = copy.deepcopy(frame_document)
    binding = extract_frame_binding_context(frame_document)
    refs = frame_document.get("persistedResultRefs")
    if refs is None:
        refs_list: list[Any] = []
    elif isinstance(refs, list):
        refs_list = refs
    else:
        refs_list = []

    entries = [
        evaluate_persisted_result_availability(
            reference,
            frame_document_path,
            binding=binding,
        )
        for reference in refs_list
    ]
    entries.sort(key=lambda item: item["resultId"])
    assert frame_document == frame_before
    return entries


def _availability_entry(
    *,
    result_id: str,
    reference: Any,
    status: str,
    diagnostics: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "resultId": result_id,
        "status": status,
        "reference": reference,
        "diagnostics": diagnostics,
    }


__all__ = [
    "IF3_AVAILABILITY_STATUSES",
    "If3AvailabilityStatus",
    "build_if3_availability_catalog",
    "evaluate_persisted_result_availability",
    "extract_frame_binding_context",
    "pick_if3_availability_status",
    "validate_persisted_result_reference_shape",
]
