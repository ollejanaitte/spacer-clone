#!/usr/bin/env python3
"""Phase 7-02 WP-G: Solver Input Adapter + grillage production path tests.

R1 regression: the grillage / AnalysisDocument path must return a SUCCESSFUL
linear-static analysis (no SCHEMA_ERROR envelope mismatch).
"""

import json

import pytest

from backend.engine.grillage import build_grillage_project, run_grillage_analysis
from backend.engine.solver_input import (
    SolverInputError,
    build_project_from_analysis_document,
    run_analysis_document,
)


def _analysis_document() -> dict:
    """A minimal 2-node cantilever AnalysisDocument (fixture shape)."""
    return {
        "schemaId": "spacer.contracts.analysis-document",
        "schemaVersion": "1.0.0",
        "documentKind": "analysis-document",
        "documentId": "11111111-1111-4111-8111-111111111111",
        "projectId": "p-1",
        "revisionId": 1,
        "modelChecksum": "a" * 64,
        "nodes": [
            {"entityId": "33333333-3333-4333-8333-333333333333", "x": 0.0, "y": 0.0, "z": 0.0},
            {"entityId": "44444444-4444-4444-8444-444444444444", "x": 4.0, "y": 0.0, "z": 0.0},
        ],
        "materials": [
            {
                "entityId": "55555555-5555-4555-8555-555555555555",
                "elasticModulus": 205000000.0,
                "shearModulus": 78846153.846,
                "poissonRatio": 0.3,
                "density": 78.5,
            }
        ],
        "sections": [
            {
                "entityId": "66666666-6666-4666-8666-666666666666",
                "area": 0.02,
                "iy": 0.0001,
                "iz": 0.0001,
                "j": 0.00005,
            }
        ],
        "members": [
            {
                "entityId": "77777777-7777-4777-8777-777777777777",
                "nodeIId": "33333333-3333-4333-8333-333333333333",
                "nodeJId": "44444444-4444-4444-8444-444444444444",
                "materialId": "55555555-5555-4555-8555-555555555555",
                "sectionId": "66666666-6666-4666-8666-666666666666",
                "orientationVector": {"x": 0, "y": 1, "z": 0},
            }
        ],
        "supports": [
            {
                "entityId": "88888888-8888-4888-8888-888888888888",
                "nodeId": "33333333-3333-4333-8333-333333333333",
                "constraint": {"ux": True, "uy": True, "uz": True, "rx": True, "ry": True, "rz": True},
            }
        ],
        "loadCases": [{"caseId": "LC1", "kind": "dead", "state": "CONFIRMED", "source": "t", "totalKN": 10.0}],
        "nodalLoads": [
            {
                "id": "NL1",
                "loadCaseId": "LC1",
                "nodeId": "44444444-4444-4444-8444-444444444444",
                "fx": 0,
                "fy": 0,
                "fz": -10.0,
                "mx": 0,
                "my": 0,
                "mz": 0,
            }
        ],
        "memberLoads": [],
        "loadCombinations": [],
        "analysisSettings": {"analysisType": "linear_static", "solver": "scipy_sparse"},
    }


