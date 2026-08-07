# -*- coding: utf-8 -*-
"""Station/offset projection and alignment-level evaluation.
Mirror of frontend/src/liner/core/stationAtPoint.ts, geometry/horizontal.ts,
vector.ts, and station/stationRules.ts (minimal subset required for the
Rule Engine adapter).
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Optional, Union

from .clothoid import ClothoidElement, evaluate_clothoid_element
from .contracts import (
    LocalFrame,
    Vec2D,
    distance2,
    dot2,
    local_frame_from_azimuth,
    normalize_angle,
)
from .line_arc import (
    CircularArcElement,
    ElementEvaluation,
    StraightElement,
    evaluate_circular_arc_element,
    evaluate_straight_element,
)

SAMPLING_INTERVAL_FRAME = 0.25
CLOTHOID_REFINE_ITERATIONS = 8
STATION_TOLERANCE = 1e-6
LENGTH_TOLERANCE = 1e-6


def _nearly_equal(a: float, b: float, tolerance: float = STATION_TOLERANCE) -> bool:
    return abs(a - b) <= tolerance


@dataclass
class StationDefinition:
    originDisplayedStation: float = 0.0


@dataclass
class LinearAlignment:
    id: str = ""
    elements: List[Union[StraightElement, CircularArcElement, ClothoidElement]] = field(default_factory=list)


@dataclass
class StationProjection:
    physicalDistance: float = 0.0
    displayedStation: float = 0.0
    offset: float = 0.0
    distance: float = 0.0
    elementId: str = ""
    localDistance: float = 0.0
    localFrame: LocalFrame = field(default_factory=LocalFrame)


def displayed_station_at_physical_distance(
    physicalDistance: float,
    definition: StationDefinition,
    after_boundary: bool = True,
) -> float:
    return definition.originDisplayedStation + physicalDistance


def _offset_from_point(point: Vec2D, alignment_point: Vec2D, local_frame: LocalFrame) -> float:
    return dot2(sub2(point, alignment_point), Vec2D(local_frame.normal.x, local_frame.normal.y))


def _offset_from_element(point: Vec2D, alignment_point: Vec2D, local_frame: LocalFrame) -> float:
    return _offset_from_point(point, alignment_point, local_frame)


def sub2(a: Vec2D, b: Vec2D) -> Vec2D:
    return Vec2D(a.x - b.x, a.y - b.y)


def element_length(element) -> float:
    return element.length


def total_alignment_length(alignment: LinearAlignment) -> float:
    return sum(element.length for element in alignment.elements)


def evaluate_element_at_distance(element, localDistance: float) -> ElementEvaluation:
    if element.type == "straight":
        return evaluate_straight_element(element, localDistance)
    if element.type == "arc":
        return evaluate_circular_arc_element(element, localDistance)
    return evaluate_clothoid_element(element, localDistance)


def evaluate_alignment_at_distance(
    alignment: LinearAlignment,
    physicalDistance: float,
    displayedStation: Optional[float] = None,
) -> ElementEvaluation:
    total_length = total_alignment_length(alignment)
    target = min(max(physicalDistance, 0.0), total_length)
    cursor = 0.0

    for element in alignment.elements:
        next_cursor = cursor + element.length
        if target <= next_cursor + STATION_TOLERANCE:
            local_distance = min(max(target - cursor, 0.0), element.length)
            evaluation = evaluate_element_at_distance(element, local_distance)
            evaluation.physicalDistance = target
            evaluation.displayedStation = (
                displayedStation if displayedStation is not None
                else displayed_station_at_physical_distance(target, StationDefinition())
            )
            evaluation.localFrame = local_frame_from_azimuth(evaluation.azimuth)
            return evaluation
        cursor = next_cursor

    last = alignment.elements[-1] if alignment.elements else None
    if last is None:
        return ElementEvaluation(
            point=Vec2D(0, 0),
            physicalDistance=0,
            displayedStation=(displayedStation if displayedStation is not None else 0),
            localFrame=local_frame_from_azimuth(0),
        )
    evaluation = evaluate_element_at_distance(last, last.length)
    evaluation.physicalDistance = total_length
    evaluation.displayedStation = (
        displayedStation if displayedStation is not None
        else displayed_station_at_physical_distance(total_length, StationDefinition())
    )
    evaluation.localFrame = local_frame_from_azimuth(evaluation.azimuth)
    return evaluation


def _build_projection(
    point: Vec2D,
    element,
    element_start_physical_distance: float,
    local_distance: float,
    distance: float,
    station_definition: StationDefinition,
) -> StationProjection:
    evaluation = evaluate_element_at_distance(element, local_distance)
    local_frame = local_frame_from_azimuth(evaluation.azimuth)
    physical = element_start_physical_distance + evaluation.localDistance
    return StationProjection(
        physicalDistance=physical,
        displayedStation=displayed_station_at_physical_distance(
            physical, station_definition, physical > 0
        ),
        offset=_offset_from_element(point, evaluation.point, local_frame),
        distance=distance,
        elementId=element.id,
        localDistance=evaluation.localDistance,
        localFrame=local_frame,
    )


def _project_onto_straight(element: StraightElement, point: Vec2D):
    tangent_x = math.cos(element.azimuth)
    tangent_y = math.sin(element.azimuth)
    projected = (point.x - element.start.x) * tangent_x + (point.y - element.start.y) * tangent_y
    local_distance = min(max(projected, 0.0), element.length)
    evaluation = evaluate_straight_element(element, local_distance)
    return local_distance, distance2(point, evaluation.point)


def _clamp_angle_to_arc(start_angle: float, sweep: float, angle: float) -> float:
    end_angle = start_angle + sweep
    full_turn = math.pi * 2

    if sweep >= 0:
        relative = angle - start_angle
        while relative < 0:
            relative += full_turn
        while relative >= full_turn:
            relative -= full_turn
        if relative <= sweep:
            return start_angle + relative
        distance_to_end = relative - sweep
        distance_to_start = (full_turn - relative) if relative > math.pi else relative
        return end_angle if distance_to_end <= distance_to_start else start_angle

    relative = angle - start_angle
    while relative > 0:
        relative -= full_turn
    while relative <= -full_turn:
        relative += full_turn
    if relative >= sweep:
        return start_angle + relative
    distance_to_end = sweep - relative
    distance_to_start = (full_turn + relative) if relative < -math.pi else -relative
    return end_angle if distance_to_end <= distance_to_start else start_angle


def _project_onto_circular_arc(element: CircularArcElement, point: Vec2D):
    sign = 1.0 if element.turn == "left" else -1.0
    radius = element.radius
    center_x = element.start.x - sign * radius * math.sin(element.azimuth)
    center_y = element.start.y + sign * radius * math.cos(element.azimuth)

    start_evaluation = evaluate_circular_arc_element(element, 0)
    start_angle = math.atan2(start_evaluation.point.y - center_y, start_evaluation.point.x - center_x)
    sweep = (sign * element.length) / radius
    query_angle = math.atan2(point.y - center_y, point.x - center_x)
    closest_angle = _clamp_angle_to_arc(start_angle, sweep, query_angle)

    angle_delta = closest_angle - start_angle
    if sign > 0:
        while angle_delta < 0:
            angle_delta += math.pi * 2
    else:
        while angle_delta > 0:
            angle_delta -= math.pi * 2

    local_distance = min(max(abs(angle_delta) * radius, 0.0), element.length)
    evaluation = evaluate_circular_arc_element(element, local_distance)
    return local_distance, distance2(point, evaluation.point)


def _distance_to_clothoid(element: ClothoidElement, local_distance: float, point: Vec2D) -> float:
    return distance2(point, evaluate_clothoid_element(element, local_distance).point)


def _project_onto_clothoid(element: ClothoidElement, point: Vec2D):
    step = SAMPLING_INTERVAL_FRAME
    best_local_distance = 0.0
    best_distance = _distance_to_clothoid(element, 0, point)

    local_distance = step
    while local_distance < element.length:
        distance = _distance_to_clothoid(element, local_distance, point)
        if distance < best_distance:
            best_distance = distance
            best_local_distance = local_distance
        local_distance += step

    end_distance = _distance_to_clothoid(element, element.length, point)
    if end_distance < best_distance:
        best_distance = end_distance
        best_local_distance = element.length

    lower = max(0.0, best_local_distance - step)
    upper = min(element.length, best_local_distance + step)

    for _ in range(CLOTHOID_REFINE_ITERATIONS):
        mid_lower = lower + (upper - lower) / 3
        mid_upper = upper - (upper - lower) / 3
        if _distance_to_clothoid(element, mid_lower, point) < _distance_to_clothoid(element, mid_upper, point):
            upper = mid_upper
        else:
            lower = mid_lower

    local_distance = (lower + upper) / 2
    return local_distance, _distance_to_clothoid(element, local_distance, point)


def _project_element(
    element,
    point: Vec2D,
    element_start_physical_distance: float,
    station_definition: StationDefinition,
) -> StationProjection:
    if element.type == "straight":
        local_distance, distance = _project_onto_straight(element, point)
    elif element.type == "arc":
        local_distance, distance = _project_onto_circular_arc(element, point)
    else:
        local_distance, distance = _project_onto_clothoid(element, point)
    return _build_projection(
        point, element, element_start_physical_distance, local_distance, distance, station_definition
    )


def station_at_point(
    point: Vec2D,
    alignment: LinearAlignment,
    station_definition: Optional[StationDefinition] = None,
) -> Optional[StationProjection]:
    if not alignment.elements:
        return None
    definition = station_definition or StationDefinition()
    best = None
    element_start_physical_distance = 0.0

    for element in alignment.elements:
        candidate = _project_element(element, point, element_start_physical_distance, definition)
        if best is None or candidate.distance < best.distance:
            best = candidate
        element_start_physical_distance += element.length

    return best