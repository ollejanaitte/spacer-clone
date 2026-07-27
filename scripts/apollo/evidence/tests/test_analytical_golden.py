"""Targeted unittest coverage for EA-02 analytical golden evidence."""

from __future__ import annotations

import csv
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from decimal import Decimal
from fractions import Fraction
from pathlib import Path

_EVIDENCE_DIR = Path(__file__).resolve().parent.parent
if str(_EVIDENCE_DIR) not in sys.path:
    sys.path.insert(0, str(_EVIDENCE_DIR))

from analytical_golden_core import (  # noqa: E402
    BLOCKERS_NAME,
    COMPARISON_RULE_DEFAULT,
    DOCS_DIR,
    EXPECTED_VALUES_NAME,
    ExclusiveWriteError,
    INDEPENDENT_REVIEW_EXPECTED_NAME,
    REQUIRED_CASE_IDS,
    TOLERANCE_FREEZE_NAME,
    AnalyticalGoldenValidationError,
    build_all_quantities,
    compare_actual_bundle,
    compute_raw_file_sha256,
    compute_selected_blocker_snapshot_sha256,
    compute_tolerance_freeze_sha256,
    evaluate_comparison,
    generate_package,
    load_expected_records,
    load_tolerance_freeze,
    read_csv_rows,
    tolerance_freeze_rows,
    validate_package,
)
from independent_analytical_review import (  # noqa: E402
    read_independent_review,
    regenerate_independent_index,
)

_GENERATE_CLI = _EVIDENCE_DIR / "generate_analytical_golden.py"
_VALIDATE_CLI = _EVIDENCE_DIR / "validate_analytical_golden.py"
_COMPARE_CLI = _EVIDENCE_DIR / "compare_apollo_to_analytical_golden.py"

FROZEN_TOLERANCE_SHA256 = "4dd51a92df802a94fec4629858019afc451b90605e68ce56185aa083abbd910a"
FROZEN_INDEPENDENT_REVIEW_SHA256 = "65cec6d7370ccdb35b13961632d9e0e20a5687a2e575af183679727d6a363cf4"
SELECTED_BLOCKER_SNAPSHOT_SHA256 = "c92f7897632d4f0935dd32cfcf87c4263efe85160a9e9b3c3d3e097551613325"
EXPECTED_QUANTITY_COUNT = 26


class IndependentReviewModuleTest(unittest.TestCase):
    def test_independent_module_has_no_core_import(self) -> None:
        source = (_EVIDENCE_DIR / "independent_analytical_review.py").read_text(encoding="utf-8")
        self.assertNotIn("from analytical_golden_core", source)
        self.assertNotIn("import analytical_golden_core", source)

    def test_generator_and_independent_records_agree(self) -> None:
        generator = {record.quantity_key: record for record in build_all_quantities()}
        independent = regenerate_independent_index()
        self.assertEqual(set(generator), set(independent))
        for key, gen_record in generator.items():
            ind_record = independent[key]
            self.assertEqual(gen_record.expected_fraction, ind_record.expected_fraction)
            self.assertEqual(gen_record.unit, ind_record.unit)
            self.assertEqual(gen_record.sign_convention, ind_record.sign_convention)

    def test_asymmetric_moment_uses_direct_formula(self) -> None:
        independent = regenerate_independent_index()
        record = independent["AG-ASYM-RC|M_AT_LOAD"]
        self.assertEqual(record.formula_expression, "P*a*(L-a)/L")

    def test_committed_independent_review_sha256(self) -> None:
        _, sha256 = read_independent_review(DOCS_DIR / INDEPENDENT_REVIEW_EXPECTED_NAME)
        self.assertEqual(sha256, FROZEN_INDEPENDENT_REVIEW_SHA256)
        on_disk = compute_raw_file_sha256(DOCS_DIR / INDEPENDENT_REVIEW_EXPECTED_NAME)
        self.assertEqual(on_disk, FROZEN_INDEPENDENT_REVIEW_SHA256)


