from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from .assertions import assert_close, by_id

REPO_ROOT = Path(__file__).resolve().parents[2]
VERIFICATION_DIR = REPO_ROOT / "examples" / "verification"


def load_verification_metadata(category: str, name: str) -> dict[str, Any]:
    meta_path = VERIFICATION_DIR / category / f"{name}.meta.json"
    with meta_path.open(encoding="utf-8") as f:
        return json.load(f)


def load_verification_model(category: str, name: str) -> dict[str, Any]:
    meta = load_verification_metadata(category, name)
    model_path = VERIFICATION_DIR / category / meta["modelPath"]
    with model_path.open(encoding="utf-8") as f:
        return json.load(f)


def _result(payload: dict[str, Any]) -> dict[str, Any]:
    return payload.get("result", payload)


def _run_success(engine_runner, project: dict[str, Any]) -> dict[str, Any]:
    result = _result(engine_runner(project))
    assert result["analysisSummary"]["status"] == "success"
    assert result["errors"] == []
    return result


class TestBeamVerification:
    def test_cantilever_tip_load(self, engine_runner) -> None:
        meta = load_verification_metadata("beam", "cantilever_tip_load")
        project = load_verification_model("beam", "cantilever_tip_load")
        result = _run_success(engine_runner, project)

        tolerance = meta["tolerance"]
        expected = meta["expected"]

        free_node = by_id(result["displacements"], "nodeId", "N2")
        fixed_node = by_id(result["reactions"], "nodeId", "N1")

        assert_close(
            free_node["uy"],
            expected["displacements"]["N2"]["uy"],
            rel_tol=tolerance["relative"],
            abs_tol=tolerance["absolute"],
        )
        assert_close(
            free_node["rz"],
            expected["displacements"]["N2"]["rz"],
            rel_tol=tolerance["relative"],
            abs_tol=tolerance["absolute"],
        )
        assert_close(
            fixed_node["fy"],
            expected["reactions"]["N1"]["fy"],
            rel_tol=tolerance["relative"],
            abs_tol=tolerance["absolute"],
        )
        assert_close(
            fixed_node["mz"],
            expected["reactions"]["N1"]["mz"],
            rel_tol=tolerance["relative"],
            abs_tol=tolerance["absolute"],
        )

    def test_simple_beam_center_load(self, engine_runner) -> None:
        meta = load_verification_metadata("beam", "simple_beam_center_load")
        project = load_verification_model("beam", "simple_beam_center_load")
        result = _run_success(engine_runner, project)

        tolerance = meta["tolerance"]
        expected = meta["expected"]

        center_node = by_id(result["displacements"], "nodeId", "N2")
        left_reaction = by_id(result["reactions"], "nodeId", "N1")
        right_reaction = by_id(result["reactions"], "nodeId", "N3")

        max_abs_mz = max(
            abs(force[end]["mz"])
            for force in result["memberEndForces"]
            for end in ("i", "j")
        )

        assert_close(
            center_node["uy"],
            expected["displacements"]["N2"]["uy"],
            rel_tol=tolerance["relative"],
            abs_tol=tolerance["absolute"],
        )
        assert_close(
            left_reaction["fy"],
            expected["reactions"]["N1"]["fy"],
            rel_tol=tolerance["relative"],
            abs_tol=tolerance["absolute"],
        )
        assert_close(
            right_reaction["fy"],
            expected["reactions"]["N3"]["fy"],
            rel_tol=tolerance["relative"],
            abs_tol=tolerance["absolute"],
        )
        assert_close(
            max_abs_mz,
            expected["maxAbsMemberForce"]["Mz"],
            rel_tol=tolerance["relative"],
            abs_tol=tolerance["absolute"],
        )

    def test_simple_beam_uniform_load(self, engine_runner) -> None:
        meta = load_verification_metadata("beam", "simple_beam_uniform_load")
        project = load_verification_model("beam", "simple_beam_uniform_load")
        result = _run_success(engine_runner, project)

        tolerance = meta["tolerance"]
        expected = meta["expected"]

        center_node = by_id(result["displacements"], "nodeId", "N2")
        left_reaction = by_id(result["reactions"], "nodeId", "N1")
        right_reaction = by_id(result["reactions"], "nodeId", "N3")

        max_abs_mz = max(
            abs(force[end]["mz"])
            for force in result["memberEndForces"]
            for end in ("i", "j")
        )

        assert_close(
            center_node["uy"],
            expected["displacements"]["N2"]["uy"],
            rel_tol=tolerance["relative"],
            abs_tol=tolerance["absolute"],
        )
        assert_close(
            left_reaction["fy"],
            expected["reactions"]["N1"]["fy"],
            rel_tol=tolerance["relative"],
            abs_tol=tolerance["absolute"],
        )
        assert_close(
            right_reaction["fy"],
            expected["reactions"]["N3"]["fy"],
            rel_tol=tolerance["relative"],
            abs_tol=tolerance["absolute"],
        )
        assert_close(
            max_abs_mz,
            expected["maxAbsMemberForce"]["Mz"],
            rel_tol=tolerance["relative"],
            abs_tol=tolerance["absolute"],
        )

    def test_cantilever_torsion(self, engine_runner) -> None:
        meta = load_verification_metadata("beam", "cantilever_torsion")
        project = load_verification_model("beam", "cantilever_torsion")
        result = _run_success(engine_runner, project)

        tolerance = meta["tolerance"]
        expected = meta["expected"]

        free_node = by_id(result["displacements"], "nodeId", "N2")
        fixed_node = by_id(result["reactions"], "nodeId", "N1")

        assert_close(
            free_node["rx"],
            expected["displacements"]["N2"]["rx"],
            rel_tol=tolerance["relative"],
            abs_tol=tolerance["absolute"],
        )
        assert_close(
            fixed_node["mx"],
            expected["reactions"]["N1"]["mx"],
            rel_tol=tolerance["relative"],
            abs_tol=tolerance["absolute"],
        )


class TestTrussVerification:
    def test_simple_truss(self, engine_runner) -> None:
        project = load_verification_model("truss", "simple_truss")
        result = _run_success(engine_runner, project)

        apex = by_id(result["displacements"], "nodeId", "N3")
        left_reaction = by_id(result["reactions"], "nodeId", "N1")
        right_reaction = by_id(result["reactions"], "nodeId", "N2")

        total_fy = left_reaction["fy"] + right_reaction["fy"]
        assert_close(total_fy, -20.0, rel_tol=1e-4)

        assert apex["uy"] < 0, "Apex should displace downward"


class TestFrameVerification:
    def test_portal_frame(self, engine_runner) -> None:
        project = load_verification_model("frame", "portal_frame_horizontal")
        result = _run_success(engine_runner, project)

        left_reaction = by_id(result["reactions"], "nodeId", "N1")
        right_reaction = by_id(result["reactions"], "nodeId", "N4")

        total_fx = left_reaction["fx"] + right_reaction["fx"]
        assert_close(total_fx, 10.0, rel_tol=1e-4)

        assert left_reaction["fx"] + right_reaction["fx"] == pytest.approx(10.0, rel=1e-4)


class Test3DFrameVerification:
    def test_l_frame(self, engine_runner) -> None:
        project = load_verification_model("3d-frame", "l_frame")
        result = _run_success(engine_runner, project)

        reaction = by_id(result["reactions"], "nodeId", "N1")
        total_fx = reaction["fx"]
        total_fy = reaction["fy"]

        assert_close(total_fx, -5.0, rel_tol=1e-4)
        assert_close(total_fy, 15.0, rel_tol=1e-4)
