from __future__ import annotations

import copy
import json
import math
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from backend.app.reports import build_result_exports
from backend.engine import run_analysis, run_eigen_analysis, validate_project

APP_VERSION = "0.1.0"
REPO_ROOT = Path(__file__).resolve().parents[2]
PROJECT_STORAGE_DIR = REPO_ROOT / "backend" / "data" / "projects"
AUTOSAVE_FILE_NAME = "autosave.json"

app = FastAPI(title="spacer-clone MVP API", version=APP_VERSION)


@app.get("/health")
def health() -> JSONResponse:
    return safe_json_response({"status": "ok", "version": APP_VERSION})


@app.post("/api/projects/validate")
def validate_project_endpoint(payload: dict[str, Any]) -> JSONResponse:
    project = extract_project(payload)
    finite_error = find_non_finite(project)
    if finite_error is not None:
        return safe_json_response(
            {
                "valid": False,
                "warnings": [],
                "errors": [
                    {
                        "code": "INVALID_VALUE",
                        "message": "NaN and Infinity are not valid JSON values.",
                        "path": finite_error,
                        "entityType": None,
                        "entityId": None,
                    }
                ],
            }
        )

    try:
        validation = validate_project(copy.deepcopy(project))
    except Exception as exc:
        return validation_error_response(
            {
                "code": "SCHEMA_ERROR",
                "message": f"Project validation failed: {exc}",
                "path": None,
                "entityType": None,
                "entityId": None,
            },
            status_code=400,
        )
    return safe_json_response(
        {
            "valid": bool(validation.get("valid")),
            "warnings": validation.get("warnings", []),
            "errors": validation.get("errors", []),
        }
    )


@app.post("/api/analysis/run")
def run_analysis_endpoint(payload: dict[str, Any]) -> JSONResponse:
    project = extract_project(payload)
    options = payload.get("options", {})
    return_csv = bool(options.get("returnCsv")) if isinstance(options, dict) else False
    finite_error = find_non_finite(project)
    if finite_error is not None:
        result = failed_result(
            project,
            {
                "code": "INVALID_VALUE",
                "message": "NaN and Infinity are not valid JSON values.",
                "path": finite_error,
                "entityType": None,
                "entityId": None,
            },
        )
    else:
        result = run_analysis(copy.deepcopy(project))

    try:
        csv_exports = build_result_exports(result) if return_csv else None
    except ValueError as exc:
        result = failed_result(
            project,
            {
                "code": "REPORT_ERROR",
                "message": str(exc),
                "path": None,
                "entityType": None,
                "entityId": None,
            },
        )
        csv_exports = None

    return safe_json_response({"result": result, "csv": csv_exports})


@app.post("/api/analysis/eigen")
def run_eigen_analysis_endpoint(payload: dict[str, Any]) -> JSONResponse:
    project = extract_project(payload)
    mode_count = payload.get("modeCount", 6)
    if not isinstance(mode_count, int):
        raise HTTPException(
            status_code=422,
            detail={"code": "SCHEMA_ERROR", "message": "modeCount must be an integer."},
        )
    mass_case_id = payload.get("massCaseId")
    if mass_case_id is not None and not isinstance(mass_case_id, str):
        raise HTTPException(
            status_code=422,
            detail={"code": "SCHEMA_ERROR", "message": "massCaseId must be a string."},
        )
    finite_error = find_non_finite(project)
    if finite_error is not None:
        result = failed_result(
            project,
            {
                "code": "INVALID_VALUE",
                "message": "NaN and Infinity are not valid JSON values.",
                "path": finite_error,
                "entityType": None,
                "entityId": None,
            },
            analysis_type="eigen",
        )
    else:
        result = run_eigen_analysis(
            copy.deepcopy(project),
            mass_case_id=mass_case_id,
            mode_count=mode_count,
        )
    return safe_json_response({"result": result})


