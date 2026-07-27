#!/usr/bin/env python3
"""Targeted unittest coverage for EA-04 parity harness (synthetic fixtures only)."""

from __future__ import annotations

import copy
import json
import subprocess
import sys
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

_EVIDENCE_DIR = Path(__file__).resolve().parent.parent
if str(_EVIDENCE_DIR) not in sys.path:
    sys.path.insert(0, str(_EVIDENCE_DIR))

from parity_core import (  # noqa: E402
    DOCS_DIR,
    EVIDENCE_LABEL_SYNTHETIC,
    TOLERANCE_FREEZE_NAME,
    ExclusiveWriteError,
    ParityComparisonError,
    ParityNormalizationError,
    ParityValidationError,
    PathSafetyError,
    build_fixture_raw_rows,
    build_identity_mapping,
    build_quantity_key,
    build_raw_document,
    build_raw_row,
    classify_comparison_report,
    classify_mismatch_row,
    compare_canonical_documents,
    compute_raw_file_sha256,
    compute_tolerance_freeze_sha256,
    evaluate_comparison,
    generate_tolerance_freeze_register,
    load_tolerance_freeze,
    normalize_raw_results,
    read_json_file,
    render_parity_report,
    row_source_key,
    tolerance_freeze_rows_from_fixtures,
    validate_coordinate_transform,
    validate_input_file,
    validate_mapping_document,
    validate_raw_document,
    write_json_exclusive,
)

FROZEN_TOLERANCE_SHA256 = "7ea474a42ecf039868279ccd084d3cb7ebae6b92ca89858e610ac4229c0c3683"
_TEST_RAW_BYTE_SHA = "a1" * 32
_TEST_MAPPING_BYTE_SHA = "b2" * 32
_TEST_SPACER_CANONICAL_BYTE_SHA = "c3" * 32
_TEST_APOLLO_CANONICAL_BYTE_SHA = "d4" * 32

_COMPARE_CLI = _EVIDENCE_DIR / "compare_numeric_parity.py"
_NORMALIZE_SPACER_CLI = _EVIDENCE_DIR / "normalize_spacer_results.py"
_NORMALIZE_APOLLO_CLI = _EVIDENCE_DIR / "normalize_apollo_results.py"
_VALIDATE_MAPPING_CLI = _EVIDENCE_DIR / "validate_mapping.py"

ROT_Z_90 = [
    ["0", "-1", "0"],
    ["1", "0", "0"],
    ["0", "0", "1"],
]


def _base_mapping() -> dict:
    return build_identity_mapping(
        spacer_source_sha256="a" * 64,
        apollo_source_sha256="b" * 64,
    )


def _full_fixture_rows() -> list[dict]:
    return build_fixture_raw_rows()


def _normalize_pair(
    spacer_rows: list[dict],
    apollo_rows: list[dict],
    mapping: dict,
    *,
    spacer_stale: bool = False,
    apollo_stale: bool = False,
) -> tuple[dict, dict, dict, dict]:
    spacer_raw = build_raw_document(
        producer="spacer",
        rows=spacer_rows,
        model_identity=mapping["spacer_model_identity"],
        model_version=mapping["spacer_model_version"],
        source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
        executable_sha256=mapping["spacer_executable_sha256"],
        stale=spacer_stale,
    )
    apollo_raw = build_raw_document(
        producer="apollo",
        rows=apollo_rows,
        model_identity=mapping["apollo_model_identity"],
        model_version=mapping["apollo_model_version"],
        source_artifact_sha256=mapping["apollo_source_artifact_sha256"],
        executable_sha256=mapping["apollo_executable_sha256"],
        stale=apollo_stale,
    )
    spacer_canonical, _ = normalize_raw_results(
        spacer_raw,
        mapping,
        side="spacer",
        raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
        mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
    )
    apollo_canonical, _ = normalize_raw_results(
        apollo_raw,
        mapping,
        side="apollo",
        raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
        mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
    )
    return spacer_raw, apollo_raw, spacer_canonical, apollo_canonical


def _compare_rows(
    spacer_rows: list[dict],
    apollo_rows: list[dict],
    mapping: dict | None = None,
    *,
    tolerance_rows: list[dict] | None = None,
    tolerance_sha: str = FROZEN_TOLERANCE_SHA256,
) -> dict:
    mapping = mapping or _base_mapping()
    tolerance_rows = tolerance_rows or load_tolerance_freeze(DOCS_DIR / TOLERANCE_FREEZE_NAME)[0]
    spacer_raw, apollo_raw, spacer_canonical, apollo_canonical = _normalize_pair(
        spacer_rows,
        apollo_rows,
        mapping,
    )
    return compare_canonical_documents(
        spacer_canonical,
        apollo_canonical,
        spacer_raw=spacer_raw,
        apollo_raw=apollo_raw,
        tolerance_rows=tolerance_rows,
        tolerance_freeze_sha256=tolerance_sha,
        mapping_document=mapping,
        expected_mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
        spacer_canonical_file_byte_sha256=_TEST_SPACER_CANONICAL_BYTE_SHA,
        apollo_canonical_file_byte_sha256=_TEST_APOLLO_CANONICAL_BYTE_SHA,
        expected_spacer_raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
        expected_apollo_raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
    )


def _set_side_rotation(mapping: dict, side: str, matrix: list[list[str]]) -> None:
    for context in ("global", "local", "support"):
        mapping["coordinate_transforms"][side][context] = matrix


class ToleranceRegisterTest(unittest.TestCase):
    def test_committed_tolerance_sha256(self) -> None:
        _, sha256 = load_tolerance_freeze(DOCS_DIR / TOLERANCE_FREEZE_NAME)
        self.assertEqual(sha256, FROZEN_TOLERANCE_SHA256)
        on_disk = compute_raw_file_sha256(DOCS_DIR / TOLERANCE_FREEZE_NAME)
        self.assertEqual(on_disk, FROZEN_TOLERANCE_SHA256)

    def test_tolerance_raw_equals_canonical_sha(self) -> None:
        rows = tolerance_freeze_rows_from_fixtures()
        canonical = compute_tolerance_freeze_sha256(rows)
        on_disk = compute_raw_file_sha256(DOCS_DIR / TOLERANCE_FREEZE_NAME)
        self.assertEqual(canonical, on_disk)

    def test_duplicate_tolerance_key_rejected(self) -> None:
        rows = tolerance_freeze_rows_from_fixtures()
        duplicate = copy.deepcopy(rows)
        duplicate.append(copy.deepcopy(rows[0]))
        with tempfile.TemporaryDirectory(prefix="parity_tol_dup_") as temp_dir:
            path = Path(temp_dir) / TOLERANCE_FREEZE_NAME
            from parity_core import TOLERANCE_FREEZE_COLUMNS, write_csv_exclusive

            write_csv_exclusive(path, TOLERANCE_FREEZE_COLUMNS, duplicate)
            with self.assertRaises(ParityValidationError):
                load_tolerance_freeze(path)


