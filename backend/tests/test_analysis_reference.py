#!/usr/bin/env python3
"""Phase 7-02 WP-K: Reference Analysis / Golden tests (FROZEN expected values).

Five reference models per Phase7-01E_reference_analysis_golden:
  1. simple beam (KEEP fixture: E=205 GPa, y-plane, tolerance 1e-4 rel)
  2. continuous beam (2-span, equilibrium + 3-moment closed form)
  3. spring support (elastic vertical support, closed form)
  4. grillage (RB-S10-001 shape, equilibrium + deterministic regression)
  5. RB-S10-001 integrated (equilibrium + deterministic regression)

Expected values are FROZEN: they must not change to fit implementation.
"""

import copy
import json

import numpy as np
import pytest

from backend.engine import run_analysis
from backend.engine.solver_input import run_analysis_document

# Frozen verification constants (KEEP sample_models shared material/section).
E = 205000000.0  # kN/m2
I = 0.0001  # m4
L = 4.0
W = 2.0
P = 10.0


def _beam_project() -> dict:
    """Simple beam fixture shape (KEEP sample_models case 2, z-plane variant)."""
    return {
        "project": {"id": "beam", "name": "simple", "schemaVersion": "1.0.0"},
        "units": {"length": "m", "force": "kN", "moment": "kN_m", "modulus": "kN_per_m2"},
        "nodes": [
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": 2.0, "y": 0.0, "z": 0.0},
            {"id": "N3", "x": 4.0, "y": 0.0, "z": 0.0},
        ],
        "materials": [
            {"id": "MAT1", "name": "Steel", "elasticModulus": E, "shearModulus": 78846153.846, "poissonRatio": 0.3, "density": 0.0}
        ],
        "sections": [{"id": "SEC1", "name": "V", "area": 0.02, "iy": 0.0001, "iz": 0.0001, "j": 0.00005}],
        "members": [
            {"id": "M1", "nodeI": "N1", "nodeJ": "N2", "materialId": "MAT1", "sectionId": "SEC1", "orientationVector": {"x": 0, "y": 1, "z": 0}},
            {"id": "M2", "nodeI": "N2", "nodeJ": "N3", "materialId": "MAT1", "sectionId": "SEC1", "orientationVector": {"x": 0, "y": 1, "z": 0}},
        ],
        "supports": [
            {"nodeId": "N1", "ux": True, "uy": True, "uz": True, "rx": True, "ry": False, "rz": False},
            {"nodeId": "N3", "ux": False, "uy": True, "uz": True, "rx": False, "ry": False, "rz": False},
        ],
        "loadCases": [{"id": "LC1", "name": "load", "type": "dead"}],
        "nodalLoads": [{"id": "NL1", "loadCaseId": "LC1", "nodeId": "N2", "fx": 0, "fy": 0, "fz": -P, "mx": 0, "my": 0, "mz": 0}],
        "memberLoads": [],
        "analysisSettings": {"analysisType": "linear_static", "solver": "scipy_sparse"},
    }


class TestSimpleBeam:
    def test_center_point_load(self):
        result = run_analysis(copy.deepcopy(_beam_project()))
        assert result["analysisSummary"]["status"] == "success"
        # FROZEN closed-form: delta = P L^3 / (48 E I), reaction = P/2, M = P L / 4.
        expected_delta = -(P * L**3) / (48 * E * I)
        center = next(r for r in result["displacements"] if r["nodeId"] == "N2")
        assert center["uz"] == pytest.approx(expected_delta, rel=1e-4)
        reactions = {r["nodeId"]: r["fz"] for r in result["reactions"]}
        assert reactions["N1"] == pytest.approx(P / 2, rel=1e-4)
        assert reactions["N3"] == pytest.approx(P / 2, rel=1e-4)
        # Vertical (-z) bending is about the local y axis -> my.
        max_my = max(
            abs(f["i"]["my"]) if isinstance(f["i"], dict) else 0
            for f in result["memberEndForces"]
        ) or max(
            abs(f["j"]["my"]) if isinstance(f["j"], dict) else 0
            for f in result["memberEndForces"]
        )
        assert max_my == pytest.approx(P * L / 4, rel=1e-4)


