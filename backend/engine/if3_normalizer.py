from __future__ import annotations

import copy
import math
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .if3_checksum import sha256_content_checksum, validate_content_checksum
from .if3_diagnostics import dedupe_diagnostics, diagnostic, sort_diagnostics


IF3_SCHEMA_ID = "spacer.contracts.frame-analysis-result-resource"
IF3_SCHEMA_VERSION = "0.1.0"
IF3_PAYLOAD_SCHEMA_VERSION = "0.1.0"
IF3_UUID_NAMESPACE = uuid.UUID("f7d7c8b4-24b2-47d8-8f8f-e91fc9a95ed5")
NIL_UUID = "00000000-0000-0000-0000-000000000000"
EMPTY_CHECKSUM = sha256_content_checksum(None)
SEMVER_PATTERN = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?"
    r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$"
)
UUID_PATTERN = re.compile(
    r"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-"
    r"[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|"
    r"00000000-0000-0000-0000-000000000000|"
    r"ffffffff-ffff-ffff-ffff-ffffffffffff)$"
)


def build_unsupported_result_resource(
    raw_result: dict[str, Any],
    metadata: dict[str, Any] | None,
    *,
    result_kind: str,
    generated_at: str | None = None,
    result_id: str | None = None,
    analysis_run_id: str | None = None,
) -> dict[str, Any]:
    raw = copy.deepcopy(raw_result)
    meta = copy.deepcopy(metadata or {})
    diagnostics: list[dict[str, Any]] = []
    generated = generated_at or _iso_now_millis()
    solver_name = _non_empty_string(meta.get("solverName")) or _raw_solver(raw) or "unknown"
    solver_version = _non_empty_string(meta.get("solverVersion")) or "0.3.0"
    if not SEMVER_PATTERN.match(solver_version):
        diagnostics.append(
            diagnostic(
                "FRAME_RESULT_SOLVER_VERSION_INVALID",
                "solverVersion must be explicit SemVer metadata.",
                path="/solverVersion",
            )
        )
        solver_version = "0.0.0"

    source_document_id = _uuid_or_diagnostic(
        meta.get("sourceDocumentId"),
        diagnostics,
        "/sourceDocumentId",
        "MISSING_SOURCE_BINDING",
        "sourceDocumentId is required and must be a UUID.",
    )
    source_document_version = _positive_int_or_diagnostic(
        meta.get("sourceDocumentVersion"),
        diagnostics,
        "/sourceDocumentVersion",
        "MISSING_SOURCE_BINDING",
        "sourceDocumentVersion is required and must be a positive integer.",
    )
    source_checksum = _checksum_or_diagnostic(
        meta.get("sourceContentChecksum"),
        diagnostics,
        "/sourceContentChecksum",
        "MISSING_SOURCE_BINDING",
        "sourceContentChecksum is required and must be a sha256 content checksum.",
    )
    source_binding_complete = (
        _is_uuid(meta.get("sourceDocumentId"))
        and isinstance(meta.get("sourceDocumentVersion"), int)
        and meta.get("sourceDocumentVersion", 0) > 0
        and validate_content_checksum(meta.get("sourceContentChecksum"))
    )

    if "analysisSettings" not in meta:
        diagnostics.append(
            diagnostic(
                "MISSING_ANALYSIS_SETTINGS",
                "analysisSettings metadata is required for IF3 normalization.",
                path="/analysisSettings",
            )
        )
        analysis_settings = None
    else:
        analysis_settings = meta["analysisSettings"]
    analysis_settings_checksum = sha256_content_checksum(analysis_settings)

    load_context, _, load_context_diagnostics = _normalize_load_context(meta.get("loadContext"))
    diagnostics.extend(load_context_diagnostics)

    if source_binding_complete:
        diagnostics.append(
            diagnostic(
                "UNSUPPORTED_RESULT_KIND",
                f"IF3-B2 does not normalize {result_kind} raw results.",
                path="/analysisSummary/analysisType",
                result_kind=result_kind,
            )
        )

    resource: dict[str, Any] = {
        "schemaId": IF3_SCHEMA_ID,
        "schemaVersion": IF3_SCHEMA_VERSION,
        "resultId": result_id or str(uuid.uuid4()),
        "analysisRunId": analysis_run_id or str(uuid.uuid4()),
        "sourceDocumentId": source_document_id,
        "sourceDocumentVersion": source_document_version,
        "sourceContentChecksum": source_checksum,
        "status": "UNSUPPORTED",
        "generatedAt": generated,
        "solverName": solver_name,
        "solverVersion": solver_version,
        "analysisSettingsChecksum": analysis_settings_checksum,
        "loadContext": load_context,
        "provenance": _provenance(meta, generated, solver_name, solver_version),
        "diagnostics": [],
        "payload": {},
        "resultKinds": [],
    }

    diagnostics.extend(validate_if3_result_resource(resource))
    resource["status"] = (
        "UNSUPPORTED"
        if source_binding_complete
        else _status_for(raw.get("analysisSummary", {}).get("status"), diagnostics, {})
    )
    resource["diagnostics"] = sort_diagnostics(dedupe_diagnostics(diagnostics))
    checksum_target = copy.deepcopy(resource)
    checksum_target.pop("resultChecksum", None)
    resource["resultChecksum"] = sha256_content_checksum(checksum_target)
    return resource