class UnitConversionTest(unittest.TestCase):
    def test_unit_conversion_normalization(self) -> None:
        mapping = _base_mapping()
        mapping["unit_conversion"]["spacer"]["displacement"] = {
            "from_unit": "mm",
            "to_unit": "m",
            "scale": "0.001",
            "offset": "0",
        }
        mapping["unit_conversion"]["apollo"]["displacement"] = {
            "from_unit": "m",
            "to_unit": "m",
            "scale": "1",
            "offset": "0",
        }
        rows = _full_fixture_rows()
        for row in rows:
            if row["quantity"] == "displacement":
                row["unit"] = "mm"
                row["internal_value"] = "1"
        spacer_raw = build_raw_document(
            producer="spacer",
            rows=rows,
            model_identity=mapping["spacer_model_identity"],
            model_version=mapping["spacer_model_version"],
            source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
            executable_sha256=mapping["spacer_executable_sha256"],
        )
        spacer_canonical, _ = normalize_raw_results(
            spacer_raw,
            mapping,
            side="spacer",
            raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
            mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
        )
        disp = [r for r in spacer_canonical["rows"] if r["quantity"] == "displacement" and not r["feature"]]
        self.assertTrue(all(r["unit"] == "m" for r in disp))
        self.assertTrue(all(Decimal(r["internal_value"]) == Decimal("0.001") for r in disp))

    def test_per_side_different_source_units_same_canonical(self) -> None:
        mapping = _base_mapping()
        mapping["unit_conversion"]["spacer"]["reaction"] = {
            "from_unit": "kN",
            "to_unit": "N",
            "scale": "1000",
            "offset": "0",
        }
        mapping["unit_conversion"]["apollo"]["reaction"] = {
            "from_unit": "N",
            "to_unit": "N",
            "scale": "1",
            "offset": "0",
        }
        spacer_rows = [
            build_raw_row(
                entity_type="node",
                entity_id="N2",
                dof="fz",
                quantity="reaction",
                unit="kN",
                internal_value="1",
            )
        ]
        apollo_rows = [
            build_raw_row(
                entity_type="node",
                entity_id="N2",
                dof="fz",
                quantity="reaction",
                unit="N",
                internal_value="1000",
            )
        ]
        _, _, spacer_canonical, apollo_canonical = _normalize_pair(spacer_rows, apollo_rows, mapping)
        spacer_fz = next(r for r in spacer_canonical["rows"] if r["dof"] == "fz")
        apollo_fz = next(r for r in apollo_canonical["rows"] if r["dof"] == "fz")
        self.assertEqual(spacer_fz["unit"], "N")
        self.assertEqual(apollo_fz["unit"], "N")
        self.assertEqual(Decimal(spacer_fz["internal_value"]), Decimal("1000"))
        self.assertEqual(Decimal(apollo_fz["internal_value"]), Decimal("1000"))

    def test_wrong_unit_rejected(self) -> None:
        mapping = _base_mapping()
        mapping["unit_conversion"]["spacer"]["displacement"] = {
            "from_unit": "mm",
            "to_unit": "m",
            "scale": "0.001",
            "offset": "0",
        }
        spacer_rows = [
            build_raw_row(
                entity_type="node",
                entity_id="N1",
                dof="ux",
                quantity="displacement",
                unit="m",
                internal_value="1",
            )
        ]
        spacer_raw = build_raw_document(
            producer="spacer",
            rows=spacer_rows,
            model_identity=mapping["spacer_model_identity"],
            model_version=mapping["spacer_model_version"],
            source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
            executable_sha256=mapping["spacer_executable_sha256"],
        )
        with self.assertRaises(ParityNormalizationError):
            normalize_raw_results(
                spacer_raw,
                mapping,
                side="spacer",
                raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
                mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
            )


class SignInversionTest(unittest.TestCase):
    def test_per_side_sign_transform_applied(self) -> None:
        mapping = _base_mapping()
        mapping["sign_transform"]["spacer"]["ux"] = -1
        rows = _full_fixture_rows()
        spacer_rows = copy.deepcopy(rows)
        apollo_rows = copy.deepcopy(rows)
        for row in apollo_rows:
            if row["dof"] == "ux" and not row.get("feature"):
                row["internal_value"] = "-0.001"
        _, _, spacer_canonical, apollo_canonical = _normalize_pair(spacer_rows, apollo_rows, mapping)
        ux_key = build_quantity_key("node", "N1", "LC1", "", "global", "ux", "", "displacement", "")
        spacer_ux = next(
            r for r in spacer_canonical["rows"]
            if build_quantity_key(
                r["entity_type"], r["entity_id"], r["load_case_id"], r["combination_id"],
                r["coordinate_context"], r["dof"], r["member_end"], r["quantity"], r["feature"],
            ) == ux_key
        )
        apollo_ux = next(
            r for r in apollo_canonical["rows"]
            if build_quantity_key(
                r["entity_type"], r["entity_id"], r["load_case_id"], r["combination_id"],
                r["coordinate_context"], r["dof"], r["member_end"], r["quantity"], r["feature"],
            ) == ux_key
        )
        self.assertEqual(
            Decimal(spacer_ux["internal_value"]),
            Decimal(apollo_ux["internal_value"]),
        )


class DofPermutationTest(unittest.TestCase):
    def test_per_side_dof_permutation(self) -> None:
        mapping = _base_mapping()
        mapping["dof_permutation"]["spacer"] = ["uy", "ux", "uz", "rx", "ry", "rz"]
        spacer_rows = [
            build_raw_row(
                entity_type="node",
                entity_id="N1",
                dof="ux",
                quantity="displacement",
                unit="m",
                internal_value="1",
            ),
            build_raw_row(
                entity_type="node",
                entity_id="N1",
                dof="uy",
                quantity="displacement",
                unit="m",
                internal_value="2",
            ),
        ]
        spacer_raw = build_raw_document(
            producer="spacer",
            rows=spacer_rows,
            model_identity=mapping["spacer_model_identity"],
            model_version=mapping["spacer_model_version"],
            source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
            executable_sha256=mapping["spacer_executable_sha256"],
        )
        spacer_canonical, _ = normalize_raw_results(
            spacer_raw,
            mapping,
            side="spacer",
            raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
            mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
        )
        ux_row = next(r for r in spacer_canonical["rows"] if r["dof"] == "ux")
        uy_row = next(r for r in spacer_canonical["rows"] if r["dof"] == "uy")
        self.assertEqual(Decimal(ux_row["internal_value"]), Decimal("2"))
        self.assertEqual(Decimal(uy_row["internal_value"]), Decimal("1"))


class MemberEndTest(unittest.TestCase):
    def test_per_side_ij_swap(self) -> None:
        mapping = _base_mapping()
        mapping["member_end_transform"]["spacer"] = {
            "swap_ij": True,
            "end_map": {"I": "J", "J": "I"},
        }
        spacer_rows = [
            build_raw_row(
                entity_type="member",
                entity_id="M1",
                coordinate_context="local",
                member_end="I",
                quantity="shear_y",
                unit="kN",
                internal_value="100",
            ),
            build_raw_row(
                entity_type="member",
                entity_id="M1",
                coordinate_context="local",
                member_end="J",
                quantity="shear_y",
                unit="kN",
                internal_value="200",
            ),
        ]
        spacer_raw = build_raw_document(
            producer="spacer",
            rows=spacer_rows,
            model_identity=mapping["spacer_model_identity"],
            model_version=mapping["spacer_model_version"],
            source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
            executable_sha256=mapping["spacer_executable_sha256"],
        )
        spacer_canonical, _ = normalize_raw_results(
            spacer_raw,
            mapping,
            side="spacer",
            raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
            mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
        )
        i_row = next(
            r for r in spacer_canonical["rows"]
            if r["entity_id"] == "M1" and r["member_end"] == "I"
        )
        j_row = next(
            r for r in spacer_canonical["rows"]
            if r["entity_id"] == "M1" and r["member_end"] == "J"
        )
        self.assertEqual(Decimal(i_row["internal_value"]), Decimal("200"))
        self.assertEqual(Decimal(j_row["internal_value"]), Decimal("100"))

    def test_non_bijective_member_end_rejected(self) -> None:
        mapping = _base_mapping()
        mapping["member_end_transform"]["spacer"] = {
            "swap_ij": False,
            "end_map": {"I": "I", "J": "I"},
        }
        with self.assertRaises(ParityValidationError):
            validate_mapping_document(mapping)

    def test_swap_ij_inconsistent_rejected(self) -> None:
        mapping = _base_mapping()
        mapping["member_end_transform"]["spacer"]["swap_ij"] = True
        with self.assertRaises(ParityValidationError):
            validate_mapping_document(mapping)


