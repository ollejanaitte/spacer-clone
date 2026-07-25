from __future__ import annotations

import copy
import re
from typing import Any

from .if3_checksum import sha256_content_checksum, validate_content_checksum
from .if3_diagnostics import dedupe_diagnostics, diagnostic, sort_diagnostics
from .if3_normalizer import IF3_SCHEMA_VERSION, SEMVER_PATTERN


SUPPORTED_SOLVER_NAMES = frozenset({"scipy_sparse", "newmark_beta"})
SUPPORTED_SOLVER_VERSION_PATTERN = re.compile(r"^0\.3\.")


def evaluate_if3_staleness(
    resource: dict[str, Any],
    *,
    source_document_id: str,
    source_document_version: int,
    source_content_checksum: dict[str, str],
    analysis_settings_checksum: dict[str, str],
    load_context: dict[str, Any],
) -> dict[str, Any]:
    diagnostics: list[dict[str, Any]] = []

    if not isinstance(resource, dict):
        diagnostics.append(
            diagnostic(
                "FRAME_RESULT_RESOURCE_INVALID",
                "Result resource must be an object.",
                path="/",
            )
        )
        return _staleness_result(diagnostics)

    _append_resource_integrity_diagnostics(resource, diagnostics)
    _append_current_binding_diagnostics(
        source_document_id,
        source_document_version,
        source_content_checksum,
        analysis_settings_checksum,
        load_context,
        diagnostics,
    )
    _append_staleness_diagnostics(
        resource,
        source_document_id=source_document_id,
        source_document_version=source_document_version,
        source_content_checksum=source_content_checksum,
        analysis_settings_checksum=analysis_settings_checksum,
        load_context=load_context,
        diagnostics=diagnostics,
    )
    return _staleness_result(diagnostics)


def _append_resource_integrity_diagnostics(
    resource: dict[str, Any],
    diagnostics: list[dict[str, Any]],
) -> None:
    schema_version = resource.get("schemaVersion")
    if not isinstance(schema_version, str) or schema_version != IF3_SCHEMA_VERSION:
        diagnostics.append(
            diagnostic(
                "UNSUPPORTED_RESULT_VERSION",
                "Result schemaVersion is not supported by this backend.",
                path="/schemaVersion",
            )
        )

    solver_name = resource.get("solverName")
    if not isinstance(solver_name, str) or not solver_name.strip():
        diagnostics.append(
            diagnostic(
                "FRAME_RESULT_SOLVER_NAME_INVALID",
                "solverName must be a non-empty string.",
                path="/solverName",
            )
        )
    elif solver_name not in SUPPORTED_SOLVER_NAMES:
        diagnostics.append(
            diagnostic(
                "UNSUPPORTED_RESULT_VERSION",
                "Result solverName is not supported by this backend.",
                path="/solverName",
            )
        )

    solver_version = resource.get("solverVersion")
    if not isinstance(solver_version, str) or not SEMVER_PATTERN.match(solver_version):
        diagnostics.append(
            diagnostic(
                "FRAME_RESULT_SOLVER_VERSION_INVALID",
                "solverVersion must be a valid SemVer string.",
                path="/solverVersion",
            )
        )
    elif not SUPPORTED_SOLVER_VERSION_PATTERN.match(solver_version):
        diagnostics.append(
            diagnostic(
                "UNSUPPORTED_RESULT_VERSION",
                "Result solverVersion is not supported by this backend.",
                path="/solverVersion",
            )
        )

    for path in ("/resultId", "/analysisRunId", "/sourceDocumentId"):
        value = resource.get(path.removeprefix("/"))
        if not isinstance(value, str) or not value.strip():
            diagnostics.append(
                diagnostic(
                    "FRAME_RESULT_UUID_INVALID",
                    "UUID field is required and must be a non-empty string.",
                    path=path,
                )
            )

    source_document_version = resource.get("sourceDocumentVersion")
    if not isinstance(source_document_version, int) or source_document_version <= 0:
        diagnostics.append(
            diagnostic(
                "FRAME_RESULT_SOURCE_DOCUMENT_VERSION_INVALID",
                "sourceDocumentVersion must be a positive integer.",
                path="/sourceDocumentVersion",
            )
        )

    for path in ("/sourceContentChecksum", "/analysisSettingsChecksum"):
        if not validate_content_checksum(resource.get(path.removeprefix("/"))):
            diagnostics.append(
                diagnostic(
                    "CONTENT_CHECKSUM_INVALID",
                    "Content checksum is invalid.",
                    path=path,
                )
            )

    stored_checksum = resource.get("resultChecksum")
    if stored_checksum is None:
        diagnostics.append(
            diagnostic(
                "RESULT_CHECKSUM_MISSING",
                "resultChecksum is required for IF3 result resources.",
                path="/resultChecksum",
            )
        )
    elif not validate_content_checksum(stored_checksum):
        diagnostics.append(
            diagnostic(
                "RESULT_CHECKSUM_INVALID",
                "resultChecksum must be a sha256 content checksum.",
                path="/resultChecksum",
            )
        )
    else:
        checksum_target = copy.deepcopy(resource)
        checksum_target.pop("resultChecksum", None)
        try:
            recomputed = sha256_content_checksum(checksum_target)
        except Exception:
            diagnostics.append(
                diagnostic(
                    "RESULT_CHECKSUM_INVALID",
                    "resultChecksum could not be recomputed from the resource envelope.",
                    path="/resultChecksum",
                )
            )
        else:
            if recomputed != stored_checksum:
                diagnostics.append(
                    diagnostic(
                        "RESULT_CHECKSUM_MISMATCH",
                        "resultChecksum does not match the normalized resource envelope.",
                        path="/resultChecksum",
                    )
                )


