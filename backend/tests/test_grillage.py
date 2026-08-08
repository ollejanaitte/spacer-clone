#!/usr/bin/env python3
"""Phase 7 grillage design-model analysis tests (STEP2-7-02)."""

import json
import unittest

from backend.engine.grillage import (
    AUTHORIZATION_GATE,
    GrillageError,
    build_grillage_project,
    run_grillage_analysis,
)

# Reference Bridge 001 grillage (frontend buildGrillageModel output shape):
# 4 supports x 2 girders -> 8 nodes; 6 longitudinal + 4 transverse members.
RB001_GRILLAGE = {
    "bridgeId": "RB-S10-001",
    "nodes": [
        {"id": "N-SUP-AR2-GIRDER-AG1", "x": 0.0, "y": 1.47689, "z": 0.0},
        {"id": "N-SUP-AR2-GIRDER-AG2", "x": 0.0, "y": -3.02859, "z": 0.0},
        {"id": "N-SUP-PR1-GIRDER-AG1", "x": 40.201, "y": 1.47689, "z": 0.0},
        {"id": "N-SUP-PR1-GIRDER-AG2", "x": 40.201, "y": -3.02859, "z": 0.0},
        {"id": "N-SUP-PR2-GIRDER-AG1", "x": 91.201, "y": 1.47689, "z": 0.0},
        {"id": "N-SUP-PR2-GIRDER-AG2", "x": 91.201, "y": -3.02859, "z": 0.0},
        {"id": "N-SUP-PU15-GIRDER-AG1", "x": 134.001, "y": 1.47689, "z": 0.0},
        {"id": "N-SUP-PU15-GIRDER-AG2", "x": 134.001, "y": -3.02859, "z": 0.0},
    ],
    "members": [
        {"id": f"M-L-GIRDER-AG{i}-S{j+1}", "nodeI": f"N-SUP-{s1}-GIRDER-AG{i}",
         "nodeJ": f"N-SUP-{s2}-GIRDER-AG{i}", "materialId": "MAT-STEEL",
         "sectionId": "SECTION-DECK", "kind": "mainGirder"}
        for i in (1, 2)
        for j, (s1, s2) in enumerate(
            (("AR2", "PR1"), ("PR1", "PR2"), ("PR2", "PU15")))
    ],
    "supports": [
        {"nodeId": f"N-SUP-{s}-GIRDER-AG{i}", "ux": s in ("AR2", "PU15"),
         "uy": s in ("AR2", "PU15"), "uz": True}
        for s in ("AR2", "PR1", "PR2", "PU15") for i in (1, 2)
    ],
    "loadCases": [],
}


class TestGrillageAnalysis(unittest.TestCase):
    def test_build_project_is_runnable(self):
        project = build_grillage_project(json.loads(json.dumps(RB001_GRILLAGE)))["project"]
        self.assertEqual(8, len(project["nodes"]))
        self.assertEqual(6, len(project["members"]))
        self.assertEqual(8, len(project["supports"]))
        self.assertEqual(1, len(project["materials"]))
        self.assertEqual("MAT-STEEL", project["materials"][0]["id"])

    def test_run_grillage_analysis_returns_gated_result(self):
        result = run_grillage_analysis(json.loads(json.dumps(RB001_GRILLAGE)))
        self.assertEqual("NOT_GRANTED", result["authorization"])
        self.assertIn("reactions", result)
        self.assertIn("displacements", result)
        self.assertIn("memberEndForces", result)

    def test_empty_grillage_rejected(self):
        with self.assertRaises(GrillageError):
            run_grillage_analysis({"nodes": [], "members": []})


if __name__ == "__main__":
    unittest.main()
