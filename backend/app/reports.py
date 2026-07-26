from __future__ import annotations

import csv
import io
import json
import math
from typing import Any


CSV_HEADERS = {
    "displacements.csv": ["case_id", "node_id", "ux", "uy", "uz", "rx", "ry", "rz"],
    "reactions.csv": [
        "case_id",
        "node_id",
        "fx",
        "fy",
        "fz",
        "mx",
        "my",
        "mz",
    ],
    "member_section_forces.csv": [
        "case_id",
        "member_id",
        "station_x",
        "station_ratio",
        "n",
        "qy",
        "qz",
        "mx",
        "my",
        "mz",
    ],
    "eigen_modes.csv": [
        "mode_no",
        "eigenvalue",
        "circular_frequency",
        "frequency",
        "period",
        "modal_mass",
        "participation_factor_x",
        "participation_factor_y",
        "participation_factor_z",
        "effective_mass_x",
        "effective_mass_y",
        "effective_mass_z",
        "effective_mass_ratio_x",
        "effective_mass_ratio_y",
        "effective_mass_ratio_z",
        "cumulative_effective_mass_ratio_x",
        "cumulative_effective_mass_ratio_y",
        "cumulative_effective_mass_ratio_z",
        "total_mass_x",
        "total_mass_y",
        "total_mass_z",
    ],
    "influence_lines.csv": [
        "case_id",
        "line_id",
        "target_id",
        "target_type",
        "node_id",
        "member_id",
        "component",
        "end",
        "station_index",
        "station",
        "ratio",
        "x",
        "y",
        "z",
        "value",
    ],
    "moving_load.csv": [
        "section",
        "case_id",
        "target_id",
        "criterion",
        "load_id",
        "line_id",
        "member_id",
        "station_index",
        "station",
        "ratio",
        "x",
        "y",
        "z",
        "value",
        "influence_value",
        "load_magnitude",
        "unit",
    ],
}


def build_result_exports(result: dict[str, Any]) -> dict[str, str]:
    ensure_finite(result)
    return {
        "result.json": json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2)
        + "\n",
        "displacements.csv": displacements_csv(result),
        "reactions.csv": reactions_csv(result),
        "member_section_forces.csv": member_section_forces_csv(result),
        "eigen_modes.csv": eigen_modes_csv(result),
        "influence_lines.csv": influence_lines_csv(result),
        "moving_load.csv": moving_load_csv(result),
    }


class If3AuthoritativeExportBlockedError(RuntimeError):
    def __init__(self, gate: dict[str, Any]) -> None:
        super().__init__("IF3 authoritative export is blocked.")
        self.gate = gate


_AUTHORITATIVE_ALLOW_STATUSES = frozenset({"VALID"})
_IF3_PRINT_SUPPORTED_RESULT_KINDS = (
    "nodeDisplacement",
    "supportReaction",
    "memberForce",
)


def evaluate_if3_print_catalog(resource: dict[str, Any]) -> dict[str, Any]:
    payload = resource.get("payload")
    payload_catalog = payload if isinstance(payload, dict) else {}
    declared = resource.get("resultKinds")
    declared_kinds = (
        [kind for kind in declared if isinstance(kind, str)]
        if isinstance(declared, list)
        else [kind for kind in payload_catalog if isinstance(kind, str)]
    )
    catalog_kinds = list(
        dict.fromkeys([*_IF3_PRINT_SUPPORTED_RESULT_KINDS, *declared_kinds, *payload_catalog.keys()])
    )
    entries: list[dict[str, Any]] = []
    diagnostics: list[dict[str, Any]] = []

    for result_kind in catalog_kinds:
        is_present = (
            result_kind in declared_kinds
            and isinstance(payload_catalog.get(result_kind), dict)
            and isinstance(payload_catalog[result_kind].get("rows"), list)
        )
        if result_kind in _IF3_PRINT_SUPPORTED_RESULT_KINDS and is_present:
            entry_diagnostics: list[dict[str, Any]] = []
            status = "SUPPORTED"
            consumers = ["report", "print", "csv", "pdf"]
        elif result_kind in _IF3_PRINT_SUPPORTED_RESULT_KINDS:
            entry_diagnostics = [
                _if3_print_catalog_diagnostic(
                    "PRINT_CATALOG_REQUIRED_RESULT_MISSING",
                    f"PRINT catalog requires the {result_kind} payload member.",
                    result_kind,
                )
            ]
            status = "MISSING"
            consumers = []
        else:
            entry_diagnostics = [
                _if3_print_catalog_diagnostic(
                    "PRINT_CATALOG_RESULT_KIND_UNSUPPORTED",
                    f"PRINT catalog does not support the declared {result_kind} result kind.",
                    result_kind,
                )
            ]
            status = "UNSUPPORTED"
            consumers = []
        entries.append(
            {
                "resultKind": result_kind,
                "status": status,
                "consumers": consumers,
                "diagnostics": entry_diagnostics,
            }
        )
        diagnostics.extend(entry_diagnostics)

    return {
        "entries": entries,
        "diagnostics": _sort_gate_diagnostics(diagnostics),
        "ready": not any(item.get("severity") == "error" for item in diagnostics),
    }


