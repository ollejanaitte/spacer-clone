from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from .assertions import assert_close, by_id

REPO_ROOT = Path(__file__).resolve().parents[2]
VERIFICATION_DIR = REPO_ROOT / "examples" / "verification"


def load_verification_model(category: str, name: str) -> dict[str, Any]:
    meta_path = VERIFICATION_DIR / category / f"{name}.meta.json"
    with meta_path.open(encoding="utf-8") as f:
        meta = json.load(f)
    model_path = VERIFICATION_DIR / category / meta["modelPath"]
    with model_path.open(encoding="utf-8") as f:
        return json.load(f)


def _run_success(engine_runner, project: dict[str, Any]) -> dict[str, Any]:
    result = engine_runner(project)
    if isinstance(result, dict) and "result" in result:
        result = result["result"]
    assert result["analysisSummary"]["status"] == "success"
    assert result["errors"] == []
    return result


class TestRegressionDisplacement:
    def test_cantilever_tip_displacement(self, engine_runner) -> None:
        project = load_verification_model("beam", "cantilever_tip_load")
        result = _run_success(engine_runner, project)
        node = by_id(result["displacements"], "nodeId", "N2")
        assert_close(node["uy"], -0.010406504, rel_tol=1e-4)

    def test_cantilever_tip_rotation(self, engine_runner) -> None:
        project = load_verification_model("beam", "cantilever_tip_load")
        result = _run_success(engine_runner, project)
        node = by_id(result["displacements"], "nodeId", "N2")
        assert_close(node["rz"], -0.003902439, rel_tol=1e-4)

    def test_simple_beam_center_displacement(self, engine_runner) -> None:
        project = load_verification_model("beam", "simple_beam_center_load")
        result = _run_success(engine_runner, project)
        node = by_id(result["displacements"], "nodeId", "N2")
        assert_close(node["uy"], -0.000650407, rel_tol=1e-4)

    def test_simple_beam_uniform_displacement(self, engine_runner) -> None:
        project = load_verification_model("beam", "simple_beam_uniform_load")
        result = _run_success(engine_runner, project)
        node = by_id(result["displacements"], "nodeId", "N2")
        assert_close(node["uy"], -0.000325203, rel_tol=1e-4)

    def test_cantilever_torsion_rotation(self, engine_runner) -> None:
        project = load_verification_model("beam", "cantilever_torsion")
        result = _run_success(engine_runner, project)
        node = by_id(result["displacements"], "nodeId", "N2")
        assert_close(node["rx"], 0.005073170731717216, rel_tol=1e-4)


class TestRegressionReaction:
    def test_cantilever_tip_reactions(self, engine_runner) -> None:
        project = load_verification_model("beam", "cantilever_tip_load")
        result = _run_success(engine_runner, project)
        reaction = by_id(result["reactions"], "nodeId", "N1")
        assert_close(reaction["fy"], 10.0, rel_tol=1e-4)
        assert_close(reaction["mz"], 40.0, rel_tol=1e-4)

    def test_simple_beam_center_reactions(self, engine_runner) -> None:
        project = load_verification_model("beam", "simple_beam_center_load")
        result = _run_success(engine_runner, project)
        left = by_id(result["reactions"], "nodeId", "N1")
        right = by_id(result["reactions"], "nodeId", "N3")
        assert_close(left["fy"], 5.0, rel_tol=1e-4)
        assert_close(right["fy"], 5.0, rel_tol=1e-4)

    def test_simple_beam_uniform_reactions(self, engine_runner) -> None:
        project = load_verification_model("beam", "simple_beam_uniform_load")
        result = _run_success(engine_runner, project)
        left = by_id(result["reactions"], "nodeId", "N1")
        right = by_id(result["reactions"], "nodeId", "N3")
        assert_close(left["fy"], 4.0, rel_tol=1e-4)
        assert_close(right["fy"], 4.0, rel_tol=1e-4)

    def test_cantilever_torsion_reaction(self, engine_runner) -> None:
        project = load_verification_model("beam", "cantilever_torsion")
        result = _run_success(engine_runner, project)
        reaction = by_id(result["reactions"], "nodeId", "N1")
        assert_close(reaction["mx"], -5.0, rel_tol=1e-4)

    def test_portal_frame_equilibrium(self, engine_runner) -> None:
        project = load_verification_model("frame", "portal_frame_horizontal")
        result = _run_success(engine_runner, project)
        left = by_id(result["reactions"], "nodeId", "N1")
        right = by_id(result["reactions"], "nodeId", "N4")
        total_fx = left["fx"] + right["fx"]
        assert_close(total_fx, -10.0, rel_tol=1e-4)


class TestRegressionMemberForce:
    def test_cantilever_tip_moment(self, engine_runner) -> None:
        project = load_verification_model("beam", "cantilever_tip_load")
        result = _run_success(engine_runner, project)
        max_abs_mz = max(
            abs(force[end]["mz"])
            for force in result["memberEndForces"]
            for end in ("i", "j")
        )
        assert_close(max_abs_mz, 40.0, rel_tol=1e-4)

    def test_simple_beam_center_moment(self, engine_runner) -> None:
        project = load_verification_model("beam", "simple_beam_center_load")
        result = _run_success(engine_runner, project)
        max_abs_mz = max(
            abs(force[end]["mz"])
            for force in result["memberEndForces"]
            for end in ("i", "j")
        )
        assert_close(max_abs_mz, 10.0, rel_tol=1e-4)

    def test_simple_beam_uniform_moment(self, engine_runner) -> None:
        project = load_verification_model("beam", "simple_beam_uniform_load")
        result = _run_success(engine_runner, project)
        max_abs_mz = max(
            abs(force[end]["mz"])
            for force in result["memberEndForces"]
            for end in ("i", "j")
        )
        assert_close(max_abs_mz, 4.0, rel_tol=1e-4)

    def test_cantilever_torsion_moment(self, engine_runner) -> None:
        project = load_verification_model("beam", "cantilever_torsion")
        result = _run_success(engine_runner, project)
        max_abs_mx = max(
            abs(force[end]["mx"])
            for force in result["memberEndForces"]
            for end in ("i", "j")
        )
        assert_close(max_abs_mx, 5.0, rel_tol=1e-4)
