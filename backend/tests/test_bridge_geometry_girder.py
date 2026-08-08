# -*- coding: utf-8 -*-
"""Bridge Geometry - Girder / Node tests (STEP-2 S2-UX09)."""
from __future__ import annotations

import pytest

from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.geometry.contracts import Vec2D
from backend.rule_engine.geometry.line_arc import StraightElement
from backend.rule_engine.bridge_geometry import (
    BridgeGeometryError,
    Girder,
    Pier,
    generate_girder_nodes,
    validate_girder,
)


def _alignment(length=200.0):
    return build_alignment(
        "road",
        [StraightElement(id="e0", start=Vec2D(0, 0), azimuth=0.0, length=length)],
        origin_station=0.0,
    )


def _piers():
    return [Pier(pier_id="K1", station=0.0, alignment_id="road"),
            Pier(pier_id="K2", station=50.0, alignment_id="road"),
            Pier(pier_id="K3", station=100.0, alignment_id="road")]


class TestValidateGirder:
    def test_valid(self):
        assert validate_girder(Girder(girder_id="G301", line_side="center")) == []

    def test_bad_side(self):
        assert validate_girder(Girder(girder_id="G", line_side="diagonal"))

    def test_empty_id(self):
        assert validate_girder(Girder(girder_id="", line_side="center"))


class TestGenerateGirderNodes:
    def test_center_nodes(self):
        girder = generate_girder_nodes(
            Girder(girder_id="G301", line_side="center", alignment_id="road"),
            _piers(), alignment=_alignment())
        assert len(girder.nodes) == 3
        assert girder.nodes[0].station == 0.0
        assert girder.nodes[0].xyz.x == pytest.approx(0.0)
        assert girder.nodes[0].xyz.y == pytest.approx(0.0)
        assert girder.nodes[1].xyz.x == pytest.approx(50.0)

    def test_right_offset(self):
        girder = generate_girder_nodes(
            Girder(girder_id="G302", line_side="right", transverse_offset_m=6.0,
                   alignment_id="road"),
            _piers(), alignment=_alignment())
        assert girder.nodes[0].offset_m == 6.0
        assert girder.nodes[0].xyz.y == pytest.approx(6.0)

    def test_left_offset(self):
        girder = generate_girder_nodes(
            Girder(girder_id="G300", line_side="left", transverse_offset_m=-6.0,
                   alignment_id="road"),
            _piers(), alignment=_alignment())
        assert girder.nodes[0].xyz.y == pytest.approx(-6.0)

    def test_node_ids(self):
        girder = generate_girder_nodes(
            Girder(girder_id="G301", line_side="center", alignment_id="road"),
            _piers(), alignment=_alignment())
        assert [n.node_id for n in girder.nodes] == ["G301-K1", "G301-K2", "G301-K3"]

    def test_z_plan_default(self):
        girder = generate_girder_nodes(
            Girder(girder_id="G301", line_side="center", alignment_id="road"),
            _piers(), alignment=_alignment(), z_plan=12.5)
        assert girder.nodes[0].z_plan == pytest.approx(12.5)

    def test_bad_girder_raises(self):
        with pytest.raises(BridgeGeometryError):
            generate_girder_nodes(
                Girder(girder_id="G", line_side="bad", alignment_id="road"),
                _piers(), alignment=_alignment())

    def test_nodes_require_generation(self):
        girder = Girder(girder_id="G", line_side="center")
        with pytest.raises(BridgeGeometryError):
            _ = girder.nodes
