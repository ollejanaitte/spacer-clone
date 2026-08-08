#!/usr/bin/env python3
"""
STEP 1 master validator unit tests.

Run: python -m unittest docs/apollo/step10/reference_bridge_001/step1/tools/tests/test_validate_step1_master.py
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

import validate_step1_master as V  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", "..", "..", ".."))
BASE = os.path.join(REPO_ROOT, V.RB)


class TestStep1MasterValidator(unittest.TestCase):

    def test_01_all_deliverables_exist(self):
        for name, (rel, _) in V.REQUIRED_DELIVERABLES.items():
            self.assertTrue(os.path.exists(os.path.join(BASE, rel)), f"{name}: {rel}")

    def test_02_connector_ids_unique(self):
        import re
        text = open(os.path.join(BASE, "STEP1_P03_CONNECTOR_MATRIX.md"), encoding="utf-8").read()
        rows = re.findall(r"^\| CN-\d\d\b", text, re.MULTILINE)
        ids = [m.split("|")[1].strip() for m in rows]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertGreaterEqual(len(set(ids)), 14)

    def test_03_replay_has_tolerance_and_fail_classes(self):
        text = open(os.path.join(BASE, "STEP1_P07_GOLDEN_REPLAY_SPEC.md"), encoding="utf-8").read()
        self.assertIn("tolerance", text)
        self.assertIn("FAIL_ID", text)
        self.assertIn("provenance", text)

    def test_04_end_to_end_passes(self):
        r = subprocess.run(
            [sys.executable, os.path.join(TOOLS, "validate_step1_master.py"), "--root", REPO_ROOT],
            capture_output=True, text=True,
        )
        first = (r.stdout.splitlines() or [""])[0]
        self.assertTrue(first.startswith("OVERALL: PASS"), f"{r.stdout} {r.stderr}")


if __name__ == "__main__":
    unittest.main()
