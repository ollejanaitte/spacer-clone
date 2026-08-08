#!/usr/bin/env python3
"""
P6-0 PR-3B unit tests: Phase 6-0 master validator.

Run: python -m unittest docs/apollo/step10/reference_bridge_001/phase6/phase6_0/tools/tests/test_validate_p6_0_pr3.py
"""

import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
for _ in (TOOLS, HERE):
    if _ not in sys.path:
        sys.path.insert(0, _)

import validate_p6_0_pr3 as V  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", "..", "..", "..", ".."))


class TestMasterValidator(unittest.TestCase):

    def test_01_core_artifacts_listed(self):
        for rel in ("architecture/apollo_geometry_engine_architecture.md",
                    "connectors/alignment_connector_spec.md",
                    "coordinates/coordinate_conversion_matrix.csv",
                    "geometry/geometry_entity_contract.md",
                    "mapping/reference_bridge_001_geometry_mapping.csv",
                    "completion/p6_0_pr2_completion_report.md"):
            self.assertIn(rel, V.CORE_FILES)

    def test_02_registers_have_no_unresolved_responsibility(self):
        dup = V.load_register(REPO_ROOT, "audit/duplicate_geometry_logic_register.csv")
        rc = V.load_register(REPO_ROOT, "audit/responsibility_conflict_register.csv")
        self.assertGreaterEqual(len(dup), 25)
        self.assertGreaterEqual(len(rc), 10)
        self.assertEqual([], [r["audit_id"] for r in dup
                              if not (r.get("proposed_owner") or "").strip()])
        self.assertEqual([], [r["conflict_id"] for r in rc
                              if not (r.get("proposed_authority") or "").strip()])

    def test_03_audit_csv_rows_well_formed(self):
        import csv
        for rel in ("audit/duplicate_geometry_logic_register.csv",
                    "audit/existing_connector_inventory.csv",
                    "audit/responsibility_conflict_register.csv"):
            p = os.path.join(REPO_ROOT, V.RB, rel)
            with open(p, newline="", encoding="utf-8") as f:
                raw = list(csv.reader(f))
            ncols = len(raw[0])
            malformed = [i + 1 for i, row in enumerate(raw[1:], start=1) if len(row) != ncols]
            self.assertEqual([], malformed, f"{rel} malformed rows: {malformed}")

    def test_04_end_to_end_master_validator_passes(self):
        r = subprocess.run([sys.executable, os.path.join(TOOLS, "validate_p6_0_pr3.py"),
                            "--root", REPO_ROOT], capture_output=True, text=True)
        first = (r.stdout.splitlines() or [""])[0]
        self.assertTrue(first.startswith("OVERALL: PASS"), f"{r.stdout} {r.stderr}")

    def test_05_summary_written(self):
        p = os.path.join(REPO_ROOT, V.RB, "validation",
                         "phase6_0_master_validation_summary.md")
        self.assertTrue(os.path.exists(p))
        text = open(p, encoding="utf-8").read()
        self.assertIn("PHASE6_0_MASTER_VALIDATION: PASS", text)


if __name__ == "__main__":
    unittest.main()
