"""Tests for evidence_traceability_matrix.csv mechanical integrity."""

from __future__ import annotations

import csv
import subprocess
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
VALIDATOR = REPO_ROOT / "scripts" / "apollo" / "evidence" / "validate_evidence_traceability_matrix.py"
BUILDER = REPO_ROOT / "scripts" / "apollo" / "evidence" / "build_evidence_traceability_matrix.py"
DS_CSV_VALIDATOR = REPO_ROOT / "scripts" / "apollo" / "evidence" / "validate_design_standards_csv.py"
EC_CSV_VALIDATOR = REPO_ROOT / "scripts" / "apollo" / "evidence" / "validate_evidence_collection_csv.py"
MATRIX_PATH = REPO_ROOT / "docs" / "apollo" / "evidence-collection" / "evidence_traceability_matrix.csv"
SNAPSHOT_PATH = (
    REPO_ROOT / "docs" / "apollo" / "evidence-collection" / "00_inventory" / "current_blocker_snapshot.csv"
)

MATRIX_COLUMNS = (
    "trace_id",
    "ea_stage",
    "deliverable_path",
    "checkpoint_sha",
    "linked_blocker_ids",
    "linked_control_ids",
    "enablement_verdict",
    "closure_verdict",
    "canonical_register_path",
    "status_note",
)


class EvidenceTraceabilityMatrixTests(unittest.TestCase):
    def test_validator_passes(self) -> None:
        result = subprocess.run(
            ["python3", str(VALIDATOR)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
        self.assertIn("TRACEABILITY_MATRIX_VALIDATION: PASS", result.stdout)

    def test_builder_produces_valid_matrix(self) -> None:
        result = subprocess.run(
            ["python3", str(BUILDER)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
        verify = subprocess.run(
            ["python3", str(VALIDATOR)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(verify.returncode, 0, msg=verify.stdout + verify.stderr)

    def test_all_snapshot_blockers_covered(self) -> None:
        with SNAPSHOT_PATH.open(encoding="utf-8", newline="") as handle:
            snapshot_ids = {row["blocker_id"] for row in csv.DictReader(handle)}
        covered: set[str] = set()
        with MATRIX_PATH.open(encoding="utf-8", newline="") as handle:
            for row in csv.DictReader(handle):
                for blocker_id in row["linked_blocker_ids"].split(";"):
                    if blocker_id:
                        covered.add(blocker_id)
        self.assertEqual(snapshot_ids, covered)

    def test_matrix_paths_exist(self) -> None:
        with MATRIX_PATH.open(encoding="utf-8", newline="") as handle:
            rows = list(csv.DictReader(handle))
        for row in rows:
            deliverable = REPO_ROOT / row["deliverable_path"]
            canonical = REPO_ROOT / row["canonical_register_path"]
            self.assertTrue(deliverable.is_file(), row["trace_id"])
            self.assertTrue(canonical.is_file(), row["trace_id"])

    def test_etm_020_ds_gate_path(self) -> None:
        with MATRIX_PATH.open(encoding="utf-8", newline="") as handle:
            rows = {row["trace_id"]: row for row in csv.DictReader(handle)}
        etm_020 = rows["ETM-020"]
        self.assertEqual(
            etm_020["deliverable_path"],
            "docs/apollo/design-standards/09_verification/numeric_release_gate.md",
        )
        path = REPO_ROOT / etm_020["deliverable_path"]
        self.assertTrue(path.is_file())

    def test_design_standards_csv_widths(self) -> None:
        result = subprocess.run(
            ["python3", str(DS_CSV_VALIDATOR)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
        self.assertIn("DESIGN_STANDARDS_CSV_VALIDATION: PASS", result.stdout)

    def test_evidence_collection_csv_widths(self) -> None:
        result = subprocess.run(
            ["python3", str(EC_CSV_VALIDATOR)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
        self.assertIn("EVIDENCE_COLLECTION_CSV_VALIDATION: PASS", result.stdout)


class ExternalRunBlockersCsvTests(unittest.TestCase):
    def test_external_run_blockers_exact_width_and_an_ids(self) -> None:
        path = (
            REPO_ROOT
            / "docs"
            / "apollo"
            / "evidence-collection"
            / "03_external_run_package"
            / "external_run_blockers.csv"
        )
        expected_header = [
            "blocker_id",
            "source_document",
            "affected_area",
            "current_status",
            "exact_missing_evidence",
            "executable_now",
            "external_dependency",
            "required_tool",
            "required_license",
            "required_input",
            "exact_procedure",
            "expected_output",
            "acceptance_criteria",
            "planned_stage",
            "notes",
        ]
        with path.open(encoding="utf-8", newline="") as handle:
            reader = csv.reader(handle)
            header = next(reader)
            self.assertEqual(header, expected_header)
            rows = list(reader)
        self.assertEqual(len(header), 15)
        for row in rows:
            self.assertEqual(len(row), 15, msg=row[0])

        blocker_ids = {row[0] for row in rows}
        for index in range(1, 11):
            self.assertIn(f"AN-BLK-{index:03d}", blocker_ids)
        for index in range(1, 4):
            self.assertIn(f"EXT-ID-{index:03d}", blocker_ids)

        an_blk_001 = next(row for row in rows if row[0] == "AN-BLK-001")
        self.assertIn("authorized machine", an_blk_001[10].lower())
        self.assertNotEqual(an_blk_001[10], an_blk_001[7])


if __name__ == "__main__":
    unittest.main()