def normalize_linear_static_result_resource(
    raw_result: dict[str, Any],
    metadata: dict[str, Any] | None,
    *,
    generated_at: str | None = None,
    result_id: str | None = None,
    analysis_run_id: str | None = None,
) -> dict[str, Any]:
    raw = copy.deepcopy(raw_result)
    meta = copy.deepcopy(metadata or {})
    diagnostics: list[dict[str, Any]] = []
    generated = generated_at or _iso_now_millis()
    solver_name = _non_empty_string(meta.get("solverName")) or _raw_solver(raw) or "unknown"
    solver_version = _non_empty_string(meta.get("solverVersion")) or "0.3.0"
    if not SEMVER_PATTERN.match(solver_version):
        diagnostics.append(
            diagnostic(
                "FRAME_RESULT_SOLVER_VERSION_INVALID",
                "solverVersion must be explicit SemVer metadata.",
                path="/solverVersion",
            )
        )
        solver_version = "0.0.0"

    source_document_id = _uuid_or_diagnostic(
        meta.get("sourceDocumentId"),
        diagnostics,
        "/sourceDocumentId",
        "MISSING_SOURCE_BINDING",
        "sourceDocumentId is required and must be a UUID.",
    )
    source_document_version = _positive_int_or_diagnostic(
        meta.get("sourceDocumentVersion"),
        diagnostics,
        "/sourceDocumentVersion",
        "MISSING_SOURCE_BINDING",
        "sourceDocumentVersion is required and must be a positive integer.",
    )
    source_checksum = _checksum_or_diagnostic(
        meta.get("sourceContentChecksum"),
        diagnostics,
        "/sourceContentChecksum",
        "MISSING_SOURCE_BINDING",
        "sourceContentChecksum is required and must be a sha256 content checksum.",
    )

    if "analysisSettings" not in meta:
        diagnostics.append(
            diagnostic(
                "MISSING_ANALYSIS_SETTINGS",
                "analysisSettings metadata is required for IF3 normalization.",
                path="/analysisSettings",
            )
        )
        analysis_settings = None
    else:
        analysis_settings = meta["analysisSettings"]
    analysis_settings_checksum = sha256_content_checksum(analysis_settings)

    load_context, load_context_lookup, load_context_diagnostics = _normalize_load_context(
        meta.get("loadContext")
    )
    diagnostics.extend(load_context_diagnostics)

    raw_status = raw.get("analysisSummary", {}).get("status")
    payload: dict[str, Any] = {}
    result_kinds: list[str] = []
    if raw_status in {"success", "warning"}:
        for key in ("displacements", "reactions", "memberEndForces"):
            if not isinstance(raw.get(key), list):
                diagnostics.append(
                    diagnostic(
                        "PARTIAL_RAW_RESULT",
                        f"Raw linear static result is missing {key}.",
                        severity="warning",
                        path=f"/{key}",
                        result_kind="linearStatic",
                    )
                )
        payload, result_kinds = _normalize_linear_static_payload(raw, load_context_lookup, diagnostics)
    elif raw_status == "failed":
        diagnostics.extend(_raw_errors_to_diagnostics(raw))
    else:
        diagnostics.append(
            diagnostic(
                "UNSUPPORTED_RAW_RESULT_STATUS",
                "Only successful, warning, and failed linear static raw results are supported.",
                path="/analysisSummary/status",
                result_kind="linearStatic",
            )
        )

    if raw.get("analysisSummary", {}).get("analysisType") != "linear_static":
        diagnostics.append(
            diagnostic(
                "UNSUPPORTED_RESULT_KIND",
                "IF3-B1 supports only linear static raw results.",
                path="/analysisSummary/analysisType",
                result_kind="linearStatic",
            )
        )

    resource: dict[str, Any] = {
        "schemaId": IF3_SCHEMA_ID,
        "schemaVersion": IF3_SCHEMA_VERSION,
        "resultId": result_id or str(uuid.uuid4()),
        "analysisRunId": analysis_run_id or str(uuid.uuid4()),
        "sourceDocumentId": source_document_id,
        "sourceDocumentVersion": source_document_version,
        "sourceContentChecksum": source_checksum,
        "status": "SUCCEEDED",
        "generatedAt": generated,
        "solverName": solver_name,
        "solverVersion": solver_version,
        "analysisSettingsChecksum": analysis_settings_checksum,
        "loadContext": load_context,
        "provenance": _provenance(meta, generated, solver_name, solver_version),
        "diagnostics": [],
        "payload": payload,
        "resultKinds": result_kinds,
    }

    diagnostics.extend(validate_if3_result_resource(resource))
    resource["status"] = _status_for(raw_status, diagnostics, payload)
    resource["diagnostics"] = sort_diagnostics(dedupe_diagnostics(diagnostics))
    checksum_target = copy.deepcopy(resource)
    checksum_target.pop("resultChecksum", None)
    resource["resultChecksum"] = sha256_content_checksum(checksum_target)
    return resource