def evaluate_if3_authoritative_export_gate(
    resource: dict[str, Any] | None,
    availability_status: str,
    *,
    source_document: dict[str, Any] | None = None,
) -> dict[str, Any]:
    diagnostics: list[dict[str, Any]] = []
    if resource is None:
        diagnostics.append(
            {
                "code": "MISSING_RESULT_ID",
                "severity": "error",
                "producer": "if3-d.reports-gate",
                "message": "FrameAnalysisResultResource is required for authoritative export.",
            }
        )
        return _authoritative_gate_result(
            state=availability_status if availability_status else "MISSING",
            diagnostics=diagnostics,
            authoritative_output_allowed=False,
            result_ref=None,
        )

    if _is_raw_analysis_result_candidate(resource):
        diagnostics.append(
            {
                "code": "RAW_ANALYSIS_RESULT_REJECTED",
                "severity": "error",
                "producer": "if3-d.reports-gate",
                "message": "Raw AnalysisResult cannot be used as an authoritative IF3 export input.",
            }
        )
        return _authoritative_gate_result(
            state="INVALID",
            diagnostics=diagnostics,
            authoritative_output_allowed=False,
            result_ref=None,
        )

    result_ref = {
        "resultId": resource.get("resultId"),
        "analysisRunId": resource.get("analysisRunId"),
        "resultChecksum": (resource.get("resultChecksum") or {}).get("hexDigest")
        if isinstance(resource.get("resultChecksum"), dict)
        else resource.get("resultChecksum"),
    }
    if not isinstance(resource.get("resultId"), str) or not resource.get("resultId"):
        diagnostics.append(
            {
                "code": "MISSING_RESULT_ID",
                "severity": "error",
                "producer": "if3-d.reports-gate",
                "message": "resultId is required for authoritative export.",
            }
        )
    if resource.get("status") != "SUCCEEDED":
        diagnostics.append(
            {
                "code": "INVALID_RESULT_STATUS",
                "severity": "error",
                "producer": "if3-d.reports-gate",
                "message": "Authoritative export requires a SUCCEEDED IF3 resource.",
            }
        )
    if resource.get("provenance") in (None, {}):
        diagnostics.append(
            {
                "code": "MISSING_PROVENANCE",
                "severity": "error",
                "producer": "if3-d.reports-gate",
                "message": "Authoritative export requires result provenance.",
            }
        )
    if source_document is not None:
        for field, code, message in (
            ("sourceDocumentId", "SOURCE_DOCUMENT_MISMATCH", "sourceDocumentId must match the current frame document."),
            ("sourceDocumentVersion", "STALE_RESULT", "sourceDocumentVersion must match the current frame document."),
            ("sourceContentChecksum", "SOURCE_CHECKSUM_MISMATCH", "sourceContentChecksum must match the current frame document."),
        ):
            if resource.get(field) != source_document.get(
                "documentId" if field == "sourceDocumentId" else "revisionId" if field == "sourceDocumentVersion" else "contentChecksum"
            ):
                diagnostics.append(
                    {
                        "code": code,
                        "severity": "error",
                        "producer": "if3-d.reports-gate",
                        "message": message,
                    }
                )

    authoritative_output_allowed = (
        availability_status in _AUTHORITATIVE_ALLOW_STATUSES
        and resource.get("status") == "SUCCEEDED"
        and not diagnostics
    )
    return _authoritative_gate_result(
        state=availability_status,
        diagnostics=_sort_gate_diagnostics(diagnostics),
        authoritative_output_allowed=authoritative_output_allowed,
        result_ref=result_ref if isinstance(resource.get("resultId"), str) else None,
    )


