"""Generate FEM (project.json) models from Bridge domain models.

The generator produces a payload that the existing parser
(`backend.engine.parse_model`) can validate, so the existing
analysis engine can run unchanged.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Iterable
import datetime as _dt

from .bridge_model import (
    BridgeProject,
    CrossSection,
    Span,
    BridgeLine,
    BridgeLoad,
    compute_impact_factor,
)
from .errors import AnalysisError


class BridgeFemGenerationError(ValueError):
    """Raised when FEM generation from a bridge model fails."""


@dataclass
class GenerationResult:
    project: dict[str, Any]
    summary: dict[str, Any]


def _y_positions(cross: CrossSection, override: float | None) -> list[float]:
    """Compute symmetric transverse y-positions.

    Returns a sorted, deduplicated list of y positions (m).
    """
    lane_total = cross.lane_count * cross.lane_width
    half_lane = lane_total / 2.0
    half_med = cross.median_width / 2.0
    half_walk = cross.sidewalk_width
    half_bar = cross.barrier_width

    # Outer edges
    y_left = -(half_lane + half_med + half_walk + half_bar)
    y_right = +(half_lane + half_med + half_walk + half_bar)

    # Inner edges
    y_lane_left = -(half_lane + half_med)
    y_lane_right = +(half_lane + half_med)
    y_med_left = -half_med
    y_med_right = +half_med
    y_walk_left = -(half_lane + half_med + half_walk)
    y_walk_right = +(half_lane + half_med + half_walk)
    y_bar_left = -(half_lane + half_med + half_walk + half_bar)
    y_bar_right = +(half_lane + half_med + half_walk + half_bar)

    # Interior main-girder positions: place evenly between -half_lane and +half_lane.
    interior = []
    if cross.lane_count >= 1:
        n_inner = max(0, cross.lane_count - 1)
        if n_inner > 0:
            step = (2 * half_lane) / n_inner
            for k in range(n_inner):
                interior.append(-half_lane + step * (k + 0.5))
    elif override is not None:
        # custom spacing
        n_inner = max(0, int(math.floor(lane_total / override)) - 1)
        if n_inner > 0:
            step = (2 * half_lane) / (n_inner + 1)
            for k in range(n_inner):
                interior.append(-half_lane + step * (k + 1))

    candidates = (
        [y_left, y_bar_left, y_walk_left, y_lane_left, y_med_left]
        + interior
        + [y_med_right, y_lane_right, y_walk_right, y_bar_right, y_right]
    )
    # Round to 6 decimals to avoid floating duplication
    rounded = sorted({round(v, 6) for v in candidates})
    # Ensure at least 3 positions exist (outer + center)
    if len(rounded) < 3:
        rounded = [y_left, 0.0, y_right]
    return rounded


def _x_positions(spans: Iterable[Span], mesh_division: int) -> list[float]:
    positions: list[float] = [0.0]
    cursor = 0.0
    for sp in spans:
        for i in range(1, mesh_division + 1):
            positions.append(round(cursor + sp.length * i / mesh_division, 6))
        cursor += sp.length
    return positions


def _validate_basic(project: BridgeProject) -> None:
    if not project.spans:
        raise BridgeFemGenerationError("at least one span is required.")
    for sp in project.spans:
        if sp.length <= 0:
            raise BridgeFemGenerationError(f"span[{sp.index}].length must be > 0")
    if project.generationSettings.mesh_division < 1:
        raise BridgeFemGenerationError("mesh_division must be >= 1")
    if project.crossSection.lane_width <= 0:
        raise BridgeFemGenerationError("lane_width must be > 0")
    if project.crossSection.lane_count < 1:
        raise BridgeFemGenerationError("lane_count must be >= 1")


def _line_x_range(line: BridgeLine) -> tuple[float, float]:
    xs = [p[0] for p in line.points]
    return (min(xs), max(xs))


def _direction_axis(direction: str) -> str:
    if direction.endswith("X") or direction == "X" or direction == "-X":
        return "x"
    if direction.endswith("Y") or direction == "Y" or direction == "-Y":
        return "y"
    return "z"


def _direction_value(direction: str, magnitude: float) -> tuple[float, float, float]:
    sign = -1.0 if direction.startswith("-") else 1.0
    axis = direction[-1]
    if axis == "X":
        return (sign * magnitude, 0.0, 0.0)
    if axis == "Y":
        return (0.0, sign * magnitude, 0.0)
    return (0.0, 0.0, sign * magnitude)


def generate_fem_model(project: BridgeProject) -> GenerationResult:
    _validate_basic(project)
    settings = project.generationSettings
    cross = project.crossSection
    spans = project.spans

    y_positions = _y_positions(cross, settings.girder_spacing_override)
    x_positions = _x_positions(spans, settings.mesh_division)

    x_count = len(x_positions)
    y_count = len(y_positions)
    if x_count < 2 or y_count < 2:
        raise BridgeFemGenerationError("model requires >= 2 nodes in each direction")

    # Resolve impact factor (auto compute if requested)
    impact = compute_impact_factor([s.length for s in spans], project.impactFactor)
    if not project.impactFactor.auto:
        impact = project.impactFactor

    # Build nodes
    nodes: list[dict[str, Any]] = []
    node_id_at: list[list[str]] = [["" for _ in range(y_count)] for _ in range(x_count)]
    seen_ids: set[str] = set()
    counter = 1
    for xi, x in enumerate(x_positions):
        for yi, y in enumerate(y_positions):
            nid = f"N{counter}"
            while nid in seen_ids:
                counter += 1
                nid = f"N{counter}"
            seen_ids.add(nid)
            nodes.append({"id": nid, "x": float(x), "y": float(y), "z": 0.0, "label": nid})
            node_id_at[xi][yi] = nid
            counter += 1

    # Build members: longitudinal + transverse
    members: list[dict[str, Any]] = []
    m_counter = 1
    used_pairs: set[tuple[str, str]] = set()

    def add_member(i: str, j: str) -> None:
        nonlocal m_counter
        if i == j:
            return
        key = tuple(sorted((i, j)))
        if key in used_pairs:
            return
        used_pairs.add(key)
        # Choose an orientation vector that is NOT parallel to the member axis.
        ip = next((n for n in nodes if n["id"] == i), None)
        jp = next((n for n in nodes if n["id"] == j), None)
        orientation = {"x": 0.0, "y": 0.0, "z": 1.0}
        if ip is not None and jp is not None:
            dx = jp["x"] - ip["x"]
            dy = jp["y"] - ip["y"]
            dz = jp["z"] - ip["z"]
            if abs(dx) > 1e-9 or abs(dy) > 1e-9:
                # in-plane (x or y direction): use z-up reference
                orientation = {"x": 0.0, "y": 0.0, "z": 1.0}
            else:
                # out-of-plane: use y-axis reference
                orientation = {"x": 0.0, "y": 1.0, "z": 0.0}
        members.append(
            {
                "id": f"M{m_counter}",
                "nodeI": i,
                "nodeJ": j,
                "materialId": settings.materialId,
                "sectionId": settings.sectionId,
                "orientationVector": orientation,
            }
        )
        m_counter += 1

    for yi in range(y_count):
        for xi in range(x_count - 1):
            add_member(node_id_at[xi][yi], node_id_at[xi + 1][yi])
    for xi in range(x_count):
        for yi in range(y_count - 1):
            add_member(node_id_at[xi][yi], node_id_at[xi][yi + 1])

    # Build supports: pin at left (x=0, y=outer), roller at right (x=L, y=outer),
    # rollers at intermediate span ends
    supports: list[dict[str, Any]] = []
    support_xs: list[float] = []
    cum = 0.0
    for i, sp in enumerate(spans):
        if i == 0:
            support_xs.append(0.0)
        cum += sp.length
        if i < len(spans) - 1:
            support_xs.append(round(cum, 6))
    if not support_xs or support_xs[-1] != round(cum, 6):
        support_xs.append(round(cum, 6))

    def nearest_x_index(x: float) -> int:
        # find index with closest x
        return min(range(len(x_positions)), key=lambda k: abs(x_positions[k] - x))

    def make_support(x: float, y: float, *, is_left: bool) -> None:
        xi = nearest_x_index(x)
        yi = min(range(y_count), key=lambda k: abs(y_positions[k] - y))
        nid = node_id_at[xi][yi]
        # is_left and is_right: pin (uy,uz,rx,ry,rz)
        supports.append(
            {
                "nodeId": nid,
                "ux": False,
                "uy": True,
                "uz": True,
                "rx": True,
                "ry": True,
                "rz": True,
            }
        )

    # For supports: take both outer y positions (yi=0, yi=y_count-1)
    outer_ys = [y_positions[0], y_positions[-1]]
    for i, sx in enumerate(support_xs):
        for oy in outer_ys:
            make_support(sx, oy, is_left=(i == 0))

    # Build loads
    load_cases: list[dict[str, Any]] = []
    nodal_loads: list[dict[str, Any]] = []
    member_loads: list[dict[str, Any]] = []
    lc_id = "LC1"
    load_cases.append({"id": lc_id, "name": "Bridge Default Load", "type": "static"})
    nl_counter = 1
    ml_counter = 1

    if project.loads:
        # Map loads to lc_id; create separate load cases by BridgeLoad.id for clarity
        for ld in project.loads:
            case_id = ld.loadCaseId or f"LC_{ld.id}"
            if not any(lc["id"] == case_id for lc in load_cases):
                load_cases.append({"id": case_id, "name": ld.name or case_id, "type": "static"})
            fx, fy, fz = _direction_value(ld.direction, ld.magnitude)
            if ld.type == "self_weight":
                # distribute over all nodes
                if not nodes:
                    continue
                per = -1.0 * abs(ld.magnitude) / len(nodes) if fz < 0 else fz / len(nodes)
                for nd in nodes:
                    nodal_loads.append(
                        {
                            "id": f"NL{nl_counter}",
                            "loadCaseId": case_id,
                            "nodeId": nd["id"],
                            "fx": 0.0,
                            "fy": 0.0,
                            "fz": float(per),
                            "mx": 0.0,
                            "my": 0.0,
                            "mz": 0.0,
                        }
                    )
                    nl_counter += 1
            elif ld.type == "vehicle":
                # place at midpoint of line_id if available, else bridge center
                target_x = x_positions[len(x_positions) // 2]
                target_y = 0.0
                if ld.line_id:
                    ln = next((l for l in project.lines if l.id == ld.line_id), None)
                    if ln and len(ln.points) >= 2:
                        target_x = (ln.points[0][0] + ln.points[1][0]) / 2.0
                        target_y = (ln.points[0][1] + ln.points[1][1]) / 2.0
                xi = nearest_x_index(target_x)
                yi = min(range(y_count), key=lambda k: abs(y_positions[k] - target_y))
                nid = node_id_at[xi][yi]
                nodal_loads.append(
                    {
                        "id": f"NL{nl_counter}",
                        "loadCaseId": case_id,
                        "nodeId": nid,
                        "fx": float(fx),
                        "fy": float(fy),
                        "fz": float(fz),
                        "mx": 0.0,
                        "my": 0.0,
                        "mz": 0.0,
                    }
                )
                nl_counter += 1
            elif ld.type == "distributed":
                # find members in line's x range
                ln = next((l for l in project.lines if l.id == ld.line_id), None) if ld.line_id else None
                if ln is not None and len(ln.points) >= 2:
                    x_min, x_max = _line_x_range(ln)
                else:
                    x_min, x_max = 0.0, x_positions[-1]
                x_min_i = nearest_x_index(x_min)
                x_max_i = nearest_x_index(x_max)
                lo, hi = sorted((x_min_i, x_max_i))
                for mi, m in enumerate(members):
                    # find x indices of member's nodes
                    nxi_i = next(
                        (xi for xi in range(x_count) for yi in range(y_count) if node_id_at[xi][yi] == m["nodeI"]),
                        None,
                    )
                    nxi_j = next(
                        (xi for xi in range(x_count) for yi in range(y_count) if node_id_at[xi][yi] == m["nodeJ"]),
                        None,
                    )
                    if nxi_i is None or nxi_j is None:
                        continue
                    if (nxi_i in range(lo, hi + 1)) or (nxi_j in range(lo, hi + 1)):
                        member_loads.append(
                            {
                                "id": f"ML{ml_counter}",
                                "loadCaseId": case_id,
                                "memberId": m["id"],
                                "coordinateSystem": "global",
                                "type": "uniform",
                                "wx": float(fx),
                                "wy": float(fy),
                                "wz": float(fz),
                            }
                        )
                        ml_counter += 1

    # Compose FEM project
    project_payload: dict[str, Any] = {
        "project": {
            "id": project.id or "bridge-generated",
            "name": project.name or "Generated Bridge",
            "schemaVersion": "1.0.0",
            "description": project.description or "Generated by Bridge Wizard",
            "createdAt": project.createdAt or _dt.datetime.now(_dt.timezone.utc).isoformat(),
            "updatedAt": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        },
        "units": {
            "length": "m",
            "force": "kN",
            "moment": "kN_m",
            "modulus": "kN_per_m2",
            "area": "m2",
            "inertia": "m4",
        },
        "nodes": nodes,
        "materials": [
            {
                "id": settings.materialId,
                "name": "Bridge Steel",
                "elasticModulus": 2.05e8,
                "shearModulus": 7.88461538e7,
                "poissonRatio": 0.3,
                "density": 0.0,
            }
        ],
        "sections": [
            {
                "id": settings.sectionId,
                "name": "Bridge Girder Section",
                "area": 0.05,
                "iy": 0.0008,
                "iz": 0.0006,
                "j": 0.0002,
            }
        ],
        "members": members,
        "supports": supports,
        "loadCases": load_cases,
        "nodalLoads": nodal_loads,
        "memberLoads": member_loads,
        "analysisSettings": {
            "analysisType": "linear_static",
            "solver": "scipy_sparse",
            "includeShearDeformation": False,
            "largeDisplacement": False,
            "tolerance": 1e-9,
        },
        "bridgeMeta": {
            "schemaVersion": project.schemaVersion,
            "impactFactor": impact.to_dict(),
            "crossSection": project.crossSection.to_dict(),
            "spans": [s.to_dict() for s in project.spans],
            "lines": [l.to_dict() for l in project.lines],
            "loads": [l.to_dict() for l in project.loads],
        },
    }

    # Verify model is acceptable to existing parser (semantic check only)
    _quick_self_check(nodes, members, supports, x_count, y_count, y_positions)

    summary = {
        "source_bridge_id": project.id,
        "generatedAt": project_payload["project"]["updatedAt"],
        "xCount": x_count,
        "yCount": y_count,
        "nodeCount": len(nodes),
        "memberCount": len(members),
        "supportCount": len(supports),
        "loadCount": len(nodal_loads) + len(member_loads),
        "summary": {
            "totalLength": x_positions[-1],
            "girderPositions": y_positions,
            "supports": [
                {"x": x_positions[nearest_x_index(s["x"])] if False else s.get("x", 0.0), "y": 0.0, "nodeId": s["nodeId"]}
                for s in supports
            ],
        },
    }
    # Fix support entries to use actual x position via node lookup
    node_pos = {n["id"]: (n["x"], n["y"]) for n in nodes}
    summary["summary"]["supports"] = [
        {"x": node_pos[s["nodeId"]][0], "y": node_pos[s["nodeId"]][1], "nodeId": s["nodeId"]}
        for s in supports
    ]

    return GenerationResult(project=project_payload, summary=summary)


def _quick_self_check(
    nodes: list[dict[str, Any]],
    members: list[dict[str, Any]],
    supports: list[dict[str, Any]],
    x_count: int,
    y_count: int,
    y_positions: list[float],
) -> None:
    node_ids = {n["id"] for n in nodes}
    if len(node_ids) != len(nodes):
        raise BridgeFemGenerationError("duplicate node IDs detected")
    used = set()
    for m in members:
        used.add(m["nodeI"])
        used.add(m["nodeJ"])
    if used != node_ids:
        missing = node_ids - used
        if missing:
            raise BridgeFemGenerationError(
                f"isolated nodes detected: {sorted(missing)[:5]}..."
            )
    # element length > 0
    pos = {n["id"]: (n["x"], n["y"], n["z"]) for n in nodes}
    for m in members:
        i = pos[m["nodeI"]]
        j = pos[m["nodeJ"]]
        if i == j:
            raise BridgeFemGenerationError(f"zero-length member {m['id']}")
    if not supports:
        raise BridgeFemGenerationError("no supports generated")
    if x_count < 2 or y_count < 2 or len(y_positions) < 2:
        raise BridgeFemGenerationError("model has too few divisions")


def analyze_generation(result: GenerationResult) -> dict[str, Any]:
    """Run the existing linear-static analysis on the generated FEM model."""
    from . import run_analysis

    payload = dict(result.project)
    return run_analysis(payload)


__all__ = [
    "BridgeFemGenerationError",
    "GenerationResult",
    "generate_fem_model",
    "analyze_generation",
    "_y_positions",
    "_x_positions",
]