@app.post("/api/projects/save")
def save_project_endpoint(payload: dict[str, Any]) -> JSONResponse:
    file_name = extract_file_name(payload)
    project = extract_project(payload)
    finite_error = find_non_finite(project)
    if finite_error is not None:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_VALUE",
                "message": "NaN and Infinity are not valid JSON values.",
                "path": finite_error,
            },
        )

    PROJECT_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    path = PROJECT_STORAGE_DIR / file_name
    with path.open("w", encoding="utf-8") as file:
        json.dump(project, file, ensure_ascii=False, allow_nan=False, indent=2)
        file.write("\n")

    return safe_json_response({"saved": True, "fileName": file_name})


@app.post("/api/projects/load")
def load_project_endpoint(payload: dict[str, Any]) -> JSONResponse:
    file_name = extract_file_name(payload)
    path = PROJECT_STORAGE_DIR / file_name
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail={
                "code": "NOT_FOUND",
                "message": f"Project file does not exist: {file_name}.",
            },
        )

    with path.open(encoding="utf-8") as file:
        project = json.load(file)
    finite_error = find_non_finite(project)
    if finite_error is not None:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_VALUE",
                "message": "Stored project contains NaN or Infinity.",
                "path": finite_error,
            },
        )

    return safe_json_response({"project": project})


@app.post("/api/projects/autosave")
def autosave_project_endpoint(payload: dict[str, Any]) -> JSONResponse:
    project = extract_project(payload)
    finite_error = find_non_finite(project)
    if finite_error is not None:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_VALUE",
                "message": "NaN and Infinity are not valid JSON values.",
                "path": finite_error,
            },
        )

    PROJECT_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    path = PROJECT_STORAGE_DIR / AUTOSAVE_FILE_NAME
    with path.open("w", encoding="utf-8") as file:
        json.dump(project, file, ensure_ascii=False, allow_nan=False, indent=2)
        file.write("\n")

    return safe_json_response({"saved": True, "fileName": AUTOSAVE_FILE_NAME})


@app.get("/api/projects/autosave")
def get_autosave_project_endpoint() -> JSONResponse:
    path = PROJECT_STORAGE_DIR / AUTOSAVE_FILE_NAME
    if not path.exists():
        return safe_json_response(
            {"exists": False, "fileName": AUTOSAVE_FILE_NAME, "project": None}
        )

    with path.open(encoding="utf-8") as file:
        project = json.load(file)
    finite_error = find_non_finite(project)
    if finite_error is not None:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_VALUE",
                "message": "Stored autosave contains NaN or Infinity.",
                "path": finite_error,
            },
        )

    return safe_json_response(
        {"exists": True, "fileName": AUTOSAVE_FILE_NAME, "project": project}
    )


@app.get("/api/examples")
def examples_endpoint() -> JSONResponse:
    return safe_json_response({"examples": examples()})


def extract_project(payload: dict[str, Any]) -> dict[str, Any]:
    project = payload.get("project")
    if not isinstance(project, dict):
        raise HTTPException(
            status_code=422,
            detail={"code": "SCHEMA_ERROR", "message": "project is required."},
        )
    return project


def extract_file_name(payload: dict[str, Any]) -> str:
    file_name = payload.get("fileName")
    if not isinstance(file_name, str) or not file_name.strip():
        raise HTTPException(
            status_code=422,
            detail={"code": "SCHEMA_ERROR", "message": "fileName is required."},
        )
    file_name = file_name.strip()
    path = Path(file_name)
    if path.is_absolute() or ".." in path.parts:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_PATH",
                "message": "fileName must stay inside the project storage directory.",
            },
        )
    if Path(file_name).name != file_name or "\\" in file_name or "/" in file_name:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_PATH",
                "message": "fileName must not contain path separators.",
            },
        )
    if file_name != "project.json" and not file_name.endswith(".project.json"):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_PATH",
                "message": "fileName must be project.json or end with .project.json.",
            },
        )
    return file_name