def build_authoritative_result_exports_from_if3(
    resource: dict[str, Any],
    availability_status: str,
    *,
    source_document: dict[str, Any] | None = None,
    load_case_labels: dict[str, str] | None = None,
) -> dict[str, str]:
    gate = evaluate_if3_authoritative_export_gate(
        resource,
        availability_status,
        source_document=source_document,
    )
    if not gate["authoritativeOutputAllowed"]:
        raise If3AuthoritativeExportBlockedError(gate)
    catalog = evaluate_if3_print_catalog(resource)
    if not catalog["ready"]:
        raise If3AuthoritativeExportBlockedError(
            {
                **gate,
                "authoritativeOutputAllowed": False,
                "diagnostics": _sort_gate_diagnostics(
                    [*gate["diagnostics"], *catalog["diagnostics"]]
                ),
            }
        )
    legacy_result = extract_linear_static_analysis_result_from_if3_resource(
        resource,
        load_case_labels=load_case_labels,
    )
    exports = build_result_exports(legacy_result)
    exports["result.json"] = (
        json.dumps(resource, ensure_ascii=False, allow_nan=False, indent=2) + "\n"
    )
    return exports


def extract_linear_static_analysis_result_from_if3_resource(
    resource: dict[str, Any],
    *,
    load_case_labels: dict[str, str] | None = None,
) -> dict[str, Any]:
    payload = resource.get("payload", {})
    load_context_lookup = _build_load_case_label_lookup(resource, load_case_labels)
    displacements = [
        {
            "loadCaseId": _resolve_load_case_id(row.get("loadContextId"), load_context_lookup),
            "nodeId": row.get("entityId", ""),
            "ux": (row.get("values") or {}).get("ux", 0),
            "uy": (row.get("values") or {}).get("uy", 0),
            "uz": (row.get("values") or {}).get("uz", 0),
            "rx": (row.get("values") or {}).get("rx", 0),
            "ry": (row.get("values") or {}).get("ry", 0),
            "rz": (row.get("values") or {}).get("rz", 0),
        }
        for row in (payload.get("nodeDisplacement") or {}).get("rows", [])
        if isinstance(row, dict)
    ]
    reactions = [
        {
            "loadCaseId": _resolve_load_case_id(row.get("loadContextId"), load_context_lookup),
            "nodeId": row.get("entityId", ""),
            "fx": (row.get("values") or {}).get("fx", 0),
            "fy": (row.get("values") or {}).get("fy", 0),
            "fz": (row.get("values") or {}).get("fz", 0),
            "mx": (row.get("values") or {}).get("mx", 0),
            "my": (row.get("values") or {}).get("my", 0),
            "mz": (row.get("values") or {}).get("mz", 0),
            "constrainedDofs": [],
        }
        for row in (payload.get("supportReaction") or {}).get("rows", [])
        if isinstance(row, dict)
    ]
    member_end_forces = [
        {
            "loadCaseId": _resolve_load_case_id(row.get("loadContextId"), load_context_lookup),
            "memberId": row.get("entityId", ""),
            "coordinateSystem": "local",
            "i": _parse_end_force(row.get("values") or {}, "i"),
            "j": _parse_end_force(row.get("values") or {}, "j"),
        }
        for row in (payload.get("memberForce") or {}).get("rows", [])
        if isinstance(row, dict)
    ]
    return {
        "projectId": resource.get("sourceDocumentId", ""),
        "schemaVersion": "1.0.0",
        "analysisSummary": {
            "analysisType": "linear_static",
            "status": "success",
            "startedAt": resource.get("generatedAt", ""),
            "finishedAt": resource.get("generatedAt", ""),
            "durationMs": 0,
            "nodeCount": len(displacements),
            "memberCount": len(member_end_forces),
            "loadCaseCount": len((resource.get("loadContext") or {}).get("entries", [])),
            "totalDof": 0,
            "freeDof": 0,
            "constrainedDof": 0,
            "solver": resource.get("solverName", "scipy_sparse"),
        },
        "displacements": displacements,
        "reactions": reactions,
        "memberEndForces": member_end_forces,
        "warnings": [],
        "errors": [],
    }


