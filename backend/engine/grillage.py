"""Grillage design-model analysis (Phase 7).

Converts a grillage design model (produced from GeometrySnapshot on the frontend)
into a runnable analysis project (declared steel material + declared section
properties), runs the existing linear-static solver and returns results gated as
NOT_AUTHORIZED (Phase A numeric-authorization policy).

The grillage spec carries nodes / members / supports / loadCases only; material
and section *properties* are declared modelling inputs supplied here.
"""

from __future__ import annotations

from typing import Any

from .errors import AnalysisError
from .solver import run_analysis

STEEL_MATERIAL: dict[str, Any] = {
    "id": "MAT-STEEL",
    "name": "steel (declared, E=205 GPa)",
    "elasticModulus": 2.05e8,  # kN/m2
    "shearModulus": 8.0e7,  # kN/m2
    "poissonRatio": 0.3,
    "density": 78.5,  # kN/m3 (declared)
}

AUTHORIZATION_GATE = {"authorization": "NOT_GRANTED", "numericDesignAuthorization": "NOT_GRANTED"}


class GrillageError(ValueError):
    """Raised for invalid grillage input."""


def declared_section(section_id: str) -> dict[str, Any]:
    """Declared section properties for the design framework (display/analysis only).

    Values are declared framework defaults; section-property computation from
    girder geometry is deferred to the authorized design path (Phase 8).
    """
    return {
        "id": section_id,
        "name": f"{section_id} (declared)",
        "area": 0.1,  # m2
        "iy": 0.01,  # m4
        "iz": 0.004,  # m4
        "j": 0.001,  # m4
    }


def build_grillage_project(grillage: dict[str, Any]) -> dict[str, Any]:
    """Build a runnable analysis project from a grillage design model."""
    nodes = grillage.get("nodes") or []
    members = grillage.get("members") or []
    supports = grillage.get("supports") or []
    load_cases = grillage.get("loadCases") or []

    if not nodes:
        raise GrillageError("grillage model has no nodes")
    if not members:
        raise GrillageError("grillage model has no members")

    # normalize supports (frontend grillage uses ux/uy/uz)
    norm_supports = []
    for s in supports:
        norm_supports.append(
            {
                "nodeId": s["nodeId"],
                "ux": bool(s.get("ux", False)),
                "uy": bool(s.get("uy", False)),
                "uz": bool(s.get("uz", True)),
                "rx": False,
                "ry": False,
                "rz": False,
            }
        )

    sections: dict[str, dict[str, Any]] = {}
    for m in members:
        sections.setdefault(m.get("sectionId", "SECTION-GIRDER"), None)
    section_list = [
        declared_section(sid) if props is None else props
        for sid, props in sections.items()
    ]

    return {
        "project": {
            "id": grillage.get("bridgeId", "grillage"),
            "name": grillage.get("bridgeId", "grillage"),
            "schemaVersion": "1.0.0",
        },
        "units": {"length": "m", "force": "kN", "moment": "kN_m", "modulus": "kN_per_m2"},
        "nodes": [{k: n[k] for k in ("id", "x", "y", "z")} for n in nodes],
        "materials": [STEEL_MATERIAL],
        "sections": section_list,
        "members": [
            {
                "id": m["id"],
                "nodeI": m["nodeI"],
                "nodeJ": m["nodeJ"],
                "materialId": m.get("materialId", STEEL_MATERIAL["id"]),
                "sectionId": m.get("sectionId", "SECTION-GIRDER"),
                "orientationVector": m.get("orientationVector", {"x": 0, "y": 1, "z": 0}),
            }
            for m in members
        ],
        "supports": norm_supports,
        "loadCases": load_cases,
        "nodalLoads": grillage.get("nodalLoads", []),
        "memberLoads": grillage.get("memberLoads", []),
        "analysisSettings": {
            "analysisType": "linear_static",
            "solver": "scipy_sparse",
            "includeShearDeformation": False,
            "largeDisplacement": False,
        },
    }


def run_grillage_analysis(grillage: dict[str, Any]) -> dict[str, Any]:
    """Run the linear-static solver on the grillage model and gate the result.

    The built envelope is `{project: ProjectInfo, units, nodes, ...}` (top
    level) which is the exact shape `parse_model` expects (R1 SCHEMA_ERROR fix).
    """
    built = build_grillage_project(grillage)
    try:
        result = run_analysis(built)
    except AnalysisError as exc:
        raise GrillageError(f"grillage analysis failed: {exc}") from exc
    result = dict(result)
    result.update(AUTHORIZATION_GATE)
    return result
