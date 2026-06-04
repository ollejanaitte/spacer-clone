from __future__ import annotations

import math
from typing import Any


REL_TOL = 1e-5
ABS_TOL_ZERO = 1e-9


def assert_close(
    actual: float,
    expected: float,
    *,
    rel_tol: float = REL_TOL,
    abs_tol: float = ABS_TOL_ZERO,
) -> None:
    assert math.isclose(actual, expected, rel_tol=rel_tol, abs_tol=abs_tol), (
        f"actual={actual!r}, expected={expected!r}, rel_tol={rel_tol}, abs_tol={abs_tol}"
    )


def assert_no_non_finite_numbers(value: Any, path: str = "$") -> None:
    if isinstance(value, float):
        assert math.isfinite(value), f"Non-finite number at {path}: {value!r}"
    elif isinstance(value, dict):
        for key, child in value.items():
            assert_no_non_finite_numbers(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            assert_no_non_finite_numbers(child, f"{path}[{index}]")


def by_id(rows: list[dict[str, Any]], id_key: str, id_value: str) -> dict[str, Any]:
    for row in rows:
        if row.get(id_key) == id_value:
            return row
    raise AssertionError(f"Could not find {id_key}={id_value!r} in rows.")


def error_codes(result_or_validation: Any) -> set[str]:
    if isinstance(result_or_validation, dict):
        errors = result_or_validation.get("errors", [])
        if "result" in result_or_validation:
            errors = result_or_validation["result"].get("errors", [])
    else:
        errors = getattr(result_or_validation, "errors", [])
    return {
        error.get("code") if isinstance(error, dict) else getattr(error, "code", None)
        for error in errors
    }
