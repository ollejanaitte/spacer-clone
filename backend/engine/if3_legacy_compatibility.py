from __future__ import annotations

from typing import Any


OLD_ANALYSIS_RESULT_POLICY = "READ_OLD_WRITE_TARGET"

IF3_COMPATIBILITY_CLASSES = (
    "IF3_COMPATIBLE_CURRENT",
    "LEGACY_SAFELY_CONSUMABLE",
    "LEGACY_INSUFFICIENT_PROVENANCE",
    "MALFORMED_UNSUPPORTED",
    "STALE",
    "MISSING_REQUIRED_MEMBERS",
)

WRITE_TARGET_REQUIRED_FIELDS = (
    "sourceDocumentId",
    "sourceDocumentVersion",
    "sourceContentChecksumHex",
    "analysisSettingsChecksumHex",
    "provenanceCreatedAt",
    "provenanceActorId",
    "provenanceProducerToolId",
    "provenanceProducerToolVersion",
    "solverName",
    "solverVersion",
)

LINEAR_STATIC_REQUIRED_KINDS = ("nodeDisplacement", "supportReaction", "memberForce")


def evaluate_write_target_eligibility(metadata: dict[str, Any] | None) -> dict[str, Any]:
    missing_fields: list[str] = []
    meta = metadata or {}
    for field in WRITE_TARGET_REQUIRED_FIELDS:
        value = meta.get(field)
        if isinstance(value, (int, float)):
            if not isinstance(value, bool) and value > 0:
                continue
            missing_fields.append(field)
            continue
        if not isinstance(value, str) or not value.strip():
            missing_fields.append(field)

    if missing_fields:
        return {
            "eligible": False,
            "policy": OLD_ANALYSIS_RESULT_POLICY,
            "missingFields": missing_fields,
            "diagnostics": [
                _diagnostic(
                    "WRITE_TARGET_METADATA_INCOMPLETE",
                    "WRITE_TARGET blocked; unknown/unavailable fields: "
                    + ", ".join(missing_fields)
                    + ". Provenance is not invented.",
                )
            ],
        }

    return {
        "eligible": True,
        "policy": OLD_ANALYSIS_RESULT_POLICY,
        "missingFields": [],
        "diagnostics": [
            _diagnostic(
                "WRITE_TARGET_METADATA_COMPLETE",
                "Explicit WRITE_TARGET metadata is complete. Promotion may proceed only through the IF3 normalizer.",
                severity="info",
            )
        ],
    }


