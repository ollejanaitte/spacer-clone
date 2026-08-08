# -*- coding: utf-8 -*-
"""Diagram payload builders (STEP-2 S2-UX17).

Builds DiagramPayload instances for each schematic plane (PLAN / PROFILE /
SECTION / BRIDGE) from resolved road / vertical / bridge geometry.

No geometry is computed here: builders only emit stable object IDs and
state for the Step3 UI.
"""
from __future__ import annotations

from typing import List, Optional, Sequence

from backend.rule_engine.alignment import Alignment
from backend.rule_engine.bridge_geometry import Girder, Pier, Span
from backend.rule_engine.road_geometry import (
    RoadGeometryError,
    RoadGeometryRequest,
    road_geometry_api,
)
from backend.rule_engine.vertical import VerticalProfile, evaluate_vertical

from .contract import (
    DiagramPayload,
    FieldToDiagramMapping,
    VisualError,
    VisualObject,
    VisualWarning,
)

__all__ = [
    "build_plan_payload",
    "build_profile_payload",
    "build_section_payload",
    "build_bridge_payload",
    "build_plan_objects",
    "build_profile_objects",
    "build_section_objects",
    "build_bridge_objects",
]


# ---------------------------------------------------------------------------
# PLAN (UX-P01)
# ---------------------------------------------------------------------------

def build_plan_objects(alignment: Alignment) -> List[VisualObject]:
    objects: List[VisualObject] = []
    for index, span in enumerate(alignment.spans):
        objects.append(VisualObject(
            object_id=f"align-{span.element_id}",
            kind="alignment-element",
            entity_id=span.element_id,
            label=f"{span.element.type} {span.element_id}",
            plane="PLAN",
        ))
    return objects


def build_plan_payload(
    alignment: Alignment,
    *,
    selected_element_id: Optional[str] = None,
    errors: Optional[List[VisualError]] = None,
    geometry_ref: Optional[dict] = None,
) -> DiagramPayload:
    objects = build_plan_objects(alignment)
    mappings = [
        FieldToDiagramMapping(field_name="radius", object_id=obj.object_id)
        for obj in objects if obj.label.startswith("arc")
    ] + [
        FieldToDiagramMapping(field_name="clothoidParameter", object_id=obj.object_id)
        for obj in objects if obj.label.startswith("clothoid")
    ] + [
        FieldToDiagramMapping(field_name="length", object_id=obj.object_id)
        for obj in objects
    ]
    payload = DiagramPayload(
        plane="PLAN",
        objects=objects,
        mappings=mappings,
        selected_object_id=(
            f"align-{selected_element_id}" if selected_element_id else None),
        errors=list(errors or []),
        geometry_ref=geometry_ref or {},
    )
    return payload


# ---------------------------------------------------------------------------
# PROFILE (UX-P02)
# ---------------------------------------------------------------------------

def build_profile_objects(profile: VerticalProfile) -> List[VisualObject]:
    objects: List[VisualObject] = []
    for span in profile.spans:
        objects.append(VisualObject(
            object_id=f"v-{span.element_id}",
            kind="profile-element",
            entity_id=span.element_id,
            label=f"{span.element.type} {span.element_id}",
            plane="PROFILE",
        ))
    return objects


def build_profile_payload(
    profile: VerticalProfile,
    *,
    station: float,
    selected_element_id: Optional[str] = None,
    warnings: Optional[List[VisualWarning]] = None,
    errors: Optional[List[VisualError]] = None,
    geometry_ref: Optional[dict] = None,
) -> DiagramPayload:
    objects = build_profile_objects(profile)
    mappings = [
        FieldToDiagramMapping(field_name="grade", object_id=obj.object_id)
        for obj in objects if obj.label.startswith("grade")
    ] + [
        FieldToDiagramMapping(field_name="startGrade", object_id=obj.object_id)
        for obj in objects if obj.label.startswith("parabolic")
    ]
    try:
        ev = evaluate_vertical(profile, station)
    except Exception:
        ev = {}
    payload = DiagramPayload(
        plane="PROFILE",
        objects=objects,
        mappings=mappings,
        selected_object_id=(
            f"v-{selected_element_id}" if selected_element_id else None),
        warnings=list(warnings or []),
        errors=list(errors or []),
        geometry_ref={
            **(geometry_ref or {}),
            "station": station,
            "elevation": ev.get("elevation"),
            "grade": ev.get("grade"),
        },
    )
    return payload


