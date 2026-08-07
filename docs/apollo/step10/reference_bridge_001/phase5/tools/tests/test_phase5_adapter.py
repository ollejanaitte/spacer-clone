#!/usr/bin/env python3
"""
P5-3 unit tests: Golden adapter, Reference fixture, round-trip.

Covers the required P5-3 tests:
  - Golden adapter test
  - fixture schema validation
  - Golden count reconciliation
  - no unexplained unmapped Golden
  - conflict preserved
  - HCR preserved
  - HOLD preserved
  - Analysis empty preserved
  - serialization round-trip
  - deterministic canonical serialization
  - semantic fingerprint stability

Run: python -m unittest docs/apollo/step10/reference_bridge_001/phase5/tools/tests/test_phase5_adapter.py
"""

import csv
import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
for _ in (TOOLS, HERE):
    if _ not in sys.path:
        sys.path.insert(0, _)

import common_model as C  # noqa: E402
from validate_common_bridge_model import load_normalized_schema, validate_semantic, SCHEMA_REL  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", "..", "..", ".."))
RB = "docs/apollo/step10/reference_bridge_001"

FIXTURE = os.path.join(RB, "phase5", "fixtures", "reference_bridge_001_common_model.json")
FINGERPRINT = os.path.join(RB, "phase5", "fixtures",
                           "reference_bridge_001_common_model.fingerprint.txt")
PARITY = os.path.join(RB, "phase5", "validation", "golden_to_common_model_parity.csv")

GOLDEN_TOTALS = {"phase3": 141, "phase4_model": 67, "phase4_design": 99,
                 "phase4_report": 1591, "phase4_drawing": 2059}


def load_fixture():
    with open(os.path.join(REPO_ROOT, FIXTURE), encoding="utf-8") as f:
        return json.load(f)


def entity_ids(doc):
    ids = []
    for layer in ("alignments", "bridgeGeometry", "structuralModel", "materials",
                  "sections", "loads", "design", "reportSpecification",
                  "drawingSpecification"):
        for k, v in doc[layer].items():
            if isinstance(v, list):
                ids.extend(e["id"] for e in v)
    return ids


class LoadedSchema:
    _validator = None

    @classmethod
    def validator(cls):
        if cls._validator is None:
            from jsonschema import Draft202012Validator
            schema = load_normalized_schema(os.path.join(REPO_ROOT, SCHEMA_REL))
            cls._validator = Draft202012Validator(schema)
        return cls._validator