def safe_json_response(content: dict[str, Any], status_code: int = 200) -> JSONResponse:
    finite_error = find_non_finite(content)
    if finite_error is not None:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "Response contains NaN or Infinity.",
            },
        )
    return JSONResponse(content=content, status_code=status_code)


def validation_error_response(error: dict[str, Any], status_code: int = 400) -> JSONResponse:
    return safe_json_response(
        {"valid": False, "warnings": [], "errors": [error]},
        status_code=status_code,
    )


def find_non_finite(value: Any, path: str = "") -> str | None:
    if isinstance(value, float) and not math.isfinite(value):
        return path or "/"
    if isinstance(value, dict):
        for key, item in value.items():
            found = find_non_finite(item, f"{path}/{key}")
            if found is not None:
                return found
    if isinstance(value, list):
        for index, item in enumerate(value):
            found = find_non_finite(item, f"{path}/{index}")
            if found is not None:
                return found
    return None


def failed_result(
    project: dict[str, Any],
    error: dict[str, Any],
    analysis_type: str = "linear_static",
) -> dict[str, Any]:
    project_info = project.get("project", {})
    project_id = project_info.get("id", "") if isinstance(project_info, dict) else ""
    return {
        "projectId": project_id,
        "schemaVersion": "1.0.0",
        "analysisSummary": {
            "analysisType": analysis_type,
            "status": "failed",
            "startedAt": "",
            "finishedAt": "",
            "durationMs": 0.0,
            "nodeCount": len(project.get("nodes", [])),
            "memberCount": len(project.get("members", [])),
            "loadCaseCount": len(project.get("loadCases", [])),
            "totalDof": 0,
            "freeDof": 0,
            "constrainedDof": 0,
            "solver": "scipy_sparse",
        },
        "displacements": [],
        "reactions": [],
        "memberEndForces": [],
        "warnings": [],
        "errors": [error],
    }


def base_project(project_id: str, name: str, description: str) -> dict[str, Any]:
    return {
        "project": {
            "id": project_id,
            "name": name,
            "schemaVersion": "1.0.0",
            "description": description,
            "createdAt": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-01T00:00:00Z",
        },
        "units": {
            "length": "m",
            "force": "kN",
            "moment": "kN_m",
            "modulus": "kN_per_m2",
            "area": "m2",
            "inertia": "m4",
        },
        "nodes": [],
        "materials": [
            {
                "id": "MAT1",
                "name": "Steel",
                "elasticModulus": 205000000.0,
                "shearModulus": 205000000.0 / (2.0 * (1.0 + 0.3)),
                "poissonRatio": 0.3,
                "density": 0.0,
            }
        ],
        "sections": [
            {
                "id": "SEC1",
                "name": "Verification Section",
                "area": 0.02,
                "iy": 0.0001,
                "iz": 0.0001,
                "j": 0.00005,
            }
        ],
        "members": [],
        "supports": [],
        "loadCases": [{"id": "LC1", "name": "Verification Load", "type": "static"}],
        "nodalLoads": [],
        "memberLoads": [],
        "analysisSettings": {
            "analysisType": "linear_static",
            "solver": "scipy_sparse",
            "includeShearDeformation": False,
            "largeDisplacement": False,
            "tolerance": 1e-9,
        },
    }


def cantilever_tip_load() -> dict[str, Any]:
    project = base_project(
        "cantilever_tip_load",
        "Cantilever Tip Load",
        "Fixed-free beam verification model.",
    )
    add_cantilever_geometry(project)
    project["nodalLoads"] = [
        {
            "id": "NL1",
            "loadCaseId": "LC1",
            "nodeId": "N2",
            "fx": 0.0,
            "fy": -10.0,
            "fz": 0.0,
            "mx": 0.0,
            "my": 0.0,
            "mz": 0.0,
        }
    ]
    return project