class CoordinateTransformTest(unittest.TestCase):
    def test_invalid_transform_rejected(self) -> None:
        mapping = _base_mapping()
        mapping["coordinate_transforms"]["spacer"]["local"] = [
            ["2", "0", "0"],
            ["0", "1", "0"],
            ["0", "0", "1"],
        ]
        with self.assertRaises(ParityValidationError):
            validate_mapping_document(mapping)

    def test_valid_identity_transform(self) -> None:
        validate_mapping_document(_base_mapping())

    def test_90_degree_displacement_rotation(self) -> None:
        mapping = _base_mapping()
        _set_side_rotation(mapping, "spacer", ROT_Z_90)
        spacer_rows = [
            build_raw_row(entity_type="node", entity_id="N1", dof="ux", quantity="displacement", unit="m", internal_value="1"),
            build_raw_row(entity_type="node", entity_id="N1", dof="uy", quantity="displacement", unit="m", internal_value="0"),
            build_raw_row(entity_type="node", entity_id="N1", dof="uz", quantity="displacement", unit="m", internal_value="0"),
        ]
        apollo_rows = [
            build_raw_row(entity_type="node", entity_id="N1", dof="ux", quantity="displacement", unit="m", internal_value="0"),
            build_raw_row(entity_type="node", entity_id="N1", dof="uy", quantity="displacement", unit="m", internal_value="1"),
            build_raw_row(entity_type="node", entity_id="N1", dof="uz", quantity="displacement", unit="m", internal_value="0"),
        ]
        _, _, spacer_canonical, apollo_canonical = _normalize_pair(spacer_rows, apollo_rows, mapping)
        for side_doc in (spacer_canonical, apollo_canonical):
            ux = next(r for r in side_doc["rows"] if r["dof"] == "ux")
            uy = next(r for r in side_doc["rows"] if r["dof"] == "uy")
            self.assertEqual(Decimal(ux["internal_value"]), Decimal(0))
            self.assertEqual(Decimal(uy["internal_value"]), Decimal(1))

    def test_90_degree_rotation_components(self) -> None:
        mapping = _base_mapping()
        _set_side_rotation(mapping, "spacer", ROT_Z_90)
        spacer_rows = [
            build_raw_row(entity_type="node", entity_id="N1", dof="rx", quantity="displacement", unit="m", internal_value="1"),
            build_raw_row(entity_type="node", entity_id="N1", dof="ry", quantity="displacement", unit="m", internal_value="0"),
            build_raw_row(entity_type="node", entity_id="N1", dof="rz", quantity="displacement", unit="m", internal_value="0"),
        ]
        apollo_rows = [
            build_raw_row(entity_type="node", entity_id="N1", dof="rx", quantity="displacement", unit="m", internal_value="0"),
            build_raw_row(entity_type="node", entity_id="N1", dof="ry", quantity="displacement", unit="m", internal_value="1"),
            build_raw_row(entity_type="node", entity_id="N1", dof="rz", quantity="displacement", unit="m", internal_value="0"),
        ]
        _, _, spacer_canonical, apollo_canonical = _normalize_pair(spacer_rows, apollo_rows, mapping)
        for side_doc in (spacer_canonical, apollo_canonical):
            rx = next(r for r in side_doc["rows"] if r["dof"] == "rx")
            ry = next(r for r in side_doc["rows"] if r["dof"] == "ry")
            self.assertEqual(Decimal(rx["internal_value"]), Decimal(0))
            self.assertEqual(Decimal(ry["internal_value"]), Decimal(1))

    def test_90_degree_force_rotation(self) -> None:
        mapping = _base_mapping()
        _set_side_rotation(mapping, "spacer", ROT_Z_90)
        spacer_rows = [
            build_raw_row(entity_type="node", entity_id="N2", dof="fx", quantity="reaction", unit="kN", internal_value="1"),
            build_raw_row(entity_type="node", entity_id="N2", dof="fy", quantity="reaction", unit="kN", internal_value="0"),
            build_raw_row(entity_type="node", entity_id="N2", dof="fz", quantity="reaction", unit="kN", internal_value="0"),
        ]
        apollo_rows = [
            build_raw_row(entity_type="node", entity_id="N2", dof="fx", quantity="reaction", unit="kN", internal_value="0"),
            build_raw_row(entity_type="node", entity_id="N2", dof="fy", quantity="reaction", unit="kN", internal_value="1"),
            build_raw_row(entity_type="node", entity_id="N2", dof="fz", quantity="reaction", unit="kN", internal_value="0"),
        ]
        _, _, spacer_canonical, apollo_canonical = _normalize_pair(spacer_rows, apollo_rows, mapping)
        for side_doc in (spacer_canonical, apollo_canonical):
            fx = next(r for r in side_doc["rows"] if r["dof"] == "fx")
            fy = next(r for r in side_doc["rows"] if r["dof"] == "fy")
            self.assertEqual(Decimal(fx["internal_value"]), Decimal(0))
            self.assertEqual(Decimal(fy["internal_value"]), Decimal(1))

    def test_90_degree_moment_rotation(self) -> None:
        mapping = _base_mapping()
        _set_side_rotation(mapping, "spacer", ROT_Z_90)
        spacer_rows = [
            build_raw_row(entity_type="node", entity_id="N2", dof="mx", quantity="reaction", unit="kN", internal_value="1"),
            build_raw_row(entity_type="node", entity_id="N2", dof="my", quantity="reaction", unit="kN", internal_value="0"),
            build_raw_row(entity_type="node", entity_id="N2", dof="mz", quantity="reaction", unit="kN", internal_value="0"),
        ]
        apollo_rows = [
            build_raw_row(entity_type="node", entity_id="N2", dof="mx", quantity="reaction", unit="kN", internal_value="0"),
            build_raw_row(entity_type="node", entity_id="N2", dof="my", quantity="reaction", unit="kN", internal_value="1"),
            build_raw_row(entity_type="node", entity_id="N2", dof="mz", quantity="reaction", unit="kN", internal_value="0"),
        ]
        _, _, spacer_canonical, apollo_canonical = _normalize_pair(spacer_rows, apollo_rows, mapping)
        for side_doc in (spacer_canonical, apollo_canonical):
            mx = next(r for r in side_doc["rows"] if r["dof"] == "mx")
            my = next(r for r in side_doc["rows"] if r["dof"] == "my")
            self.assertEqual(Decimal(mx["internal_value"]), Decimal(0))
            self.assertEqual(Decimal(my["internal_value"]), Decimal(1))

    def test_incomplete_vector_group_rejected(self) -> None:
        mapping = _base_mapping()
        _set_side_rotation(mapping, "spacer", ROT_Z_90)
        rows = [
            build_raw_row(entity_type="node", entity_id="N1", dof="ux", quantity="displacement", unit="m", internal_value="1"),
        ]
        spacer_raw = build_raw_document(
            producer="spacer",
            rows=rows,
            model_identity=mapping["spacer_model_identity"],
            model_version=mapping["spacer_model_version"],
            source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
            executable_sha256=mapping["spacer_executable_sha256"],
        )
        with self.assertRaises(ParityNormalizationError):
            normalize_raw_results(
                spacer_raw,
                mapping,
                side="spacer",
                raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
                mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
            )