def _authoritative_gate_result(
    *,
    state: str,
    diagnostics: list[dict[str, Any]],
    authoritative_output_allowed: bool,
    result_ref: dict[str, Any] | None,
) -> dict[str, Any]:
    return {
        "state": state,
        "diagnostics": diagnostics,
        "authoritativeOutputAllowed": authoritative_output_allowed,
        "resultRef": result_ref,
    }


def _is_raw_analysis_result_candidate(value: dict[str, Any]) -> bool:
    return (
        isinstance(value.get("projectId"), str)
        and "resultId" not in value
        and "schemaId" not in value
        and isinstance(value.get("displacements"), list)
    )


def _build_load_case_label_lookup(
    resource: dict[str, Any],
    load_case_labels: dict[str, str] | None,
) -> dict[str, str]:
    lookup: dict[str, str] = {}
    entries = (resource.get("loadContext") or {}).get("entries", [])
    if isinstance(entries, list):
        for entry in entries:
            if not isinstance(entry, dict) or entry.get("kind") != "loadCase":
                continue
            entry_id = entry.get("id")
            if not isinstance(entry_id, str):
                continue
            explicit = (load_case_labels or {}).get(entry_id)
            lookup[entry_id] = explicit or entry.get("label") or entry_id
    return lookup


def _resolve_load_case_id(load_context_id: Any, lookup: dict[str, str]) -> str:
    if not isinstance(load_context_id, str):
        return ""
    return lookup.get(load_context_id, load_context_id)


def _parse_end_force(values: dict[str, Any], end: str) -> dict[str, float]:
    return {
        "fx": float(values.get(f"{end}.fx", 0) or 0),
        "fy": float(values.get(f"{end}.fy", 0) or 0),
        "fz": float(values.get(f"{end}.fz", 0) or 0),
        "mx": float(values.get(f"{end}.mx", 0) or 0),
        "my": float(values.get(f"{end}.my", 0) or 0),
        "mz": float(values.get(f"{end}.mz", 0) or 0),
    }


def _if3_print_catalog_diagnostic(
    code: str,
    message: str,
    result_kind: str,
) -> dict[str, Any]:
    return {
        "code": code,
        "severity": "error",
        "producer": "pr40.print-catalog",
        "message": message,
        "path": f"/payload/{result_kind}",
        "resultKind": result_kind,
    }


def _sort_gate_diagnostics(diagnostics: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        diagnostics,
        key=lambda item: (
            str(item.get("code", "")),
            str(item.get("severity", "")),
            str(item.get("producer", "")),
            str(item.get("message", "")),
            str(item.get("path", "")),
        ),
    )


def displacements_csv(result: dict[str, Any]) -> str:
    rows = [
        displacement_row(row.get("loadCaseId", ""), row)
        for row in result.get("displacements", [])
    ]
    for mode in result.get("eigenResult", {}).get("modes", []):
        rows.extend(
            displacement_row(f"Mode {mode.get('modeNo', '')}", row)
            for row in mode.get("shape", [])
        )
    response = result.get("responseSpectrumResult")
    if isinstance(response, dict):
        for mode in response.get("modalResults", []):
            rows.extend(
                displacement_row(f"Mode {mode.get('modeNo', '')}", row)
                for row in mode.get("displacements", [])
            )
        combined = response.get("combinedResult", {})
        rows.extend(
            displacement_row(combined.get("method", "SRSS"), row)
            for row in combined.get("displacements", [])
        )
    return write_csv(CSV_HEADERS["displacements.csv"], rows)


