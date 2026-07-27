"""Tests for §12 / unresolved_evidence_register mechanical consistency."""

from __future__ import annotations

import csv
import subprocess
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
VALIDATOR = REPO_ROOT / "scripts" / "apollo" / "evidence" / "validate_report_section12_register.py"
BUILDER = REPO_ROOT / "scripts" / "apollo" / "evidence" / "build_unresolved_evidence_register.py"
REGISTER_PATH = REPO_ROOT / "docs" / "apollo" / "evidence-collection" / "unresolved_evidence_register.csv"
SNAPSHOT_PATH = (
    REPO_ROOT / "docs" / "apollo" / "evidence-collection" / "00_inventory" / "current_blocker_snapshot.csv"
)

SNAPSHOT_BASELINE_MAP = {
    "blocker_id": "blocker_id",
    "source_document": "source_document",
    "affected_area": "affected_area",
    "current_status": "current_status",
    "exact_missing_evidence": "exact_missing_evidence",
    "external_dependency": "external_dependency",
    "required_tool": "required_tool",
    "required_license": "required_license",
    "exact_input": "required_input",
    "exact_output": "expected_output",
    "acceptance_criteria": "acceptance_criteria",
    "planned_stage": "planned_stage",
    "notes": "notes",
}


class ReportSection12RegisterTests(unittest.TestCase):
    def test_section12_matches_register_without_truncation(self) -> None:
        result = subprocess.run(
            ["python3", str(VALIDATOR)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(
            result.returncode,
            0,
            msg=result.stdout + result.stderr,
        )
        self.assertIn("SECTION12_REGISTER_VALIDATION: PASS", result.stdout)
        self.assertIn("baseline_mismatch_count=0", result.stdout)

    def test_register_baseline_fields_match_snapshot_byte_exact(self) -> None:
        with SNAPSHOT_PATH.open(newline="", encoding="utf-8") as handle:
            snapshots = {row["blocker_id"]: row for row in csv.DictReader(handle)}
        with REGISTER_PATH.open(newline="", encoding="utf-8") as handle:
            register_rows = list(csv.DictReader(handle))

        self.assertEqual(len(snapshots), 76)
        self.assertEqual(len(register_rows), 76)

        mismatches: list[str] = []
        for register_row in register_rows:
            blocker_id = register_row["blocker_id"]
            snapshot = snapshots[blocker_id]
            for register_field, snapshot_field in SNAPSHOT_BASELINE_MAP.items():
                if register_row[register_field] != snapshot[snapshot_field]:
                    mismatches.append(f"{blocker_id}/{register_field}")

        self.assertEqual(mismatches, [], msg="\n".join(mismatches[:20]))

    def test_register_builder_produces_76_rows(self) -> None:
        result = subprocess.run(
            ["python3", str(BUILDER)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
        self.assertIn("76 rows", result.stdout)


if __name__ == "__main__":
    unittest.main()