class ReorderMappingTest(unittest.TestCase):
    def test_node_member_reorder(self) -> None:
        mapping = _base_mapping()
        mapping["node_map"] = {
            "spacer": {"N_SP": "N1", "N2": "N2"},
            "apollo": {"N1": "N1", "N2": "N2"},
        }
        rows = _full_fixture_rows()
        spacer_rows = copy.deepcopy(rows)
        for row in spacer_rows:
            if row["entity_id"] == "N1":
                row["entity_id"] = "N_SP"
        apollo_rows = copy.deepcopy(rows)
        _, _, spacer_canonical, apollo_canonical = _normalize_pair(spacer_rows, apollo_rows, mapping)
        spacer_n1 = [r for r in spacer_canonical["rows"] if r["entity_type"] == "node"]
        apollo_n1 = [r for r in apollo_canonical["rows"] if r["entity_type"] == "node"]
        self.assertTrue(all(r["entity_id"] == "N1" or r["entity_id"] == "N2" for r in spacer_n1))
        self.assertTrue(any(r["entity_id"] == "N1" for r in spacer_n1))
        self.assertTrue(any(r["entity_id"] == "N1" for r in apollo_n1))


class ComparisonBehaviorTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tolerance_rows, _ = load_tolerance_freeze(DOCS_DIR / TOLERANCE_FREEZE_NAME)

    def test_full_fixture_pass(self) -> None:
        rows = _full_fixture_rows()
        report = _compare_rows(rows, copy.deepcopy(rows))
        self.assertEqual(report["overall_verdict"], "PASS")

    def test_near_zero_absolute_tolerance(self) -> None:
        rows = _full_fixture_rows()
        apollo_rows = copy.deepcopy(rows)
        for row in apollo_rows:
            if row.get("feature") == "near_zero":
                row["internal_value"] = "1E-18"
        report = _compare_rows(rows, apollo_rows)
        self.assertEqual(report["overall_verdict"], "PASS")

    def test_absolute_tolerance_pass(self) -> None:
        rows = _full_fixture_rows()
        apollo_rows = copy.deepcopy(rows)
        for row in apollo_rows:
            if row["dof"] == "ux" and not row.get("feature"):
                row["internal_value"] = "0.001000000001"
        report = _compare_rows(rows, apollo_rows)
        self.assertEqual(report["overall_verdict"], "PASS")

    def test_relative_tolerance_fail(self) -> None:
        rows = _full_fixture_rows()
        apollo_rows = copy.deepcopy(rows)
        for row in apollo_rows:
            if row["dof"] == "ux" and not row.get("feature"):
                row["internal_value"] = "1001"
                row["internal_value"] = "0.002" if row["internal_value"] == "0.001" else row["internal_value"]
        for row in apollo_rows:
            if row["dof"] == "ux" and row["internal_value"] == "0.001":
                row["internal_value"] = "0.002"
        report = _compare_rows(rows, apollo_rows)
        self.assertEqual(report["overall_verdict"], "FAIL")
        self.assertIsNotNone(report["worst_case"])

    def test_worst_case_by_utilization(self) -> None:
        rows = _full_fixture_rows()
        apollo_rows = copy.deepcopy(rows)
        for row in apollo_rows:
            if row["dof"] == "ux" and not row.get("feature"):
                row["internal_value"] = "0.002"
            if row["dof"] == "uy":
                row["internal_value"] = "0.00101"
        report = _compare_rows(rows, apollo_rows)
        self.assertEqual(report["worst_case"]["quantity_key"], build_quantity_key(
            "node", "N1", "LC1", "", "global", "ux", "", "displacement", ""
        ))
        self.assertIn("utilization_ratio", report["worst_case"])

    def test_exact_tolerance_coverage_required(self) -> None:
        rows = _full_fixture_rows()[:1]
        report = _compare_rows(rows, copy.deepcopy(rows))
        self.assertEqual(report["overall_verdict"], "FAIL")
        self.assertTrue(any("unused_tol" in failure or "key/tolerance" in failure for failure in report["failures"]))

    def test_unused_tolerance_rejected(self) -> None:
        rows = _full_fixture_rows()
        subset_tol = [self.tolerance_rows[0]]
        subset_sha = compute_tolerance_freeze_sha256(subset_tol)
        report = _compare_rows(
            rows,
            copy.deepcopy(rows),
            tolerance_rows=subset_tol,
            tolerance_sha=subset_sha,
        )
        self.assertEqual(report["overall_verdict"], "FAIL")

    def test_missing_output(self) -> None:
        rows = _full_fixture_rows()
        apollo_rows = copy.deepcopy(rows[:-1])
        report = _compare_rows(rows, apollo_rows)
        self.assertEqual(report["overall_verdict"], "FAIL")

    def test_extra_output(self) -> None:
        rows = _full_fixture_rows()
        spacer_rows = rows[:-1]
        report = _compare_rows(spacer_rows, copy.deepcopy(rows))
        self.assertEqual(report["overall_verdict"], "FAIL")

    def test_deterministic_sorted_rerun(self) -> None:
        rows = _full_fixture_rows()
        first = _compare_rows(rows, copy.deepcopy(rows))
        second = _compare_rows(list(reversed(rows)), list(reversed(copy.deepcopy(rows))))
        self.assertEqual(
            [row["quantity_key"] for row in first["rows"]],
            [row["quantity_key"] for row in second["rows"]],
        )

    def test_internal_value_not_quantized_during_normalization(self) -> None:
        mapping = _base_mapping()
        rows = [
            build_raw_row(
                entity_type="node",
                entity_id="N1",
                dof="ux",
                quantity="displacement",
                unit="m",
                internal_value="0.0010001",
                internal_precision=3,
            )
        ]
        spacer_raw = build_raw_document(
            producer="spacer",
            rows=rows,
            model_identity=mapping["spacer_model_identity"],
            model_version=mapping["spacer_model_version"],
            source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
            executable_sha256=mapping["spacer_executable_sha256"],
        )
        spacer_canonical, _ = normalize_raw_results(
            spacer_raw,
            mapping,
            side="spacer",
            raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
            mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
        )
        ux = next(r for r in spacer_canonical["rows"] if r["dof"] == "ux")
        self.assertEqual(ux["internal_value"], "0.0010001")
        self.assertEqual(ux["internal_precision"], 3)

    def test_sub_internal_precision_difference_tolerance_evaluated(self) -> None:
        rows = _full_fixture_rows()
        apollo_rows = copy.deepcopy(rows)
        for row in apollo_rows:
            if row["dof"] == "ux" and not row.get("feature"):
                row["internal_value"] = "0.0010002"
                row["internal_precision"] = 3
        for row in rows:
            if row["dof"] == "ux" and not row.get("feature"):
                row["internal_value"] = "0.0010001"
                row["internal_precision"] = 3
        report = _compare_rows(rows, apollo_rows)
        ux_key = build_quantity_key("node", "N1", "LC1", "", "global", "ux", "", "displacement", "")
        ux_row = next(r for r in report["rows"] if r["quantity_key"] == ux_key)
        self.assertNotEqual(ux_row["spacer_internal_value"], ux_row["apollo_internal_value"])
        self.assertEqual(
            Decimal(ux_row["spacer_internal_value"]).quantize(Decimal("0.001")),
            Decimal(ux_row["apollo_internal_value"]).quantize(Decimal("0.001")),
        )
        self.assertEqual(ux_row["internal_verdict"], "FAIL")
        self.assertEqual(report["overall_verdict"], "FAIL")

    def test_display_precision_mismatch_rejected(self) -> None:
        rows = _full_fixture_rows()
        apollo_rows = copy.deepcopy(rows)
        mapping = _base_mapping()
        del mapping["canonical_display_precision"]
        for row in rows:
            if row["dof"] == "ux" and not row.get("feature"):
                row["display_precision"] = 3
        for row in apollo_rows:
            if row["dof"] == "ux" and not row.get("feature"):
                row["display_precision"] = 6
        report = _compare_rows(rows, apollo_rows, mapping=mapping)
        self.assertEqual(report["overall_verdict"], "FAIL")
        ux_key = build_quantity_key("node", "N1", "LC1", "", "global", "ux", "", "displacement", "")
        ux_row = next(r for r in report["rows"] if r["quantity_key"] == ux_key)
        self.assertIn("display_precision_evidence", ux_row)

    def test_min_display_precision_no_longer_hides_mismatch(self) -> None:
        rows = _full_fixture_rows()
        apollo_rows = copy.deepcopy(rows)
        mapping = _base_mapping()
        mapping["canonical_display_precision"] = {"displacement": 6}
        for row in rows:
            if row["dof"] == "ux" and not row.get("feature"):
                row["display_value"] = "0.001000"
                row["display_precision"] = 3
        for row in apollo_rows:
            if row["dof"] == "ux" and not row.get("feature"):
                row["internal_value"] = "0.0010000000001"
                row["display_value"] = "0.001001"
                row["display_precision"] = 6
        report = _compare_rows(rows, apollo_rows, mapping=mapping)
        failed = [r for r in report["rows"] if r.get("classification_hint") == "ROUNDING_DISPLAY_DIFFERENCE"]
        self.assertTrue(failed)

    def test_display_rounding_difference_exposed(self) -> None:
        rows = _full_fixture_rows()
        apollo_rows = copy.deepcopy(rows)
        for row in apollo_rows:
            if row["dof"] == "ux" and not row.get("feature"):
                row["internal_value"] = "0.0010000000001"
                row["display_value"] = "0.001001"
        report = _compare_rows(rows, apollo_rows)
        failed = [r for r in report["rows"] if r.get("classification_hint") == "ROUNDING_DISPLAY_DIFFERENCE"]
        self.assertTrue(failed)
        self.assertIn("rounding_difference", failed[0])


