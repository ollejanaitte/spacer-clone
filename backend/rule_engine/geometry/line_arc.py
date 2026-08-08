# -*- coding: utf-8 -*-
"""Line and circular-arc element evaluation (mirror of frontend geometry/line.ts & arc.ts)."""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional, Union

from .contracts import Vec2D


@dataclass
class StraightElement:
    type: str = "straight"
    id: str = ""
    length: float = 0.0
    start: Vec2D = field(default_factory=Vec2D)
    azimuth: float = 0.0


@dataclass
class CircularArcElement:
    type: str = "arc"
    id: str = ""
    length: float = 0.0
    start: Vec2D = field(default_factory=Vec2D)
    azimuth: float = 0.0
    radius: float = 0.0
    turn: str = "left"


@dataclass
class ElementEvaluation:
    point: Vec2D = field(default_factory=Vec2D)
    azimuth: float = 0.0
    curvature: float = 0.0
    localDistance: float = 0.0
    elementId: str = ""
    physicalDistance: Optional[float] = None
    displayedStation: Optional[float] = None
    localFrame: Optional[object] = None


def _clamp(distance: float, length: float) -> float:
    return min(max(distance, 0.0), length)


def evaluate_straight_element(
    element: StraightElement,
    localDistance: float,
) -> ElementEvaluation:
    clamped = _clamp(localDistance, element.length)
    return ElementEvaluation(
        point=Vec2D(
            element.start.x + math.cos(element.azimuth) * clamped,
            element.start.y + math.sin(element.azimuth) * clamped,
        ),
        azimuth=element.azimuth,
        curvature=0.0,
        localDistance=clamped,
        elementId=element.id,
    )


def signed_arc_curvature(element: CircularArcElement) -> float:
    """left => positive, right => negative; straight/invalid radius => 0."""
    if element.radius <= 0 or not math.isfinite(element.radius):
        return 0.0
    return (1.0 / element.radius) if element.turn == "left" else (-1.0 / element.radius)


def evaluate_circular_arc_element(
    element: CircularArcElement,
    localDistance: float,
) -> ElementEvaluation:
    clamped = _clamp(localDistance, element.length)
    sign = 1.0 if element.turn == "left" else -1.0
    delta = (clamped / element.radius) * sign
    azimuth = element.azimuth + delta
    sin0 = math.sin(element.azimuth)
    cos0 = math.cos(element.azimuth)
    sin1 = math.sin(azimuth)
    cos1 = math.cos(azimuth)

    return ElementEvaluation(
        point=Vec2D(
            element.start.x + sign * element.radius * (sin1 - sin0),
            element.start.y - sign * element.radius * (cos1 - cos0),
        ),
        azimuth=azimuth,
        curvature=signed_arc_curvature(element),
        localDistance=clamped,
        elementId=element.id,
    )