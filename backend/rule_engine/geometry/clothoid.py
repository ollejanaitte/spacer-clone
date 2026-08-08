# -*- coding: utf-8 -*-
"""Clothoid (spiral) element evaluation via Simpson integration.
Mirror of frontend/src/liner/core/geometry/clothoid.ts.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

from .contracts import Vec2D

SIMPSON_INTERVALS = 128


@dataclass
class ClothoidElement:
    type: str = "clothoid"
    id: str = ""
    length: float = 0.0
    start: Vec2D = field(default_factory=Vec2D)
    azimuth: float = 0.0
    clothoidParameter: float = 0.0
    startRadius: Optional[float] = None
    endRadius: Optional[float] = None
    turn: str = "left"


def _radius_to_curvature(radius: Optional[float]) -> float:
    if radius is None or not math.isfinite(radius):
        return 0.0
    return 1.0 / radius


def clothoid_curvature_at(element: ClothoidElement, localDistance: float) -> float:
    sign = -1.0 if element.turn == "right" else 1.0
    start_curvature = _radius_to_curvature(element.startRadius) * sign
    if element.endRadius is None or not math.isfinite(element.endRadius):
        end_curvature = sign * (element.length / (element.clothoidParameter ** 2))
    else:
        end_curvature = _radius_to_curvature(element.endRadius) * sign
    t = 0.0 if element.length == 0 else localDistance / element.length
    return start_curvature + (end_curvature - start_curvature) * t


def _clothoid_heading_at(element: ClothoidElement, distance: float) -> float:
    k0 = clothoid_curvature_at(element, 0)
    k1 = clothoid_curvature_at(element, element.length)
    slope = 0.0 if element.length == 0 else (k1 - k0) / element.length
    return element.azimuth + k0 * distance + 0.5 * slope * distance * distance


def _simpson_integrate(
    length: float,
    intervals: int,
    value_at,
) -> float:
    even_intervals = intervals if intervals % 2 == 0 else intervals + 1
    step = length / even_intervals
    total = value_at(0) + value_at(length)
    index = 1
    while index < even_intervals:
        total += (2 if index % 2 == 0 else 4) * value_at(index * step)
        index += 1
    return (total * step) / 3.0


def evaluate_clothoid_element(
    element: ClothoidElement,
    localDistance: float,
) -> "ElementEvaluation":
    from .line_arc import ElementEvaluation

    clamped = min(max(localDistance, 0.0), element.length)
    intervals = max(16, SIMPSON_INTERVALS)
    x_local = _simpson_integrate(clamped, intervals, lambda d: math.cos(_clothoid_heading_at(element, d)))
    y_local = _simpson_integrate(clamped, intervals, lambda d: math.sin(_clothoid_heading_at(element, d)))

    return ElementEvaluation(
        point=Vec2D(element.start.x + x_local, element.start.y + y_local),
        azimuth=_clothoid_heading_at(element, clamped),
        curvature=clothoid_curvature_at(element, clamped),
        localDistance=clamped,
        elementId=element.id,
    )


def is_phase0_clothoid_approximation() -> bool:
    return True