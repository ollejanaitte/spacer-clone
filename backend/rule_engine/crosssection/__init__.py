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
]