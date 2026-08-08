# -*- coding: utf-8 -*-
"""Diagram Data Contract tests (STEP-2 S2-UX17)."""
from __future__ import annotations

import pytest

from backend.rule_engine.alignment import build_alignment
from backend.rule_engine.geometry.contracts import Vec2D, Vec3
from backend.rule_engine.geometry.line_arc import CircularArcElement, StraightElement
from backend.rule_engine.bridge_geometry import Girder, Node, Pier
from backend.rule_engine.vertical import (
    VerticalGradeElement,
    build_vertical_profile,
)
from backend.rule_engine.visual import (
    VisualError,
    VisualObject,
    VisualWarning,
    build_bridge_payload,
    build_plan_payload,
    build_profile_payload,
    build_section_payload,
)


def _alignment():
    return build_alignment(
        "road",
        [StraightElement(id="s0", start=Vec2D(0, 0), azimuth=0.0, length=30.0),
         CircularArcElement(id="a1", start=Vec2D(30, 0), azimuth=0.0,
                            radius=100.0, turn="left", length=50.0)],
        origin_station=0.0,
    )


def _profile():
    return build_vertical_profile("v", [
        VerticalGradeElement(id="g0", start_station=0.0, end_station=100.0,
                             start_elevation=10.0, grade=0.01)])


class TestPlan:
    def test_objects_stable_ids(self):
        payload = build_plan_payload(_alignment())
        ids = {o.object_id for o in payload.objects}
        assert "align-s0" in ids
        assert "align-a1" in ids
        # radius field maps to arc element
        radius_mappings = [m for m in payload.mappings if m.field_name == "radius"]
        assert radius_mappings

    def test_selection(self):
        payload = build_plan_payload(_alignment(), selected_element_id="a1")
        assert payload.selected_object_id == "align-a1"


class TestProfile:
    def test_objects(self):
        payload = build_profile_payload(_profile(), station=50.0)
        assert payload.objects[0].object_id == "v-g0"
        assert payload.geometry_ref["elevation"] is not None
        grade_mappings = [m for m in payload.mappings if m.field_name == "grade"]
        assert grade_mappings


class TestSection:
    def test_objects(self):
        payload = build_section_payload(
            segment_ids=["L0", "R0"], station=50.0,
            selected_segment_id="L0")
        assert payload.selected_object_id == "s-L0"
        assert len(payload.objects) == 2


class TestBridge:
    def test_objects(self):
        pier = Pier(pier_id="K1", station=0.0, alignment_id="road")
        pier.support_points = [Vec3(0, 0, 10.0)]
        girder = Girder(girder_id="G1", line_side="center", transverse_offset_m=0.0)
        girder.nodes = [Node(node_id="G1-K1", girder_id="G1", pier_id="K1",
                             station=0.0, offset_m=0.0, xyz=Vec3(0, 0, 10.0))]
        payload = build_bridge_payload(
            piers=[pier], girders=[girder],
            warnings=[VisualWarning(object_id="pier-K1", rule_id="X2-R-023",
                                    message="clearance")],
            errors=[VisualError(object_id="girder-G1", error_type="GEOMETRY",
                                message="out of section")],
        )
        assert payload.plane == "BRIDGE"
        assert any(o.object_id == "node-G1-K1" for o in payload.objects)
        assert payload.warnings[0].rule_id == "X2-R-023"
        assert payload.errors[0].error_type == "GEOMETRY"
        skew_mappings = [m for m in payload.mappings if m.field_name == "skew"]
        assert skew_mappings

    def test_to_dict(self):
        payload = build_bridge_payload(piers=[], girders=[])
        data = payload.to_dict()
        assert data["plane"] == "BRIDGE"
        assert "selectedObjectId" in data


class TestVisualObject:
    def test_fields(self):
        obj = VisualObject(object_id="x", kind="pier", entity_id="K1",
                           label="pier K1", plane="MIXED")
        assert obj.entity_id == "K1"