class GlobalEquilibriumSignTest(unittest.TestCase):
    def test_axial_fixed_end_reaction_opposes_applied_force(self) -> None:
        records = {record.quantity_key: record for record in build_all_quantities()}
        self.assertEqual(records["AG-AXIAL|N1_FX"].expected_fraction, Fraction(-50, 1))
        self.assertEqual(records["AG-AXIAL|N1_FX"].derivation_formula, "-F")

    def test_torsion_fixed_end_reaction_opposes_applied_torque(self) -> None:
        records = {record.quantity_key: record for record in build_all_quantities()}
        self.assertEqual(records["AG-TORSION|N1_MX"].expected_fraction, Fraction(-5, 1))
        self.assertEqual(records["AG-TORSION|N1_MX"].derivation_formula, "-T")


class SectionMomentMappingTest(unittest.TestCase):
    def test_ss_center_load_section_moments_at_supports_and_midspan(self) -> None:
        records = {record.quantity_key: record for record in build_all_quantities()}
        self.assertEqual(records["AG-SS-CL|M1_MZ_I"].entity_type, "member_section_result")
        self.assertEqual(records["AG-SS-CL|M1_MZ_I"].expected_fraction, Fraction(0))
        self.assertEqual(records["AG-SS-CL|M1_MZ_J"].expected_fraction, Fraction(10))
        self.assertEqual(records["AG-SS-CL|M2_MZ_J"].expected_fraction, Fraction(0))
        self.assertIn("sagging positive", records["AG-SS-CL|M1_MZ_J"].sign_convention)

    def test_ss_udl_section_moments(self) -> None:
        records = {record.quantity_key: record for record in build_all_quantities()}
        self.assertEqual(records["AG-SS-UDL|M1_MZ_J"].expected_fraction, Fraction(4))
        self.assertEqual(records["AG-SS-UDL|M2_MZ_I"].expected_fraction, Fraction(4))


class PackageArtifactTest(unittest.TestCase):
    def test_committed_package_validates(self) -> None:
        report = validate_package(DOCS_DIR, expected_tolerance_sha256=FROZEN_TOLERANCE_SHA256)
        self.assertTrue(report["valid"])
        self.assertEqual(report["quantity_count"], EXPECTED_QUANTITY_COUNT)
        self.assertEqual(report["tolerance_freeze_sha256"], FROZEN_TOLERANCE_SHA256)
        self.assertEqual(report["tolerance_freeze_on_disk_sha256"], FROZEN_TOLERANCE_SHA256)
        self.assertEqual(report["independent_review_sha256"], FROZEN_INDEPENDENT_REVIEW_SHA256)
        self.assertEqual(report["selected_blocker_snapshot_sha256"], SELECTED_BLOCKER_SNAPSHOT_SHA256)
        self.assertEqual(report["package_approval_status"], "TOOLING_REVIEWED_NOT_GOLD_APPROVED")
        self.assertEqual(report["canonical_gold_approval_status"], "NOT_APPROVED")

    def test_case_catalog_contains_required_cases(self) -> None:
        rows = read_csv_rows(DOCS_DIR / "analytical_case_catalog.csv")
        self.assertEqual(sorted(row["case_id"] for row in rows), sorted(REQUIRED_CASE_IDS))

    def test_generation_refuses_existing_artifacts(self) -> None:
        with tempfile.TemporaryDirectory(prefix="apollo_analytical_golden_") as temp_dir:
            docs_dir = Path(temp_dir)
            generate_package(docs_dir)
            with self.assertRaises(ExclusiveWriteError):
                generate_package(docs_dir)

    def test_generation_in_empty_dir_is_deterministic(self) -> None:
        with tempfile.TemporaryDirectory(prefix="apollo_analytical_golden_a_") as temp_a:
            with tempfile.TemporaryDirectory(prefix="apollo_analytical_golden_b_") as temp_b:
                first = generate_package(Path(temp_a))
                second = generate_package(Path(temp_b))
                self.assertEqual(first["tolerance_freeze_sha256"], second["tolerance_freeze_sha256"])
                self.assertEqual(first["independent_review_sha256"], second["independent_review_sha256"])
                self.assertEqual(first["quantity_count"], EXPECTED_QUANTITY_COUNT)