# ---------------------------------------------------------------------------
# SECTION (UX-P03)
# ---------------------------------------------------------------------------

def build_section_objects(
    segment_ids: Sequence[str],
) -> List[VisualObject]:
    return [
        VisualObject(
            object_id=f"s-{segment_id}",
            kind="section-element",
            entity_id=segment_id,
            label=f"section {segment_id}",
            plane="SECTION",
        )
        for segment_id in segment_ids
    ]


def build_section_payload(
    *,
    segment_ids: Sequence[str],
    station: float,
    selected_segment_id: Optional[str] = None,
    warnings: Optional[List[VisualWarning]] = None,
    errors: Optional[List[VisualError]] = None,
    geometry_ref: Optional[dict] = None,
) -> DiagramPayload:
    objects = build_section_objects(segment_ids)
    mappings = [
        FieldToDiagramMapping(field_name="width", object_id=obj.object_id)
        for obj in objects
    ]
    merged_ref = dict(geometry_ref or {})
    merged_ref["station"] = station
    payload = DiagramPayload(
        plane="SECTION",
        objects=objects,
        mappings=mappings,
        selected_object_id=(
            f"s-{selected_segment_id}" if selected_segment_id else None),
        warnings=list(warnings or []),
        errors=list(errors or []),
        geometry_ref=merged_ref,
    )
    return payload


# ---------------------------------------------------------------------------
# BRIDGE (UX-P04)
# ---------------------------------------------------------------------------

def build_bridge_objects(
    piers: Sequence[Pier],
    girders: Sequence[Girder],
    spans: Optional[Sequence[Span]] = None,
) -> List[VisualObject]:
    objects: List[VisualObject] = [
        VisualObject(
            object_id=f"pier-{pier.pier_id}",
            kind="pier",
            entity_id=pier.pier_id,
            label=f"pier {pier.pier_id}",
            plane="MIXED",
        )
        for pier in piers
    ]
    for girder in girders:
        objects.append(VisualObject(
            object_id=f"girder-{girder.girder_id}",
            kind="girder",
            entity_id=girder.girder_id,
            label=f"girder {girder.girder_id}",
            plane="MIXED",
        ))
        for node in girder.nodes:
            objects.append(VisualObject(
                object_id=f"node-{node.node_id}",
                kind="node",
                entity_id=node.node_id,
                label=f"node {node.node_id}",
                plane="MIXED",
            ))
    return objects


def build_bridge_payload(
    *,
    piers: Sequence[Pier],
    girders: Sequence[Girder],
    spans: Optional[Sequence[Span]] = None,
    selected_object_id: Optional[str] = None,
    warnings: Optional[List[VisualWarning]] = None,
    errors: Optional[List[VisualError]] = None,
    geometry_ref: Optional[dict] = None,
) -> DiagramPayload:
    objects = build_bridge_objects(piers, girders, spans)
    mappings = [
        FieldToDiagramMapping(field_name="station", object_id=obj.object_id)
        for obj in objects if obj.kind == "pier"
    ] + [
        FieldToDiagramMapping(field_name="skew", object_id=obj.object_id)
        for obj in objects if obj.kind == "pier"
    ] + [
        FieldToDiagramMapping(field_name="transverseOffset", object_id=obj.object_id)
        for obj in objects if obj.kind == "girder"
    ]
    payload = DiagramPayload(
        plane="BRIDGE",
        objects=objects,
        mappings=mappings,
        selected_object_id=selected_object_id,
        warnings=list(warnings or []),
        errors=list(errors or []),
        geometry_ref=geometry_ref or {},
    )
    return payload
