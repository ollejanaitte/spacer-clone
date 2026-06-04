from __future__ import annotations

from typing import Any


E = 205_000_000.0  # kN/m2
G = E / (2.0 * (1.0 + 0.3))  # kN/m2
A = 0.02  # m2
I = 0.0001  # noqa: E741 - Imported by verification tests as the theory inertia symbol.
J = 0.00005  # m4
L = 4.0  # m
P = 10.0  # kN
W = 2.0  # kN/m
T = 5.0  # kN_m


def base_project(project_id: str) -> dict[str, Any]:
    return {
        "project": {
            "id": project_id,
            "name": project_id.replace("-", " ").title(),
            "schemaVersion": "1.0.0",
            "description": "MVP verification model.",
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
                "elasticModulus": E,
                "shearModulus": G,
                "poissonRatio": 0.3,
                "density": 0.0,
            }
        ],
        "sections": [
            {
                "id": "SEC1",
                "name": "Verification Section",
                "area": A,
                "iy": I,
                "iz": I,
                "j": J,
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
    project = base_project("case-1-cantilever-tip-load")
    project["nodes"] = [
        {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
        {"id": "N2", "x": L, "y": 0.0, "z": 0.0},
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
    project["nodalLoads"] = [
        {
            "id": "NL1",
            "loadCaseId": "LC1",
            "nodeId": "N2",
            "fx": 0.0,
            "fy": -P,
            "fz": 0.0,
            "mx": 0.0,
            "my": 0.0,
            "mz": 0.0,
        }
    ]
    return project


def simply_supported_center_load() -> dict[str, Any]:
    project = base_project("case-2-simple-beam-center-load")
    project["nodes"] = [
        {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
        {"id": "N2", "x": L / 2.0, "y": 0.0, "z": 0.0},
        {"id": "N3", "x": L, "y": 0.0, "z": 0.0},
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
    # Pin at N1 and roller at N3. Extra axial restraint at N1 prevents rigid axial motion.
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
    project["nodalLoads"] = [
        {
            "id": "NL1",
            "loadCaseId": "LC1",
            "nodeId": "N2",
            "fx": 0.0,
            "fy": -P,
            "fz": 0.0,
            "mx": 0.0,
            "my": 0.0,
            "mz": 0.0,
        }
    ]
    return project


def simply_supported_uniform_load() -> dict[str, Any]:
    project = simply_supported_center_load()
    project["project"]["id"] = "case-3-simple-beam-uniform-load"
    project["project"]["name"] = "Case 3 Simple Beam Uniform Load"
    project["nodalLoads"] = []
    project["memberLoads"] = [
        {
            "id": "ML1",
            "loadCaseId": "LC1",
            "memberId": "M1",
            "coordinateSystem": "local",
            "type": "uniform",
            "wx": 0.0,
            "wy": -W,
            "wz": 0.0,
        },
        {
            "id": "ML2",
            "loadCaseId": "LC1",
            "memberId": "M2",
            "coordinateSystem": "local",
            "type": "uniform",
            "wx": 0.0,
            "wy": -W,
            "wz": 0.0,
        },
    ]
    return project


def cantilever_torsion() -> dict[str, Any]:
    project = cantilever_tip_load()
    project["project"]["id"] = "case-4-cantilever-torsion"
    project["project"]["name"] = "Case 4 Cantilever Torsion"
    project["nodalLoads"] = [
        {
            "id": "NL1",
            "loadCaseId": "LC1",
            "nodeId": "N2",
            "fx": 0.0,
            "fy": 0.0,
            "fz": 0.0,
            "mx": T,
            "my": 0.0,
            "mz": 0.0,
        }
    ]
    return project


def insufficient_support() -> dict[str, Any]:
    project = cantilever_tip_load()
    project["project"]["id"] = "case-5-insufficient-support"
    project["supports"] = []
    return project


def invalid_member_reference() -> dict[str, Any]:
    project = cantilever_tip_load()
    project["project"]["id"] = "case-6-invalid-member-reference"
    project["members"][0]["nodeJ"] = "N999"
    return project


def all_nodes_free_rigid_body_mode() -> dict[str, Any]:
    project = cantilever_tip_load()
    project["project"]["id"] = "case-7-all-nodes-free-rigid-body-mode"
    project["supports"] = []
    project["nodalLoads"] = []
    return project


VALIDATION_PROJECTS = [
    cantilever_tip_load,
    simply_supported_center_load,
    simply_supported_uniform_load,
    cantilever_torsion,
    insufficient_support,
    invalid_member_reference,
    all_nodes_free_rigid_body_mode,
]