class ToleranceFreezeTest(unittest.TestCase):
    def test_tolerance_sha256_matches_committed_register(self) -> None:
        _, sha256 = load_tolerance_freeze(DOCS_DIR / TOLERANCE_FREEZE_NAME)
        self.assertEqual(sha256, FROZEN_TOLERANCE_SHA256)

    def test_on_disk_tolerance_raw_sha_equals_canonical_freeze_sha(self) -> None:
        on_disk = compute_raw_file_sha256(DOCS_DIR / TOLERANCE_FREEZE_NAME)
        _, canonical = load_tolerance_freeze(DOCS_DIR / TOLERANCE_FREEZE_NAME)
        self.assertEqual(on_disk, canonical)
        self.assertEqual(on_disk, FROZEN_TOLERANCE_SHA256)

    def test_tolerance_rows_sorted_on_disk(self) -> None:
        rows = read_csv_rows(DOCS_DIR / TOLERANCE_FREEZE_NAME)
        quantity_keys = [row["quantity_key"] for row in rows]
        self.assertEqual(quantity_keys, sorted(quantity_keys))

    def test_validator_rejects_mutated_tolerance_register(self) -> None:
        with tempfile.TemporaryDirectory(prefix="apollo_analytical_golden_mut_") as temp_dir:
            docs_dir = Path(temp_dir)
            generate_package(docs_dir)
            tolerance_path = docs_dir / TOLERANCE_FREEZE_NAME
            rows = read_csv_rows(tolerance_path)
            rows[0]["absolute_tolerance"] = "9.9E-15"
            with tolerance_path.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=rows[0].keys(), lineterminator="\n")
                writer.writeheader()
                writer.writerows(rows)
            with self.assertRaises(AnalyticalGoldenValidationError):
                validate_package(docs_dir, expected_tolerance_sha256=FROZEN_TOLERANCE_SHA256)


class ComparatorFailClosedTest(unittest.TestCase):
    def _matching_actual_rows(self) -> list[dict[str, str]]:
        rows = load_expected_records(DOCS_DIR / EXPECTED_VALUES_NAME)
        return [
            {
                "case_id": row["case_id"],
                "quantity_id": row["quantity_id"],
                "unit": row["unit"],
                "actual_value": row["expected_value"],
            }
            for row in rows
        ]

    def test_pass_on_exact_match(self) -> None:
        report = compare_actual_bundle(
            self._matching_actual_rows(),
            DOCS_DIR,
            tolerance_freeze_sha256=FROZEN_TOLERANCE_SHA256,
        )
        self.assertEqual(report["overall_verdict"], "PASS")
        self.assertEqual(report["comparison_count"], EXPECTED_QUANTITY_COUNT)
        self.assertEqual(report["failures"], [])

    def test_rejects_wrong_tolerance_sha256_argument(self) -> None:
        with self.assertRaises(AnalyticalGoldenValidationError):
            compare_actual_bundle(
                self._matching_actual_rows(),
                DOCS_DIR,
                tolerance_freeze_sha256="0" * 63 + "f",
            )

    def test_rejects_missing_quantity(self) -> None:
        actual_rows = self._matching_actual_rows()[:-1]
        report = compare_actual_bundle(
            actual_rows,
            DOCS_DIR,
            tolerance_freeze_sha256=FROZEN_TOLERANCE_SHA256,
        )
        self.assertEqual(report["overall_verdict"], "FAIL")
        self.assertTrue(any("missing quantities" in failure for failure in report["failures"]))

    def test_rejects_extra_quantity(self) -> None:
        actual_rows = self._matching_actual_rows()
        actual_rows.append(
            {
                "case_id": "AG-CANT-P",
                "quantity_id": "EXTRA",
                "unit": "m",
                "actual_value": "0",
            }
        )
        report = compare_actual_bundle(
            actual_rows,
            DOCS_DIR,
            tolerance_freeze_sha256=FROZEN_TOLERANCE_SHA256,
        )
        self.assertEqual(report["overall_verdict"], "FAIL")
        self.assertTrue(any("extra quantities" in failure for failure in report["failures"]))

    def test_rejects_unit_mismatch(self) -> None:
        actual_rows = self._matching_actual_rows()
        actual_rows[0] = dict(actual_rows[0])
        actual_rows[0]["unit"] = "mm"
        report = compare_actual_bundle(
            actual_rows,
            DOCS_DIR,
            tolerance_freeze_sha256=FROZEN_TOLERANCE_SHA256,
        )
        self.assertEqual(report["overall_verdict"], "FAIL")
        self.assertTrue(any("unit mismatch" in failure for failure in report["failures"]))

    def test_near_zero_uses_absolute_tolerance_only(self) -> None:
        passed, abs_err, _rel_err = evaluate_comparison(
            Decimal("0"),
            Decimal("1E-16"),
            absolute_tolerance=Decimal("1E-15"),
            relative_tolerance=Decimal("1E-12"),
            zero_threshold=Decimal("1E-20"),
            comparison_rule=COMPARISON_RULE_DEFAULT,
        )
        self.assertTrue(passed)
        self.assertEqual(abs_err, Decimal("1E-16"))


