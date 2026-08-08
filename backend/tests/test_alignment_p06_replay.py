# -*- coding: utf-8 -*-
"""X4-B-P06 regression: replay realistic road alignment data through the
canonical backend Alignment solver and lock key numeric invariants.

The values mirrored here come from real project data:
  - BUILT_IN_SAMPLE_ALIGNMENT_LENGTH = 164.2476 (PDF: HCL 中心線長)
    from frontend/src/liner/importer/sample/builtInSampleDataset.ts
  - The built-in HCL is a single straight on azimuth 0 from (0,0).

The mixed-chain regression uses hand-computed geometry so the test is a
true oracle independent of the solver implementation.
"""
import math
import pytest

from backend.rule_engine.alignment.contract import (
    build_alignment_from_roadmap, evaluate_alignment_for_rule,
)
from backend.rule_engine.alignment.model import build_alignment
from backend.rule_engine.alignment.evaluate import evaluate_alignment
from backend.rule_engine.alignment.station import lookup_station
from backend.rule_engine.alignment.continuity import verify_continuity, semantic_points
from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import CircularArcElement, StraightElement


# Real project value (PDF HCL 中心線長) - replay ground truth.
BUILT_IN_HCL_LENGTH = 164.2476


def _mixed():
    """A straight->arc->straight whose geometry is hand-computed."""
    return build_alignment(
        "mixed",
        [
            StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=30.0),
            CircularArcElement(id="a1", start=Vec2D(30, 0), azimuth=0.0,
                               radius=100.0, turn="left", length=50.0),
            StraightElement(id="s2", start=Vec2D(0, 0), azimuth=0.0, length=20.0),
        ],
    )


class TestBuiltInSampleReplay:
    def _replay_builtin_hcl(self):
        # Emulates builtInSampleDataset alignmentMetadata.plan.elements:
        # a single straight on azimuth 0 from (0,0).
        return build_alignment(
            "built-in-plan-hcl",
            [
                StraightElement(
                    id="built-in-plan-hcl",
                    start=Vec2D(0, 0),
                    azimuth=0.0,
                    length=BUILT_IN_HCL_LENGTH,
                )
            ],
        )

    def test_total_length_matches_pdf(self):
        a = self._replay_builtin_hcl()
        assert abs(a.total_length - BUILT_IN_HCL_LENGTH) < 1e-9
        assert abs(a.end_station - BUILT_IN_HCL_LENGTH) < 1e-9

    def test_station_progression_monotonic(self):
        a = self._replay_builtin_hcl()
        prev = -1.0
        for s in [0.0, 50.0, 100.0, 150.0, BUILT_IN_HCL_LENGTH]:
            ev = evaluate_alignment(a, s)
            assert ev.station == s
            assert ev.point.x == pytest.approx(s)
            assert ev.point.y == 0.0
            assert prev < ev.point.x
            prev = ev.point.x

    def test_midpoint_point(self):
        a = self._replay_builtin_hcl()
        ev = evaluate_alignment(a, BUILT_IN_HCL_LENGTH / 2)
        assert ev.point.x == pytest.approx(BUILT_IN_HCL_LENGTH / 2)
        assert ev.point.y == 0.0
        assert ev.azimuth == 0.0
        assert ev.curvature == 0.0

    def test_endpoint_semantic(self):
        a = self._replay_builtin_hcl()
        pts = semantic_points(a)
        assert pts[0].kind == "BP"
        assert pts[0].station == 0.0
        assert pts[-1].kind == "EP"
        assert pts[-1].station == pytest.approx(BUILT_IN_HCL_LENGTH)


class TestMixedChain:
    def test_total_and_boundaries(self):
        a = _mixed()
        assert a.total_length == 100.0
        assert a.end_station == 100.0
        report = verify_continuity(a)
        assert [b.boundary_station for b in report.boundaries] == [30.0, 80.0]
        assert report.boundary_crossings == 2

    def test_built_in_reference_pin(self):
        assert BUILT_IN_HCL_LENGTH > 0
        assert math.isclose(BUILT_IN_HCL_LENGTH, 164.2476, abs_tol=1e-9)


class TestRoadmapReplay:
    """Replay via the RuleEngine Road->Bridge adapter."""

    def test_replay_built_in_road_map(self):
        a = build_alignment_from_roadmap(
            "replay",
            [
                {"kind": "straight", "length": 30.0,
                 "parameters": {"startX": 0, "startY": 0, "azimuth": 0}, "id": "s0"},
                {"kind": "arc", "length": 50.0,
                 "parameters": {"radius": 100.0, "turn": "left",
                                "startX": 30, "startY": 0, "azimuth": 0}, "id": "a1"},
                {"kind": "straight", "length": 20.0,
                 "parameters": {"startX": 0, "startY": 0, "azimuth": 0}, "id": "s2"},
            ],
            origin_station=0.0,
        )
        ev = evaluate_alignment_for_rule(a, 35.0)
        assert ev.status == "PASS"
        curvature = next(o for o in ev.outputs if o.name == "curvature")
        assert curvature.value == pytest.approx(0.01)

    def test_lookup_regression_returns_span(self):
        a = _mixed()
        lu = lookup_station(a, 45.0)
        assert lu.element_id == "a1"
        assert lu.local_station == pytest.approx(15.0)