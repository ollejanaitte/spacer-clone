"""Targeted unittest coverage for EA-05 evidence acquisition dry run."""

from __future__ import annotations

import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

_EVIDENCE_DIR = Path(__file__).resolve().parent.parent
if str(_EVIDENCE_DIR) not in sys.path:
    sys.path.insert(0, str(_EVIDENCE_DIR))

from evidence_core import sha256_file  # noqa: E402
from run_evidence_dry_run import (  # noqa: E402
    ARTIFACT_MANIFEST_COLUMNS,
    DOCS_DIR,
    DRY_RUN_VERSION,
    EXECUTION_REGISTER_COLUMNS,
    FAILURES_COLUMNS,
    VERDICT_TOKENS,
    canonical_json_text,
    collect_artifact_manifest,
    execute_dry_run,
    write_csv,
)
from verify_dry_run_artifacts import verify_dry_run_artifacts  # noqa: E402

_RUNNER_CLI = _EVIDENCE_DIR / "run_evidence_dry_run.py"
_VERIFIER_CLI = _EVIDENCE_DIR / "verify_dry_run_artifacts.py"


def _refresh_artifact_manifest(output_root: Path) -> str:
    artifacts_dir = output_root / "artifacts"
    rows = collect_artifact_manifest(artifacts_dir, [])
    manifest_path = output_root / "dry_run_artifact_manifest.csv"
    write_csv(manifest_path, ARTIFACT_MANIFEST_COLUMNS, rows)
    return sha256_file(manifest_path)