class ManualEditRejectionTest(unittest.TestCase):
    def test_validator_rejects_tampered_expected_value(self) -> None:
        with tempfile.TemporaryDirectory(prefix="apollo_analytical_golden_tamper_") as temp_dir:
            docs_dir = Path(temp_dir)
            generate_package(docs_dir)
            expected_path = docs_dir / EXPECTED_VALUES_NAME
            rows = read_csv_rows(expected_path)
            rows[0]["expected_value"] = "999"
            with expected_path.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=rows[0].keys(), lineterminator="\n")
                writer.writeheader()
                writer.writerows(rows)
            with self.assertRaises(AnalyticalGoldenValidationError):
                validate_package(docs_dir, expected_tolerance_sha256=FROZEN_TOLERANCE_SHA256)

    def test_validator_rejects_tampered_derivation_formula(self) -> None:
        with tempfile.TemporaryDirectory(prefix="apollo_analytical_golden_formula_") as temp_dir:
            docs_dir = Path(temp_dir)
            generate_package(docs_dir)
            expected_path = docs_dir / EXPECTED_VALUES_NAME
            rows = read_csv_rows(expected_path)
            rows[0]["derivation_formula"] = "HACKED"
            with expected_path.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=rows[0].keys(), lineterminator="\n")
                writer.writeheader()
                writer.writerows(rows)
            with self.assertRaises(AnalyticalGoldenValidationError):
                validate_package(docs_dir, expected_tolerance_sha256=FROZEN_TOLERANCE_SHA256)

    def test_validator_rejects_tampered_independent_review(self) -> None:
        with tempfile.TemporaryDirectory(prefix="apollo_analytical_golden_ind_") as temp_dir:
            docs_dir = Path(temp_dir)
            generate_package(docs_dir)
            review_path = docs_dir / INDEPENDENT_REVIEW_EXPECTED_NAME
            rows = read_csv_rows(review_path)
            rows[0]["expected_value"] = "999"
            with review_path.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=rows[0].keys(), lineterminator="\n")
                writer.writeheader()
                writer.writerows(rows)
            with self.assertRaises(AnalyticalGoldenValidationError):
                validate_package(docs_dir, expected_tolerance_sha256=FROZEN_TOLERANCE_SHA256)

    def test_validator_rejects_mutated_blockers_file(self) -> None:
        with tempfile.TemporaryDirectory(prefix="apollo_analytical_golden_blk_") as temp_dir:
            docs_dir = Path(temp_dir)
            generate_package(docs_dir)
            blockers_path = docs_dir / BLOCKERS_NAME
            rows = read_csv_rows(blockers_path)
            rows[0]["notes"] = "edited"
            with blockers_path.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=rows[0].keys(), lineterminator="\n")
                writer.writeheader()
                writer.writerows(rows)
            with self.assertRaises(AnalyticalGoldenValidationError):
                validate_package(docs_dir, expected_tolerance_sha256=FROZEN_TOLERANCE_SHA256)