def reactions_csv(result: dict[str, Any]) -> str:
    rows = [
        reaction_row(row.get("loadCaseId", ""), row)
        for row in result.get("reactions", [])
    ]
    response = result.get("responseSpectrumResult")
    if isinstance(response, dict):
        for mode in response.get("modalResults", []):
            rows.extend(
                reaction_row(f"Mode {mode.get('modeNo', '')}", row)
                for row in mode.get("reactions", [])
            )
        combined = response.get("combinedResult", {})
        rows.extend(
            reaction_row(combined.get("method", "SRSS"), row)
            for row in combined.get("reactions", [])
        )
    return write_csv(CSV_HEADERS["reactions.csv"], rows)


def member_section_forces_csv(result: dict[str, Any]) -> str:
    output_rows: list[dict[str, Any]] = []
    for row in result.get("memberEndForces", []):
        output_rows.extend(
            [
                member_end_force_row(row.get("loadCaseId", ""), row.get("memberId", ""), 0, row.get("i", {})),
                member_end_force_row(row.get("loadCaseId", ""), row.get("memberId", ""), 1, row.get("j", {})),
            ]
        )
    response = result.get("responseSpectrumResult")
    if isinstance(response, dict):
        for mode in response.get("modalResults", []):
            output_rows.extend(
                member_section_force_rows(
                    f"Mode {mode.get('modeNo', '')}",
                    mode.get("memberSectionForces", []),
                )
            )
        combined = response.get("combinedResult", {})
        output_rows.extend(
            member_section_force_rows(
                combined.get("method", "SRSS"),
                combined.get("memberSectionForces", []),
            )
        )
    return write_csv(CSV_HEADERS["member_section_forces.csv"], output_rows)


def eigen_modes_csv(result: dict[str, Any]) -> str:
    eigen = result.get("eigenResult")
    if not isinstance(eigen, dict):
        return write_csv(CSV_HEADERS["eigen_modes.csv"], [])
    totals = directional_map(eigen.get("totalMassByDirection", []))
    rows = []
    for mode in eigen.get("modes", []):
        participation = directional_map(mode.get("participationFactors", []))
        ratios = directional_map(mode.get("effectiveMassRatios", []))
        masses = directional_map(mode.get("effectiveMasses", []))
        cumulative = directional_map(mode.get("cumulativeEffectiveMassRatios", []))
        rows.append({
            "mode_no": mode.get("modeNo", ""),
            "eigenvalue": mode.get("eigenvalue", ""),
            "circular_frequency": mode.get("circularFrequency", ""),
            "frequency": mode.get("frequency", ""),
            "period": mode.get("period", ""),
            "modal_mass": mode.get("modalMass", ""),
            "participation_factor_x": participation.get("X", ""),
            "participation_factor_y": participation.get("Y", ""),
            "participation_factor_z": participation.get("Z", ""),
            "effective_mass_x": masses.get("X", ""),
            "effective_mass_y": masses.get("Y", ""),
            "effective_mass_z": masses.get("Z", ""),
            "effective_mass_ratio_x": ratios.get("X", ""),
            "effective_mass_ratio_y": ratios.get("Y", ""),
            "effective_mass_ratio_z": ratios.get("Z", ""),
            "cumulative_effective_mass_ratio_x": cumulative.get("X", ""),
            "cumulative_effective_mass_ratio_y": cumulative.get("Y", ""),
            "cumulative_effective_mass_ratio_z": cumulative.get("Z", ""),
            "total_mass_x": totals.get("X", ""),
            "total_mass_y": totals.get("Y", ""),
            "total_mass_z": totals.get("Z", ""),
        })
    return write_csv(CSV_HEADERS["eigen_modes.csv"], rows)


def directional_map(items: Any) -> dict[str, Any]:
    if not isinstance(items, list):
        return {}
    return {str(item.get("direction", "")): item.get("value", "") for item in items if isinstance(item, dict)}


