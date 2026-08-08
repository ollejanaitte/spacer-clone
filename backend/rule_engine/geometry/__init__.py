# -*- coding: utf-8 -*-
"""Geometry Kernel Adapter for Rule Engine.

This package provides Python-side canonical contracts and evaluation utilities
mirroring the canonical TypeScript Geometry Kernel
(frontend/src/liner/core/geometry/). It is split by responsibility so each
Geometry Kernel phase advances as an independent, reviewable unit:

- contracts:     core 2D/3D types and vector math (mirror of vector.ts/types.ts)
- line_arc:      straight and circular arc evaluation (line.ts / arc.ts)
- clothoid:      clothoid evaluation via Simpson integration (clothoid.ts)
- station_offset: station/offset projection and alignment evaluation
                  (stationAtPoint.ts / horizontal.ts / stationRules.ts)

Keeping the implementation in separate modules mirrors the canonical frontend
structure and keeps each phase's diff minimal and self-contained.
"""
from .contracts import (
    LocalFrame,
    Point2D,
    Vector2D,
    Vec2,
    Vec2D,
    Vec3,
    add2,
    angle_to_normal,
    angle_to_tangent,
    azimuth_from_direction,
    cross3,
    distance2,
    dot2,
    local_frame_from_azimuth,
    normalize2,
    normalize3,
    normalize_angle,
    offset_point,
    radius_from_curvature,
    scale2,
    signed_curvature,
    sub2,
    vec2,
    vec3,
)
from .line_arc import (
    CircularArcElement,
    ElementEvaluation,
    StraightElement,
    evaluate_circular_arc_element,
    evaluate_straight_element,
    signed_arc_curvature,
)
from .clothoid import (
    ClothoidElement,
    SIMPSON_INTERVALS,
    clothoid_curvature_at,
    evaluate_clothoid_element,
    is_phase0_clothoid_approximation,
)
from .station_offset import (
    LinearAlignment,
    StationDefinition,
    StationProjection,
    displayed_station_at_physical_distance,
    element_length,
    evaluate_alignment_at_distance,
    evaluate_element_at_distance,
    station_at_point,
    total_alignment_length,
)

__all__ = [
    "LocalFrame",
    "Point2D",
    "Vector2D",
    "Vec2",
    "Vec2D",
    "Vec3",
    "add2",
    "angle_to_normal",
    "angle_to_tangent",
    "azimuth_from_direction",
    "cross3",
    "distance2",
    "dot2",
    "local_frame_from_azimuth",
    "normalize2",
    "normalize3",
    "normalize_angle",
    "offset_point",
    "radius_from_curvature",
    "scale2",
    "signed_curvature",
    "sub2",
    "vec2",
    "vec3",
    "CircularArcElement",
    "ElementEvaluation",
    "StraightElement",
    "evaluate_circular_arc_element",
    "evaluate_straight_element",
    "signed_arc_curvature",
    "ClothoidElement",
    "SIMPSON_INTERVALS",
    "clothoid_curvature_at",
    "evaluate_clothoid_element",
    "is_phase0_clothoid_approximation",
    "LinearAlignment",
    "StationDefinition",
    "displayed_station_at_physical_distance",
    "element_length",
    "evaluate_alignment_at_distance",
    "evaluate_element_at_distance",
    "station_at_point",
    "total_alignment_length",
]