def validate_if3_result_resource(resource: dict[str, Any]) -> list[dict[str, Any]]:
    diagnostics: list[dict[str, Any]] = []
    if resource.get("schemaId") != IF3_SCHEMA_ID:
        diagnostics.append(diagnostic("FRAME_RESULT_SCHEMA_ID_INVALID", "schemaId is invalid.", path="/schemaId"))
    if resource.get("schemaVersion") != IF3_SCHEMA_VERSION:
        diagnostics.append(
            diagnostic("CONTRACT_SCHEMA_VERSION_MAJOR_UNSUPPORTED", "schemaVersion is unsupported.", path="/schemaVersion")
        )
    for path in ("/resultId", "/analysisRunId", "/sourceDocumentId"):
        if not _is_uuid(resource.get(path.removeprefix("/"))):
            diagnostics.append(diagnostic("FRAME_RESULT_UUID_INVALID", "UUID field is invalid.", path=path))
    if not isinstance(resource.get("sourceDocumentVersion"), int) or resource["sourceDocumentVersion"] <= 0:
        diagnostics.append(
            diagnostic(
                "FRAME_RESULT_SOURCE_DOCUMENT_VERSION_INVALID",
                "sourceDocumentVersion must be a positive integer.",
                path="/sourceDocumentVersion",
            )
        )
    for path in ("/sourceContentChecksum", "/analysisSettingsChecksum"):
        if not validate_content_checksum(resource.get(path.removeprefix("/"))):
            diagnostics.append(diagnostic("CONTENT_CHECKSUM_INVALID", "Content checksum is invalid.", path=path))
    if not isinstance(resource.get("payload"), dict):
        diagnostics.append(diagnostic("FRAME_RESULT_PAYLOAD_INVALID", "payload must be an object.", path="/payload"))
    if not isinstance(resource.get("diagnostics"), list):
        diagnostics.append(diagnostic("FRAME_RESULT_DIAGNOSTICS_INVALID", "diagnostics must be an array.", path="/diagnostics"))
    diagnostics.extend(_validate_payload_numbers(resource.get("payload", {})))
    return sort_diagnostics(diagnostics)


