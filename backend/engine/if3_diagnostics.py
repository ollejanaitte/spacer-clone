from __future__ import annotations

from typing import Any


IF3_DIAGNOSTIC_PRODUCER = "backend.if3.normalizer"


def diagnostic(
    code: str,
    message: str,
    *,
    severity: str = "error",
    path: str | None = None,
    entity_kind: str | None = None,
    entity_id: str | None = None,
    result_kind: str | None = None,
) -> dict[str, Any]:
    item: dict[str, Any] = {
        "code": code,
        "severity": severity,
        "producer": IF3_DIAGNOSTIC_PRODUCER,
        "message": message,
    }
    if path is not None:
        item["path"] = path
    if entity_kind is not None:
        item["entityKind"] = entity_kind
    if entity_id is not None:
        item["entityId"] = entity_id
    if result_kind is not None:
        item["resultKind"] = result_kind
    return item


def sort_diagnostics(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        items,
        key=lambda item: (
            str(item.get("path", "")),
            str(item.get("code", "")),
            str(item.get("severity", "")),
            str(item.get("message", "")),
        ),
    )