def simple_beam_center_load() -> dict[str, Any]:
    project = base_project(
        "simple_beam_center_load",
        "Simple Beam Center Load",
        "Simply supported beam with a center point load.",
    )
    add_simple_beam_geometry(project)
    project["nodalLoads"] = [
        {
            "id": "NL1",
            "loadCaseId": "LC1",
            "nodeId": "N2",
            "fx": 0.0,
            "fy": -10.0,
            "fz": 0.0,
            "mx": 0.0,
            "my": 0.0,
            "mz": 0.0,
        }
    ]
    return project


def simple_beam_uniform_load() -> dict[str, Any]:
    project = base_project(
        "simple_beam_uniform_load",
        "Simple Beam Uniform Load",
        "Simply supported beam with uniform member loads.",
    )
    add_simple_beam_geometry(project)
    project["memberLoads"] = [
        {
            "id": "ML1",
            "loadCaseId": "LC1",
            "memberId": "M1",
            "coordinateSystem": "local",
            "type": "uniform",
            "wx": 0.0,
            "wy": -2.0,
            "wz": 0.0,
        },
        {
            "id": "ML2",
            "loadCaseId": "LC1",
            "memberId": "M2",
            "coordinateSystem": "local",
            "type": "uniform",
            "wx": 0.0,
            "wy": -2.0,
            "wz": 0.0,
        },
    ]
    return project


def cantilever_torsion() -> dict[str, Any]:
    project = base_project(
        "cantilever_torsion",
        "Cantilever Torsion",
        "Fixed-free beam with a torsional tip moment.",
    )
    add_cantilever_geometry(project)
    project["nodalLoads"] = [
        {
            "id": "NL1",
            "loadCaseId": "LC1",
            "nodeId": "N2",
            "fx": 0.0,
            "fy": 0.0,
            "fz": 0.0,
            "mx": 5.0,
            "my": 0.0,
            "mz": 0.0,
        }
    ]
    return project


def add_cantilever_geometry(project: dict[str, Any]) -> None:
    project["nodes"] = [
        {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
        {"id": "N2", "x": 4.0, "y": 0.0, "z": 0.0},
    ]
    project["members"] = [
        {
            "id": "M1",
            "nodeI": "N1",
            "nodeJ": "N2",
            "materialId": "MAT1",
            "sectionId": "SEC1",
            "orientationVector": {"x": 0.0, "y": 1.0, "z": 0.0},
        }
    ]
    project["supports"] = [
        {
            "nodeId": "N1",
            "ux": True,
            "uy": True,
            "uz": True,
            "rx": True,
            "ry": True,
            "rz": True,
        }
    ]


def add_simple_beam_geometry(project: dict[str, Any]) -> None:
    project["nodes"] = [
        {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
        {"id": "N2", "x": 2.0, "y": 0.0, "z": 0.0},
        {"id": "N3", "x": 4.0, "y": 0.0, "z": 0.0},
    ]
    project["members"] = [
        {
            "id": "M1",
            "nodeI": "N1",
            "nodeJ": "N2",
            "materialId": "MAT1",
            "sectionId": "SEC1",
            "orientationVector": {"x": 0.0, "y": 1.0, "z": 0.0},
        },
        {
            "id": "M2",
            "nodeI": "N2",
            "nodeJ": "N3",
            "materialId": "MAT1",
            "sectionId": "SEC1",
            "orientationVector": {"x": 0.0, "y": 1.0, "z": 0.0},
        },
    ]
    project["supports"] = [
        {
            "nodeId": "N1",
            "ux": True,
            "uy": True,
            "uz": True,
            "rx": True,
            "ry": True,
            "rz": False,
        },
        {
            "nodeId": "N3",
            "ux": False,
            "uy": True,
            "uz": True,
            "rx": True,
            "ry": True,
            "rz": False,
        },
    ]


def examples() -> list[dict[str, Any]]:
    projects = [
        cantilever_tip_load(),
        simple_beam_center_load(),
        simple_beam_uniform_load(),
        cantilever_torsion(),
    ]
    return [
        {
            "id": project["project"]["id"],
            "name": project["project"]["name"],
            "description": project["project"]["description"],
            "project": project,
        }
        for project in projects
    ]