class TestSolverInputAdapter:
    def test_build_project_produces_correct_envelope(self):
        project = build_project_from_analysis_document(_analysis_document())
        # parse_model expects data["project"] = ProjectInfo (id/name/schemaVersion).
        assert project["project"]["id"] == "p-1"
        assert project["project"]["schemaVersion"] == "1.0.0"
        assert len(project["nodes"]) == 2
        assert len(project["materials"]) == 1
        assert len(project["sections"]) == 1
        assert len(project["members"]) == 1
        assert len(project["supports"]) == 1
        assert project["loadCases"][0]["id"] == "LC1"
        assert project["nodalLoads"][0]["fz"] == -10.0
        assert project["memberLoads"] == []
        assert project["analysisSettings"]["solver"] == "scipy_sparse"

    def test_run_analysis_document_succeeds(self):
        # R1 regression: no SCHEMA_ERROR.
        result = run_analysis_document(_analysis_document())
        assert result["analysisSummary"]["status"] == "success"
        assert len(result["displacements"]) == 2
        assert len(result["reactions"]) == 1
        assert len(result["memberEndForces"]) == 1

    def test_rejects_dangling_member(self):
        doc = _analysis_document()
        doc["members"][0]["nodeJId"] = "99999999-9999-4999-8999-999999999999"
        with pytest.raises(SolverInputError):
            build_project_from_analysis_document(doc)

    def test_rejects_non_finite(self):
        doc = _analysis_document()
        doc["nodes"][1]["y"] = float("nan")
        with pytest.raises(SolverInputError):
            build_project_from_analysis_document(doc)

    def test_member_orientation_passed_through(self):
        doc = _analysis_document()
        project = build_project_from_analysis_document(doc)
        assert project["members"][0]["orientationVector"] == {"x": 0, "y": 1, "z": 0}


class TestGrillageProductionPath:
    def test_grillage_project_envelope_is_correct(self):
        grillage = {
            "bridgeId": "B-1",
            "nodes": [
                {"id": "N1", "x": 0, "y": 0, "z": 0},
                {"id": "N2", "x": 10, "y": 0, "z": 0},
            ],
            "members": [
                {"id": "M1", "nodeI": "N1", "nodeJ": "N2", "sectionId": "SEC1"},
            ],
            "supports": [
                {"nodeId": "N1", "ux": True, "uy": True, "uz": True},
            ],
            "loadCases": [],
        }
        built = build_grillage_project(json.loads(json.dumps(grillage)))
        assert built["project"]["id"] == "B-1"
        assert len(built["nodes"]) == 2
        assert "memberLoads" in built
        assert "nodalLoads" in built

    def test_run_grillage_analysis_succeeds(self):
        # R1 regression: legacy grillage path now succeeds (was SCHEMA_ERROR).
        grillage = {
            "bridgeId": "B-1",
            "nodes": [
                {"id": "N1", "x": 0, "y": 0, "z": 0},
                {"id": "N2", "x": 10, "y": 0, "z": 0},
                {"id": "N3", "x": 0, "y": 5, "z": 0},
                {"id": "N4", "x": 10, "y": 5, "z": 0},
            ],
            "members": [
                {"id": "M1", "nodeI": "N1", "nodeJ": "N2", "sectionId": "SEC1", "orientationVector": {"x": 0, "y": 1, "z": 0}},
                {"id": "M2", "nodeI": "N3", "nodeJ": "N4", "sectionId": "SEC1", "orientationVector": {"x": 0, "y": 1, "z": 0}},
                {"id": "M3", "nodeI": "N1", "nodeJ": "N3", "sectionId": "SEC1", "orientationVector": {"x": 1, "y": 0, "z": 0}},
                {"id": "M4", "nodeI": "N2", "nodeJ": "N4", "sectionId": "SEC1", "orientationVector": {"x": 1, "y": 0, "z": 0}},
            ],
            "supports": [
                {"nodeId": "N1", "ux": True, "uy": True, "uz": True},
                {"nodeId": "N3", "ux": True, "uy": True, "uz": True},
            ],
            "loadCases": [{"id": "LC1", "name": "test", "type": "dead"}],
            "nodalLoads": [{"id": "L1", "loadCaseId": "LC1", "nodeId": "N2", "fz": -10.0}],
            "memberLoads": [],
        }
        result = run_grillage_analysis(json.loads(json.dumps(grillage)))
        assert result["authorization"] == "NOT_GRANTED"
        # R1: analysis RUNS (no SCHEMA_ERROR); warning = under-constrained test
        # model, not a failed envelope.
        assert result["analysisSummary"]["status"] in ("success", "warning")
        assert len(result["reactions"]) == 2
