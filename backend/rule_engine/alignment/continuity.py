# -*- coding: utf-8 -*-
"""Alignment continuity verification (G0/G1/G2) and semantic boundary points.

All numeric checks delegate to the X4-A canonical kernel (evaluate_alignment).
No geometry math is re-implemented.

Severity model:
  - WARNING: cosmetic / tolerance-exceeded but structurally usable
  - ERROR:   position/tangent mismatch at a required junction
  - FATAL:   malformed model that cannot be evaluated (e.g. no spans)

G2 (curvature) is only enforced where the design contract requires it (e.g.
straight -> clothoid -> arc), never as a blanket rule.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional

from .model import Alignment, AlignmentSpan
from .evaluate import evaluate_element


class ContinuityLevel(str, Enum):
    WARNING = "WARNING"
    ERROR = "ERROR"
    FATAL = "FATAL"


CONTINUITY_TOLERANCE = 1e-6
_TWO_PI = 2.0 * 3.141592653589793
_PI = 3.141592653589793


@dataclass
class ContinuityIssue:
    index: int
    boundary_station: float
    level: ContinuityLevel
    kind: str  # "G0" | "G1" | "G2"
    message: str
    delta: Optional[float] = None


@dataclass
class BoundaryReport:
    """A verified junction between adjacent elements."""
    index: int
    boundary_station: float
    left_id: str
    right_id: str
    position_delta: float
    bearing_delta: float
    curvature_delta_g2: Optional[float] = None


@dataclass
class ContinuityReport:
    """Aggregate G0/G1 continuity assessment for an Alignment."""
    alignment_id: str
    boundary_crossings: int
    issues: List[ContinuityIssue] = field(default_factory=list)
    boundaries: List[BoundaryReport] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return all(issue.level != ContinuityLevel.ERROR for issue in self.issues)

    @property
    def count(self) -> int:
        return len(self.issues)


def _wrap_bearing(rad: float) -> float:
    """Wrap a bearing delta into (-pi, pi]."""
    value = rad % _TWO_PI
    if value > _PI:
        value -= _TWO_PI
    elif value <= -_PI:
        value += _TWO_PI
    return value


def _requires_g2(left_type: str, right_type: str) -> bool:
    """Curvature continuity is enforced only across clothoid bridges."""
    return left_type == "clothoid" or right_type == "clothoid"


def verify_continuity(alignment: Alignment) -> ContinuityReport:
    """Verify G0/G1 (and G2 where required) across every element boundary."""
    spans: List[AlignmentSpan] = alignment.spans
    if len(spans) < 2:
        return ContinuityReport(
            alignment_id=alignment.alignment_id,
            boundary_crossings=0,
            issues=[],
            boundaries=[],
        )

    report = ContinuityReport(
        alignment_id=alignment.alignment_id,
        boundary_crossings=len(spans) - 1,
    )

    for idx in range(len(spans) - 1):
        left = spans[idx]
        right = spans[idx + 1]
        boundary = left.end_station

        left_end = evaluate_element(left.element, left.element.length)
        right_start = evaluate_element(right.element, 0.0)

        pos_delta = (
            (left_end.point.x - right_start.point.x) ** 2
            + (left_end.point.y - right_start.point.y) ** 2
        ) ** 0.5

        bearing_delta = abs(_wrap_bearing(left_end.azimuth - right_start.azimuth))

        if pos_delta > CONTINUITY_TOLERANCE:
            report.issues.append(
                ContinuityIssue(
                    index=idx,
                    boundary_station=boundary,
                    level=ContinuityLevel.ERROR,
                    kind="G0",
                    message=(
                        f"position mismatch at station {boundary:g} "
                        f"({left.element_id}->{right.element_id}): delta={pos_delta:.3g}"
                    ),
                    delta=pos_delta,
                )
            )

        if bearing_delta > CONTINUITY_TOLERANCE:
            report.issues.append(
                ContinuityIssue(
                    index=idx,
                    boundary_station=boundary,
                    level=ContinuityLevel.ERROR,
                    kind="G1",
                    message=(
                        f"bearing mismatch at station {boundary:g} "
                        f"({left.element_id}->{right.element_id}): delta={bearing_delta:.3g}"
                    ),
                    delta=bearing_delta,
                )
            )

        curvature_delta: Optional[float] = None
        if _requires_g2(left.element_type, right.element_type):
            curvature_delta = abs(left_end.curvature - right_start.curvature)
            if curvature_delta > CONTINUITY_TOLERANCE:
                report.issues.append(
                    ContinuityIssue(
                        index=idx,
                        boundary_station=boundary,
                        level=ContinuityLevel.ERROR,
                        kind="G2",
                        message=(
                            f"curvature mismatch at {boundary:g} "
                            f"({left.element_id}->{right.element_id}): delta={curvature_delta:.3g}"
                        ),
                        delta=curvature_delta,
                    )
                )

        report.boundaries.append(
            BoundaryReport(
                index=idx,
                boundary_station=boundary,
                left_id=left.element_id,
                right_id=right.element_id,
                position_delta=pos_delta,
                bearing_delta=bearing_delta,
                curvature_delta_g2=curvature_delta,
            )
        )

    return report


class SemanticBoundaryError(Exception):
    """Raised when semantic boundary extraction is impossible."""


@dataclass
class SemanticPoint:
    """A semantically recognised point on the Alignment (BP/BC/EC/KA/KE/IP...)."""
    station: float
    kind: str  # "BP" | "boundary" | "EP" | ...
    element_id: str
    left_id: Optional[str] = None
    right_id: Optional[str] = None


def semantic_points(alignment: Alignment) -> List[SemanticPoint]:
    """Extract semantic boundary points of the element sequence.

    Produces BP at the start, EP at the end, and one interior 'boundary' point
    per junction. Element-specific labels (BC/EC/KA/KE) are supplied by the
    calling adapter when the source provides them; this core never fabricates
    labels beyond evidence.
    """
    spans = alignment.spans
    if not spans:
        raise SemanticBoundaryError(
            f"alignment {alignment.alignment_id!r} has no spans"
        )

    points: List[SemanticPoint] = []
    primary = spans[0]
    points.append(
        SemanticPoint(
            station=primary.start_station,
            kind="BP",
            element_id=primary.element_id,
        )
    )
    for idx in range(len(spans) - 1):
        left = spans[idx]
        right = spans[idx + 1]
        points.append(
            SemanticPoint(
                station=left.end_station,
                kind="boundary",
                element_id=right.element_id,
                left_id=left.element_id,
                right_id=right.element_id,
            )
        )
    last = spans[-1]
    points.append(
        SemanticPoint(
            station=last.end_station,
            kind="EP",
            element_id=last.element_id,
        )
    )
    return points


__all__ = [
    "CONTINUITY_TOLERANCE",
    "BoundaryReport",
    "ContinuityIssue",
    "ContinuityLevel",
    "ContinuityReport",
    "SemanticBoundaryError",
    "SemanticPoint",
    "semantic_points",
    "verify_continuity",
]