class ExclusionPropagationTest(unittest.TestCase):
    def test_exclusion_blocks_compare_pass(self) -> None:
        mapping = _base_mapping()
        rows = _full_fixture_rows()
        source_key = row_source_key(rows[0])
        mapping["exclusions"] = [
            {
                "side": "spacer",
                "source_key": source_key,
                "reason": "synthetic unsupported",
                "classification": "UNSUPPORTED_FEATURE",
            }
        ]
        spacer_rows = copy.deepcopy(rows)
        apollo_rows = copy.deepcopy(rows)
        spacer_raw, apollo_raw, spacer_canonical, apollo_canonical = _normalize_pair(
            spacer_rows, apollo_rows, mapping
        )
        self.assertEqual(len(spacer_canonical["exclusions"]), 1)
        tolerance_rows, _ = load_tolerance_freeze(DOCS_DIR / TOLERANCE_FREEZE_NAME)
        report = compare_canonical_documents(
            spacer_canonical,
            apollo_canonical,
            spacer_raw=spacer_raw,
            apollo_raw=apollo_raw,
            tolerance_rows=tolerance_rows,
            tolerance_freeze_sha256=FROZEN_TOLERANCE_SHA256,
            mapping_document=mapping,
            expected_mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
            spacer_canonical_file_byte_sha256=_TEST_SPACER_CANONICAL_BYTE_SHA,
            apollo_canonical_file_byte_sha256=_TEST_APOLLO_CANONICAL_BYTE_SHA,
            expected_spacer_raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
            expected_apollo_raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
        )
        self.assertFalse(report["parity_pass"])
        self.assertTrue(report["exclusion_blocks_pass"])
        rendered = render_parity_report(report)
        self.assertFalse(rendered["parity_pass"])

    def test_exclusion_exact_source_key(self) -> None:
        mapping = _base_mapping()
        rows = _full_fixture_rows()
        mapping["exclusions"] = [
            {
                "side": "spacer",
                "source_key": "wrong|key",
                "reason": "should not match",
                "classification": "UNSUPPORTED_FEATURE",
            }
        ]
        spacer_raw = build_raw_document(
            producer="spacer",
            rows=rows,
            model_identity=mapping["spacer_model_identity"],
            model_version=mapping["spacer_model_version"],
            source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
            executable_sha256=mapping["spacer_executable_sha256"],
        )
        _, audit = normalize_raw_results(
            spacer_raw,
            mapping,
            side="spacer",
            raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
            mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
        )
        self.assertEqual(audit.excluded_row_count, 0)
        self.assertEqual(audit.output_row_count, len(rows))

    def test_exclusion_per_side_only(self) -> None:
        mapping = _base_mapping()
        rows = _full_fixture_rows()
        source_key = row_source_key(rows[0])
        mapping["exclusions"] = [
            {
                "side": "apollo",
                "source_key": source_key,
                "reason": "apollo-only exclusion",
                "classification": "UNSUPPORTED_FEATURE",
            }
        ]
        _, _, spacer_canonical, apollo_canonical = _normalize_pair(
            copy.deepcopy(rows),
            copy.deepcopy(rows),
            mapping,
        )
        self.assertEqual(len(spacer_canonical["exclusions"]), 0)
        self.assertEqual(len(apollo_canonical["exclusions"]), 1)
        self.assertEqual(apollo_canonical["exclusions"][0]["side"], "apollo")

    def test_identical_source_key_both_sides_not_overwritten(self) -> None:
        mapping = _base_mapping()
        rows = _full_fixture_rows()
        source_key = row_source_key(rows[0])
        mapping["exclusions"] = [
            {
                "side": "spacer",
                "source_key": source_key,
                "reason": "spacer exclusion",
                "classification": "UNSUPPORTED_FEATURE",
            },
            {
                "side": "apollo",
                "source_key": source_key,
                "reason": "apollo exclusion",
                "classification": "UNSUPPORTED_FEATURE",
            },
        ]
        spacer_raw, apollo_raw, spacer_canonical, apollo_canonical = _normalize_pair(
            copy.deepcopy(rows),
            copy.deepcopy(rows),
            mapping,
        )
        tolerance_rows, _ = load_tolerance_freeze(DOCS_DIR / TOLERANCE_FREEZE_NAME)
        report = compare_canonical_documents(
            spacer_canonical,
            apollo_canonical,
            spacer_raw=spacer_raw,
            apollo_raw=apollo_raw,
            tolerance_rows=tolerance_rows,
            tolerance_freeze_sha256=FROZEN_TOLERANCE_SHA256,
            mapping_document=mapping,
            expected_mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
            spacer_canonical_file_byte_sha256=_TEST_SPACER_CANONICAL_BYTE_SHA,
            apollo_canonical_file_byte_sha256=_TEST_APOLLO_CANONICAL_BYTE_SHA,
            expected_spacer_raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
            expected_apollo_raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
        )
        self.assertEqual(len(report["exclusions"]), 2)
        sides = {entry["side"] for entry in report["exclusions"]}
        self.assertEqual(sides, {"spacer", "apollo"})