def influence_lines_csv(result: dict[str, Any]) -> str:
    influence = result.get("influenceResult")
    if not isinstance(influence, dict):
        return write_csv(CSV_HEADERS["influence_lines.csv"], [])

    stations = influence.get("stations", [])
    targets = {
        str(target.get("id", "")): target
        for target in influence.get("targets", [])
        if isinstance(target, dict)
    }
    line = influence.get("line", {})
    rows: list[dict[str, Any]] = []

    for target_result in influence.get("targetResults", []):
        values = target_result.get("values", [])
        if len(values) != len(stations):
            raise ValueError(
                "Influence target result values length must match stations length."
            )
        target_id = str(target_result.get("targetId", ""))
        target = targets.get(target_id, {})
        for station, value in zip(stations, values, strict=True):
            position = station.get("position", {})
            rows.append(
                {
                    "case_id": influence.get("caseId", ""),
                    "line_id": line.get("id", ""),
                    "target_id": target_id,
                    "target_type": target.get("type", ""),
                    "node_id": target.get("nodeId", ""),
                    "member_id": target.get("memberId", ""),
                    "component": target.get("component", ""),
                    "end": target.get("end", ""),
                    "station_index": station.get("stationIndex", ""),
                    "station": station.get("station", ""),
                    "ratio": station.get("ratio", ""),
                    "x": position.get("x", ""),
                    "y": position.get("y", ""),
                    "z": position.get("z", ""),
                    "value": value,
                }
            )

    return write_csv(CSV_HEADERS["influence_lines.csv"], rows)


def moving_load_csv(result: dict[str, Any]) -> str:
    moving = result.get("movingLoadResult")
    if not isinstance(moving, dict):
        return write_csv(CSV_HEADERS["moving_load.csv"], [])
    case_id = str(moving.get("caseId", ""))
    live_load = moving.get("liveLoad", {}) if isinstance(moving.get("liveLoad"), dict) else {}
    line = moving.get("line", {}) if isinstance(moving.get("line"), dict) else {}
    rows: list[dict[str, Any]] = [
        {
            "section": "MovingLoadSummary",
            "case_id": case_id,
            "load_id": live_load.get("id", ""),
            "line_id": line.get("id", ""),
            "member_id": line.get("memberId", ""),
            "station_index": line.get("stationCount", ""),
            "load_magnitude": live_load.get("magnitude", ""),
            "unit": live_load.get("unit", ""),
        }
    ]
    rows.extend(moving_load_history_rows(moving, case_id, live_load, line))
    rows.extend(moving_load_envelope_rows(moving, case_id, live_load, line))
    rows.extend(moving_load_worst_case_rows(moving, case_id, live_load, line))
    return write_csv(CSV_HEADERS["moving_load.csv"], rows)