class TestPhase5Adapter(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.doc = load_fixture()

    def test_01_fixture_schema_validation(self):
        self.assertEqual([], list(LoadedSchema.validator().iter_errors(self.doc)),
                         "fixture fails canonical JSON Schema")

    def test_02_fixture_semantic_validation(self):
        self.assertEqual([], validate_semantic(self.doc), "fixture fails semantic rules")

    def test_03_golden_count_reconciliation(self):
        with open(os.path.join(REPO_ROOT, PARITY), newline="", encoding="utf-8") as f:
            parity = list(csv.DictReader(f))
        total = sum(GOLDEN_TOTALS.values())
        self.assertEqual(total, len(parity))
        # per-source counts
        p3 = [r for r in parity if r["golden_id"].startswith("GIN")]
        p4_model = [r for r in parity if r["golden_id"].startswith("G-GEO") or r["golden_id"].startswith("G-SM")]
        p4_design = [r for r in parity if r["golden_id"].startswith(("G-DES", "G-AD"))]
        p4_report = [r for r in parity if r["golden_id"].startswith("G-RPT")]
        p4_drawing = [r for r in parity if r["golden_id"].startswith("G-DWG")]
        self.assertEqual(GOLDEN_TOTALS["phase3"], len(p3))
        self.assertEqual(GOLDEN_TOTALS["phase4_model"], len(p4_model))
        self.assertEqual(GOLDEN_TOTALS["phase4_design"], len(p4_design))
        self.assertEqual(GOLDEN_TOTALS["phase4_report"], len(p4_report))
        self.assertEqual(GOLDEN_TOTALS["phase4_drawing"], len(p4_drawing))
        # traceability links match
        self.assertEqual(total, len(self.doc["traceability"]["links"]))
        # every golden record maps to at least one entity field
        all_entities = _entities_lookup(self.doc)
        self.assertGreaterEqual(sum(len(e["fields"]) for e in all_entities), total)

    def test_04_no_unexplained_unmapped(self):
        with open(os.path.join(REPO_ROOT, PARITY), newline="", encoding="utf-8") as f:
            statuses = {}
            for r in csv.DictReader(f):
                statuses[r["mapping_status"]] = statuses.get(r["mapping_status"], 0) + 1
        self.assertEqual(0, statuses.get("ERROR_UNMAPPED", 0))
        for allowed in ("MAPPED", "MAPPED_WITH_HUMAN_TRACK", "MAPPED_CONFLICT",
                        "MAPPED_HOLD", "INTENTIONALLY_EXCLUDED"):
            statuses.pop(allowed, None)
        self.assertEqual({}, statuses, f"unexpected mapping statuses: {statuses}")

    def test_05_conflict_preserved(self):
        reg = self.doc["resolutionRegistry"]
        conflict = next(c for c in reg["conflicts"] if c["conflictId"] == "CONF-P2II-001")
        self.assertIsNone(conflict["selected"])
        self.assertEqual("UNRESOLVED", conflict["resolutionStatus"])
        vals = sorted(c["value"] for c in conflict["candidates"])
        self.assertEqual([680.0, 700.0], vals)
        # fixture design layer carries CONFLICT values on bottom flange width (6),
        # drawing layer carries the drawing-side conflict record (1)
        conflict_design = sum(1 for item in self.doc["design"]["items"]
                              for fld in item["fields"].values()
                              if isinstance(fld, dict) and fld.get("state") == "CONFLICT")
        conflict_drawing = sum(1 for item in self.doc["drawingSpecification"]["items"]
                               for fld in item["fields"].values()
                               if isinstance(fld, dict) and fld.get("state") == "CONFLICT")
        self.assertEqual(6, conflict_design)
        self.assertEqual(1, conflict_drawing)

    def test_06_hcr_preserved(self):
        reg = self.doc["resolutionRegistry"]
        hcr = next(h for h in reg["humanConfirmations"] if h["humanConfirmationId"] == "HCR-001")
        self.assertEqual("PENDING", hcr["state"])
        hcr_values = sum(1 for item in self.doc["drawingSpecification"]["items"]
                         for fld in item["fields"].values()
                         if isinstance(fld, dict) and fld.get("state") == "HUMAN_CONFIRMATION_REQUIRED")
        hcr_sheets = sum(1 for s in self.doc["drawingSpecification"]["sheets"]
                         for fld in s["fields"].values()
                         if isinstance(fld, dict) and fld.get("state") == "HUMAN_CONFIRMATION_REQUIRED")
        self.assertEqual(91, hcr_values + hcr_sheets)

    def test_07_hold_preserved(self):
        reg = self.doc["resolutionRegistry"]
        hold = next(h for h in reg["holds"] if h["holdId"] == "HOLD-PANEL-COORDS")
        self.assertEqual(50, len(hold["affectedEntityIds"]))
        panel = [e for e in self.doc["structuralModel"]["nodes"]
                 if e["id"] in ("NODE-1002", "NODE-1026", "NODE-2002", "NODE-2026")]
        self.assertEqual(4, len(panel))
        for e in panel:
            for fld in e["fields"].values():
                self.assertEqual("HOLD_INSUFFICIENT_SOURCE", fld["state"])
                self.assertTrue(fld.get("stateReason"))

    def test_08_analysis_empty_preserved(self):
        self.assertEqual("NOT_AVAILABLE", self.doc["analysisReference"]["status"])
        self.assertEqual([], self.doc["analysisReference"]["results"])

    def test_09_serialization_round_trip(self):
        rt = C.round_trip(self.doc)
        self.assertTrue(C.semantic_parity(self.doc, rt))
        self.assertEqual(sorted(entity_ids(self.doc)), sorted(entity_ids(rt)))

    def test_10_deterministic_canonical_serialization(self):
        self.assertEqual(C.serialize(self.doc), C.serialize(C.round_trip(self.doc)))
        # re-run yields identical text
        self.assertEqual(C.serialize(self.doc), C.serialize(self.doc))

    def test_11_semantic_fingerprint_stability(self):
        with open(os.path.join(REPO_ROOT, FINGERPRINT), encoding="utf-8") as f:
            checked = f.read().strip()
        self.assertEqual(checked, C.semantic_fingerprint(self.doc))
        self.assertEqual(checked, C.semantic_fingerprint(C.round_trip(self.doc)))


def _entities_lookup(doc):
    out = []
    for layer in ("alignments", "bridgeGeometry", "structuralModel", "materials",
                  "sections", "loads", "design", "reportSpecification",
                  "drawingSpecification"):
        for k, v in doc[layer].items():
            if isinstance(v, list):
                out.extend(v)
    return out


if __name__ == "__main__":
    unittest.main()