def _append_current_binding_diagnostics(
    source_document_id: Any,
    source_document_version: Any,
    source_content_checksum: Any,
    analysis_settings_checksum: Any,
    load_context: Any,
    diagnostics: list[dict[str, Any]],
) -> None:
    if not isinstance(source_document_id, str) or not source_document_id.strip():
        diagnostics.append(
            diagnostic(
                "CURRENT_SOURCE_BINDING_INVALID",
                "Current sourceDocumentId must be a non-empty string.",
                path="/sourceDocumentId",
            )
        )
    if not isinstance(source_document_version, int) or source_document_version <= 0:
        diagnostics.append(
            diagnostic(
                "CURRENT_SOURCE_BINDING_INVALID",
                "Current sourceDocumentVersion must be a positive integer.",
                path="/sourceDocumentVersion",
            )
        )
    if not validate_content_checksum(source_content_checksum):
        diagnostics.append(
            diagnostic(
                "CURRENT_SOURCE_BINDING_INVALID",
                "Current sourceContentChecksum must be a sha256 content checksum.",
                path="/sourceContentChecksum",
            )
        )
    if not validate_content_checksum(analysis_settings_checksum):
        diagnostics.append(
            diagnostic(
                "CURRENT_SOURCE_BINDING_INVALID",
                "Current analysisSettingsChecksum must be a sha256 content checksum.",
                path="/analysisSettingsChecksum",
            )
        )
    if not isinstance(load_context, dict) or not isinstance(load_context.get("entries"), list):
        diagnostics.append(
            diagnostic(
                "CURRENT_SOURCE_BINDING_INVALID",
                "Current loadContext.entries must be an array.",
                path="/loadContext/entries",
            )
        )


def _append_staleness_diagnostics(
    resource: dict[str, Any],
    *,
    source_document_id: Any,
    source_document_version: Any,
    source_content_checksum: Any,
    analysis_settings_checksum: Any,
    load_context: Any,
    diagnostics: list[dict[str, Any]],
) -> None:
    if isinstance(source_document_id, str) and source_document_id.strip():
        if resource.get("sourceDocumentId") != source_document_id.strip():
            diagnostics.append(
                diagnostic(
                    "SOURCE_DOCUMENT_MISMATCH",
                    "Result sourceDocumentId does not match the current source document.",
                    path="/sourceDocumentId",
                )
            )

    if isinstance(source_document_version, int) and source_document_version > 0:
        if resource.get("sourceDocumentVersion") != source_document_version:
            diagnostics.append(
                diagnostic(
                    "STALE_RESULT",
                    "Result sourceDocumentVersion does not match the current source document revision.",
                    path="/sourceDocumentVersion",
                )
            )

    if (
        validate_content_checksum(resource.get("sourceContentChecksum"))
        and validate_content_checksum(source_content_checksum)
        and resource.get("sourceContentChecksum") != source_content_checksum
    ):
        diagnostics.append(
            diagnostic(
                "SOURCE_CHECKSUM_MISMATCH",
                "Result sourceContentChecksum does not match the current source content checksum.",
                path="/sourceContentChecksum",
            )
        )

    if (
        validate_content_checksum(resource.get("analysisSettingsChecksum"))
        and validate_content_checksum(analysis_settings_checksum)
        and resource.get("analysisSettingsChecksum") != analysis_settings_checksum
    ):
        diagnostics.append(
            diagnostic(
                "STALE_RESULT",
                "Result analysisSettingsChecksum does not match the current analysis settings.",
                path="/analysisSettingsChecksum",
            )
        )

    resource_entries = (
        resource.get("loadContext", {}).get("entries")
        if isinstance(resource.get("loadContext"), dict)
        else None
    )
    current_entries = load_context.get("entries") if isinstance(load_context, dict) else None
    if isinstance(resource_entries, list) and isinstance(current_entries, list):
        resource_pairs = sorted(
            (
                entry.get("kind") if isinstance(entry, dict) else None,
                entry.get("id") if isinstance(entry, dict) else None,
                entry.get("checksum", {}) if isinstance(entry, dict) else {},
            )
            for entry in resource_entries
        )
        current_pairs = sorted(
            (
                entry.get("kind") if isinstance(entry, dict) else None,
                entry.get("id") if isinstance(entry, dict) else None,
                entry.get("checksum", {}) if isinstance(entry, dict) else {},
            )
            for entry in current_entries
        )
        if resource_pairs != current_pairs:
            diagnostics.append(
                diagnostic(
                    "STALE_RESULT",
                    "Result loadContext does not match the current load context.",
                    path="/loadContext/entries",
                )
            )


def _staleness_result(diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    ordered = sort_diagnostics(dedupe_diagnostics(diagnostics))
    if not ordered:
        return {"status": "VALID", "diagnostics": []}
    if any(item["code"] == "UNSUPPORTED_RESULT_VERSION" for item in ordered):
        return {"status": "UNSUPPORTED", "diagnostics": ordered}
    if any(
        item["code"]
        in {
            "FRAME_RESULT_RESOURCE_INVALID",
            "RESULT_CHECKSUM_MISSING",
            "RESULT_CHECKSUM_INVALID",
            "RESULT_CHECKSUM_MISMATCH",
            "FRAME_RESULT_UUID_INVALID",
            "FRAME_RESULT_SOURCE_DOCUMENT_VERSION_INVALID",
            "CONTENT_CHECKSUM_INVALID",
            "FRAME_RESULT_SOLVER_NAME_INVALID",
            "FRAME_RESULT_SOLVER_VERSION_INVALID",
            "CURRENT_SOURCE_BINDING_INVALID",
        }
        for item in ordered
    ):
        return {"status": "INVALID", "diagnostics": ordered}
    return {"status": "STALE", "diagnostics": ordered}
