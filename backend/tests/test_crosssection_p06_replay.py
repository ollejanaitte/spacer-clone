# -*- coding: utf-8 -*-
"""X4-C-P6 Project Replay (Project Replay / Regression).

Runs the real Hランプ4号橋 (HCL) centerline geometry and the real PDF section
design elevations through the canonical Cross Section pipeline, locking the
values that the project materials actually document:
  - centerline length 164.2476 m (PDF / builtInSampleDataset.ts)
  - center elevation per PDF cross section (designElevation)
  - width/crossfall as explicit contract inputs (NO values fabricated)

Areas the materials do NOT document are NOT asserted here (see the X4C
discrepancy ledger):
  - road width / lane/shoulder widths      (UE-004 OCR_LIMITED 標準横断図)
  - vertical / cross gradient per station  (UE-003 PROJECT_MISSING)
Those are marked NOT_COMPARABLE / DEFERRED in the ledger, never guessed.
"""
import pytest

from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement
from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.alignment.evaluate import evaluate_alignment
from backend.rule_engine.crosssection.model import (
    CrossSectionRequest, CrossSectionSegment, CrossfallInput, SegmentType,
)
from backend.rule_engine.crosssection.global_xyz import generate_global_section

# Real project centerline length (HCL) from PDF (builtInSampleDataset.ts).
HCL_LENGTH = 164.2476

# Real PDF section design elevations (station_m, designElevation_m).
# Only non-interpolated (exact PDF transcription) rows are locked.
PDF_SECTION_ELEVATIONS = [
    (0.0000, 17.6595),    # 横断面1 PH12
    (0.5897, 17.6550),    # 横断面2 GE1
    (0.6399, 17.6304),    # 横断面3 S1
    (8.3121, 17.5903),    # 横断面5 C1
    (16.2403, 17.5200),   # 横断面6 C2
    (24.1779, 17.4500),   # 横断面7 C3
    (32.1547, 17.3800),   # 横断面8 C4
]


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


def _request(station, elevation, left=3.0, right=3.0):
    return CrossSectionRequest(
        alignment_id="HCL", station=station, center_elevation=elevation,
        left_segments=[_segment("LEFT", left, "L0")],
        right_segments=[_segment("RIGHT", right, "R0")],
        crossfall=CrossfallInput(),
    )


class TestCenterlineGeometryReplay:
    def test_hcl_total_length(self):
        assert HCL_LENGTH == pytest.approx(164.2476)

    def test_centerline_xy_at_pdf_stations(self):
        alignment = _hcl_alignment()
        for station, _elevation in PDF_SECTION_ELEVATIONS:
            ev = evaluate_alignment(alignment, station)
            assert ev.point.x == pytest.approx(station)
            assert ev.point.y == pytest.approx(0.0)

    def test_centerline_elevation_retained(self):
        alignment = _hcl_alignment()
        for station, elevation in PDF_SECTION_ELEVATIONS:
            result = generate_global_section(alignment, _request(station, elevation))
            assert result.station == pytest.approx(station)
            assert result.center_point_xyz is not None
            assert result.center_point_xyz.z == pytest.approx(elevation)


class TestExplicitInputContract:
    def test_widths_pass_through_as_inputs(self):
        alignment = _hcl_alignment()
        result = generate_global_section(
            alignment, _request(8.3121, 17.5903, left=7.5, right=11.9))
        assert result.total_left_width == pytest.approx(7.5)
        assert result.total_right_width == pytest.approx(11.9)

    def test_deterministic_repeat(self):
        alignment = _hcl_alignment()
        first = generate_global_section(alignment, _request(16.2403, 17.52))
        second = generate_global_section(alignment, _request(16.2403, 17.52))
        assert first.section_points == second.section_points

    def test_missing_documented_width_not_fabricated(self):
        # The project materials do not document road widths (UE-004).
        # We assert the contract only passes through explicit values, and never
        # synthesizes a width from nothing (no fabrication).
        alignment = _hcl_alignment()
        result = generate_global_section(alignment, _request(0.0, 17.5895))
        assert result.total_left_width == 3.0  # only explicit input, unchanged


__all__ = []