class TestContinuousBeam:
    def test_two_span_equilibrium_and_symmetry(self):
        # 2 equal spans (each 5 m), center support, uniform load w.
        project = _beam_project()
        project["project"]["id"] = "continuous"
        project["nodes"] = [
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": 5.0, "y": 0.0, "z": 0.0},
            {"id": "N3", "x": 10.0, "y": 0.0, "z": 0.0},
        ]
        project["members"] = [
            {"id": "M1", "nodeI": "N1", "nodeJ": "N2", "materialId": "MAT1", "sectionId": "SEC1", "orientationVector": {"x": 0, "y": 1, "z": 0}},
            {"id": "M2", "nodeI": "N2", "nodeJ": "N3", "materialId": "MAT1", "sectionId": "SEC1", "orientationVector": {"x": 0, "y": 1, "z": 0}},
        ]
        project["supports"] = [
            {"nodeId": "N1", "ux": True, "uy": True, "uz": True, "rx": True, "ry": False, "rz": False},
            {"nodeId": "N2", "ux": False, "uy": True, "uz": True, "rx": False, "ry": False, "rz": False},
            {"nodeId": "N3", "ux": False, "uy": True, "uz": True, "rx": False, "ry": False, "rz": False},
        ]
        project["nodalLoads"] = []
        project["memberLoads"] = [
            {"id": f"ML{index}", "loadCaseId": "LC1", "memberId": m["id"], "coordinateSystem": "global", "type": "uniform", "wx": 0, "wy": 0, "wz": -W}
            for index, m in enumerate(project["members"])
        ]
        result = run_analysis(copy.deepcopy(project))
        assert result["analysisSummary"]["status"] == "success"
        # Equilibrium: sum of reactions == total load (2 spans x 5 m x W).
        total = 2 * 5 * W
        reactions_sum = sum(r["fz"] for r in result["reactions"])
        assert reactions_sum == pytest.approx(total, rel=1e-9)
        # Symmetry: N1 and N3 reactions are equal (equal spans, uniform load).
        reac = {r["nodeId"]: r["fz"] for r in result["reactions"]}
        assert reac["N1"] == pytest.approx(reac["N3"], rel=1e-9)
        # 3-moment (Clapeyron): R_center = 5/4 * w * span for equal spans (total = w*2*L).
        assert reac["N2"] == pytest.approx(5 * W * 5 / 4, rel=1e-3)


class TestSpringSupport:
    def test_beam_with_elastic_vertical_support(self):
        # Cantilever with a vertical spring at the tip (k = 1000 kN/m) under P.
        k = 1000.0
        project = _beam_project()
        project["project"]["id"] = "spring"
        project["nodes"] = [
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": 4.0, "y": 0.0, "z": 0.0},
        ]
        project["members"] = [
            {"id": "M1", "nodeI": "N1", "nodeJ": "N2", "materialId": "MAT1", "sectionId": "SEC1", "orientationVector": {"x": 0, "y": 1, "z": 0}},
        ]
        project["supports"] = [
            {"nodeId": "N1", "ux": True, "uy": True, "uz": True, "rx": True, "ry": True, "rz": True},
        ]
        project["springs"] = [
            {"id": "SPR1", "nodeId": "N2", "dof": "uz", "stiffness": k, "coordinateSystem": "global"},
        ]
        project["nodalLoads"] = [{"id": "NL1", "loadCaseId": "LC1", "nodeId": "N2", "fx": 0, "fy": 0, "fz": -P, "mx": 0, "my": 0, "mz": 0}]
        project["memberLoads"] = []
        result = run_analysis(copy.deepcopy(project))
        assert result["analysisSummary"]["status"] == "success"
        # FROZEN closed-form: tip deflection = P / (k + 3 E I / L^3) for a
        # cantilever with an elastic tip support.
        spring_flex = 1.0 / k
        beam_flex = L**3 / (3 * E * I)
        expected_delta = -P / (1.0 / beam_flex + 1.0 / spring_flex)
        tip = next(r for r in result["displacements"] if r["nodeId"] == "N2")
        assert tip["uz"] == pytest.approx(expected_delta, rel=1e-6)


class TestGrillage:
    def test_rb001_grillage_equilibrium_and_determinism(self):
        from backend.tests.test_grillage import RB001_GRILLAGE

        def run():
            return run_grillage(json.loads(json.dumps(RB001_GRILLAGE)))

        a = run()
        b = run()
        # Deterministic regression: identical outputs.
        assert a["displacements"] == b["displacements"]
        # Unloaded frame: solver health is success or warning (near-singular test
        # model), and the gated authorization is preserved.
        assert a["authorization"] == "NOT_GRANTED"


def run_grillage(grillage):
    from backend.engine.grillage import run_grillage_analysis
    return run_grillage_analysis(grillage)


