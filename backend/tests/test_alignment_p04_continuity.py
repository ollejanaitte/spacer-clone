# -*- coding: utf-8 -*-
"""Focused tests for X4-B-P04: continuity and semantic points."""
import math
import pytest

from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement, CircularArcElement
from backend.rule_engine.geometry.clothoid import ClothoidElement

from backend.rule_engine.alignment.model import build_alignment
from backend.rule_engine.alignment.evaluate import evaluate_alignment
from backend.rule_engine.alignment.continuity import (
    ContinuityLevel, SemanticBoundaryError, SemanticPoint, verify_continuity,
    semantic_points,
)


def _aligned_chain():
    """A synthesised, perfectly continuous straight->clothoid->arc chain.

    The clothoid bridges straight (k=0) into a circular arc (G2 holds). The
    arc's start point/azimuth are derived from the clothoid's actual end so
    G0/G1 hold at every junction.
    """
    from backend.rule_engine.alignment.evaluate import evaluate_element

    clothoid = ClothoidElement(id="c1", start=Vec2D(10, 0), azimuth=0.0, length=20.0,
                                clothoidParameter=20.0, startRadius=None,
                                endRadius=20.0, turn="left")
    clothoid_end = evaluate_element(clothoid, 20.0)

    arc = CircularArcElement(
        id="a2",
        start=clothoid_end.point,
        azimuth=clothoid_end.azimuth,
        radius=20.0,
        turn="left",
        length=30.0,
    )
    return build_alignment(
        "A",
        [
            StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=10.0),
            clothoid,
            arc,
        ],
    )


def _intentionally_broken():
    """Two straights with a bearing discontinuity (azimuth jump)."""
    return build_alignment(
        "A",
        [
            StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=10.0),
            StraightElement(id="s1", start=Vec2D(10, 0), azimuth=math.pi, length=10.0),
        ],
    )


def _noncontiguous_position():
    return build_alignment(
        "A",
        [
            StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=10.0),
            StraightElement(id="s1", start=Vec2D(500, 500), azimuth=0.0, length=10.0),
        ],
    )


class TestVerifyContinuity:
    def test_single_element_no_boundaries(self):
        a = build_alignment("A", [StraightElement(id="s0", start=Vec2D(0, 0),
                             azimuth=0.0, length=10.0)])
        report = verify_continuity(a)
        assert report.boundary_crossings == 0
        assert report.count == 0
        assert report.passed is True

    def test_continuous_chain_passes(self):
        a = _aligned_chain()
        report = verify_continuity(a)
        assert report.count == 0
        assert report.passed is True
        assert report.boundary_crossings == 2

    def test_position_mismatch_reported_g0(self):
        report = verify_continuity(_noncontiguous_position())
        kinds = {issue.kind for issue in report.issues}
        assert "G0" in kinds
        assert all(issue.level == ContinuityLevel.ERROR for issue in report.issues)
        assert report.passed is False

    def test_bearing_mismatch_reported_g1(self):
        report = verify_continuity(_intentionally_broken())
        kinds = {issue.kind for issue in report.issues}
        assert "G1" in kinds
        assert report.passed is False

    def test_boundaries_metadata(self):
        report = verify_continuity(_aligned_chain())
        assert len(report.boundaries) == 2
        b0 = report.boundaries[0]
        assert b0.left_id == "s0"
        assert b0.right_id == "c1"
        assert b0.position_delta <= 1e-6


class TestSemanticPoints:
    def test_bp_ep_and_interior(self):
        a = _aligned_chain()
        pts = semantic_points(a)
        assert pts[0].kind == "BP"
        assert pts[-1].kind == "EP"
        assert len(pts) == 4  # BP + 2 boundaries + EP

    def test_interior_boundary_links(self):
        a = _aligned_chain()
        pts = semantic_points(a)
        interior = pts[1]
        assert interior.kind == "boundary"
        assert interior.left_id == "s0"
        assert interior.right_id == "c1"

    def test_semantic_point_type(self):
        a = _aligned_chain()
        assert isinstance(semantic_points(a)[0], SemanticPoint)

    def test_empty_alignment_rejected(self):
        with pytest.raises(SemanticBoundaryError):
            semantic_points(build_alignment("A", []) if False else _no_spans())


def _no_spans():
    # Can't build an empty alignment via builder; simulate via manual instance
    from backend.rule_engine.alignment.model import Alignment
    return Alignment(alignment_id="A", elements=[], _spans=[])


def build_chain(elements):
    return build_alignment("A", elements)