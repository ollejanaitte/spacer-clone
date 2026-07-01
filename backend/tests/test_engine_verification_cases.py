from __future__ import annotations

from copy import deepcopy
from typing import Any

from .assertions import assert_close, by_id, error_codes
from .sample_models import E, G, I, J, L, P, T, W
from .sample_models import all_nodes_free_rigid_body_mode as case_7
from .sample_models import cantilever_tip_load as case_1
from .sample_models import cantilever_torsion as case_4
from .sample_models import insufficient_support as case_5
from .sample_models import invalid_member_reference as case_6
from .sample_models import simply_supported_center_load as case_2
from .sample_models import simply_supported_uniform_load as case_3


def _result(payload: dict[str, Any]) -> dict[str, Any]:
    return payload.get("result", payload)


def _run_success(engine_runner, project: dict[str, Any]) -> dict[str, Any]:
    result = _result(engine_runner(project))
    assert result["analysisSummary"]["status"] == "success"
    assert result["errors"] == []
    return result


def _run_failed(engine_runner, project: dict[str, Any]) -> dict[str, Any]:
    result = _result(engine_runner(project))
    assert result["analysisSummary"]["status"] == "failed"
    assert result["errors"], "Failed analysis must return structured errors."
    assert result["displacements"] == []
    assert result["reactions"] == []
    assert result["memberEndForces"] == []
    return result


def test_case_1_cantilever_tip_concentrated_load(engine_runner) -> None:
    result = _run_success(engine_runner, case_1())

    free_node = by_id(result["displacements"], "nodeId", "N2")
    fixed_node = by_id(result["reactions"], "nodeId", "N1")

    # Theory, SI units:
    # tip displacement uy [m] = -P[kN] * L[m]^3 / (3 * E[kN/m2] * I[m4])
    # tip rotation rz [rad] = -P[kN] * L[m]^2 / (2 * E[kN/m2] * I[m4])
    # fixed reaction fy [kN] = P, fixed moment mz [kN_m] = P * L
    assert_close(free_node["uy"], -(P * L**3) / (3.0 * E * I))
    assert_close(free_node["rz"], -(P * L**2) / (2.0 * E * I))
    assert_close(fixed_node["fy"], P)
    assert_close(fixed_node["mz"], P * L)
    assert result["warnings"] == []


def test_static_analysis_warns_for_near_singular_stiffness(engine_runner) -> None:
    project = case_1()
    project["sections"][0]["j"] = 1e-20

    result = _result(engine_runner(project))

    assert result["analysisSummary"]["status"] == "warning"
    assert any(warning["code"] == "NEAR_SINGULAR_STIFFNESS" for warning in result["warnings"])
    assert result["errors"] == []


def test_static_analysis_warns_for_large_displacement(engine_runner) -> None:
    project = case_1()
    project["materials"][0]["elasticModulus"] = 1e-9
    project["materials"][0]["shearModulus"] = 1e-9

    result = _result(engine_runner(project))

    assert result["analysisSummary"]["status"] == "warning"
    assert any(warning["code"] == "LARGE_DISPLACEMENT" for warning in result["warnings"])
    assert result["errors"] == []


def test_case_2_simply_supported_center_concentrated_load(engine_runner) -> None:
    result = _run_success(engine_runner, case_2())

    center_node = by_id(result["displacements"], "nodeId", "N2")
    left_reaction = by_id(result["reactions"], "nodeId", "N1")
    right_reaction = by_id(result["reactions"], "nodeId", "N3")
    max_abs_mz = max(
        abs(force[end]["mz"])
        for force in result["memberEndForces"]
        for end in ("i", "j")
    )

    # Theory, SI units:
    # center displacement uy [m] = -P[kN] * L[m]^3 / (48 * E[kN/m2] * I[m4])
    # reactions fy [kN] = P / 2 at each support
    # maximum bending moment magnitude [kN_m] = P * L / 4
    assert_close(center_node["uy"], -(P * L**3) / (48.0 * E * I))
    assert_close(left_reaction["fy"], P / 2.0)
    assert_close(right_reaction["fy"], P / 2.0)
    assert_close(max_abs_mz, P * L / 4.0)
    assert result["warnings"] == []


def test_case_3_simply_supported_uniform_distributed_load(engine_runner) -> None:
    result = _run_success(engine_runner, case_3())

    center_node = by_id(result["displacements"], "nodeId", "N2")
    left_reaction = by_id(result["reactions"], "nodeId", "N1")
    right_reaction = by_id(result["reactions"], "nodeId", "N3")
    max_abs_mz = max(
        abs(force[end]["mz"])
        for force in result["memberEndForces"]
        for end in ("i", "j")
    )

    # Theory, SI units:
    # center displacement uy [m] = -5 * w[kN/m] * L[m]^4 / (384 * E[kN/m2] * I[m4])
    # reactions fy [kN] = w[kN/m] * L[m] / 2 at each support
    # maximum bending moment magnitude [kN_m] = w[kN/m] * L[m]^2 / 8
    assert_close(center_node["uy"], -(5.0 * W * L**4) / (384.0 * E * I))
    assert_close(left_reaction["fy"], W * L / 2.0)
    assert_close(right_reaction["fy"], W * L / 2.0)
    assert_close(max_abs_mz, W * L**2 / 8.0)
    assert result["warnings"] == []