class ValidationRejectionTest(unittest.TestCase):
    def test_duplicate_raw_key_rejected(self) -> None:
        rows = _full_fixture_rows()
        rows.append(copy.deepcopy(rows[0]))
        document = build_raw_document(
            producer="spacer",
            rows=rows,
            model_identity="SYNTHETIC_SPACER_MODEL",
            source_artifact_sha256="a" * 64,
        )
        with self.assertRaises(ParityValidationError):
            validate_raw_document(document)

    def test_version_mismatch_rejected(self) -> None:
        mapping = _base_mapping()
        spacer_raw = build_raw_document(
            producer="spacer",
            rows=_full_fixture_rows(),
            model_identity=mapping["spacer_model_identity"],
            model_version="9.9.9",
            source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
            executable_sha256=mapping["spacer_executable_sha256"],
        )
        with self.assertRaises(ParityValidationError):
            validate_mapping_document(mapping, spacer_raw=spacer_raw)

    def test_executable_sha_mismatch_rejected(self) -> None:
        mapping = _base_mapping()
        spacer_raw = build_raw_document(
            producer="spacer",
            rows=_full_fixture_rows(),
            model_identity=mapping["spacer_model_identity"],
            model_version=mapping["spacer_model_version"],
            source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
            executable_sha256="0" * 64,
        )
        with self.assertRaises(ParityValidationError):
            validate_mapping_document(mapping, spacer_raw=spacer_raw)

    def test_producer_build_mismatch_rejected(self) -> None:
        mapping = _base_mapping()
        spacer_raw = build_raw_document(
            producer="spacer",
            rows=_full_fixture_rows(),
            model_identity=mapping["spacer_model_identity"],
            model_version=mapping["spacer_model_version"],
            source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
            executable_sha256=mapping["spacer_executable_sha256"],
            producer_build="WRONG",
        )
        with self.assertRaises(ParityValidationError):
            validate_mapping_document(mapping, spacer_raw=spacer_raw)

    def test_stale_raw_rejected(self) -> None:
        mapping = _base_mapping()
        spacer_raw = build_raw_document(
            producer="spacer",
            rows=_full_fixture_rows(),
            model_identity=mapping["spacer_model_identity"],
            model_version=mapping["spacer_model_version"],
            source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
            executable_sha256=mapping["spacer_executable_sha256"],
            stale=True,
        )
        with self.assertRaises(ParityNormalizationError):
            normalize_raw_results(
                spacer_raw,
                mapping,
                side="spacer",
                raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
                mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
            )

    def test_tolerance_mutation_rejected(self) -> None:
        tolerance_rows, _ = load_tolerance_freeze(DOCS_DIR / TOLERANCE_FREEZE_NAME)
        rows = _full_fixture_rows()
        spacer_raw, apollo_raw, spacer_canonical, apollo_canonical = _normalize_pair(
            rows, copy.deepcopy(rows), _base_mapping()
        )
        with self.assertRaises(ParityComparisonError):
            compare_canonical_documents(
                spacer_canonical,
                apollo_canonical,
                spacer_raw=spacer_raw,
                apollo_raw=apollo_raw,
                tolerance_rows=tolerance_rows,
                tolerance_freeze_sha256="0" * 64,
                mapping_document=_base_mapping(),
                expected_mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
                spacer_canonical_file_byte_sha256=_TEST_SPACER_CANONICAL_BYTE_SHA,
                apollo_canonical_file_byte_sha256=_TEST_APOLLO_CANONICAL_BYTE_SHA,
                expected_spacer_raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
                expected_apollo_raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
            )

    def test_mapping_sha_mismatch_between_sides(self) -> None:
        rows = _full_fixture_rows()
        mapping = _base_mapping()
        spacer_raw, apollo_raw, spacer_canonical, apollo_canonical = _normalize_pair(
            rows, copy.deepcopy(rows), mapping
        )
        apollo_canonical = copy.deepcopy(apollo_canonical)
        apollo_canonical["mapping_sha256"] = "0" * 64
        tolerance_rows, _ = load_tolerance_freeze(DOCS_DIR / TOLERANCE_FREEZE_NAME)
        with self.assertRaises(ParityComparisonError):
            compare_canonical_documents(
                spacer_canonical,
                apollo_canonical,
                spacer_raw=spacer_raw,
                apollo_raw=apollo_raw,
                tolerance_rows=tolerance_rows,
                tolerance_freeze_sha256=FROZEN_TOLERANCE_SHA256,
                mapping_document=mapping,
                expected_mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
                spacer_canonical_file_byte_sha256=_TEST_SPACER_CANONICAL_BYTE_SHA,
                apollo_canonical_file_byte_sha256=_TEST_APOLLO_CANONICAL_BYTE_SHA,
                expected_spacer_raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
                expected_apollo_raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
            )

    def test_canonical_requires_byte_sha_fields(self) -> None:
        rows = _full_fixture_rows()
        _, _, spacer_canonical, _ = _normalize_pair(rows, copy.deepcopy(rows), _base_mapping())
        broken = copy.deepcopy(spacer_canonical)
        del broken["raw_file_byte_sha256"]
        with self.assertRaises(ParityValidationError):
            from parity_core import validate_canonical_document

            validate_canonical_document(broken)


class ClassifierTest(unittest.TestCase):
    def test_solver_numeric_requires_mapping_binding(self) -> None:
        row = {
            "quantity_key": "k",
            "spacer_present": True,
            "apollo_present": True,
            "internal_verdict": "FAIL",
            "classification_hint": "SOLVER_NUMERIC_DIFFERENCE",
        }
        without_mapping = classify_mismatch_row(row)
        self.assertEqual(without_mapping["classification"], "UNKNOWN_REQUIRES_EVIDENCE")
        with_mapping = classify_mismatch_row(row, mapping_document=_base_mapping())
        self.assertEqual(with_mapping["classification"], "SOLVER_NUMERIC_DIFFERENCE")

    def test_unit_classification_requires_unit_evidence(self) -> None:
        row = {
            "quantity_key": "k",
            "spacer_present": True,
            "apollo_present": True,
            "classification_hint": "UNIT_CONVERSION_ERROR",
            "unit_evidence": {"spacer_unit": "kN", "apollo_unit": "N"},
        }
        result = classify_mismatch_row(row)
        self.assertEqual(result["classification"], "UNIT_CONVERSION_ERROR")