def _normalize_load_context(value: Any) -> tuple[dict[str, Any], dict[tuple[str, str], str], list[dict[str, Any]]]:
    diagnostics: list[dict[str, Any]] = []
    lookup: dict[tuple[str, str], str] = {}
    if not isinstance(value, dict) or not isinstance(value.get("entries"), list):
        diagnostics.append(
            diagnostic(
                "MISSING_LOAD_CONTEXT",
                "loadContext.entries metadata is required for IF3 normalization.",
                path="/loadContext/entries",
            )
        )
        return {"entries": []}, lookup, diagnostics

    entries: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, entry in enumerate(value["entries"]):
        path = f"/loadContext/entries/{index}"
        if not isinstance(entry, dict):
            diagnostics.append(diagnostic("LOAD_CONTEXT_ENTRY_INVALID", "loadContext entry must be an object.", path=path))
            continue
        kind = entry.get("kind")
        if kind != "loadCase":
            diagnostics.append(
                diagnostic(
                    "UNSUPPORTED_LOAD_CONTEXT_KIND",
                    "IF3-B1 supports only linear static loadCase context entries.",
                    path=f"{path}/kind",
                )
            )
            continue
        source_id = _non_empty_string(entry.get("sourceId")) or _non_empty_string(entry.get("id"))
        if source_id is None:
            diagnostics.append(diagnostic("LOAD_CONTEXT_SOURCE_ID_MISSING", "loadCase sourceId is required.", path=path))
            continue
        normalized_id = entry["id"] if _is_uuid(entry.get("id")) else _stable_uuid("loadContext", kind, source_id)
        normalized: dict[str, Any] = {"kind": kind, "id": normalized_id}
        label = _non_empty_string(entry.get("label")) or source_id
        normalized["label"] = label
        if validate_content_checksum(entry.get("checksum")):
            normalized["checksum"] = entry["checksum"]
        else:
            normalized["checksum"] = sha256_content_checksum(
                entry.get("definition", {"kind": kind, "sourceId": source_id, "label": label})
            )
        if normalized_id in seen:
            diagnostics.append(diagnostic("FRAME_RESULT_LOAD_CONTEXT_ID_DUPLICATE", "loadContext ids must be unique.", path=f"{path}/id"))
        seen.add(normalized_id)
        lookup[(kind, source_id)] = normalized_id
        entries.append(normalized)
    return {"entries": entries, "requestChecksum": sha256_content_checksum(entries)}, lookup, diagnostics


def _normalize_linear_static_payload(
    raw: dict[str, Any],
    load_context_lookup: dict[tuple[str, str], str],
    diagnostics: list[dict[str, Any]],
) -> tuple[dict[str, Any], list[str]]:
    payload = {
        "nodeDisplacement": {"schemaVersion": IF3_PAYLOAD_SCHEMA_VERSION, "rows": []},
        "supportReaction": {"schemaVersion": IF3_PAYLOAD_SCHEMA_VERSION, "rows": []},
        "memberForce": {"schemaVersion": IF3_PAYLOAD_SCHEMA_VERSION, "rows": []},
    }
    for index, row in enumerate(raw.get("displacements", [])):
        normalized = _row_from_legacy(
            row,
            index,
            kind="nodeDisplacement",
            entity_kind="node",
            entity_source_key="nodeId",
            quantity="displacement",
            unit="m/rad",
            value_keys=("ux", "uy", "uz", "rx", "ry", "rz"),
            load_context_lookup=load_context_lookup,
            diagnostics=diagnostics,
        )
        if normalized:
            payload["nodeDisplacement"]["rows"].append(normalized)
    for index, row in enumerate(raw.get("reactions", [])):
        normalized = _row_from_legacy(
            row,
            index,
            kind="supportReaction",
            entity_kind="support",
            entity_source_key="nodeId",
            quantity="reaction",
            unit="kN/kN_m",
            value_keys=("fx", "fy", "fz", "mx", "my", "mz"),
            load_context_lookup=load_context_lookup,
            diagnostics=diagnostics,
        )
        if normalized:
            payload["supportReaction"]["rows"].append(normalized)
    for index, row in enumerate(raw.get("memberEndForces", [])):
        if not isinstance(row, dict):
            diagnostics.append(diagnostic("FRAME_RESULT_ROW_INVALID", "memberEndForces row must be an object.", path=f"/memberEndForces/{index}"))
            continue
        load_context_id = _load_context_id(row, load_context_lookup, diagnostics, f"/memberEndForces/{index}")
        member_id = _non_empty_string(row.get("memberId"))
        if member_id is None:
            diagnostics.append(diagnostic("FRAME_RESULT_ROW_ENTITY_ID_INVALID", "memberId is required.", path=f"/memberEndForces/{index}/memberId"))
            continue
        values: dict[str, float] = {}
        for end in ("i", "j"):
            end_values = row.get(end)
            if not isinstance(end_values, dict):
                diagnostics.append(diagnostic("FRAME_RESULT_ROW_VALUES_INVALID", "member force end values are required.", path=f"/memberEndForces/{index}/{end}"))
                continue
            for key in ("fx", "fy", "fz", "mx", "my", "mz"):
                numeric = _finite_number(end_values.get(key), diagnostics, f"/memberEndForces/{index}/{end}/{key}")
                if numeric is not None:
                    values[f"{end}.{key}"] = numeric
        normalized = {
            "rowId": _stable_uuid("row", "memberForce", str(index), str(row.get("loadCaseId")), member_id),
            "entityKind": "member",
            "entityId": _stable_uuid("member", member_id),
            "quantity": "memberEndForce",
            "unit": "kN/kN_m",
            "values": values,
        }
        if load_context_id is not None:
            normalized["loadContextId"] = load_context_id
        payload["memberForce"]["rows"].append(normalized)
    return payload, ["nodeDisplacement", "supportReaction", "memberForce"]