def _global_uniform_load_project(axis: str) -> dict[str, Any]:
    project = deepcopy(case_2())
    project["nodalLoads"] = []
    for member in project["members"]:
        member["orientationVector"] = {"x": 0.0, "y": 0.0, "z": 1.0}
    project["supports"] = [
        {
            "nodeId": "N1",
            "ux": True,
            "uy": True,
            "uz": True,
            "rx": True,
            "ry": False,
            "rz": False,
        },
        {
            "nodeId": "N3",
            "ux": False,
            "uy": True,
            "uz": True,
            "rx": False,
            "ry": False,
            "rz": False,
        },
    ]
    project["memberLoads"] = [
        {
            "id": f"ML{index}",
            "loadCaseId": "LC1",
            "memberId": member["id"],
            "coordinateSystem": "global",
            "type": "uniform",
            "wx": 0.0,
            "wy": -W if axis == "y" else 0.0,
            "wz": -W if axis == "z" else 0.0,
        }
        for index, member in enumerate(project["members"], start=1)
    ]
    return project


def test_global_fy_uniform_load_uses_y_displacement_and_local_my(
    engine_runner,
) -> None:
    result = _run_success(engine_runner, _global_uniform_load_project("y"))

    center_node = by_id(result["displacements"], "nodeId", "N2")
    max_abs_my = max(
        abs(force[end]["my"])
        for force in result["memberEndForces"]
        for end in ("i", "j")
    )
    max_abs_mz = max(
        abs(force[end]["mz"])
        for force in result["memberEndForces"]
        for end in ("i", "j")
    )

    assert_close(center_node["uy"], -(5.0 * W * L**4) / (384.0 * E * I))
    assert_close(center_node["uz"], 0.0)
    assert_close(max_abs_my, W * L**2 / 8.0)
    assert_close(max_abs_mz, 0.0)


def test_global_fz_uniform_load_uses_z_displacement_and_local_mz(
    engine_runner,
) -> None:
    result = _run_success(engine_runner, _global_uniform_load_project("z"))

    center_node = by_id(result["displacements"], "nodeId", "N2")
    max_abs_my = max(
        abs(force[end]["my"])
        for force in result["memberEndForces"]
        for end in ("i", "j")
    )
    max_abs_mz = max(
        abs(force[end]["mz"])
        for force in result["memberEndForces"]
        for end in ("i", "j")
    )

    assert_close(center_node["uy"], 0.0)
    assert_close(center_node["uz"], -(5.0 * W * L**4) / (384.0 * E * I))
    assert_close(max_abs_my, 0.0)
    assert_close(max_abs_mz, W * L**2 / 8.0)


def test_case_4_3d_cantilever_torsion(engine_runner) -> None:
    result = _run_success(engine_runner, case_4())

    free_node = by_id(result["displacements"], "nodeId", "N2")
    fixed_node = by_id(result["reactions"], "nodeId", "N1")

    # Theory, SI units:
    # torsional rotation rx [rad] = T[kN_m] * L[m] / (G[kN/m2] * J[m4])
    # fixed torsional reaction magnitude [kN_m] = T
    assert_close(free_node["rx"], (T * L) / (G * J))
    assert_close(abs(fixed_node["mx"]), T)


def test_case_5_insufficient_support_error(engine_runner) -> None:
    result = _run_failed(engine_runner, case_5())

    assert error_codes(result) & {"MODEL_UNSTABLE", "SOLVER_ERROR"}


def test_case_6_invalid_member_reference_error(project_validator) -> None:
    validation = project_validator(case_6())

    codes = error_codes(validation)
    assert "INVALID_REFERENCE" in codes

    errors = (
        validation.get("errors", [])
        if isinstance(validation, dict)
        else getattr(validation, "errors", [])
    )
    assert any(
        "/members/0/nodeJ"
        == (
            error.get("path")
            if isinstance(error, dict)
            else getattr(error, "path", None)
        )
        for error in errors
    )


def test_case_7_all_nodes_free_rigid_body_mode_detection(engine_runner) -> None:
    result = _run_failed(engine_runner, case_7())

    assert error_codes(result) & {"MODEL_UNSTABLE", "SOLVER_ERROR"}


def test_invalid_member_reference_can_also_be_rejected_by_analysis_runner(
    engine_runner,
) -> None:
    result = _run_failed(engine_runner, case_6())

    assert "INVALID_REFERENCE" in error_codes(result)
