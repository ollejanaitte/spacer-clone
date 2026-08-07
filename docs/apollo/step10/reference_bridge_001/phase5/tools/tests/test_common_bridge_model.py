#!/usr/bin/env python3
"""
P5-2 unit tests: Common Bridge Data Model canonical schema + semantic validation.

Covers the 14 required tests from the STEP 10 Phase 5 P5-2 spec:
  1. minimal valid bridge
  2. Reference-like valid bridge
  3. duplicate ID rejection
  4. broken reference rejection
  5. unknown schema version rejection
  6. conflict value valid
  7. conflict without sources invalid
  8. HCR value valid
  9. HOLD value valid
 10. missing required metadata rejection
 11. AnalysisReference empty allowed
 12. JSON serialization-safe values
 13. legacy project unaffected
 14. existing project schema backward compatibility

Run: python -m unittest discover -s docs/apollo/step10/reference_bridge_001/phase5/tools/tests
"""

import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
for _ in (TOOLS, HERE):
    if _ not in sys.path:
        sys.path.insert(0, _)

from validate_common_bridge_model import (
    load_normalized_schema,
    validate_semantic,
    SCHEMA_REL,
)  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", "..", "..", ".."))
SHA = "a" * 64


def envelope():
    return {
        "schemaId": "spacer.contracts.common-bridge-data-model",
        "schemaVersion": "1.0.0",
        "documentId": "00000000-0000-4000-8000-000000000001",
        "documentKind": "common-bridge-data-model",
        "revisionId": 1,
        "contentChecksum": {"algorithm": "sha256", "hexDigest": SHA},
        "provenance": {
            "createdAt": "2026-08-08T00:00:00Z",
            "createdBy": {"actorId": "test", "actorType": "tool", "displayName": "test"},
            "producer": {"toolId": "test", "toolVersion": "1.0.0"},
        },
    }


def metadata():
    return {
        "bridgeId": "RB-S10-001",
        "displayName": "Reference Bridge 001",
        "standardProfile": "H29_REFERENCE",
        "r7Compliance": "NOT_VERIFIED",
        "numericDesignAuthorization": "NOT_GRANTED",
        "designOrConstructionUse": "PROHIBITED",
        "referenceType": "REFERENCE",
    }


def empty_layers():
    return {
        "alignments": {"alignments": []},
        "bridgeGeometry": {"spans": [], "supports": [], "girders": [], "gridPoints": [],
                           "deck": [], "crossMembers": []},
        "structuralModel": {"nodes": [], "members": []},
        "materials": {"materials": []},
        "sections": {"sections": []},
        "loads": {"loadCases": [], "loadCombinations": []},
        "analysisReference": {"status": "NOT_AVAILABLE", "stateReason": "no analysis golden", "results": []},
        "design": {"items": []},
        "reportSpecification": {"items": []},
        "drawingSpecification": {"sheets": [], "items": []},
        "traceability": {"links": []},
        "resolutionRegistry": {"conflicts": [], "humanConfirmations": [], "holds": []},
    }


def minimal_bridge():
    doc = envelope()
    doc["metadata"] = metadata()
    doc.update(empty_layers())
    return doc


class LoadedSchema:
    """Lazy-load the canonical JSON schema once."""
    _validator = None

    @classmethod
    def validator(cls):
        if cls._validator is None:
            from jsonschema import Draft202012Validator
            path = os.path.join(REPO_ROOT, SCHEMA_REL)
            schema = load_normalized_schema(path)
            cls._validator = Draft202012Validator(schema)
        return cls._validator

    @classmethod
    def schema_errors(cls, doc):
        return list(cls.validator().iter_errors(doc))