class CliIntegrationTest(unittest.TestCase):
    def test_generate_cli_writes_valid_package(self) -> None:
        with tempfile.TemporaryDirectory(prefix="apollo_analytical_golden_cli_") as temp_dir:
            docs_dir = Path(temp_dir) / "docs"
            docs_dir.mkdir()
            completed = subprocess.run(
                [sys.executable, str(_GENERATE_CLI), "--docs-dir", str(docs_dir)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(completed.returncode, 0, msg=completed.stderr)
            payload = json.loads(completed.stdout)
            self.assertEqual(payload["quantity_count"], EXPECTED_QUANTITY_COUNT)
            report = validate_package(
                docs_dir,
                expected_tolerance_sha256=payload["tolerance_freeze_sha256"],
            )
            self.assertTrue(report["valid"])

    def test_compare_cli_requires_tolerance_sha256(self) -> None:
        with tempfile.TemporaryDirectory(prefix="apollo_analytical_golden_cli_cmp_") as temp_dir:
            actual_path = Path(temp_dir) / "actual.json"
            actual_path.write_text("[]\n", encoding="utf-8")
            completed = subprocess.run(
                [
                    sys.executable,
                    str(_COMPARE_CLI),
                    "--actual",
                    str(actual_path),
                    "--docs-dir",
                    str(DOCS_DIR),
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertNotEqual(completed.returncode, 0)
            self.assertIn("tolerance-freeze-sha256", completed.stderr)

    def test_validate_cli_requires_tolerance_sha256(self) -> None:
        completed = subprocess.run(
            [sys.executable, str(_VALIDATE_CLI), "--docs-dir", str(DOCS_DIR)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("tolerance-freeze-sha256", completed.stderr)

    def test_validate_cli_with_frozen_sha256(self) -> None:
        completed = subprocess.run(
            [
                sys.executable,
                str(_VALIDATE_CLI),
                "--docs-dir",
                str(DOCS_DIR),
                "--tolerance-freeze-sha256",
                FROZEN_TOLERANCE_SHA256,
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(completed.returncode, 0, msg=completed.stderr)
        payload = json.loads(completed.stdout)
        self.assertTrue(payload["valid"])


class SyntheticFixtureBoundaryTest(unittest.TestCase):
    def test_all_cases_marked_synthetic_fixture(self) -> None:
        rows = read_csv_rows(DOCS_DIR / "analytical_case_catalog.csv")
        for row in rows:
            self.assertEqual(row["fixture_coefficient_class"], "SYNTHETIC_FIXTURE_NOT_DESIGN_STANDARD")

    def test_blockers_match_ea00_snapshot_verbatim(self) -> None:
        on_disk = hashlib.sha256((DOCS_DIR / BLOCKERS_NAME).read_bytes()).hexdigest()
        self.assertEqual(on_disk, compute_selected_blocker_snapshot_sha256())
        self.assertEqual(on_disk, SELECTED_BLOCKER_SNAPSHOT_SHA256)

    def test_tolerance_justification_separates_idealization(self) -> None:
        records = build_all_quantities()
        rows = tolerance_freeze_rows(records)
        for row in rows:
            self.assertIn("fixed-unit error budget", row["freeze_justification"])
            self.assertIn("theory idealization exact", row["freeze_justification"])

if __name__ == "__main__":
    unittest.main()
