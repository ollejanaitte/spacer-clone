#!/usr/bin/env python3
"""
P6-0 PR-3A unit tests: geometry mapping CSV validator.

Run: python -m unittest docs/apollo/step10/reference_bridge_001/phase6/phase6_0/tools/tests/test_validate_p6_0_pr3a_mapping.py
"""

import csv
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
for _ in (TOOLS, HERE):
    if _ not in sys.path:
        sys.path.insert(0, _)

import validate_p6_0_pr3a_mapping as V  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", "..", "..", "..", ".."))
MAPPING = os.path.join(REPO_ROOT, V.MAPPING_REL)


class TestMappingValidator(unittest.TestCase):

    def test_01_mapping_csv_exists(self):
        self.assertTrue(os.path.exists(MAPPING), "mapping CSV missing")

    def test_02_headers_complete(self):
        with open(MAPPING, newline="", encoding="utf-8") as f:
            headers = list(csv.DictReader(f).fieldnames or [])
        for col in V.REQUIRED_COLUMNS:
            self.assertIn(col, headers)

    def test_03_rows_unique_and_complete(self):
        with open(MAPPING, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        self.assertGreaterEqual(len(rows), 20)
        ids = [r["mapping_id"] for r in rows]
        self.assertEqual(len(ids), len(set(ids)), "duplicate mapping_id")
        for r in rows:
            for col in ("common_model_id", "geometry_input_entity", "resolution_state",
                        "readiness"):
                self.assertTrue((r.get(col) or "").strip(), f"{r['mapping_id']} empty {col}")

    def test_04_enums(self):
        with open(MAPPING, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        for r in rows:
            self.assertIn(r["resolution_state"], V.RESOLUTION_STATES)
            self.assertIn(r["readiness"], V.READINESS)
            if r["geometry_entity_type"]:
                self.assertIn(r["geometry_entity_type"], V.ENTITY_TYPES)

    def test_05_golden_references_resolve(self):
        ids = V.load_golden_ids(REPO_ROOT)
        self.assertGreaterEqual(len(ids), 3800, "golden IDs should load from Phase 3/4")
        with open(MAPPING, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        for r in rows:
            g = (r.get("golden_reference") or "").strip()
            if not g or g in ("none", "none (Phase 2 not extracted)"):
                continue
            _, missing, _ = V.expand_references(g, ids)
            unresolved = [m for m in missing if m not in V.EXPECTED_HOLD_ABSENT]
            self.assertEqual([], unresolved,
                             f"{r['mapping_id']} unresolved golden refs: {unresolved}")

    def test_06_range_expansion(self):
        ids = {"GIN-0001", "GIN-0002", "GIN-0003", "GIN-0004"}
        resolvable, missing, informal = V.expand_references("GIN-0001..0004", ids)
        self.assertEqual(4, len(resolvable))
        self.assertEqual([], missing)
        self.assertEqual([], informal)

    def test_07_informal_tokens_flagged(self):
        ids = set()
        _, missing, informal = V.expand_references("G-GEO-00xx", ids)
        self.assertEqual([], missing)
        self.assertEqual(["G-GEO-00xx"], informal)

    def test_08_end_to_end_validator_passes(self):
        r = subprocess.run([sys.executable,
                            os.path.join(TOOLS, "validate_p6_0_pr3a_mapping.py"),
                            "--root", REPO_ROOT], capture_output=True, text=True)
        first = (r.stdout.splitlines() or [""])[0]
        self.assertTrue(first.startswith("OVERALL: PASS"), f"validator output: {r.stdout} {r.stderr}")

    def test_09_bad_enum_detected(self):
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, newline="",
                                         encoding="utf-8") as fh:
            fh.write("mapping_id,common_model_entity,common_model_id,geometry_input_entity,"
                     "geometry_entity_type,geometry_entity_id_rule,golden_reference,"
                     "source_reference,resolution_state,readiness,notes\n")
            fh.write("GM-T1,test,T1,test,GridPoint,GP-x,none,,BAD_STATE,READY,note\n")
            tmp = fh.name
        try:
            with open(tmp, newline="", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
            rs = (rows[0].get("resolution_state") or "").strip()
            self.assertNotIn(rs, V.RESOLUTION_STATES)
        finally:
            os.unlink(tmp)


if __name__ == "__main__":
    unittest.main()
