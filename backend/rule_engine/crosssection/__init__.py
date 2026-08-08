# -*- coding: utf-8 -*-
"""Cross Section Generator public API surface.

Canonical Cross Section contracts over X4-A Geometry Kernel / X4-B Alignment
Solver, established step by step in Phase X4-C.
"""
from .model import (
    CrossSectionError,
    CrossSectionPoint,
    CrossSectionRequest,
    CrossSectionResult,
    CrossSectionSegment,
    CrossSectionTrace,
    CrossfallInput,
    PivotDefinition,
    PivotMode,
    PivotType,
    SegmentType,
    Side,
    validate_request,
)
from .width import (
    ResolvedWidthExtents,
    WIDTH_TOLERANCE,
    WidthChangePoint,
    WidthError,
    evaluate_request_width,
    evaluate_width_at_distance,
    resolve_level_width,
    segment_total_width_left,
    segment_total_width_right,
    total_width_from_request,
)
from .crossfall import (
    CrossfallError,
    CrossfallInterval,
    CrossfallMode,
    OFFSET_TOLERANCE,
    ResolvedCrossfallState,
    crossfall_delta_z,
    resolve_crossfall_at,
    resolve_crossfall_input,
)

__all__ = [
    "CrossSectionError",
    "CrossSectionPoint",
    "CrossSectionRequest",
    "CrossSectionResult",
    "CrossSectionSegment",
    "CrossSectionTrace",
    "CrossfallInput",
    "PivotDefinition",
    "PivotMode",
    "PivotType",
    "SegmentType",
    "Side",
    "validate_request",
    "ResolvedWidthExtents",
    "WIDTH_TOLERANCE",
    "WidthChangePoint",
    "WidthError",
    "evaluate_request_width",
    "evaluate_width_at_distance",
    "resolve_level_width",
    "segment_total_width_left",
    "segment_total_width_right",
    "total_width_from_request",
    "CrossfallError",
    "CrossfallInterval",
    "CrossfallMode",
    "OFFSET_TOLERANCE",
    "ResolvedCrossfallState",
    "crossfall_delta_z",
    "resolve_crossfall_at",
    "resolve_crossfall_input",
]