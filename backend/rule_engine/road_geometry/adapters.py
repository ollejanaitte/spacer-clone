# -*- coding: utf-8 -*-
"""Rule -> RoadGeometry adapter (STEP-2 S2-UX06).

Converts Design Rule evaluation results (X2-R-020 widening, X2-R-022
superelevation transition, X2-R-023 clearance, ...) into explicit inputs for
the Road Geometry API (X4-D) without re-implementing any geometry.

Data flow:
  Rule Engine (evaluate)
    -> RuleDesignValues (widening amount, crossfall transition, warnings)
    -> RoadGeometryRequest patches (left/right segments width, crossfall)
    -> X4-D evaluate -> RoadGeometryResult

The adapter only *maps* rule outputs onto explicit geometry inputs; it never
computes geometry itself.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from backend.rule_engine.crosssection.model import (
    CrossfallInput,
    CrossSectionSegment,
)
from backend.rule_engine.road_geometry.contracts import (
    RoadGeometryError,
    RoadGeometryRequest,
)

__all__ = [
    "RuleDesignValues",
    "RuleToGeometryAdapter",
    "DesignWarning",
    "apply_rule_design_values",
]


@dataclass
class DesignWarning:
    """A rule-issued warning/error mapped onto the design inputs."""
    rule_id: str
    message: str
    severity: str = "WARNING"  # WARNING | ERROR | DEFERRED
    target_field: str = ""     # field the diagram/UI should highlight


@dataclass
class RuleDesignValues:
    """Resolved design values produced by Rule evaluations."""
    widening_amount_m: float = 0.0
    crossfall: Optional[CrossfallInput] = None
    left_width_m: Optional[float] = None
    right_width_m: Optional[float] = None
    clearance_height_m: Optional[float] = None
    warnings: List[DesignWarning] = field(default_factory=list)


class RuleToGeometryAdapter:
    """Maps Rule evaluation results onto explicit Road Geometry inputs."""

    def apply(
        self,
        request: RoadGeometryRequest,
        design: RuleDesignValues,
    ) -> RoadGeometryRequest:
        """Return a copy of `request` with rule-derived values applied.

        The original request is not mutated.
        """
        import copy
        patched = copy.copy(request)
        patched.source_trace = dict(request.source_trace)

        if design.left_width_m is not None or design.right_width_m is not None:
            patched.left_segments = self._apply_width(
                request.left_segments, "LEFT", design.left_width_m)
            patched.right_segments = self._apply_width(
                request.right_segments, "RIGHT", design.right_width_m)
            patched.source_trace["width_source"] = "rule-engine"

        if design.crossfall is not None:
            patched.crossfall = design.crossfall
            patched.source_trace["crossfall_source"] = "rule-engine"

        if design.widening_amount_m:
            patched.source_trace["widening_source"] = "rule-engine"
            patched.source_trace["widening_amount_m"] = str(design.widening_amount_m)

        return patched

    @staticmethod
    def _apply_width(
        segments: List[CrossSectionSegment],
        side: str,
        width: Optional[float],
    ) -> List[CrossSectionSegment]:
        if width is None:
            return list(segments)
        if width < 0:
            raise RoadGeometryError(f"{side} rule-derived width must be non-negative")
        if not segments:
            return [CrossSectionSegment(
                segment_id=f"rule-{side.lower()}",
                side=side,
                width=width,
                source="rule-engine")]
        out = list(segments)
        out[-1] = CrossSectionSegment(
            segment_id=out[-1].segment_id,
            side=side,
            segment_type=out[-1].segment_type,
            width=width,
            crossfall=out[-1].crossfall,
            start_offset=out[-1].start_offset,
            end_offset=out[-1].end_offset,
            source="rule-engine",
        )
        return out


# Canonical instance
rule_to_geometry_adapter = RuleToGeometryAdapter()


def apply_rule_design_values(
    request: RoadGeometryRequest,
    design: RuleDesignValues,
) -> RoadGeometryRequest:
    """Module-level helper delegating to the canonical adapter."""
    return rule_to_geometry_adapter.apply(request, design)