def moving_load_history_rows(
    moving: dict[str, Any],
    case_id: str,
    live_load: dict[str, Any],
    line: dict[str, Any],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for history in moving.get("movingLoadHistory") or []:
        position = history.get("position", {})
        for response in history.get("responses", []):
            rows.append(
                {
                    "section": "MovingLoadHistory",
                    "case_id": case_id,
                    "target_id": response.get("targetId", ""),
                    "load_id": live_load.get("id", ""),
                    "line_id": line.get("id", ""),
                    "member_id": line.get("memberId", ""),
                    "station": history.get("station", ""),
                    "ratio": history.get("ratio", ""),
                    "x": position.get("x", ""),
                    "y": position.get("y", ""),
                    "z": position.get("z", ""),
                    "value": response.get("value", ""),
                    "load_magnitude": live_load.get("magnitude", ""),
                    "unit": live_load.get("unit", ""),
                }
            )
    return rows


def moving_load_envelope_rows(
    moving: dict[str, Any],
    case_id: str,
    live_load: dict[str, Any],
    line: dict[str, Any],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    envelope = moving.get("envelopeResult", {})
    if not isinstance(envelope, dict):
        return rows
    for item in envelope.get("items", []):
        target_id = item.get("targetId", "")
        for criterion in ("max", "min", "absMax"):
            extreme = item.get(criterion, {})
            position = extreme.get("position", {}) if isinstance(extreme, dict) else {}
            rows.append(
                {
                    "section": "Envelope",
                    "case_id": case_id,
                    "target_id": target_id,
                    "criterion": criterion,
                    "load_id": live_load.get("id", ""),
                    "line_id": line.get("id", ""),
                    "member_id": line.get("memberId", ""),
                    "station_index": extreme.get("stationIndex", ""),
                    "station": extreme.get("station", ""),
                    "ratio": extreme.get("ratio", ""),
                    "x": position.get("x", ""),
                    "y": position.get("y", ""),
                    "z": position.get("z", ""),
                    "value": extreme.get("value", ""),
                    "load_magnitude": live_load.get("magnitude", ""),
                    "unit": live_load.get("unit", ""),
                }
            )
    return rows


def moving_load_worst_case_rows(
    moving: dict[str, Any],
    case_id: str,
    live_load: dict[str, Any],
    line: dict[str, Any],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for worst in moving.get("worstCaseLoadingPositions", []):
        position = worst.get("position", {})
        rows.append(
            {
                "section": "WorstCaseLoadingPosition",
                "case_id": case_id,
                "target_id": worst.get("targetId", ""),
                "criterion": worst.get("criterion", ""),
                "load_id": live_load.get("id", ""),
                "line_id": line.get("id", ""),
                "member_id": line.get("memberId", ""),
                "station_index": worst.get("stationIndex", ""),
                "station": worst.get("station", ""),
                "ratio": worst.get("ratio", ""),
                "x": position.get("x", ""),
                "y": position.get("y", ""),
                "z": position.get("z", ""),
                "value": worst.get("value", ""),
                "influence_value": worst.get("influenceValue", ""),
                "load_magnitude": live_load.get("magnitude", ""),
                "unit": live_load.get("unit", ""),
            }
        )
    return rows


def displacement_row(case_id: str, row: dict[str, Any]) -> dict[str, Any]:
    return {
        "case_id": case_id,
        "node_id": row.get("nodeId", ""),
        "ux": row.get("ux", 0.0),
        "uy": row.get("uy", 0.0),
        "uz": row.get("uz", 0.0),
        "rx": row.get("rx", 0.0),
        "ry": row.get("ry", 0.0),
        "rz": row.get("rz", 0.0),
    }


def reaction_row(case_id: str, row: dict[str, Any]) -> dict[str, Any]:
    return {
        "case_id": case_id,
        "node_id": row.get("nodeId", ""),
        "fx": row.get("fx", 0.0),
        "fy": row.get("fy", 0.0),
        "fz": row.get("fz", 0.0),
        "mx": row.get("mx", 0.0),
        "my": row.get("my", 0.0),
        "mz": row.get("mz", 0.0),
    }


def member_end_force_row(
    case_id: str,
    member_id: str,
    station: float,
    forces: dict[str, Any],
) -> dict[str, Any]:
    return {
        "case_id": case_id,
        "member_id": member_id,
        "station_x": station,
        "station_ratio": station,
        "n": forces.get("fx", 0.0),
        "qy": forces.get("fy", 0.0),
        "qz": forces.get("fz", 0.0),
        "mx": forces.get("mx", 0.0),
        "my": forces.get("my", 0.0),
        "mz": forces.get("mz", 0.0),
    }


def member_section_force_rows(case_id: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, Any], dict[str, Any]] = {}
    for row in rows:
        key = (str(row.get("memberId", "")), row.get("station", 0.0))
        output_row = grouped.setdefault(
            key,
            {
                "case_id": case_id,
                "member_id": key[0],
                "station_x": key[1],
                "station_ratio": key[1],
                "n": "",
                "qy": "",
                "qz": "",
                "mx": "",
                "my": "",
                "mz": "",
            },
        )
        column = component_column(str(row.get("component", "")))
        if column:
            output_row[column] = row.get("value", 0.0)
    return list(grouped.values())


def component_column(component: str) -> str | None:
    return {
        "N": "n",
        "Qy": "qy",
        "Qz": "qz",
        "Mx": "mx",
        "My": "my",
        "Mz": "mz",
    }.get(component)


def write_csv(headers: list[str], rows: list[dict[str, Any]]) -> str:
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({header: csv_value(row.get(header, "")) for header in headers})
    return buffer.getvalue()


def csv_value(value: Any) -> Any:
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("CSV value contains NaN or Infinity.")
        return value
    return value


def ensure_finite(value: Any) -> None:
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError("Result contains NaN or Infinity.")
    if isinstance(value, dict):
        for item in value.values():
            ensure_finite(item)
    elif isinstance(value, list):
        for item in value:
            ensure_finite(item)