def classify_if3_compatibility(
    *,
    resource: dict[str, Any] | None = None,
    availability_status: str | None = None,
    raw_result: dict[str, Any] | None = None,
    legacy_time_history: dict[str, Any] | None = None,
    required_result_kinds: tuple[str, ...] | list[str] | None = None,
    write_target_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if raw_result is not None and resource is None:
        return _assess_legacy_raw(raw_result, write_target_metadata)

    if resource is not None and _is_raw_analysis_result_candidate(resource):
        return _assess_legacy_raw(resource, write_target_metadata)

    if resource is None:
        if legacy_time_history is not None:
            return _assess_legacy_time_history(legacy_time_history, write_target_metadata)
        return _assessment(
            compatibility_class="MALFORMED_UNSUPPORTED",
            authoritative=False,
            state="MISSING",
            write_target=_blocked_write_target(
                [
                    _diagnostic(
                        "MISSING_RESULT_ID",
                        "No FrameAnalysisResultResource or legacy compatibility input is available.",
                    )
                ]
            ),
            diagnostics=[
                _diagnostic(
                    "MISSING_RESULT_ID",
                    "No FrameAnalysisResultResource or legacy compatibility input is available.",
                )
            ],
        )

    status = str(resource.get("status") or "")
    availability = availability_status or _map_status(status)

    if availability == "STALE" or status == "STALE":
        return _assessment(
            compatibility_class="STALE",
            authoritative=False,
            state="STALE",
            write_target=_blocked_write_target(
                [_diagnostic("STALE_RESULT", "Stale IF3 resources must not be rewritten as authoritative.")]
            ),
            diagnostics=[_diagnostic("STALE_RESULT", "Result is stale relative to the current source.")],
            result_ref=_result_ref(resource),
        )

    if availability in {"UNSUPPORTED", "INVALID"} or status in {"UNSUPPORTED", "INVALID"}:
        return _assessment(
            compatibility_class="MALFORMED_UNSUPPORTED",
            authoritative=False,
            state=availability if availability else "INVALID",
            write_target=_blocked_write_target(
                [
                    _diagnostic(
                        "UNSUPPORTED_RESULT_VERSION",
                        "Malformed or unsupported IF3 resources cannot be promoted.",
                    )
                ]
            ),
            diagnostics=[
                _diagnostic(
                    "UNSUPPORTED_RESULT_VERSION",
                    "Resource is malformed, invalid, or unsupported for authoritative consumption.",
                )
            ],
            result_ref=_result_ref(resource),
        )

    required_kinds = tuple(required_result_kinds or LINEAR_STATIC_REQUIRED_KINDS)
    missing_kinds = _missing_required_kinds(resource, required_kinds)
    if missing_kinds:
        return _assessment(
            compatibility_class="MISSING_REQUIRED_MEMBERS",
            authoritative=False,
            state=availability if availability else "INVALID",
            write_target=_blocked_write_target(
                [
                    _diagnostic(
                        "UNSUPPORTED_RESULT_KIND",
                        "Required result members are missing: " + ", ".join(missing_kinds) + ".",
                    )
                ]
            ),
            diagnostics=[
                _diagnostic(
                    "UNSUPPORTED_RESULT_KIND",
                    "Required result members are missing: " + ", ".join(missing_kinds) + ".",
                )
            ],
            result_ref=_result_ref(resource),
        )

    if not _has_usable_provenance(resource):
        return _assessment(
            compatibility_class="LEGACY_INSUFFICIENT_PROVENANCE",
            authoritative=False,
            state=availability if availability else "INVALID",
            write_target=_blocked_write_target(
                [
                    _diagnostic(
                        "MISSING_PROVENANCE",
                        "WRITE_TARGET is blocked because provenance is missing; values are not invented.",
                    )
                ]
            ),
            diagnostics=[_diagnostic("MISSING_PROVENANCE", "Result provenance is missing or incomplete.")],
            result_ref=_result_ref(resource),
        )

    if availability == "VALID" and status == "SUCCEEDED":
        return _assessment(
            compatibility_class="IF3_COMPATIBLE_CURRENT",
            authoritative=True,
            state="VALID",
            write_target={
                "eligible": False,
                "policy": OLD_ANALYSIS_RESULT_POLICY,
                "missingFields": [],
                "diagnostics": [
                    _diagnostic(
                        "IF3_ALREADY_TARGET",
                        "Resource is already an IF3 target; no legacy WRITE_TARGET promotion is required.",
                        severity="info",
                    )
                ],
            },
            diagnostics=[],
            result_ref=_result_ref(resource),
        )

    write_target = evaluate_write_target_eligibility(write_target_metadata)
    return _assessment(
        compatibility_class="LEGACY_INSUFFICIENT_PROVENANCE",
        authoritative=False,
        state=availability if availability else "INVALID",
        write_target=write_target,
        diagnostics=[
            _diagnostic(
                "LEGACY_QUARANTINED",
                "Candidate is not authoritative IF3-compatible; quarantine for authoritative consumers.",
            )
        ],
        result_ref=_result_ref(resource),
    )


def consumer_capabilities_for_class(compatibility_class: str) -> dict[str, dict[str, bool]]:
    if compatibility_class == "IF3_COMPATIBLE_CURRENT":
        shared = _capability(True, True, True, True, False, False)
        return {name: shared for name in ("report", "viewer", "draft", "print", "csv", "pdf")}
    if compatibility_class == "STALE":
        return {
            "report": _capability(True, True, False, False, True, True),
            "viewer": _capability(True, True, False, False, True, False),
            "draft": _capability(True, False, False, False, True, True),
            "print": _capability(True, False, False, False, True, True),
            "csv": _capability(True, False, False, False, True, True),
            "pdf": _capability(True, False, False, False, True, True),
        }
    if compatibility_class == "LEGACY_SAFELY_CONSUMABLE":
        return {
            "report": _capability(True, False, False, False, True, True),
            "viewer": _capability(True, True, False, False, True, False),
            "draft": _capability(True, False, False, False, True, True),
            "print": _capability(True, False, False, False, True, True),
            "csv": _capability(True, False, False, False, True, True),
            "pdf": _capability(True, False, False, False, True, True),
        }
    if compatibility_class in {"LEGACY_INSUFFICIENT_PROVENANCE", "MISSING_REQUIRED_MEMBERS"}:
        return {
            "report": _capability(True, False, False, False, True, True),
            "viewer": _capability(True, True, False, False, True, True),
            "draft": _capability(True, False, False, False, True, True),
            "print": _capability(True, False, False, False, True, True),
            "csv": _capability(True, False, False, False, True, True),
            "pdf": _capability(True, False, False, False, True, True),
        }
    shared = _capability(False, False, False, False, True, True)
    return {name: shared for name in ("report", "viewer", "draft", "print", "csv", "pdf")}


def _assess_legacy_raw(
    raw: dict[str, Any],
    write_target_metadata: dict[str, Any] | None,
) -> dict[str, Any]:
    write_target = evaluate_write_target_eligibility(write_target_metadata)
    if not _is_readable_legacy_analysis_result(raw):
        return _assessment(
            compatibility_class="MALFORMED_UNSUPPORTED",
            authoritative=False,
            state="INVALID",
            write_target=_blocked_write_target(
                [_diagnostic("RAW_ANALYSIS_RESULT_REJECTED", "Legacy AnalysisResult shape is malformed.")]
            ),
            diagnostics=[
                _diagnostic("RAW_ANALYSIS_RESULT_REJECTED", "Legacy AnalysisResult shape is malformed.")
            ],
        )

    if write_target["eligible"]:
        return _assessment(
            compatibility_class="LEGACY_SAFELY_CONSUMABLE",
            authoritative=False,
            state="INVALID",
            write_target=write_target,
            diagnostics=[
                _diagnostic(
                    "RAW_ANALYSIS_RESULT_REJECTED",
                    "Raw AnalysisResult is compatibility input only until normalized and registered as IF3.",
                ),
                _diagnostic(
                    "LEGACY_COMPATIBILITY_INPUT",
                    "Legacy AnalysisResult is readable as compatibility input. Authoritative export remains blocked until WRITE_TARGET normalization.",
                    severity="info",
                ),
            ],
        )

    return _assessment(
        compatibility_class="LEGACY_INSUFFICIENT_PROVENANCE",
        authoritative=False,
        state="INVALID",
        write_target=write_target,
        diagnostics=[
            _diagnostic(
                "RAW_ANALYSIS_RESULT_REJECTED",
                "Raw AnalysisResult cannot be used as an authoritative IF3 consumer input.",
            ),
            _diagnostic(
                "MISSING_PROVENANCE",
                "Legacy result lacks explicit WRITE_TARGET provenance/binding metadata; values are not invented.",
            ),
            _diagnostic(
                "LEGACY_QUARANTINED",
                "Legacy result is quarantined for authoritative consumers due to insufficient provenance/binding.",
            ),
        ],
    )


def _assess_legacy_time_history(
    legacy: dict[str, Any],
    write_target_metadata: dict[str, Any] | None,
) -> dict[str, Any]:
    readable = isinstance(legacy, dict) and isinstance(legacy.get("meta"), dict) and isinstance(
        legacy.get("time"), list
    )
    write_target = evaluate_write_target_eligibility(write_target_metadata)
    if not readable:
        return _assessment(
            compatibility_class="MALFORMED_UNSUPPORTED",
            authoritative=False,
            state="INVALID",
            write_target=_blocked_write_target(
                [_diagnostic("UNSUPPORTED_RESULT_KIND", "Legacy timeHistory payload is malformed.")]
            ),
            diagnostics=[_diagnostic("UNSUPPORTED_RESULT_KIND", "Legacy timeHistory payload is malformed.")],
        )

    compatibility_class = (
        "LEGACY_SAFELY_CONSUMABLE" if write_target["eligible"] else "LEGACY_INSUFFICIENT_PROVENANCE"
    )
    diagnostics = [
        _diagnostic(
            "LEGACY_TIME_HISTORY_COMPATIBILITY",
            "Legacy analysisResults.timeHistory is compatibility input only; not an authoritative IF3 Frame PRINT/CSV source.",
            severity="info",
        )
    ]
    if not write_target["eligible"]:
        diagnostics.append(
            _diagnostic(
                "MISSING_PROVENANCE",
                "Legacy timeHistory lacks explicit WRITE_TARGET provenance/binding metadata; values are not invented.",
            )
        )
        diagnostics.append(
            _diagnostic(
                "LEGACY_QUARANTINED",
                "Legacy timeHistory is quarantined for authoritative Frame consumers.",
            )
        )
    return _assessment(
        compatibility_class=compatibility_class,
        authoritative=False,
        state="INVALID",
        write_target=write_target,
        diagnostics=diagnostics,
    )


def _assessment(
    *,
    compatibility_class: str,
    authoritative: bool,
    state: str,
    write_target: dict[str, Any],
    diagnostics: list[dict[str, Any]],
    result_ref: dict[str, Any] | None = None,
) -> dict[str, Any]:
    merged = _sort_diagnostics([*diagnostics, *write_target.get("diagnostics", [])])
    return {
        "compatibilityClass": compatibility_class,
        "policy": OLD_ANALYSIS_RESULT_POLICY,
        "gate": {
            "state": state,
            "diagnostics": merged,
            "authoritativeOutputAllowed": authoritative and compatibility_class == "IF3_COMPATIBLE_CURRENT",
            "resultRef": result_ref,
        },
        "consumerCapabilities": consumer_capabilities_for_class(compatibility_class),
        "writeTarget": write_target,
        "diagnostics": merged,
    }


def _blocked_write_target(diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "eligible": False,
        "policy": OLD_ANALYSIS_RESULT_POLICY,
        "missingFields": [],
        "diagnostics": diagnostics,
    }


def _capability(
    readable: bool,
    displayable: bool,
    exportable: bool,
    formal_printable: bool,
    recompute_recommended: bool,
    hard_block_authoritative: bool,
) -> dict[str, bool]:
    return {
        "readable": readable,
        "displayable": displayable,
        "exportable": exportable,
        "formalPrintable": formal_printable,
        "recomputeRecommended": recompute_recommended,
        "hardBlockAuthoritative": hard_block_authoritative,
    }


def _diagnostic(code: str, message: str, *, severity: str = "error") -> dict[str, Any]:
    return {
        "code": code,
        "severity": severity,
        "producer": "if3-e.legacy-compatibility",
        "message": message,
    }


def _sort_diagnostics(diagnostics: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        diagnostics,
        key=lambda item: "\0".join(
            [
                str(item.get("code", "")),
                str(item.get("severity", "")),
                str(item.get("producer", "")),
                str(item.get("message", "")),
                str(item.get("path", "")),
            ]
        ),
    )


def _is_raw_analysis_result_candidate(value: Any) -> bool:
    if not isinstance(value, dict):
        return False
    return (
        isinstance(value.get("projectId"), str)
        and "resultId" not in value
        and "schemaId" not in value
        and isinstance(value.get("displacements"), list)
    )


def _is_readable_legacy_analysis_result(value: dict[str, Any]) -> bool:
    return (
        isinstance(value.get("projectId"), str)
        and isinstance(value.get("displacements"), list)
        and isinstance(value.get("reactions"), list)
        and isinstance(value.get("memberEndForces"), list)
    )


def _has_usable_provenance(resource: dict[str, Any]) -> bool:
    provenance = resource.get("provenance")
    if not isinstance(provenance, dict):
        return False
    created_by = provenance.get("createdBy")
    producer = provenance.get("producer")
    return (
        isinstance(provenance.get("createdAt"), str)
        and bool(str(provenance.get("createdAt")).strip())
        and isinstance(created_by, dict)
        and isinstance(created_by.get("actorId"), str)
        and bool(str(created_by.get("actorId")).strip())
        and isinstance(producer, dict)
        and isinstance(producer.get("toolId"), str)
        and bool(str(producer.get("toolId")).strip())
        and isinstance(producer.get("toolVersion"), str)
        and bool(str(producer.get("toolVersion")).strip())
    )


def _missing_required_kinds(resource: dict[str, Any], required_kinds: tuple[str, ...]) -> list[str]:
    payload = resource.get("payload") if isinstance(resource.get("payload"), dict) else {}
    declared = resource.get("resultKinds")
    if not isinstance(declared, list):
        declared = list(payload.keys())
    declared_set = set(declared)
    missing: list[str] = []
    for kind in required_kinds:
        entry = payload.get(kind)
        if kind not in declared_set or not isinstance(entry, dict) or not isinstance(entry.get("rows"), list):
            missing.append(kind)
    return missing


def _map_status(status: str) -> str:
    mapping = {
        "SUCCEEDED": "VALID",
        "FAILED": "FAILED",
        "PARTIAL": "PARTIAL",
        "INVALID": "INVALID",
        "UNSUPPORTED": "UNSUPPORTED",
        "STALE": "STALE",
        "RUNNING": "RUNNING",
        "PENDING": "PENDING",
    }
    return mapping.get(status, "INVALID")


def _result_ref(resource: dict[str, Any]) -> dict[str, Any] | None:
    result_id = resource.get("resultId")
    if not isinstance(result_id, str) or not result_id:
        return None
    checksum = resource.get("resultChecksum")
    hex_digest = checksum.get("hexDigest") if isinstance(checksum, dict) else checksum
    return {
        "resultId": result_id,
        "analysisRunId": resource.get("analysisRunId"),
        "resultChecksum": hex_digest,
    }
