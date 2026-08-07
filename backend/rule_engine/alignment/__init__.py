# -*- coding: utf-8 -*-
"""LINER Alignment Solver public adapter surface.

Canonical Alignment model/builder over the X4-A Geometry Kernel.
"""
from .model import Alignment, AlignmentError, AlignmentElement, AlignmentSpan, build_alignment
from .station import STATION_EPSILON, AlignmentRangeError, StationLookup, lookup_station, station_at
from .evaluate import AlignmentEvaluation, evaluate_alignment, evaluate_element
from .continuity import (
    CONTINUITY_TOLERANCE, BoundaryReport, ContinuityIssue, ContinuityLevel,
    ContinuityReport, SemanticBoundaryError, SemanticPoint,
    semantic_points, verify_continuity,
)
from .contract import (
    ALIGNMENT_RULE_ID, ALIGNMENT_RULE_VERSION, AlignmentGeometryRule,
    RoadAlignmentError, RoadElementRow, build_alignment_from_roadmap,
    evaluate_alignment_for_rule,
)

__all__ = [
    "Alignment",
    "AlignmentError",
    "AlignmentElement",
    "AlignmentSpan",
    "build_alignment",
    "STATION_EPSILON",
    "AlignmentRangeError",
    "StationLookup",
    "lookup_station",
    "station_at",
    "AlignmentEvaluation",
    "evaluate_alignment",
    "evaluate_element",
    "CONTINUITY_TOLERANCE",
    "BoundaryReport",
    "ContinuityIssue",
    "ContinuityLevel",
    "ContinuityReport",
    "SemanticBoundaryError",
    "SemanticPoint",
    "semantic_points",
    "verify_continuity",
    "ALIGNMENT_RULE_ID",
    "ALIGNMENT_RULE_VERSION",
    "AlignmentGeometryRule",
    "RoadAlignmentError",
    "RoadElementRow",
    "build_alignment_from_roadmap",
    "evaluate_alignment_for_rule",
]