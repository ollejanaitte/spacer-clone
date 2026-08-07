# -*- coding: utf-8 -*-
"""Alignment evaluation: resolve a station to point / bearing / curvature.

Delegates ALL numeric evaluation to the X4-A canonical Geometry Kernel
(line_arc.evaluate_straight_element / evaluate_circular_arc_element,
clothoid.evaluate_clothoid_element). No geometry math is re-implemented here.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import ElementEvaluation
from backend.rule_engine.geometry.line_arc import (
    evaluate_circular_arc_element,
    evaluate_straight_element,
)
from backend.rule_engine.geometry.clothoid import evaluate_clothoid_element

from .model import AlignmentElement, AlignmentSpan
from .station import AlignmentRangeError, lookup_station


@dataclass
class AlignmentEvaluation:
    """Evaluation of an Alignment at a given station."""
    station: float
    point: Vec2D
    azimuth: float
    curvature: float
    element_id: str
    element_type: str
    local_station: float
    is_boundary: bool


def evaluate_alignment(
    alignment,
    station: float,
    bearing_units: str = "radian",
) -> AlignmentEvaluation:
    """Evaluate the Alignment at a station.

    Delegates to the canonical kernel per element type. Raises
    AlignmentRangeError for stations outside [start, end].
    """
    lookup = lookup_station(alignment, station)
    element = lookup.element.element
    local = lookup.local_station

    kernel_result: ElementEvaluation = _dispatch(element, local)

    azimuth = kernel_result.azimuth
    if bearing_units.strip().lower() in {"deg", "degree", "degrees", "degre"}:
        azimuth = azimuth * 180.0 / 3.141592653589793

    return AlignmentEvaluation(
        station=station,
        point=kernel_result.point,
        azimuth=azimuth,
        curvature=kernel_result.curvature,
        element_id=lookup.element_id,
        element_type=lookup.element_type,
        local_station=local,
        is_boundary=lookup.is_boundary,
    )


def _dispatch(element: AlignmentElement, local: float) -> ElementEvaluation:
    etype = getattr(element, "type", "")
    if etype == "straight":
        return evaluate_straight_element(element, local)
    if etype == "arc":
        return evaluate_circular_arc_element(element, local)
    if etype == "clothoid":
        return evaluate_clothoid_element(element, local)
    raise ValueError(f"unsupported alignment element type: {etype!r}")


__all__ = [
    "AlignmentEvaluation",
    "evaluate_alignment",
]