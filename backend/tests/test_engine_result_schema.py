from __future__ import annotations

import pytest

from .assertions import assert_no_non_finite_numbers
from .sample_models import cantilever_tip_load

jsonschema = pytest.importorskip(
    "jsonschema", reason="jsonschema is required for result schema tests."
)


def test_engine_success_result_matches_result_schema(
    engine_runner, result_schema: dict
) -> None:
    payload = engine_runner(cantilever_tip_load())
    result = payload.get("result", payload)

    assert_no_non_finite_numbers(result)
    validator = jsonschema.Draft202012Validator(result_schema)
    errors = sorted(validator.iter_errors(result), key=lambda error: error.path)

    assert errors == []
