"""Solver Input Adapter (Phase 7-01 C FROZEN / Phase 7-02 WP-G).

Converts an AnalysisDocument (spacer.contracts.analysis-document v1.0.0) into a
backend engine project dict with the correct envelope (SCHEMA_ERROR fixed):

    {project: ProjectInfo, units, nodes, materials, sections, members,
     supports, loadCases, nodalLoads, memberLoads, analysisSettings}

Member orientation is passed through per member (cross-beam INVALID_ORIENTATION
fix, R1). Member distributed loads (global z) map to engine uniform member
loads (wz). Supports are bool DOF constraints (global axes).
"""

from __future__ import annotations

from typing import Any

from .errors import AnalysisError

REQUIRED_NODE_KEYS = ("entityId", "x", "y", "z")


class SolverInputError(ValueError):
    """Raised for invalid AnalysisDocument input."""


def _require_mapping(data: Any, key: str, path: str) -> dict[str, Any]:
    value = data.get(key) if isinstance(data, dict) else None
    if not isinstance(value, dict):
        raise SolverInputError(f"{path}: {key} must be an object.")
    return value


def _require_list(data: Any, key: str, path: str) -> list[Any]:
    value = data.get(key) if isinstance(data, dict) else None
    if not isinstance(value, list):
        raise SolverInputError(f"{path}: {key} must be an array.")
    return value


def _finite(value: Any, path: str) -> float:
    if not isinstance(value, (int, float)) or not isinstance(value, (int, float)):
        raise SolverInputError(f"{path}: value must be numeric.")
    number = float(value)
    if number != number or number in (float("inf"), float("-inf")):
        raise SolverInputError(f"{path}: value must be finite.")
    return number


