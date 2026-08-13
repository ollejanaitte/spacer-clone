"""Load combination synthesis (Phase 7-01 C FROZEN / Phase 7-02 WP-H).

COMBO-1 = sum(factor * case_result) computed as linear superposition of the
per-case raw solver results (FROZEN load_combination §4: per-case solve then
linear synthesis). Deterministic and numeric-exact for linear static analysis.
"""

from __future__ import annotations

from typing import Any

from .results import clean

COMBO_1 = "COMBO-1"


def _row_case_id(row: dict[str, Any]) -> str:
    return str(row.get("loadCaseId") or row.get("caseId") or "")


def synthesize_combination_rows(
    rows: list[dict[str, Any]],
    factors: dict[str, float],
    result_case_id: str,
) -> list[dict[str, Any]]:
    """Superpose per-case result rows into a combined result-case row set.

    Rows of the same entity (node / member / support) are summed with the given
    factors. Numeric component keys are detected by finite-number values.
    """
    combined: dict[tuple[str, str], dict[str, Any]] = {}

    for row in rows:
        case_id = _row_case_id(row)
        factor = factors.get(case_id, 0.0)
        if factor == 0.0:
            continue
        key = _entity_key(row)
        if key not in combined:
            # Seed with scalar metadata only; numeric + nested component values
            # are accumulated solely through the factor-sum loop below.
            combined[key] = {
                **{
                    k: v
                    for k, v in row.items()
                    if not isinstance(v, (int, float)) and not isinstance(v, dict)
                },
                "loadCaseId": result_case_id,
                "combinationId": result_case_id,
            }
        target = combined[key]
        for field, value in row.items():
            if field in ("loadCaseId", "combinationId"):
                continue
            if isinstance(value, dict):
                _accumulate_nested(target, field, value, factor)
            elif isinstance(value, (int, float)):
                target[field] = clean(float(target.get(field, 0.0)) + factor * float(value))

    return list(combined.values())


def _accumulate_nested(
    target: dict[str, Any],
    field: str,
    value: dict[str, Any],
    factor: float,
) -> None:
    """Accumulate numeric leaves of a nested component object (member i/j)."""
    if field not in target or not isinstance(target[field], dict):
        target[field] = {}
    target_obj = target[field]
    for sub_field, sub_value in value.items():
        if isinstance(sub_value, dict):
            _accumulate_nested(target_obj, sub_field, sub_value, factor)
        elif isinstance(sub_value, (int, float)):
            target_obj[sub_field] = clean(
                float(target_obj.get(sub_field, 0.0)) + factor * float(sub_value)
            )


_NON_COMPONENT_KEYS = {"id", "rowId", "entityId", "nodeId", "memberId", "supportId"}


def _entity_key(row: dict[str, Any]) -> tuple[str, str]:
    for key in ("entityId", "nodeId", "memberId", "supportId", "rowId", "id"):
        if key in row:
            return (key, str(row[key]))
    return ("row", str(row))


def synthesize_combo1_result(raw_result: dict[str, Any], factors: dict[str, float]) -> dict[str, Any]:
    """Build the COMBO-1 result envelope from per-case raw result rows."""
    combo_rows = synthesize_combination_rows(
        list(raw_result.get("displacements", [])),
        factors,
        COMBO_1,
    )
    reaction_rows = synthesize_combination_rows(
        list(raw_result.get("reactions", [])),
        factors,
        COMBO_1,
    )
    member_rows = synthesize_combination_rows(
        list(raw_result.get("memberEndForces", [])),
        factors,
        COMBO_1,
    )
    return {
        "loadCaseId": COMBO_1,
        "displacements": combo_rows,
        "reactions": reaction_rows,
        "memberEndForces": member_rows,
    }


__all__ = ["COMBO_1", "synthesize_combination_rows", "synthesize_combo1_result"]