class NegativePathTest(unittest.TestCase):
    def test_exclusive_write_rejected(self) -> None:
        with tempfile.TemporaryDirectory(prefix="parity_exclusive_") as temp_dir:
            path = Path(temp_dir) / "out.json"
            write_json_exclusive(path, {"a": 1})
            with self.assertRaises(ExclusiveWriteError):
                write_json_exclusive(path, {"a": 2})

    def test_symlink_input_rejected(self) -> None:
        with tempfile.TemporaryDirectory(prefix="parity_symlink_") as temp_dir:
            root = Path(temp_dir)
            target = root / "target.json"
            target.write_text('{"schema_version":"apollo.parity.raw.v1"}', encoding="utf-8")
            link = root / "link.json"
            link.symlink_to(target)
            with self.assertRaises(PathSafetyError):
                validate_input_file(link)

    def test_hash_binding_mismatch(self) -> None:
        document = build_raw_document(
            producer="spacer",
            rows=_full_fixture_rows(),
            model_identity="SYNTHETIC_SPACER_MODEL",
            source_artifact_sha256="a" * 64,
        )
        with self.assertRaises(ParityValidationError):
            validate_raw_document(document, expected_sha256="0" * 64)

    def test_noninvertible_coordinate_transform(self) -> None:
        matrix = [
            [Decimal("1"), Decimal("0"), Decimal("0")],
            [Decimal("0"), Decimal("1"), Decimal("0")],
            [Decimal("0"), Decimal("0"), Decimal("-1")],
        ]
        with self.assertRaises(ParityValidationError):
            validate_coordinate_transform(matrix, field_name="test")


class QuantityMapTest(unittest.TestCase):
    def test_different_producer_quantity_names_same_canonical(self) -> None:
        mapping = _base_mapping()
        mapping["quantity_map"]["spacer"]["disp"] = "displacement"
        del mapping["quantity_map"]["spacer"]["displacement"]
        spacer_rows = [
            build_raw_row(
                entity_type="node",
                entity_id="N1",
                dof="ux",
                quantity="disp",
                unit="m",
                internal_value="0.005",
            )
        ]
        apollo_rows = [
            build_raw_row(
                entity_type="node",
                entity_id="N1",
                dof="ux",
                quantity="displacement",
                unit="m",
                internal_value="0.005",
            )
        ]
        _, _, spacer_canonical, apollo_canonical = _normalize_pair(spacer_rows, apollo_rows, mapping)
        spacer_ux = next(r for r in spacer_canonical["rows"] if r["dof"] == "ux")
        apollo_ux = next(r for r in apollo_canonical["rows"] if r["dof"] == "ux")
        self.assertEqual(spacer_ux["quantity"], "displacement")
        self.assertEqual(apollo_ux["quantity"], "displacement")
        self.assertEqual(spacer_ux["internal_value"], apollo_ux["internal_value"])


class ProvenanceSealTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tolerance_rows, _ = load_tolerance_freeze(DOCS_DIR / TOLERANCE_FREEZE_NAME)
        self.rows = _full_fixture_rows()
        self.mapping = _base_mapping()

    def _compare_with_canonicals(
        self,
        spacer_canonical: dict,
        apollo_canonical: dict,
        *,
        spacer_raw: dict | None = None,
        apollo_raw: dict | None = None,
    ) -> None:
        spacer_raw = spacer_raw or build_raw_document(
            producer="spacer",
            rows=self.rows,
            model_identity=self.mapping["spacer_model_identity"],
            model_version=self.mapping["spacer_model_version"],
            source_artifact_sha256=self.mapping["spacer_source_artifact_sha256"],
            executable_sha256=self.mapping["spacer_executable_sha256"],
        )
        apollo_raw = apollo_raw or build_raw_document(
            producer="apollo",
            rows=copy.deepcopy(self.rows),
            model_identity=self.mapping["apollo_model_identity"],
            model_version=self.mapping["apollo_model_version"],
            source_artifact_sha256=self.mapping["apollo_source_artifact_sha256"],
            executable_sha256=self.mapping["apollo_executable_sha256"],
        )
        compare_canonical_documents(
            spacer_canonical,
            apollo_canonical,
            spacer_raw=spacer_raw,
            apollo_raw=apollo_raw,
            tolerance_rows=self.tolerance_rows,
            tolerance_freeze_sha256=FROZEN_TOLERANCE_SHA256,
            mapping_document=self.mapping,
            expected_mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
            spacer_canonical_file_byte_sha256=_TEST_SPACER_CANONICAL_BYTE_SHA,
            apollo_canonical_file_byte_sha256=_TEST_APOLLO_CANONICAL_BYTE_SHA,
            expected_spacer_raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
            expected_apollo_raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
        )

    def test_forged_transform_rejected(self) -> None:
        spacer_raw, apollo_raw, spacer_canonical, apollo_canonical = _normalize_pair(
            self.rows,
            copy.deepcopy(self.rows),
            self.mapping,
        )
        forged = copy.deepcopy(spacer_canonical)
        forged["rows"][0]["internal_value"] = "999"
        with self.assertRaises(ParityComparisonError):
            self._compare_with_canonicals(forged, apollo_canonical, spacer_raw=spacer_raw, apollo_raw=apollo_raw)

    def test_mutated_model_identity_rejected(self) -> None:
        _, _, spacer_canonical, apollo_canonical = _normalize_pair(
            self.rows,
            copy.deepcopy(self.rows),
            self.mapping,
        )
        mutated = copy.deepcopy(spacer_canonical)
        mutated["model_identity"] = "FORGED"
        with self.assertRaises(ParityComparisonError):
            self._compare_with_canonicals(mutated, apollo_canonical)

    def test_mutated_source_artifact_rejected(self) -> None:
        _, _, spacer_canonical, apollo_canonical = _normalize_pair(
            self.rows,
            copy.deepcopy(self.rows),
            self.mapping,
        )
        mutated = copy.deepcopy(spacer_canonical)
        mutated["source_artifact_sha256"] = "f" * 64
        with self.assertRaises(ParityComparisonError):
            self._compare_with_canonicals(mutated, apollo_canonical)

    def test_raw_hash_mismatch_rejected(self) -> None:
        spacer_raw, apollo_raw, spacer_canonical, apollo_canonical = _normalize_pair(
            self.rows,
            copy.deepcopy(self.rows),
            self.mapping,
        )
        with self.assertRaises(ParityComparisonError):
            compare_canonical_documents(
                spacer_canonical,
                apollo_canonical,
                spacer_raw=spacer_raw,
                apollo_raw=apollo_raw,
                tolerance_rows=self.tolerance_rows,
                tolerance_freeze_sha256=FROZEN_TOLERANCE_SHA256,
                mapping_document=self.mapping,
                expected_mapping_file_byte_sha256=_TEST_MAPPING_BYTE_SHA,
                spacer_canonical_file_byte_sha256=_TEST_SPACER_CANONICAL_BYTE_SHA,
                apollo_canonical_file_byte_sha256=_TEST_APOLLO_CANONICAL_BYTE_SHA,
                expected_spacer_raw_file_byte_sha256="0" * 64,
                expected_apollo_raw_file_byte_sha256=_TEST_RAW_BYTE_SHA,
            )

    def test_input_checksums_include_raw_byte_shas(self) -> None:
        report = _compare_rows(self.rows, copy.deepcopy(self.rows))
        checksums = report["input_checksums"]
        self.assertEqual(checksums["spacer_raw_file_byte_sha256"], _TEST_RAW_BYTE_SHA)
        self.assertEqual(checksums["apollo_raw_file_byte_sha256"], _TEST_RAW_BYTE_SHA)
        self.assertEqual(checksums["mapping_file_byte_sha256"], _TEST_MAPPING_BYTE_SHA)