class DryRunExecutionTest(unittest.TestCase):
    def test_runner_executes_twenty_cases(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_test_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            summary = execute_dry_run(output_root)
            self.assertEqual(summary["case_count"], 20)
            self.assertEqual(summary["case_acceptance_pass"], 20)
            self.assertEqual(summary["dry_run_version"], DRY_RUN_VERSION)
            failures_path = output_root / "dry_run_failures.csv"
            with failures_path.open(encoding="utf-8", newline="") as handle:
                failures = list(csv.DictReader(handle))
            self.assertEqual(failures, [])

    def test_rerun_produces_identical_summary_and_manifest(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_det_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            first = execute_dry_run(output_root)
            manifest_path = output_root / "dry_run_artifact_manifest.csv"
            register_path = output_root / "dry_run_execution_register.csv"
            summary_path = output_root / "artifacts" / "dry_run_summary.json"
            first_manifest_sha = sha256_file(manifest_path)
            first_register_sha = sha256_file(register_path)
            first_summary_sha = sha256_file(summary_path)

            second = execute_dry_run(output_root)
            self.assertEqual(first["artifact_manifest_sha256"], second["artifact_manifest_sha256"])
            self.assertEqual(first["execution_register_sha256"], second["execution_register_sha256"])
            self.assertEqual(first_manifest_sha, sha256_file(manifest_path))
            self.assertEqual(first_register_sha, sha256_file(register_path))
            self.assertEqual(first_summary_sha, sha256_file(summary_path))

    def test_committed_summary_does_not_self_reference_manifest(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_sum_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            execute_dry_run(output_root)
            summary_path = output_root / "artifacts" / "dry_run_summary.json"
            payload = json.loads(summary_path.read_text(encoding="utf-8"))
            self.assertNotIn("artifact_manifest_sha256", payload)

    def test_artifact_tree_matches_manifest_exactly(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_tree_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            execute_dry_run(output_root)
            artifacts_dir = output_root / "artifacts"
            disk_files = {
                path.relative_to(artifacts_dir).as_posix()
                for path in artifacts_dir.rglob("*")
                if path.is_file()
            }
            manifest_path = output_root / "dry_run_artifact_manifest.csv"
            with manifest_path.open(encoding="utf-8", newline="") as handle:
                manifest_files = {row["relative_path"] for row in csv.DictReader(handle)}
            self.assertEqual(disk_files, manifest_files)
            self.assertIn("dry_run_summary.json", disk_files)

    def test_manifest_mutation_detected(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_mut_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            summary = execute_dry_run(output_root)
            manifest_path = output_root / "dry_run_artifact_manifest.csv"
            original = manifest_path.read_text(encoding="utf-8")
            manifest_path.write_text(original + "# mutated\n", encoding="utf-8")
            self.assertNotEqual(sha256_file(manifest_path), summary["artifact_manifest_sha256"])

    def test_case_record_mutation_detected_against_manifest(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_case_mut_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            execute_dry_run(output_root)
            case_record = output_root / "artifacts" / "cases" / "DR-01" / "case_record.json"
            manifest_path = output_root / "dry_run_artifact_manifest.csv"
            with manifest_path.open(encoding="utf-8", newline="") as handle:
                rows = {row["relative_path"]: row for row in csv.DictReader(handle)}
            relative = "cases/DR-01/case_record.json"
            recorded_sha = rows[relative]["sha256"]

            payload = json.loads(case_record.read_text(encoding="utf-8"))
            payload["validation_valid"] = False
            case_record.write_text(canonical_json_text(payload), encoding="utf-8")
            self.assertNotEqual(sha256_file(case_record), recorded_sha)

    def test_verdict_tokens_present_and_blocked(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_verdict_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            summary = execute_dry_run(output_root)
            verdicts = summary["verdicts"]
            for token in VERDICT_TOKENS:
                self.assertIn(token, verdicts)
            self.assertEqual(
                verdicts["EXTERNAL_MACHINE_EVIDENCE_VERDICT"],
                "BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT",
            )
            self.assertEqual(
                verdicts["ACTUAL_SPACER_PARITY_VERDICT"],
                "BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT",
            )
            self.assertEqual(verdicts["HARNESS_OPERATIONAL_VERDICT"], "OPERATIONAL")
            self.assertEqual(verdicts["ANALYTICAL_GOLDEN_PIPELINE_VERDICT"], "OPERATIONAL")
            self.assertEqual(verdicts["PARITY_COMPARISON_PIPELINE_VERDICT"], "OPERATIONAL")

    def test_execution_register_csv_parseable(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_csv_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            execute_dry_run(output_root)
            register_path = output_root / "dry_run_execution_register.csv"
            with register_path.open(encoding="utf-8", newline="") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(list(rows[0].keys()), list(EXECUTION_REGISTER_COLUMNS))
            self.assertEqual(len(rows), 20)
            self.assertTrue(all(row["case_acceptance"] == "PASS" for row in rows))

    def test_artifact_manifest_csv_parseable(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_art_csv_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            execute_dry_run(output_root)
            manifest_path = output_root / "dry_run_artifact_manifest.csv"
            with manifest_path.open(encoding="utf-8", newline="") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(list(rows[0].keys()), list(ARTIFACT_MANIFEST_COLUMNS))
            self.assertGreaterEqual(len(rows), 21)
            for row in rows:
                self.assertEqual(len(row["sha256"]), 64)

    def test_failures_csv_header(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_fail_csv_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            execute_dry_run(output_root)
            failures_path = output_root / "dry_run_failures.csv"
            with failures_path.open(encoding="utf-8", newline="") as handle:
                reader = csv.DictReader(handle)
                self.assertEqual(list(reader.fieldnames), list(FAILURES_COLUMNS))

    def test_dry_run_summary_json_parseable(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_json_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            execute_dry_run(output_root)
            summary_path = output_root / "artifacts" / "dry_run_summary.json"
            payload = json.loads(summary_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["case_count"], 20)
            self.assertIn("verdicts", payload)
            self.assertNotIn("artifact_manifest_sha256", payload)

    def test_cli_entrypoint(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_cli_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            completed = subprocess.run(
                [sys.executable, str(_RUNNER_CLI), "--output-root", str(output_root)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(completed.returncode, 0, msg=completed.stderr)
            summary = json.loads(completed.stdout)
            self.assertEqual(summary["case_acceptance_pass"], 20)


class DryRunVerifierTest(unittest.TestCase):
    def test_verifier_cli_success(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_verify_ok_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            summary = execute_dry_run(output_root)
            completed = subprocess.run(
                [
                    sys.executable,
                    str(_VERIFIER_CLI),
                    "--dry-run-root",
                    str(output_root),
                    "--expected-manifest-sha256",
                    summary["artifact_manifest_sha256"],
                ],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(completed.returncode, 0, msg=completed.stderr + completed.stdout)
            report = json.loads(completed.stdout)
            self.assertTrue(report["valid"])

    def test_verifier_fails_on_mutated_artifact(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_verify_art_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            summary = execute_dry_run(output_root)
            case_record = output_root / "artifacts" / "cases" / "DR-01" / "case_record.json"
            case_record.write_text(case_record.read_text(encoding="utf-8") + "\n", encoding="utf-8")
            report = verify_dry_run_artifacts(
                output_root,
                expected_manifest_sha256=summary["artifact_manifest_sha256"],
            )
            self.assertFalse(report["valid"])
            self.assertTrue(any("sha256 mismatch" in error for error in report["errors"]))

    def test_verifier_fails_on_mutated_manifest(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_verify_man_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            summary = execute_dry_run(output_root)
            manifest_path = output_root / "dry_run_artifact_manifest.csv"
            manifest_path.write_text(manifest_path.read_text(encoding="utf-8") + "# mutated\n", encoding="utf-8")
            report = verify_dry_run_artifacts(
                output_root,
                expected_manifest_sha256=summary["artifact_manifest_sha256"],
            )
            self.assertFalse(report["valid"])
            self.assertTrue(any("manifest file sha256 mismatch" in error for error in report["errors"]))

    def test_verifier_fails_on_orphan_artifact(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_verify_orphan_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            summary = execute_dry_run(output_root)
            orphan = output_root / "artifacts" / "orphan.txt"
            orphan.write_text("orphan\n", encoding="utf-8")
            report = verify_dry_run_artifacts(
                output_root,
                expected_manifest_sha256=summary["artifact_manifest_sha256"],
            )
            self.assertFalse(report["valid"])
            self.assertTrue(any("orphan artifact" in error for error in report["errors"]))

    def test_verifier_fails_on_missing_artifact(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_verify_missing_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            summary = execute_dry_run(output_root)
            missing = output_root / "artifacts" / "cases" / "DR-01" / "case_record.json"
            missing.unlink()
            report = verify_dry_run_artifacts(
                output_root,
                expected_manifest_sha256=summary["artifact_manifest_sha256"],
            )
            self.assertFalse(report["valid"])
            self.assertTrue(
                any(
                    "missing artifact" in error or "missing case record" in error
                    for error in report["errors"]
                )
            )

    def test_verifier_fails_when_summary_register_binding_mutated_despite_manifest_refresh(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_verify_sum_bind_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            execute_dry_run(output_root)
            summary_path = output_root / "artifacts" / "dry_run_summary.json"
            summary = json.loads(summary_path.read_text(encoding="utf-8"))
            summary["execution_register_sha256"] = "0" * 64
            summary_path.write_text(canonical_json_text(summary), encoding="utf-8")
            refreshed_manifest_sha = _refresh_artifact_manifest(output_root)
            report = verify_dry_run_artifacts(
                output_root,
                expected_manifest_sha256=refreshed_manifest_sha,
            )
            self.assertFalse(report["valid"])
            self.assertTrue(
                any("execution_register_sha256 mismatch" in error for error in report["errors"])
            )

    def test_verifier_fails_when_register_tampered_without_summary_refresh(self) -> None:
        with tempfile.TemporaryDirectory(prefix="ea05_verify_reg_bind_") as temp_dir:
            output_root = Path(temp_dir) / "05_dry_run"
            summary = execute_dry_run(output_root)
            register_path = output_root / "dry_run_execution_register.csv"
            with register_path.open(encoding="utf-8", newline="") as handle:
                rows = list(csv.DictReader(handle))
            rows[0]["command"] = rows[0]["command"] + " # tampered"
            write_csv(register_path, EXECUTION_REGISTER_COLUMNS, rows)
            report = verify_dry_run_artifacts(
                output_root,
                expected_manifest_sha256=summary["artifact_manifest_sha256"],
            )
            self.assertFalse(report["valid"])
            self.assertTrue(
                any("execution_register_sha256 mismatch" in error for error in report["errors"])
            )


class CommittedDryRunArtifactsTest(unittest.TestCase):
    def test_committed_docs_exist(self) -> None:
        required = [
            DOCS_DIR / "dry_run_plan.md",
            DOCS_DIR / "dry_run_usage.md",
            DOCS_DIR / "dry_run_execution_register.csv",
            DOCS_DIR / "dry_run_results.md",
            DOCS_DIR / "dry_run_artifact_manifest.csv",
            DOCS_DIR / "dry_run_failures.csv",
            DOCS_DIR / "dry_run_verdicts.md",
            DOCS_DIR / "artifacts" / "dry_run_summary.json",
        ]
        for path in required:
            with self.subTest(path=str(path)):
                self.assertTrue(path.is_file(), f"missing committed artifact: {path}")

    def test_committed_summary_does_not_self_reference_manifest(self) -> None:
        summary_path = DOCS_DIR / "artifacts" / "dry_run_summary.json"
        summary = json.loads(summary_path.read_text(encoding="utf-8"))
        self.assertNotIn("artifact_manifest_sha256", summary)
        self.assertEqual(
            summary["execution_register_sha256"],
            sha256_file(DOCS_DIR / "dry_run_execution_register.csv"),
        )

    def test_committed_artifact_tree_matches_manifest(self) -> None:
        artifacts_dir = DOCS_DIR / "artifacts"
        disk_files = {
            path.relative_to(artifacts_dir).as_posix()
            for path in artifacts_dir.rglob("*")
            if path.is_file()
        }
        manifest_path = DOCS_DIR / "dry_run_artifact_manifest.csv"
        with manifest_path.open(encoding="utf-8", newline="") as handle:
            manifest_files = {row["relative_path"] for row in csv.DictReader(handle)}
        self.assertEqual(disk_files, manifest_files)


if __name__ == "__main__":
    unittest.main()
