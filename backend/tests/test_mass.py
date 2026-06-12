from __future__ import annotations

from dataclasses import replace

import numpy as np
import pytest

from backend.engine.constants import GRAVITY_ACCELERATION, MASS_ABS_TOL
from backend.engine.errors import AnalysisError
from backend.engine.mass import build_mass_vector
from backend.engine.model import MassCase, MassItem, parse_model

from .sample_models import base_project


def test_mass_constants_are_fixed() -> None:
    assert GRAVITY_ACCELERATION == 9.80665
    assert MASS_ABS_TOL == 0.0


def test_builds_full_dof_mass_vector_for_manual_lumped_mass() -> None:
    model = mass_model(
        MassCase(
            id="mass-1",
            name="Manual mass",
            items=[
                MassItem(
                    nodeId="N1",
                    mx=1.0,
                    my=2.0,
                    mz=3.0,
                    irx=10.0,
                    iry=20.0,
                    irz=30.0,
                ),
                MassItem(nodeId="N2", mx=4.0, my=5.0, mz=6.0),
            ],
        )
    )

    result = build_mass_vector(model, "mass-1")

    np.testing.assert_array_equal(
        result,
        np.array(
            [
                1.0,
                2.0,
                3.0,
                0.0,
                0.0,
                0.0,
                4.0,
                5.0,
                6.0,
                0.0,
                0.0,
                0.0,
            ]
        ),
    )


def test_accumulates_repeated_node_mass_items() -> None:
    model = mass_model(
        MassCase(
            id="mass-1",
            name="Repeated node mass",
            items=[
                MassItem(nodeId="N1", mx=1.0, my=2.0, mz=3.0),
                MassItem(nodeId="N1", mx=4.0, my=5.0, mz=6.0),
            ],
        )
    )

    result = build_mass_vector(model, "mass-1")

    np.testing.assert_array_equal(result[:6], [5.0, 7.0, 9.0, 0.0, 0.0, 0.0])


def test_selects_requested_mass_case() -> None:
    model = mass_model(
        MassCase(
            id="mass-1",
            name="First mass",
            items=[MassItem(nodeId="N1", mx=1.0)],
        ),
        MassCase(
            id="mass-2",
            name="Second mass",
            items=[MassItem(nodeId="N2", mx=2.0)],
        ),
    )

    result = build_mass_vector(model, "mass-2")

    np.testing.assert_array_equal(
        result,
        [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    )


@pytest.mark.parametrize(
    ("component", "value"),
    [("mx", -1.0), ("my", -2.0), ("mz", -3.0)],
)
def test_rejects_negative_translational_mass(component: str, value: float) -> None:
    item_values = {"nodeId": "N1", "mx": 0.0, "my": 0.0, "mz": 0.0}
    item_values[component] = value
    model = mass_model(
        MassCase(
            id="mass-1",
            name="Negative mass",
            items=[MassItem(**item_values)],
        )
    )

    assert_mass_error(model, "mass-1", "MASS_NEGATIVE")


@pytest.mark.parametrize("items", [None, []])
def test_rejects_empty_mass_items(items: list[MassItem] | None) -> None:
    model = mass_model(MassCase(id="mass-1", name="Empty mass", items=items))

    assert_mass_error(model, "mass-1", "MASS_EMPTY")


def test_rejects_empty_mass_cases() -> None:
    model = mass_model()

    assert_mass_error(model, "mass-1", "MASS_EMPTY")


def test_rejects_missing_mass_case_id() -> None:
    model = mass_model(
        MassCase(
            id="mass-1",
            name="Manual mass",
            items=[MassItem(nodeId="N1", mx=1.0)],
        )
    )

    assert_mass_error(model, "missing", "MASS_CASE_NOT_FOUND")


def test_rejects_unknown_node_id() -> None:
    model = mass_model(
        MassCase(
            id="mass-1",
            name="Unknown node",
            items=[MassItem(nodeId="N999", mx=1.0)],
        )
    )

    assert_mass_error(model, "mass-1", "MASS_UNKNOWN_NODE")


def test_rejects_unsupported_method() -> None:
    model = mass_model(
        MassCase(
            id="mass-1",
            name="Unsupported method",
            method="consistent",
            items=[MassItem(nodeId="N1", mx=1.0)],
        )
    )

    assert_mass_error(model, "mass-1", "MASS_UNSUPPORTED_METHOD")


def test_rejects_unsupported_source() -> None:
    model = mass_model(
        MassCase(
            id="mass-1",
            name="Unsupported source",
            source="fromLoadCase",
            items=[MassItem(nodeId="N1", mx=1.0)],
        )
    )

    assert_mass_error(model, "mass-1", "MASS_UNSUPPORTED_SOURCE")


def mass_model(*mass_cases: MassCase):
    project = base_project("mass-vector")
    project["nodes"] = [
        {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
        {"id": "N2", "x": 1.0, "y": 0.0, "z": 0.0},
    ]
    return replace(parse_model(project), massCases=list(mass_cases))


def assert_mass_error(model, mass_case_id: str, code: str) -> None:
    with pytest.raises(AnalysisError) as exc_info:
        build_mass_vector(model, mass_case_id)

    assert exc_info.value.detail.code == code
    assert code in str(exc_info.value)