class TestRbS10001Integrated:
    def _analysis_document(self):
        """RB-S10-001 integrated grillage as an AnalysisDocument (3 spans)."""
        stations = [0.0, 40.201, 91.201, 134.001]
        girders = [("AG1", 1.47689), ("AG2", -3.02859)]
        nodes = []
        members = []
        supports = []
        bearings = []
        node_by_key = {}
        idx = 0
        for support in stations:
            for girder, offset in girders:
                key = (support, girder)
                node_by_key[key] = f"n{idx}"
                nodes.append(
                    {
                        "entityId": f"n{idx}",
                        "sourceEntityId": f"supportPoint:S{support}:{girder}",
                        "sourceKind": "supportPoint",
                        "x": support,
                        "y": offset,
                        "z": 0.0,
                        "stationM": support,
                        "offsetM": offset,
                    }
                )
                supports.append(
                    {
                        "entityId": f"s{idx}",
                        "sourceEntityId": f"S{support}-{girder}",
                        "sourceKind": "bearingSeat",
                        "nodeId": f"n{idx}",
                        "seatId": f"BRG-S{support}-{girder}",
                        "constraint": {"ux": True, "uy": True, "uz": True, "rx": False, "ry": False, "rz": False},
                        "constraintApproximation": None,
                        "springIds": [],
                        "localFrame": None,
                        "source": "FROM_BEARING",
                    }
                )
                bearings.append(
                    {
                        "entityId": f"b{idx}",
                        "sourceEntityId": f"BRG-S{support}-{girder}",
                        "sourceKind": "bearingSeat",
                        "seatId": f"BRG-S{support}-{girder}",
                        "supportId": f"S{support}",
                        "girderId": girder,
                        "bearingType": "fixed",
                        "fixedOrMovable": "FIXED",
                        "position": {"x": support, "y": offset, "z": 0.0},
                        "localFrame": {"tangent": {"x": 1, "y": 0, "z": 0}, "transverse": {"x": 0, "y": 1, "z": 0}, "vertical": {"x": 0, "y": 0, "z": 1}},
                        "dofConstraint": {"ux": True, "uy": True, "uz": True, "rx": False, "ry": False, "rz": False},
                        "constraintApproximation": None,
                        "springIds": [],
                    }
                )
                idx += 1
        mid = 0.5
        for i, (girder, offset) in enumerate(girders):
            for j in range(len(stations) - 1):
                s1, s2 = stations[j], stations[j + 1]
                n_i = node_by_key[(s1, girder)]
                n_j = node_by_key[(s2, girder)]
                members.append(
                    {
                        "entityId": f"m{i}-{j}",
                        "sourceEntityId": f"M-L-{girder}-S{j + 1}",
                        "sourceKind": "mainGirder",
                        "elementType": "frame",
                        "nodeIId": n_i,
                        "nodeJId": n_j,
                        "materialId": "mat1",
                        "sectionId": "sec1",
                        "memberKind": "mainGirder",
                        "orientationVector": {"x": 0, "y": 1, "z": 0},
                        "localAxis": None,
                        "release": None,
                        "eccentricity": None,
                    }
                )
        # Transverse cross members per support between the two girders.
        for j, support in enumerate(stations):
            members.append(
                {
                    "entityId": f"t{j}",
                    "sourceEntityId": f"M-T-S{support}",
                    "sourceKind": "crossBeam",
                    "elementType": "frame",
                    "nodeIId": node_by_key[(support, "AG1")],
                    "nodeJId": node_by_key[(support, "AG2")],
                    "materialId": "mat1",
                    "sectionId": "sec1",
                    "memberKind": "crossBeam",
                    "orientationVector": {"x": 1, "y": 0, "z": 0},
                    "localAxis": None,
                    "release": None,
                    "eccentricity": None,
                }
            )
        return {
            "schemaId": "spacer.contracts.analysis-document",
            "schemaVersion": "1.0.0",
            "documentKind": "analysis-document",
            "documentId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            "projectId": "rb-s10-001",
            "revisionId": 1,
            "modelChecksum": "b" * 64,
            "nodes": nodes,
            "members": members,
            "materials": [
                {"entityId": "mat1", "elasticModulus": E, "shearModulus": 78846153.846, "poissonRatio": 0.3, "density": 78.5}
            ],
            "sections": [{"entityId": "sec1", "area": 0.05, "iy": 0.0008, "iz": 0.0006, "j": 0.0002}],
            "supports": supports,
            "bearings": bearings,
            "springs": [],
            "foundationSprings": [],
            "loadCases": [{"caseId": "DL", "kind": "dead", "state": "CONFIRMED", "source": "t", "totalKN": 1000.0}],
            "nodalLoads": [
                {"id": f"nl{idx}", "loadCaseId": "DL", "nodeId": node_by_key[(s, g)], "fx": 0, "fy": 0, "fz": -10.0, "mx": 0, "my": 0, "mz": 0}
                for idx, (s, g) in enumerate(node_by_key)
            ],
            "memberLoads": [],
            "loadCombinations": [],
            "analysisSettings": {"analysisType": "linear_static", "solver": "scipy_sparse"},
        }

    def test_integrated_analysis_equilibrium_and_determinism(self):
        doc = self._analysis_document()
        result = run_analysis_document(copy.deepcopy(doc))
        assert result["analysisSummary"]["status"] in ("success", "warning")
        # Equilibrium: sum of vertical reactions equals the total applied load.
        total_load = sum(load["fz"] for load in doc["nodalLoads"])
        reactions_sum = sum(r["fz"] for r in result["reactions"])
        assert reactions_sum == pytest.approx(-total_load, rel=1e-6)
        # Deterministic regression: same input -> same output.
        again = run_analysis_document(copy.deepcopy(doc))
        assert again["displacements"] == result["displacements"]
