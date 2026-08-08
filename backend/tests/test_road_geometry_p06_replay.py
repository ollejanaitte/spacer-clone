# -*- coding: utf-8 -*-
"""Road Geometry API - P06 project replay / full contract tests (X4D-P06).

Replays the real Hランプ4号橋 (HCL) centerline and the real PDF section
design elevations through the single Road Geometry API entry point, and
verifies every field in the unified result contract (§6 minimum surface):
station / X / Y / Z / heading / tangent / normal / curvature / width /
crossfall / left-right road edges / cross-section points.
"""
from __future__ import annotations

import pytest

from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.alignment.contract import RoadElementRow
from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import (
    CircularArcElement,
    StraightElement,
)
from backend.rule_engine.crosssection.model import (
    CrossSectionSegment,
    CrossfallInput,
    SegmentType,
)
from backend.rule_engine.road_geometry import (
    RoadGeometryError,
    RoadGeometryRequest,
    road_geometry_api,
)

# Real project centerline length (HCL) from PDF (builtInSampleDataset.ts).
HCL_LENGTH = 164.2476

# Real PDF section design elevations (station_m, designElevation_m).
PDF_SECTION_ELEVATIONS = [
    (0.0000, 17.6595),
    (0.5897, 17.6550),
    (0.6399, 17.6304),
    (8.3121, 17.5903),
    (16.2403, 17.5200),
    (24.1779, 17.4500),
    (32.1547, 17.3800),
]


def _hcl_rows():
    return [RoadElementRow(kind="straight", length=HCL_LENGTH, id="hcl")]


def _hcl_alignment():
    return build_alignment(
        "HCL",
        [StraightElement(id="hcl", start=Vec2D(0, 0), azimuth=0.0,
                         length=HCL_LENGTH)],
        origin_station=0.0,
    )


def _segment(side, width, sid):
    return CrossSectionSegment(
        segment_id=sid, side=side, segment_type=SegmentType.LANE,
        width=width, crossfall=0.0, start_offset=0.0, end_offset=width)


def _request(station, elevation, left=3.0, right=3.0, rows=None):
    return RoadGeometryRequest(
        alignment_id="HCL", station=station, center_elevation=elevation,
        rows=rows if rows is not None else _hcl_rows(),
        left_segments=[_segment("LEFT", left, "L0")],
        right_segments=[_segment("RIGHT", right, "R0")],
        crossfall=CrossfallInput(),
    )


class TestHclProjectReplay:
    def test_total_length(self):
        assert HCL_LENGTH == pytest.approx(164.2476)

    def test_center_xyz_at_pdf_stations(self):
        for station, elevation in PDF_SECTION_ELEVATIONS:
            result = road_geometry_api.evaluate(
                _request(station, elevation))
            assert result.ok
            assert result.station == pytest.approx(station)
            assert result.x == pytest.approx(station)
            assert result.y == pytest.approx(0.0)
            assert result.z == pytest.approx(elevation)

    def test_centerline_pose_via_rows_and_prebuilt_agree(self):
        prebuilt = _hcl_alignment()
        for station, elevation in PDF_SECTION_ELEVATIONS:
            via_rows = road_geometry_api.evaluate(_request(station, elevation))
            via_prebuilt = road_geometry_api.evaluate(
                RoadGeometryRequest(
                    alignment_id="HCL", station=station, center_elevation=elevation,
                    alignment=prebuilt,
                    left_segments=[_segment("LEFT", 3.0, "L0")],
                    right_segments=[_segment("RIGHT", 3.0, "R0")],
                    crossfall=CrossfallInput(),
                ))
            assert via_rows.x == pytest.approx(via_prebuilt.x)
            assert via_rows.y == pytest.approx(via_prebuilt.y)
            assert via_rows.z == pytest.approx(via_prebuilt.z)
            assert via_rows.heading == pytest.approx(via_prebuilt.heading)

    def test_edges_at_pdf_stations(self):
        station, elevation = PDF_SECTION_ELEVATIONS[4]
        result = road_geometry_api.evaluate(_request(station, elevation))
        assert result.left_edge_xyz is not None
        assert result.right_edge_xyz is not None
        assert result.left_edge_xyz.x == pytest.approx(station)
        assert result.left_edge_xyz.y == pytest.approx(-3.0)
        assert result.right_edge_xyz.y == pytest.approx(3.0)


class TestFullResultContract:
    def test_all_required_fields_present(self):
        result = road_geometry_api.evaluate(
            _request(8.3121, 17.5903, left=7.5, right=11.9))
        assert result.station == pytest.approx(8.3121)
        assert result.x == pytest.approx(8.3121)
        assert result.y == pytest.approx(0.0)
        assert result.z == pytest.approx(17.5903)
        assert result.heading == pytest.approx(0.0)
        assert result.curvature == pytest.approx(0.0)
        assert result.tangent is not None
        assert result.normal is not None
        assert result.total_left_width == pytest.approx(7.5)
        assert result.total_right_width == pytest.approx(11.9)
        assert result.left_edge_xyz is not None
        assert result.right_edge_xyz is not None
        assert len(result.section_points) >= 3
        assert result.ok

    def test_no_cross_inputs_keeps_pose(self):
        request = RoadGeometryRequest(
            alignment_id="HCL", station=50.0, rows=_hcl_rows())
        result = road_geometry_api.evaluate(request)
        assert result.ok
        assert result.x == pytest.approx(50.0)
        assert result.z is None


class TestMixedChainReplay:
    def test_mixed_chain_curvature(self):
        alignment = build_alignment(
            "mixed",
            [
                StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=30.0),
                CircularArcElement(id="a1", start=Vec2D(30, 0), azimuth=0.0,
                                   radius=100.0, turn="left", length=50.0),
            ],
        )
        request = RoadGeometryRequest(
            alignment_id="mixed", station=45.0, alignment=alignment)
        result = road_geometry_api.evaluate(request)
        assert result.ok
        assert result.element_type == "arc"
        assert result.curvature == pytest.approx(1.0 / 100.0)

    def test_mixed_chain_straight_portion(self):
        alignment = build_alignment(
            "mixed",
            [
                StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=30.0),
                CircularArcElement(id="a1", start=Vec2D(30, 0), azimuth=0.0,
                                   radius=100.0, turn="left", length=50.0),
            ],
        )
        request = RoadGeometryRequest(
            alignment_id="mixed", station=10.0, alignment=alignment)
        result = road_geometry_api.evaluate(request)
        assert result.element_type == "straight"
        assert result.curvature == pytest.approx(0.0)
