from __future__ import annotations

from typing import Any

from .if3_checksum import validate_content_checksum
from .if3_diagnostics import diagnostic, sort_diagnostics


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

    if resource.get("schemaVersion") != "0.1.0":
        diagnostics.append(
            diagnostic(
                "UNSUPPORTED_RESULT_VERSION",
                "Result schemaVersion is not supported by this backend.",
                path="/schemaVersion",
            )
        )

    if resource.get("sourceDocumentId") != source_document_id:
        diagnostics.append(
            diagnostic(
                "SOURCE_DOCUMENT_MISMATCH",
                "Result sourceDocumentId does not match the current source document.",
                path="/sourceDocumentId",
            )
        )
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
        and resource.get("analysisSettingsChecksum") != analysis_settings_checksum
    ):
        diagnostics.append(
            diagnostic(
                "STALE_RESULT",
                "Result analysisSettingsChecksum does not match the current analysis settings.",
                path="/analysisSettingsChecksum",
            )
        )

    resource_entries = resource.get("loadContext", {}).get("entries")
    current_entries = load_context.get("entries")
    if isinstance(resource_entries, list) and isinstance(current_entries, list):
        resource_pairs = sorted((entry.get("kind"), entry.get("id"), entry.get("checksum", {})) for entry in resource_entries)
        current_pairs = sorted((entry.get("kind"), entry.get("id"), entry.get("checksum", {})) for entry in current_entries)
        if resource_pairs != current_pairs:
            diagnostics.append(
                diagnostic(
                    "STALE_RESULT",
                    "Result loadContext does not match the current load context.",
                    path="/loadContext/entries",
                )
            )

    if diagnostics:
        status = "UNSUPPORTED" if any(item["code"] == "UNSUPPORTED_RESULT_VERSION" for item in diagnostics) else "STALE"
        return {"status": status, "diagnostics": sort_diagnostics(diagnostics)}
    return {"status": "VALID", "diagnostics": []}
