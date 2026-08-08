# -*- coding: utf-8 -*-
"""Road Geometry API - facade skeleton (X4D-P01).

Single entry point that unifies the X4-A Geometry Kernel, X4-B Alignment
Solver and X4-C Cross Section Generator. P01 establishes the orchestration
shape and the request/result contract; the individual resolve steps are
implemented in P02 (alignment/pose) and P03 (cross section / edges / XYZ).

Nothing is re-implemented here: each step delegates to the canonical
X4 subsystems.
"""
from __future__ import annotations

from typing import Optional

from backend.rule_engine.alignment import Alignment
from backend.rule_engine.alignment.contract import build_alignment_from_roadmap
from backend.rule_engine.alignment.evaluate import evaluate_alignment
from backend.rule_engine.alignment.station import AlignmentRangeError
from backend.rule_engine.geometry.contracts import (
    Vec3,
    angle_to_normal,
    angle_to_tangent,
)
from backend.rule_engine.crosssection.crossfall import (
    crossfall_delta_z,
    resolve_crossfall_input,
)
from backend.rule_engine.crosssection.geometry import pose_at
from backend.rule_engine.crosssection.global_xyz import (
    generate_global_section,
    point_global,
)
from backend.rule_engine.crosssection.model import CrossSectionRequest

from .contracts import (
    RoadGeometryError,
    RoadGeometryRequest,
    RoadGeometryResult,
    validate_request,
)


class RoadGeometryAPI:
    """Single entry point for road geometry evaluation."""

    def evaluate(self, request: RoadGeometryRequest) -> RoadGeometryResult:
        validate_request(request)
        alignment = self._resolve_alignment(request)
        result = self._evaluate_alignment(request, alignment)
        return self._merge_cross_section(request, alignment, result)

    # -- internal orchestration (filled in P02/P03) -------------------------

    def _resolve_alignment(self, request: RoadGeometryRequest) -> Alignment:
        """Return the canonical Alignment to evaluate.

        P02: delegates to build_alignment_from_roadmap when rows are given;
        accepts a prebuilt Alignment otherwise.
        """
        if request.alignment is not None:
            return request.alignment
        if request.rows:
            return build_alignment_from_roadmap(
                request.alignment_id,
                list(request.rows),
                origin_station=request.origin_station,
            )
        raise RoadGeometryError("no alignment source provided")

    def _evaluate_alignment(
        self,
        request: RoadGeometryRequest,
        alignment: Alignment,
    ) -> RoadGeometryResult:
        """Evaluate center pose (X / Y / heading / curvature / tangent / normal).

        P02: delegates to evaluate_alignment via the X4-B solver and derives
        tangent / normal vectors from the canonical Geometry Kernel.
        """
        try:
            evaluation = evaluate_alignment(
                alignment, request.station, bearing_units=request.bearing_units)
        except AlignmentRangeError as exc:
            raise RoadGeometryError(str(exc)) from exc

        azimuth = evaluation.azimuth
        tangent = angle_to_tangent(azimuth)
        normal = angle_to_normal(azimuth)
        return RoadGeometryResult(
            station=request.station,
            x=evaluation.point.x,
            y=evaluation.point.y,
            z=request.center_elevation,
            heading=azimuth,
            tangent=Vec3(tangent.x, tangent.y, 0.0),
            normal=Vec3(normal.x, normal.y, 0.0),
            curvature=evaluation.curvature,
            element_id=evaluation.element_id,
            element_type=evaluation.element_type,
            total_left_width=0.0,
            total_right_width=0.0,
            crossfall_left_percent=0.0,
            crossfall_right_percent=0.0,
            left_edge_xyz=None,
            right_edge_xyz=None,
            trace={"source": "X4B-ALIGNMENT-SOLVER", "element": evaluation.element_id},
        )

    def _merge_cross_section(
        self,
        request: RoadGeometryRequest,
        alignment: Alignment,
        result: RoadGeometryResult,
    ) -> RoadGeometryResult:
        """Merge width / crossfall / edges / cross-section points / Z.

        P03: delegates to generate_global_section (X4-C) and fills the unified
        result with total widths, crossfall, road edges and section points.
        """
        has_cross_inputs = bool(request.left_segments or request.right_segments)
        if not has_cross_inputs:
            return result

        cross_request = CrossSectionRequest(
            alignment_id=request.alignment_id,
            station=request.station,
            center_elevation=request.center_elevation or 0.0,
            left_segments=list(request.left_segments),
            right_segments=list(request.right_segments),
            crossfall=request.crossfall,
            pivot=request.pivot,
            source_trace=dict(request.source_trace),
        )
        cross = generate_global_section(alignment, cross_request)

        pose = pose_at(alignment, request.station)
        crossfall_state = resolve_crossfall_input(request.crossfall)
        center_z = request.center_elevation or 0.0

        left_edge_xyz = None
        right_edge_xyz = None
        if cross.left_edge_offset is not None:
            left_edge_xyz = point_global(
                pose.center_xy,
                pose.azimuth,
                cross.left_edge_offset,
                center_z + crossfall_delta_z(crossfall_state, cross.left_edge_offset),
            )
        if cross.right_edge_offset is not None:
            right_edge_xyz = point_global(
                pose.center_xy,
                pose.azimuth,
                cross.right_edge_offset,
                center_z + crossfall_delta_z(crossfall_state, cross.right_edge_offset),
            )

        result.z = cross.center_point_xyz.z if cross.center_point_xyz else center_z
        result.total_left_width = cross.total_left_width
        result.total_right_width = cross.total_right_width
        result.crossfall_left_percent = crossfall_state.left_slope_percent
        result.crossfall_right_percent = crossfall_state.right_slope_percent
        result.left_edge_xyz = left_edge_xyz
        result.right_edge_xyz = right_edge_xyz
        result.section_points = list(cross.section_points)
        result.warnings = list(cross.warnings)
        result.trace = {
            **result.trace,
            "cross_section": "X4C-CROSS-SECTION",
            "elevation_source": "explicit_input",
        }
        return result


# Module-level facade instance (canonical entry point)
road_geometry_api = RoadGeometryAPI()


__all__ = [
    "RoadGeometryAPI",
    "RoadGeometryError",
    "RoadGeometryRequest",
    "RoadGeometryResult",
    "road_geometry_api",
]