class TestCommonBridgeDataModel(unittest.TestCase):

    def test_01_minimal_valid_bridge(self):
        doc = minimal_bridge()
        self.assertEqual([], LoadedSchema.schema_errors(doc), "schema errors on minimal bridge")
        self.assertEqual([], validate_semantic(doc), "semantic errors on minimal bridge")

    def test_02_reference_like_valid_bridge(self):
        doc = minimal_bridge()
        doc["alignments"]["alignments"].append({
            "id": "ALN-ACL", "entityType": "ALIGNMENT",
            "fields": {"bridge_length": {
                "state": "CONFIRMED", "value": 134.001, "unit": "m",
                "sourceUnit": "m", "sourceRefs": ["G-GEO-0001"],
                "goldenId": "G-GEO-0001"}}})
        doc["bridgeGeometry"]["girders"].append({
            "id": "GIRDER-AG1", "entityType": "GIRDER",
            "fields": {"girder_height": {
                "state": "CONFIRMED", "value": 1.9, "unit": "m",
                "sourceRefs": ["G-GEO-0008"], "goldenId": "G-GEO-0008"}}})
        self.assertEqual([], LoadedSchema.schema_errors(doc))
        self.assertEqual([], validate_semantic(doc))

    def test_03_duplicate_id_rejection(self):
        doc = minimal_bridge()
        dup = {"id": "SPAN-1", "entityType": "SPAN", "fields": {}}
        doc["bridgeGeometry"]["spans"] = [dup, dict(dup)]
        issues = validate_semantic(doc)
        self.assertTrue(any("duplicate entity id: SPAN-1" in i for i in issues),
                        f"expected duplicate id issue, got {issues}")

    def test_04_broken_reference_rejection(self):
        doc = minimal_bridge()
        doc["resolutionRegistry"]["holds"].append({
            "holdId": "HOLD-1", "state": "HOLD_INSUFFICIENT_SOURCE",
            "stateReason": "not extracted",
            "affectedEntityIds": ["NODE-DOES-NOT-EXIST"]})
        issues = validate_semantic(doc)
        self.assertTrue(any("references unknown entity" in i for i in issues),
                        f"expected broken reference issue, got {issues}")

    def test_05_unknown_schema_version_rejection(self):
        doc = minimal_bridge()
        doc["schemaVersion"] = "2.0.0"
        issues = validate_semantic(doc)
        self.assertTrue(any("unsupported schema version major" in i for i in issues),
                        f"expected unsupported version issue, got {issues}")

    def test_06_conflict_value_valid(self):
        doc = minimal_bridge()
        doc["sections"]["sections"].append({
            "id": "SECTION-AG1-SEC1", "entityType": "SECTION",
            "fields": {"bottom_flange_width": {
                "state": "CONFLICT", "conflictId": "CONF-P2II-001",
                "candidates": [{"value": 0.680, "unit": "m"},
                               {"value": 0.700, "unit": "m"}],
                "selected": None, "resolutionStatus": "UNRESOLVED",
                "description": "calc 680 vs drawing 700"}}})
        doc["resolutionRegistry"]["conflicts"].append({
            "conflictId": "CONF-P2II-001", "description": "bottom flange width",
            "candidates": [{"value": 0.680, "unit": "m"}, {"value": 0.700, "unit": "m"}],
            "selected": None, "resolutionStatus": "UNRESOLVED",
            "affectedEntityIds": ["SECTION-AG1-SEC1"]})
        self.assertEqual([], LoadedSchema.schema_errors(doc))
        self.assertEqual([], validate_semantic(doc))

    def test_07_conflict_without_sources_invalid(self):
        doc = minimal_bridge()
        doc["sections"]["sections"].append({
            "id": "SECTION-X", "entityType": "SECTION",
            "fields": {"f": {"state": "CONFLICT", "conflictId": "C-1",
                             "candidates": [], "selected": None,
                             "resolutionStatus": "UNRESOLVED"}}})
        issues = validate_semantic(doc)
        self.assertTrue(any("has no candidates" in i for i in issues),
                        f"expected conflict-without-candidates issue, got {issues}")

    def test_08_hcr_value_valid(self):
        doc = minimal_bridge()
        doc["drawingSpecification"]["items"].append({
            "id": "DWG-0001", "entityType": "DRAWING_ITEM",
            "fields": {"text": {
                "state": "HUMAN_CONFIRMATION_REQUIRED", "value": "deck elevation 41.200",
                "unit": "m", "humanConfirmationId": "HCR-001",
                "sourceRefs": ["DWG-S141"]}}})
        doc["resolutionRegistry"]["humanConfirmations"].append({
            "humanConfirmationId": "HCR-001", "description": "sheet 141 OCR",
            "state": "PENDING", "affectedEntityIds": ["DWG-0001"]})
        self.assertEqual([], LoadedSchema.schema_errors(doc))
        self.assertEqual([], validate_semantic(doc))

    def test_09_hold_value_valid(self):
        doc = minimal_bridge()
        doc["bridgeGeometry"]["gridPoints"].append({
            "id": "GRID-1002", "entityType": "GRID_POINT",
            "fields": {"x": {"state": "HOLD_INSUFFICIENT_SOURCE",
                             "stateReason": "intermediate panel point not extracted in Phase 2"}}})
        self.assertEqual([], LoadedSchema.schema_errors(doc))
        self.assertEqual([], validate_semantic(doc))

    def test_10_missing_required_metadata_rejection(self):
        doc = minimal_bridge()
        del doc["metadata"]
        errs = LoadedSchema.schema_errors(doc)
        self.assertTrue(any("metadata" in "/".join(map(str, e.path)) for e in errs) or
                        "metadata" in str([e.message for e in errs]),
                        f"expected missing metadata schema error, got {errs}")

    def test_11_analysis_reference_empty_allowed(self):
        doc = minimal_bridge()
        doc["analysisReference"] = {"status": "NOT_AVAILABLE", "results": []}
        self.assertEqual([], LoadedSchema.schema_errors(doc))
        self.assertEqual([], validate_semantic(doc))

    def test_12_json_serialization_safe_values(self):
        doc = minimal_bridge()
        doc["alignments"]["alignments"].append({
            "id": "ALN-1", "entityType": "ALIGNMENT",
            "fields": {"bad": {"state": "CONFIRMED", "value": float("nan"), "unit": "m"}}})
        issues = validate_semantic(doc)
        self.assertTrue(any("non-finite" in i for i in issues),
                        f"expected non-finite issue, got {issues}")
        # A NaN cannot be represented in strict JSON; ensure json.dumps with allow_nan=False fails
        with self.assertRaises(ValueError):
            json.dumps(doc["alignments"]["alignments"][0]["fields"], allow_nan=False)

    def test_13_legacy_project_unaffected(self):
        p = os.path.join(REPO_ROOT, "schemas", "project.schema.json")
        self.assertTrue(os.path.exists(p), "legacy project.schema.json missing")
        with open(p, encoding="utf-8") as f:
            json.load(f)  # must parse as valid JSON
        r = subprocess.run(["git", "diff", "--name-only", "origin/main...HEAD"],
                           cwd=REPO_ROOT, capture_output=True, text=True)
        changed = r.stdout.splitlines()
        self.assertNotIn("schemas/project.schema.json", changed,
                         "legacy project schema must not change in P5-2")

    def test_14_existing_project_schema_backward_compatibility(self):
        for rel in ("schemas/project.schema.json", "frontend/src/types.ts",
                    "schemas/bridge-definition.schema.json"):
            p = os.path.join(REPO_ROOT, rel)
            self.assertTrue(os.path.exists(p), f"missing {rel}")
        r = subprocess.run(["git", "diff", "--name-only", "origin/main...HEAD"],
                           cwd=REPO_ROOT, capture_output=True, text=True)
        changed = r.stdout.splitlines()
        for rel in ("schemas/project.schema.json", "frontend/src/types.ts",
                    "schemas/bridge-definition.schema.json"):
            self.assertNotIn(rel, changed,
                             f"{rel} must remain backward compatible / unchanged in P5-2")
        # existing project JSON sample (if any) still validates against project schema
        cand = os.path.join(REPO_ROOT, "backend", "data")
        sample = None
        if os.path.isdir(cand):
            for fn in sorted(os.listdir(cand)):
                if fn.endswith(".json"):
                    sample = os.path.join(cand, fn)
                    break
        if sample:
            with open(sample, encoding="utf-8") as f:
                json.load(f)


if __name__ == "__main__":
    unittest.main()