def build_project_from_analysis_document(analysis: dict[str, Any]) -> dict[str, Any]:
    """Build the backend engine project dict from an AnalysisDocument."""
    raw_project_id = analysis.get("projectId") if isinstance(analysis, dict) else None
    project_id = str(raw_project_id) if raw_project_id else "analysis"

    nodes = _require_list(analysis, "nodes", "/")
    members = _require_list(analysis, "members", "/")
    materials = _require_list(analysis, "materials", "/")
    sections = _require_list(analysis, "sections", "/")
    supports = _require_list(analysis, "supports", "/")
    load_cases = _require_list(analysis, "loadCases", "/")
    nodal_loads = _require_list(analysis, "nodalLoads", "/")
    member_loads = _require_list(analysis, "memberLoads", "/")

    node_ids = {str(n["entityId"]): n for n in nodes if isinstance(n, dict)}
    member_ids = {str(m["entityId"]): m for m in members if isinstance(m, dict)}
    material_ids = {str(m["entityId"]): m for m in materials if isinstance(m, dict)}
    section_ids = {str(s["entityId"]): s for s in sections if isinstance(s, dict)}

    project_nodes = []
    for index, node in enumerate(nodes):
        if not isinstance(node, dict):
            raise SolverInputError(f"/nodes[{index}]: must be an object.")
        node_id = str(node.get("entityId", ""))
        if not node_id:
            raise SolverInputError(f"/nodes[{index}]: entityId required.")
        project_nodes.append(
            {
                "id": node_id,
                "x": _finite(node.get("x"), f"/nodes[{index}].x"),
                "y": _finite(node.get("y"), f"/nodes[{index}].y"),
                "z": _finite(node.get("z"), f"/nodes[{index}].z"),
            }
        )

    project_materials = []
    for index, material in enumerate(materials):
        if not isinstance(material, dict):
            raise SolverInputError(f"/materials[{index}]: must be an object.")
        material_id = str(material.get("entityId", ""))
        project_materials.append(
            {
                "id": material_id,
                "name": material.get("name") or f"material-{index}",
                "elasticModulus": _finite(material.get("elasticModulus"), f"/materials[{index}].elasticModulus"),
                "shearModulus": _finite(material.get("shearModulus"), f"/materials[{index}].shearModulus"),
                "poissonRatio": _finite(material.get("poissonRatio"), f"/materials[{index}].poissonRatio"),
                "density": _finite(material.get("density"), f"/materials[{index}].density"),
            }
        )

    project_sections = []
    for index, section in enumerate(sections):
        if not isinstance(section, dict):
            raise SolverInputError(f"/sections[{index}]: must be an object.")
        section_id = str(section.get("entityId", ""))
        project_sections.append(
            {
                "id": section_id,
                "name": section.get("name") or f"section-{index}",
                "area": _finite(section.get("area"), f"/sections[{index}].area"),
                "iy": _finite(section.get("iy"), f"/sections[{index}].iy"),
                "iz": _finite(section.get("iz"), f"/sections[{index}].iz"),
                "j": _finite(section.get("j"), f"/sections[{index}].j"),
            }
        )

    project_members = []
    for index, member in enumerate(members):
        if not isinstance(member, dict):
            raise SolverInputError(f"/members[{index}]: must be an object.")
        member_id = str(member.get("entityId", ""))
        node_i = str(member.get("nodeIId", ""))
        node_j = str(member.get("nodeJId", ""))
        if node_i not in node_ids or node_j not in node_ids:
            raise SolverInputError(f"/members[{index}]: end nodes must exist.")
        material_id = str(member.get("materialId", ""))
        section_id = str(member.get("sectionId", ""))
        if material_id not in material_ids:
            raise SolverInputError(f"/members[{index}]: material must exist.")
        if section_id not in section_ids:
            raise SolverInputError(f"/members[{index}]: section must exist.")
        orientation = member.get("orientationVector") or {"x": 0, "y": 1, "z": 0}
        project_members.append(
            {
                "id": member_id,
                "nodeI": node_i,
                "nodeJ": node_j,
                "materialId": material_id,
                "sectionId": section_id,
                "orientationVector": {
                    "x": _finite(orientation.get("x"), f"/members[{index}].orientationVector.x"),
                    "y": _finite(orientation.get("y"), f"/members[{index}].orientationVector.y"),
                    "z": _finite(orientation.get("z"), f"/members[{index}].orientationVector.z"),
                },
            }
        )

    project_supports = []
    for index, support in enumerate(supports):
        if not isinstance(support, dict):
            raise SolverInputError(f"/supports[{index}]: must be an object.")
        node_id = str(support.get("nodeId", ""))
        if node_id not in node_ids:
            raise SolverInputError(f"/supports[{index}]: node must exist.")
        constraint = support.get("constraint") or {}
        project_supports.append(
            {
                "nodeId": node_id,
                "ux": bool(constraint.get("ux", False)),
                "uy": bool(constraint.get("uy", False)),
                "uz": bool(constraint.get("uz", True)),
                "rx": bool(constraint.get("rx", False)),
                "ry": bool(constraint.get("ry", False)),
                "rz": bool(constraint.get("rz", False)),
            }
        )

    project_load_cases = []
    for index, load_case in enumerate(load_cases):
        if not isinstance(load_case, dict):
            raise SolverInputError(f"/loadCases[{index}]: must be an object.")
        project_load_cases.append(
            {
                "id": str(load_case.get("caseId", f"LC{index + 1}")),
                "name": str(load_case.get("caseId", f"LC{index + 1}")),
                "type": str(load_case.get("kind", "dead")),
            }
        )

    project_nodal_loads = []
    for index, load in enumerate(nodal_loads):
        if not isinstance(load, dict):
            raise SolverInputError(f"/nodalLoads[{index}]: must be an object.")
        node_id = str(load.get("nodeId", ""))
        if node_id not in node_ids:
            raise SolverInputError(f"/nodalLoads[{index}]: node must exist.")
        project_nodal_loads.append(
            {
                "id": str(load.get("id", f"NL{index + 1}")),
                "loadCaseId": str(load.get("loadCaseId", "")),
                "nodeId": node_id,
                "fx": _finite(load.get("fx", 0.0), f"/nodalLoads[{index}].fx"),
                "fy": _finite(load.get("fy", 0.0), f"/nodalLoads[{index}].fy"),
                "fz": _finite(load.get("fz", 0.0), f"/nodalLoads[{index}].fz"),
                "mx": _finite(load.get("mx", 0.0), f"/nodalLoads[{index}].mx"),
                "my": _finite(load.get("my", 0.0), f"/nodalLoads[{index}].my"),
                "mz": _finite(load.get("mz", 0.0), f"/nodalLoads[{index}].mz"),
            }
        )

    project_member_loads = []
    for index, load in enumerate(member_loads):
        if not isinstance(load, dict):
            raise SolverInputError(f"/memberLoads[{index}]: must be an object.")
        member_id = str(load.get("memberId", ""))
        if member_id not in member_ids:
            raise SolverInputError(f"/memberLoads[{index}]: member must exist.")
        magnitude = _finite(load.get("magnitude"), f"/memberLoads[{index}].magnitude")
        direction = str(load.get("direction", "z"))
        coordinate_system = str(load.get("coordinateSystem", "global"))
        wx = magnitude if direction == "x" else 0.0
        wy = magnitude if direction == "y" else 0.0
        wz = magnitude if direction == "z" else 0.0
        project_member_loads.append(
            {
                "id": str(load.get("id", f"ML{index + 1}")),
                "loadCaseId": str(load.get("loadCaseId", "")),
                "memberId": member_id,
                "coordinateSystem": coordinate_system,
                "type": "uniform",
                "wx": wx,
                "wy": wy,
                "wz": wz,
            }
        )

    # Elastic supports: pass CONFIRMED springs (stiffness present) through.
    # SOURCE_NOT_AVAILABLE / null-stiffness springs are never fabricated.
    project_springs = []
    for index, spring in enumerate(analysis.get("springs", []) + analysis.get("foundationSprings", [])):
        if not isinstance(spring, dict):
            raise SolverInputError(f"/springs[{index}]: must be an object.")
        if spring.get("valueState") != "CONFIRMED":
            continue
        stiffness = spring.get("stiffness")
        if not isinstance(stiffness, (int, float)):
            continue
        node_id = str(spring.get("nodeId", ""))
        if node_id not in node_ids:
            raise SolverInputError(f"/springs[{index}]: node must exist.")
        project_springs.append(
            {
                "id": str(spring.get("entityId") or f"spring{index + 1}"),
                "nodeId": node_id,
                "dof": str(spring.get("dof", "uz")),
                "stiffness": _finite(stiffness, f"/springs[{index}].stiffness"),
                "coordinateSystem": str(spring.get("coordinateSystem", "global")),
            }
        )

    analysis_settings = analysis.get("analysisSettings") or {}
    settings = {
        "analysisType": "linear_static",
        "solver": "scipy_sparse",
        "includeShearDeformation": False,
        "largeDisplacement": False,
    }
    if isinstance(analysis_settings, dict):
        if analysis_settings.get("analysisType"):
            settings["analysisType"] = str(analysis_settings["analysisType"])
        if analysis_settings.get("solver"):
            settings["solver"] = str(analysis_settings["solver"])
        if analysis_settings.get("includeShearDeformation") is True:
            settings["includeShearDeformation"] = True
        if analysis_settings.get("largeDisplacement") is True:
            settings["largeDisplacement"] = True

    return {
        "project": {
            "id": str(project_id or "analysis"),
            "name": "AnalysisDocument",
            "schemaVersion": "1.0.0",
        },
        "units": {
            "length": "m",
            "force": "kN",
            "moment": "kN_m",
            "modulus": "kN_per_m2",
        },
        "nodes": project_nodes,
        "materials": project_materials,
        "sections": project_sections,
        "members": project_members,
        "supports": project_supports,
        "loadCases": project_load_cases,
        "nodalLoads": project_nodal_loads,
        "memberLoads": project_member_loads,
        "springs": project_springs,
        "analysisSettings": settings,
    }


def run_analysis_document(analysis: dict[str, Any]) -> dict[str, Any]:
    """Convert an AnalysisDocument and run the linear-static solver (KEEP)."""
    from .solver import run_analysis  # deferred to avoid import cycle

    project = build_project_from_analysis_document(analysis)
    return run_analysis(project)


__all__ = [
    "SolverInputError",
    "build_project_from_analysis_document",
    "run_analysis_document",
]