class CliTest(unittest.TestCase):
    def test_compare_cli_requires_raw_and_byte_shas(self) -> None:
        with tempfile.TemporaryDirectory(prefix="parity_cli_") as temp_dir:
            root = Path(temp_dir)
            spacer = root / "spacer.json"
            apollo = root / "apollo.json"
            mapping = root / "mapping.json"
            spacer.write_text("{}", encoding="utf-8")
            apollo.write_text("{}", encoding="utf-8")
            mapping.write_text("{}", encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(_COMPARE_CLI),
                    "--spacer-canonical",
                    str(spacer),
                    "--apollo-canonical",
                    str(apollo),
                    "--mapping",
                    str(mapping),
                    "--tolerance-freeze-sha256",
                    FROZEN_TOLERANCE_SHA256,
                ],
                capture_output=True,
                text=True,
            )
            self.assertNotEqual(result.returncode, 0)

    def test_normalize_cli_requires_byte_shas(self) -> None:
        result = subprocess.run(
            [sys.executable, str(_NORMALIZE_SPACER_CLI), "--help"],
            capture_output=True,
            text=True,
        )
        self.assertIn("--expected-raw-sha256", result.stdout)
        self.assertIn("--expected-mapping-sha256", result.stdout)
        compare_help = subprocess.run(
            [sys.executable, str(_COMPARE_CLI), "--help"],
            capture_output=True,
            text=True,
        )
        self.assertIn("--expected-spacer-canonical-sha256", compare_help.stdout)
        self.assertIn("--expected-apollo-canonical-sha256", compare_help.stdout)
        self.assertIn("--expected-spacer-raw-sha256", compare_help.stdout)
        self.assertIn("--expected-apollo-raw-sha256", compare_help.stdout)
        self.assertIn("--expected-mapping-sha256", compare_help.stdout)
        validate_help = subprocess.run(
            [sys.executable, str(_VALIDATE_MAPPING_CLI), "--help"],
            capture_output=True,
            text=True,
        )
        self.assertIn("--expected-mapping-sha256", validate_help.stdout)

    def test_end_to_end_cli_pretty_json_success(self) -> None:
        mapping = _base_mapping()
        rows = _full_fixture_rows()
        spacer_raw_doc = build_raw_document(
            producer="spacer",
            rows=rows,
            model_identity=mapping["spacer_model_identity"],
            model_version=mapping["spacer_model_version"],
            source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
            executable_sha256=mapping["spacer_executable_sha256"],
        )
        apollo_raw_doc = build_raw_document(
            producer="apollo",
            rows=copy.deepcopy(rows),
            model_identity=mapping["apollo_model_identity"],
            model_version=mapping["apollo_model_version"],
            source_artifact_sha256=mapping["apollo_source_artifact_sha256"],
            executable_sha256=mapping["apollo_executable_sha256"],
        )
        with tempfile.TemporaryDirectory(prefix="parity_e2e_") as temp_dir:
            root = Path(temp_dir)
            mapping_path = root / "mapping.json"
            spacer_raw_path = root / "spacer_raw.json"
            apollo_raw_path = root / "apollo_raw.json"
            spacer_canonical_path = root / "spacer_canonical.json"
            apollo_canonical_path = root / "apollo_canonical.json"
            compare_out = root / "comparison.json"

            mapping_path.write_text(json.dumps(mapping, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            spacer_raw_path.write_text(
                json.dumps(spacer_raw_doc, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            apollo_raw_path.write_text(
                json.dumps(apollo_raw_doc, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )

            mapping_sha = compute_raw_file_sha256(mapping_path)
            spacer_raw_sha = compute_raw_file_sha256(spacer_raw_path)
            apollo_raw_sha = compute_raw_file_sha256(apollo_raw_path)

            for cli, args in (
                (
                    _NORMALIZE_SPACER_CLI,
                    [
                        "--raw",
                        str(spacer_raw_path),
                        "--mapping",
                        str(mapping_path),
                        "--expected-raw-sha256",
                        spacer_raw_sha,
                        "--expected-mapping-sha256",
                        mapping_sha,
                        "--output",
                        str(spacer_canonical_path),
                    ],
                ),
                (
                    _NORMALIZE_APOLLO_CLI,
                    [
                        "--raw",
                        str(apollo_raw_path),
                        "--mapping",
                        str(mapping_path),
                        "--expected-raw-sha256",
                        apollo_raw_sha,
                        "--expected-mapping-sha256",
                        mapping_sha,
                        "--output",
                        str(apollo_canonical_path),
                    ],
                ),
            ):
                result = subprocess.run(
                    [sys.executable, str(cli), *args],
                    capture_output=True,
                    text=True,
                )
                self.assertEqual(result.returncode, 0, msg=result.stderr)

            spacer_canonical_sha = compute_raw_file_sha256(spacer_canonical_path)
            apollo_canonical_sha = compute_raw_file_sha256(apollo_canonical_path)

            compare_result = subprocess.run(
                [
                    sys.executable,
                    str(_COMPARE_CLI),
                    "--spacer-canonical",
                    str(spacer_canonical_path),
                    "--apollo-canonical",
                    str(apollo_canonical_path),
                    "--spacer-raw",
                    str(spacer_raw_path),
                    "--apollo-raw",
                    str(apollo_raw_path),
                    "--mapping",
                    str(mapping_path),
                    "--expected-spacer-canonical-sha256",
                    spacer_canonical_sha,
                    "--expected-apollo-canonical-sha256",
                    apollo_canonical_sha,
                    "--expected-spacer-raw-sha256",
                    spacer_raw_sha,
                    "--expected-apollo-raw-sha256",
                    apollo_raw_sha,
                    "--expected-mapping-sha256",
                    mapping_sha,
                    "--tolerance-freeze-sha256",
                    FROZEN_TOLERANCE_SHA256,
                    "--output",
                    str(compare_out),
                ],
                capture_output=True,
                text=True,
            )
            self.assertEqual(compare_result.returncode, 0, msg=compare_result.stderr)
            report = json.loads(compare_out.read_text(encoding="utf-8"))
            self.assertEqual(report["overall_verdict"], "PASS")
            self.assertIn("spacer_raw_file_byte_sha256", report["input_checksums"])


class RenderReportTest(unittest.TestCase):
    def test_verdicts_present(self) -> None:
        report = render_parity_report(
            {
                "overall_verdict": "FAIL",
                "parity_pass": False,
                "tolerance_freeze_sha256": FROZEN_TOLERANCE_SHA256,
                "comparison_count": 0,
                "failures": [],
                "exclusions": [],
            }
        )
        self.assertEqual(report["parity_harness_verdict"], "COMPLETE")
        self.assertEqual(
            report["actual_spacer_parity_verdict"],
            "BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT",
        )
        self.assertEqual(report["evidence_label"], EVIDENCE_LABEL_SYNTHETIC)


class EvaluateComparisonTest(unittest.TestCase):
    def test_zero_threshold_uses_absolute(self) -> None:
        passed, abs_err, _, util = evaluate_comparison(
            Decimal("0"),
            Decimal("1E-13"),
            absolute_tolerance=Decimal("1E-12"),
            relative_tolerance=Decimal("1E-9"),
            zero_threshold=Decimal("1E-15"),
            comparison_rule="abs(a-e) <= max(A, R*|e|)",
        )
        self.assertTrue(passed)
        self.assertEqual(abs_err, Decimal("1E-13"))
        self.assertGreater(util, Decimal(0))


if __name__ == "__main__":
    unittest.main()
