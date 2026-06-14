from __future__ import annotations

import pytest

from backend.engine.bridge_model import (
    BridgeDomainError,
    parse_bridge_project,
    bridge_default,
)
from backend.engine.bridge_fem_generator import (
    BridgeFemGenerationError,
    generate_fem_model,
)


def _build_cross_section(**overrides):
    cs = {"lane_count": 2, "lane_width": 3.5, "median_width": 0.0, "sidewalk_width": 1.5, "barrier_width": 0.5}
    cs.update(overrides)
    return cs


def _build_project(**overrides):
    base = {
        "id": "bridge-test",
        "name": "Test Bridge",
        "schemaVersion": "0.1.0",
        "crossSection": _build_cross_section(),
        "spans": [{"index": 1, "length": 30.0, "offset": 0.0}],
        "impactFactor": {"value": 0.0, "auto": True},
        "lines": [],
        "loads": [],
        "generationSettings": {"mesh_division": 10, "mesh_density": "standard"},
    }
    base.update(overrides)
    return base


def test_default_bridge_parses():
    project = parse_bridge_project(bridge_default().to_dict())
    assert project.spans[0].length == 30.0


def test_simple_2lane_generates_expected_counts():
    project = parse_bridge_project(_build_project())
    result = generate_fem_model(project)
    s = result.summary
    assert s["xCount"] == 11
    assert s["yCount"] >= 5
    assert s["nodeCount"] == s["xCount"] * s["yCount"]
    assert s["supportCount"] >= 2
    assert s["memberCount"] > 0


def test_2span_3girder_generates():
    payload = _build_project(
        spans=[{"index": 1, "length": 30.0, "offset": 0.0}, {"index": 2, "length": 40.0, "offset": 0.0}]
    )
    project = parse_bridge_project(payload)
    result = generate_fem_model(project)
    s = result.summary
    assert s["xCount"] == 21
    assert s["supportCount"] == 6


def test_load_line_distributed_load_creates_member_loads():
    payload = _build_project(
        lines=[
            {
                "id": "line-1",
                "type": "traffic",
                "name": "走行",
                "points": [[2.0, 0.0, 0.0], [28.0, 0.0, 0.0]],
            }
        ],
        loads=[
            {
                "id": "load-1",
                "type": "distributed",
                "name": "分布",
                "magnitude": 12.0,
                "direction": "-Y",
                "line_id": "line-1",
            }
        ],
    )
    project = parse_bridge_project(payload)
    result = generate_fem_model(project)
    assert result.summary["loadCount"] > 0
    member_ids = {m["id"] for m in result.project["members"]}
    for ml in result.project["memberLoads"]:
        assert ml["memberId"] in member_ids


def test_self_weight_load_distributes_to_nodes():
    payload = _build_project(
        loads=[
            {
                "id": "sw-1",
                "type": "self_weight",
                "name": "自重",
                "magnitude": 100.0,
                "direction": "-Z",
            }
        ]
    )
    project = parse_bridge_project(payload)
    result = generate_fem_model(project)
    nodal_loads = result.project["nodalLoads"]
    assert len(nodal_loads) == result.summary["nodeCount"]


def test_vehicle_load_creates_single_nodal_load():
    payload = _build_project(
        lines=[
            {"id": "l1", "type": "traffic", "name": "l1", "points": [[5.0, 0.0, 0.0], [25.0, 0.0, 0.0]]}
        ],
        loads=[
            {
                "id": "v1",
                "type": "vehicle",
                "name": "vehicle",
                "magnitude": 50.0,
                "direction": "-Y",
                "line_id": "l1",
            }
        ],
    )
    project = parse_bridge_project(payload)
    result = generate_fem_model(project)
    assert len(result.project["nodalLoads"]) == 1


def test_impact_factor_auto_compute():
    payload = _build_project(
        impactFactor={"value": 0.0, "auto": True},
        spans=[{"index": 1, "length": 50.0, "offset": 0.0}],
    )
    project = parse_bridge_project(payload)
    result = generate_fem_model(project)
    impact = result.project["bridgeMeta"]["impactFactor"]
    assert impact["auto"] is True
    assert 0.0 <= impact["value"] <= 0.3
    assert "L_max" in impact["formula"]


def test_invalid_span_length_rejected():
    payload = _build_project(spans=[{"index": 1, "length": 0.0, "offset": 0.0}])
    with pytest.raises(BridgeDomainError):
        parse_bridge_project(payload)


def test_invalid_mesh_division_rejected():
    with pytest.raises(BridgeDomainError):
        parse_bridge_project(_build_project(
            generationSettings={"mesh_division": 0, "mesh_density": "standard"},
        ))


def test_unknown_line_id_in_load_rejected():
    payload = _build_project(
        loads=[
            {
                "id": "ld1",
                "type": "distributed",
                "name": "x",
                "magnitude": 1.0,
                "direction": "-Y",
                "line_id": "missing",
            }
        ]
    )
    with pytest.raises(BridgeDomainError):
        parse_bridge_project(payload)


def test_generation_yields_no_duplicate_node_ids():
    project = parse_bridge_project(_build_project())
    result = generate_fem_model(project)
    ids = [n["id"] for n in result.project["nodes"]]
    assert len(set(ids)) == len(ids)


def test_generation_no_isolated_nodes():
    project = parse_bridge_project(_build_project())
    result = generate_fem_model(project)
    node_ids = {n["id"] for n in result.project["nodes"]}
    used = set()
    for m in result.project["members"]:
        used.add(m["nodeI"])
        used.add(m["nodeJ"])
    assert used == node_ids


def test_generation_element_length_positive():
    project = parse_bridge_project(_build_project())
    result = generate_fem_model(project)
    pos = {n["id"]: (n["x"], n["y"], n["z"]) for n in result.project["nodes"]}
    for m in result.project["members"]:
        a = pos[m["nodeI"]]
        b = pos[m["nodeJ"]]
        dx = a[0] - b[0]
        dy = a[1] - b[1]
        dz = a[2] - b[2]
        assert (dx * dx + dy * dy + dz * dz) > 0.0


def test_generation_includes_supports():
    project = parse_bridge_project(_build_project())
    result = generate_fem_model(project)
    assert result.project["supports"]


def test_generation_fem_runs_through_existing_parser():
    project = parse_bridge_project(_build_project())
    result = generate_fem_model(project)
    from backend.engine import parse_model

    model = parse_model(result.project)
    assert len(model.nodes) == result.summary["nodeCount"]
    assert len(model.members) == result.summary["memberCount"]