def _row_from_legacy(
    row: Any,
    index: int,
    *,
    kind: str,
    entity_kind: str,
    entity_source_key: str,
    quantity: str,
    unit: str,
    value_keys: tuple[str, ...],
    load_context_lookup: dict[tuple[str, str], str],
    diagnostics: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not isinstance(row, dict):
        diagnostics.append(diagnostic("FRAME_RESULT_ROW_INVALID", "result row must be an object.", path=f"/{kind}/rows/{index}"))
        return None
    entity_source_id = _non_empty_string(row.get(entity_source_key))
    if entity_source_id is None:
        diagnostics.append(
            diagnostic("FRAME_RESULT_ROW_ENTITY_ID_INVALID", f"{entity_source_key} is required.", path=f"/{kind}/rows/{index}/{entity_source_key}")
        )
        return None
    values: dict[str, float] = {}
    for key in value_keys:
        numeric = _finite_number(row.get(key), diagnostics, f"/{kind}/rows/{index}/{key}")
        if numeric is not None:
            values[key] = numeric
    normalized = {
        "rowId": _stable_uuid("row", kind, str(index), str(row.get("loadCaseId")), entity_source_id),
        "entityKind": entity_kind,
        "entityId": _stable_uuid(entity_kind, entity_source_id),
        "quantity": quantity,
        "unit": unit,
        "values": values,
    }
    load_context_id = _load_context_id(row, load_context_lookup, diagnostics, f"/{kind}/rows/{index}")
    if load_context_id is not None:
        normalized["loadContextId"] = load_context_id
    return normalized


def _load_context_id(
    row: dict[str, Any],
    load_context_lookup: dict[tuple[str, str], str],
    diagnostics: list[dict[str, Any]],
    path: str,
) -> str | None:
    load_case_id = _non_empty_string(row.get("loadCaseId"))
    if load_case_id is None:
        diagnostics.append(diagnostic("FRAME_RESULT_ROW_LOAD_CONTEXT_MISSING", "loadCaseId is required.", path=f"{path}/loadCaseId"))
        return None
    load_context_id = load_context_lookup.get(("loadCase", load_case_id))
    if load_context_id is None:
        diagnostics.append(
            diagnostic(
                "FRAME_RESULT_ROW_LOAD_CONTEXT_UNBOUND",
                "row loadCaseId is not present in explicit loadContext metadata.",
                path=f"{path}/loadCaseId",
            )
        )
    return load_context_id


def _status_for(raw_status: Any, diagnostics: list[dict[str, Any]], payload: dict[str, Any]) -> str:
    if raw_status == "failed" and not payload:
        return "FAILED"
    if any(item.get("code") == "PARTIAL_RAW_RESULT" for item in diagnostics) and not any(
        item.get("severity") == "error" for item in diagnostics
    ):
        return "PARTIAL"
    if any(str(item.get("code", "")).startswith("UNSUPPORTED_") for item in diagnostics):
        return "UNSUPPORTED"
    if any(item.get("severity") == "error" for item in diagnostics):
        return "INVALID"
    return "SUCCEEDED"


def _raw_errors_to_diagnostics(raw: dict[str, Any]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for error in raw.get("errors", []):
        if not isinstance(error, dict):
            continue
        items.append(
            diagnostic(
                str(error.get("code") or "RAW_SOLVER_ERROR"),
                str(error.get("message") or "Raw solver failed."),
                path=error.get("path") if isinstance(error.get("path"), str) and error.get("path").startswith("/") else "/errors",
                result_kind="linearStatic",
            )
        )
    return items


def _validate_payload_numbers(payload: dict[str, Any]) -> list[dict[str, Any]]:
    diagnostics: list[dict[str, Any]] = []
    for kind, entry in payload.items():
        rows = entry.get("rows") if isinstance(entry, dict) else None
        if not isinstance(rows, list):
            diagnostics.append(diagnostic("FRAME_RESULT_PAYLOAD_ROWS_INVALID", "payload rows must be an array.", path=f"/payload/{kind}/rows"))
            continue
        for row_index, row in enumerate(rows):
            values = row.get("values") if isinstance(row, dict) else None
            if not isinstance(values, dict):
                diagnostics.append(diagnostic("FRAME_RESULT_ROW_VALUES_INVALID", "row values must be an object.", path=f"/payload/{kind}/rows/{row_index}/values"))
                continue
            for key, value in values.items():
                if not isinstance(value, (int, float)) or not math.isfinite(value):
                    diagnostics.append(
                        diagnostic(
                            "INVALID_NUMERIC_RESULT",
                            "result numeric values must be finite numbers.",
                            path=f"/payload/{kind}/rows/{row_index}/values/{key}",
                            result_kind=kind,
                        )
                    )
    return diagnostics


def _finite_number(value: Any, diagnostics: list[dict[str, Any]], path: str) -> float | None:
    if isinstance(value, (int, float)) and math.isfinite(value):
        number = float(value)
        return 0.0 if abs(number) < 1e-14 else number
    diagnostics.append(
        diagnostic(
            "INVALID_NUMERIC_RESULT",
            "result numeric values must be finite numbers.",
            path=path,
            result_kind="linearStatic",
        )
    )
    return None


def _uuid_or_diagnostic(
    value: Any,
    diagnostics: list[dict[str, Any]],
    path: str,
    code: str,
    message: str,
) -> str:
    if _is_uuid(value):
        return str(value).lower()
    diagnostics.append(diagnostic(code, message, path=path))
    return NIL_UUID


def _positive_int_or_diagnostic(
    value: Any,
    diagnostics: list[dict[str, Any]],
    path: str,
    code: str,
    message: str,
) -> int:
    if isinstance(value, int) and value > 0:
        return value
    diagnostics.append(diagnostic(code, message, path=path))
    return 1


def _checksum_or_diagnostic(
    value: Any,
    diagnostics: list[dict[str, Any]],
    path: str,
    code: str,
    message: str,
) -> dict[str, str]:
    if validate_content_checksum(value):
        return copy.deepcopy(value)
    diagnostics.append(diagnostic(code, message, path=path))
    return EMPTY_CHECKSUM


def _provenance(meta: dict[str, Any], generated_at: str, solver_name: str, solver_version: str) -> dict[str, Any]:
    created_by = meta.get("createdBy")
    if not isinstance(created_by, dict):
        created_by = {"actorId": "backend.if3.normalizer", "actorType": "tool"}
    return {
        "createdAt": generated_at,
        "createdBy": {
            "actorId": _non_empty_string(created_by.get("actorId")) or "backend.if3.normalizer",
            "actorType": created_by.get("actorType") if created_by.get("actorType") in {"user", "system", "tool"} else "tool",
        },
        "producer": {
            "toolId": _non_empty_string(meta.get("producerToolId")) or solver_name,
            "toolVersion": solver_version,
            "algorithmVersion": _non_empty_string(meta.get("algorithmVersion")) or "if3-b1-linear-static-normalizer",
        },
    }


def _raw_solver(raw: dict[str, Any]) -> str | None:
    summary = raw.get("analysisSummary")
    if isinstance(summary, dict):
        return _non_empty_string(summary.get("solver"))
    return None


def _is_uuid(value: Any) -> bool:
    return isinstance(value, str) and UUID_PATTERN.match(value) is not None


def _stable_uuid(*parts: str) -> str:
    return str(uuid.uuid5(IF3_UUID_NAMESPACE, ":".join(parts)))


def _non_empty_string(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _iso_now_millis() -> str:
    now = datetime.now(timezone.utc)
    return now.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def load_if3_json_schema() -> dict[str, Any]:
    schema_path = Path(__file__).resolve().parents[2] / "schemas" / "contracts" / "v0.1" / "frame-analysis-result-resource.schema.json"
    import json

    with schema_path.open(encoding="utf-8") as file:
        return _escape_local_def_refs(json.load(file))


def _escape_local_def_refs(value: Any) -> Any:
    if isinstance(value, list):
        return [_escape_local_def_refs(item) for item in value]
    if isinstance(value, dict):
        normalized: dict[str, Any] = {}
        for key, item in value.items():
            if key == "$ref" and isinstance(item, str) and item.startswith("#/$defs/"):
                ref_key = item.removeprefix("#/$defs/")
                normalized[key] = f"#/$defs/{ref_key.replace('~', '~0').replace('/', '~1')}"
            else:
                normalized[key] = _escape_local_def_refs(item)
        return normalized
    return value
