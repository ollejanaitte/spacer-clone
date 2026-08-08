#!/usr/bin/env python3
"""
P6-0 PR-3C unit tests: closeout validator.

Run: python -m unittest docs/apollo/step10/reference_bridge_001/phase6/phase6_0/tools/tests/test_validate_p6_0_pr3_closeout.py
"""

import csv
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
for _ in (TOOLS, HERE):
    if _ not in sys.path:
        sys.path.insert(0, _)

import validate_p6_0_pr3_closeout as V  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", "..", "..", "..", ".."))


class TestCloseoutValidator(unittest.TestCase):

    def test_01_risk_register_well_formed(self):
        p = os.path.join(REPO_ROOT, V.RB, "validation", "risk_register.csv")
        with open(p, newline="", encoding="utf-8") as f:
            raw = list(csv.reader(f))
        self.assertGreaterEqual(len(raw[1:]), 10)
        ncols = len(raw[0])
        malformed = [i for i, r in enumerate(raw[1:], start=1) if len(r) != ncols]
        self.assertEqual([], malformed)
        for col in V.RISK_COLUMNS:
            self.assertIn(col, raw[0])

    def test_02_risk_ids_unique(self):
        p = os.path.join(REPO_ROOT, V.RB, "validation", "risk_register.csv")
        with open(p, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        ids = [r["risk_id"] for r in rows]
        self.assertEqual(len(ids), len(set(ids)))

    def test_03_closeout_files_exist(self):
        for rel in V.REQUIRED_FILES:
            self.assertTrue(os.path.exists(os.path.join(REPO_ROOT, V.RB, rel)), rel)

    def test_04_seal_markers(self):
        text = open(os.path.join(REPO_ROOT, V.RB, "phase6_0_seal.md"), encoding="utf-8").read()
        self.assertIn("SEAL-RB-S10-001-P6-0", text)
        self.assertIn("SEALED", text)
        self.assertIn("PHASE6_0_MASTER_VALIDATION: PASS", text)

    def test_05_end_to_end_closeout_passes(self):
        r = subprocess.run([sys.executable, os.path.join(TOOLS, "validate_p6_0_pr3_closeout.py"),
                            "--root", REPO_ROOT], capture_output=True, text=True)
        first = (r.stdout.splitlines() or [""])[0]
        self.assertTrue(first.startswith("OVERALL: PASS"), f"{r.stdout} {r.stderr}")

    def test_06_final_report_markers(self):
        text = open(os.path.join(REPO_ROOT, "final_report.txt"), encoding="utf-8").read()
        self.assertIn("PHASE6_0_OVERALL_VERDICT: COMPLETE", text)
        self.assertIn("SEAL-RB-S10-001-P6-0", text)
        self.assertIn("PHASE6_0_MASTER_VALIDATION: PASS", text)
        self.assertIn("PHASE6_1_START_READINESS: READY", text)


if __name__ == "__main__":
    unittest.main()
