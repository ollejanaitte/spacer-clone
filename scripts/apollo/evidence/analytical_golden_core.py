"""Shared core for EA-02 independent analytical golden evidence (DS-07)."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import re
from dataclasses import dataclass
from decimal import Decimal, getcontext
from fractions import Fraction
from pathlib import Path
from typing import Any, Callable, Iterable, Mapping, Sequence

from independent_analytical_review import (
    INDEPENDENT_REVIEW_COLUMNS,
    INDEPENDENT_REVIEW_EXPECTED_NAME,
    compute_independent_review_sha256,
    generate_independent_review_artifact,
    read_independent_review,
    regenerate_independent_index,
)

PACKAGE_VERSION = "2.1.0"
SCHEMA_VERSION = "apollo.analytical_golden.v1"
COMPARISON_RULE_DEFAULT = "abs(a-e) <= max(A, R*|e|)"

REPO_ROOT = Path(__file__).resolve().parents[3]
DOCS_DIR = REPO_ROOT / "docs" / "apollo" / "evidence-collection" / "02_analytical_golden"
EA00_BLOCKER_SNAPSHOT_PATH = (
    REPO_ROOT / "docs" / "apollo" / "evidence-collection" / "00_inventory" / "current_blocker_snapshot.csv"
)

CASE_CATALOG_NAME = "analytical_case_catalog.csv"
DERIVATION_REGISTER_NAME = "derivation_register.csv"
EXPECTED_VALUES_NAME = "expected_values.csv"
TOLERANCE_FREEZE_NAME = "tolerance_freeze_register.csv"
BLOCKERS_NAME = "analytical_golden_blockers.csv"

REQUIRED_CASE_IDS = (
    "AG-CANT-P",
    "AG-SS-CL",
    "AG-SS-UDL",
    "AG-AXIAL",
    "AG-ASYM-RC",
    "AG-LC-LIN",
    "AG-TORSION",
)

CASE_CATALOG_COLUMNS = (
    "case_id",
    "canonical_golden_ref",
    "model_description",
    "boundary_conditions",
    "load_description",
    "coordinate_system",
    "sign_convention",
    "member_end_convention",
    "fixture_coefficient_class",
    "derivation_method",
    "theory_source_description",
    "approval_status",
)

DERIVATION_REGISTER_COLUMNS = (
    "case_id",
    "quantity_id",
    "formula_id",
    "formula_expression",
    "theory_source_description",
    "input_parameters",
    "derivation_checksum",
    "derivation_path",
    "approval_status",
)

EXPECTED_VALUES_COLUMNS = (
    "case_id",
    "quantity_id",
    "entity_type",
    "entity_id",
    "component",
    "member_end",
    "unit",
    "expected_value",
    "derivation_formula",
    "derivation_checksum",
    "coordinate_system",
    "sign_convention",
    "member_end_convention",
    "absolute_tolerance",
    "relative_tolerance",
    "zero_threshold",
    "comparison_rule",
    "approval_status",
)

TOLERANCE_FREEZE_COLUMNS = (
    "quantity_key",
    "case_id",
    "quantity_id",
    "unit",
    "absolute_tolerance",
    "relative_tolerance",
    "zero_threshold",
    "comparison_rule",
    "freeze_justification",
)

BLOCKERS_COLUMNS = (
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
    "expected_output",
    "acceptance_criteria",
    "planned_stage",
    "notes",
)

SELECTED_BLOCKER_IDS = (
    "AN-BLK-001",
    "BLK-S1-002",
    "BLK-S1-004",
    "BLK-S1-005",
    "EXT-ID-001",
    "EXT-ID-002",
    "EXT-ID-003",
    "GOLD-BLK-001",
    "GOLD-BLK-002",
    "GOLD-BLK-003",
    "GOLD-BLK-004",
    "GOLD-BLK-005",
    "GOLD-BLK-006",
    "GOLD-BLK-007",
    "GOLD-BLK-008",
    "PKG-SCOPE-P1B",
)

DECIMAL_PRECISION = 50

# Synthetic fixture coefficients — NOT adopted DS-02..DS-05 design-standard numerics.
FIXTURE_E_KN_M2 = Fraction(205_000_000)
FIXTURE_NU = Fraction(3, 10)
FIXTURE_G_KN_M2 = FIXTURE_E_KN_M2 / (Fraction(2) * (Fraction(1) + FIXTURE_NU))
FIXTURE_A_M2 = Fraction(1, 50)
FIXTURE_I_M4 = Fraction(1, 10_000)
FIXTURE_J_M4 = Fraction(1, 20_000)
FIXTURE_L_M = Fraction(4)
FIXTURE_P_KN = Fraction(10)
FIXTURE_W_KN_M = Fraction(2)
FIXTURE_T_KN_M = Fraction(5)
FIXTURE_F_AXIAL_KN = Fraction(50)

FIXTURE_ASYM_L_M = Fraction(6)
FIXTURE_ASYM_P_KN = Fraction(12)
FIXTURE_ASYM_A_M = Fraction(2)

FIXTURE_LC1_FACTOR = Fraction(1)
FIXTURE_LC2_FACTOR = Fraction(3, 5)
FIXTURE_LC1_REACTION_KN = Fraction(10)
FIXTURE_LC2_REACTION_KN = Fraction(5)

BEAM_THEORY_SOURCE = (
    "Classical Euler-Bernoulli prismatic beam closed-form theory: deflection slope reactions "
    "and bending moment under point and distributed loads (package-contained derivation; "
    "shear deformation excluded; small-displacement linear elastic idealization)."
)
AXIAL_THEORY_SOURCE = (
    "Classical uniform bar axial Hooke-law elongation delta=F*L/(E*A) with global equilibrium "
    "(package-contained derivation; linear elastic prismatic idealization)."
)
TORSION_THEORY_SOURCE = (
    "Classical Saint-Venant torsion phi=T*L/(G*J) for prismatic section with explicit torsion "
    "constant J (package-contained derivation; warping excluded)."
)
STATIC_EQUILIBRIUM_SOURCE = (
    "Classical static equilibrium for off-center point load on simply-supported beam "
    "(package-contained derivation)."
)
SYNTHETIC_COMBINATION_SOURCE = (
    "Synthetic linear superposition fixture (EA-02 package coefficient, not DS-04 adopted "
    "combination rule): combined = f1*q1 + f2*q2 with explicit rational factors."
)

EULER_BERNOULLI_APPLICABILITY = (
    "Applicability: Euler-Bernoulli prismatic linear elastic small-displacement beam; "
    "shear deformation excluded."
)
SAINT_VENANT_APPLICABILITY = (
    "Applicability: Saint-Venant prismatic section with J as torsion constant; warping excluded."
)
AXIAL_APPLICABILITY = "Applicability: uniform prismatic linear elastic axial bar."
STATICS_APPLICABILITY = "Applicability: rigid-body static equilibrium."

SECTION_MOMENT_SIGN = (
    "Section bending moment sagging positive; distinct from FE nodal end-action vector convention."
)

PACKAGE_APPROVAL_STATUS = "TOOLING_REVIEWED_NOT_GOLD_APPROVED"
PACKAGE_COMPLETENESS_STATUS = "COMPLETE"
CANONICAL_GOLD_APPROVAL_STATUS = "NOT_APPROVED"

DEFAULT_RELATIVE_TOLERANCE = Decimal("1e-12")
DEFAULT_ZERO_THRESHOLD = Decimal("1e-20")
DEFAULT_ABSOLUTE_TOLERANCE = Decimal("1e-15")

PACKAGE_ARTIFACT_NAMES = (
    CASE_CATALOG_NAME,
    DERIVATION_REGISTER_NAME,
    EXPECTED_VALUES_NAME,
    TOLERANCE_FREEZE_NAME,
    INDEPENDENT_REVIEW_EXPECTED_NAME,
)


class AnalyticalGoldenError(Exception):
    """Base error for analytical golden tooling."""


class AnalyticalGoldenValidationError(AnalyticalGoldenError):
    """Raised when validation fails closed."""


class AnalyticalGoldenComparisonError(AnalyticalGoldenError):
    """Raised when comparison fails closed."""


class ExclusiveWriteError(AnalyticalGoldenError):
    """Raised when generation would overwrite an existing artifact."""


@dataclass(frozen=True)
class CaseDefinition:
    case_id: str
    canonical_golden_ref: str
    model_description: str
    boundary_conditions: str
    load_description: str
    coordinate_system: str
    sign_convention: str
    member_end_convention: str
    fixture_coefficient_class: str
    derivation_method: str
    theory_source_description: str
    approval_status: str


@dataclass(frozen=True)
class QuantityRecord:
    case_id: str
    quantity_id: str
    entity_type: str
    entity_id: str
    component: str
    member_end: str
    unit: str
    expected_fraction: Fraction
    derivation_formula: str
    formula_id: str
    theory_source_description: str
    input_parameters: Mapping[str, str]
    coordinate_system: str
    sign_convention: str
    member_end_convention: str
    absolute_tolerance: Decimal
    relative_tolerance: Decimal
    zero_threshold: Decimal
    comparison_rule: str
    approval_status: str

    @property
    def quantity_key(self) -> str:
        return f"{self.case_id}|{self.quantity_id}"

    @property
    def expected_value(self) -> str:
        return fraction_to_decimal_string(self.expected_fraction)

    def derivation_checksum(self) -> str:
        return compute_derivation_checksum(
            case_id=self.case_id,
            quantity_id=self.quantity_id,
            formula_id=self.formula_id,
            input_parameters=self.input_parameters,
            expected_fraction=self.expected_fraction,
        )


CASE_DEFINITIONS: dict[str, CaseDefinition] = {
    "AG-CANT-P": CaseDefinition(
        case_id="AG-CANT-P",
        canonical_golden_ref="GOLD-001",
        model_description="Prismatic Euler-Bernoulli cantilever beam span L with tip point load",
        boundary_conditions="Fixed support at node N1 (all DOF restrained); free tip at node N2",
        load_description="Concentrated force P applied at N2 in global -Y",
        coordinate_system="Global X along member axis; local Y weak axis; displacements in global Y",
        sign_convention="Positive load acts in +Y; downward load is -P; positive reaction opposes load",
        member_end_convention="I at fixed end N1; J at free end N2",
        fixture_coefficient_class="SYNTHETIC_FIXTURE_NOT_DESIGN_STANDARD",
        derivation_method="Closed-form Euler-Bernoulli cantilever tip-load formulas",
        theory_source_description=BEAM_THEORY_SOURCE,
        approval_status=PACKAGE_APPROVAL_STATUS,
    ),
    "AG-SS-CL": CaseDefinition(
        case_id="AG-SS-CL",
        canonical_golden_ref="GOLD-002",
        model_description="Prismatic simply supported beam span L with center point load",
        boundary_conditions="Pin-roller supports at N1 and N3; center node N2 at midspan",
        load_description="Concentrated force P at midspan node N2 in global -Y",
        coordinate_system="Global X along member axis; local Y weak axis; displacements in global Y",
        sign_convention="Positive load acts in +Y; downward load is -P; reactions positive upward",
        member_end_convention="Members M1 (N1-N2) and M2 (N2-N3); I-J follows increasing X",
        fixture_coefficient_class="SYNTHETIC_FIXTURE_NOT_DESIGN_STANDARD",
        derivation_method="Closed-form simply-supported center-load formulas",
        theory_source_description=BEAM_THEORY_SOURCE,
        approval_status=PACKAGE_APPROVAL_STATUS,
    ),
    "AG-SS-UDL": CaseDefinition(
        case_id="AG-SS-UDL",
        canonical_golden_ref="GOLD-003",
        model_description="Prismatic simply supported beam span L with uniform distributed load",
        boundary_conditions="Pin-roller supports at N1 and N3",
        load_description="Uniform load w in local -Y on both half-span members",
        coordinate_system="Global X along member axis; local member Y for distributed load",
        sign_convention="Positive distributed load in +Y; applied load is -w; reactions positive upward",
        member_end_convention="Members M1 and M2; I-J follows increasing X",
        fixture_coefficient_class="SYNTHETIC_FIXTURE_NOT_DESIGN_STANDARD",
        derivation_method="Closed-form simply-supported uniform-load formulas",
        theory_source_description=BEAM_THEORY_SOURCE,
        approval_status=PACKAGE_APPROVAL_STATUS,
    ),
    "AG-AXIAL": CaseDefinition(
        case_id="AG-AXIAL",
        canonical_golden_ref="GOLD-004",
        model_description="Prismatic axial bar length L under end tensile force",
        boundary_conditions="Fixed at N1 in axial X; free axial displacement at N2",
        load_description="Axial force F at N2 in global +X (tension)",
        coordinate_system="Global X along bar axis",
        sign_convention="Positive axial force is tension; elongation positive in +X; fixed-end reaction opposes applied end force",
        member_end_convention="I at N1 fixed end; J at N2 loaded end",
        fixture_coefficient_class="SYNTHETIC_FIXTURE_NOT_DESIGN_STANDARD",
        derivation_method="Uniform bar Hooke-law elongation with axial equilibrium",
        theory_source_description=AXIAL_THEORY_SOURCE,
        approval_status=PACKAGE_APPROVAL_STATUS,
    ),
    "AG-ASYM-RC": CaseDefinition(
        case_id="AG-ASYM-RC",
        canonical_golden_ref="EA-02_MINIMAL_ASYMMETRIC_REACTION",
        model_description="Simply supported beam span L with off-center point load at distance a from left support",
        boundary_conditions="Pin at left support; roller at right support",
        load_description="Concentrated force P at distance a from left support",
        coordinate_system="Global X from left to right support",
        sign_convention="Downward load -P; reactions positive upward",
        member_end_convention="Support nodes N_LEFT and N_RIGHT",
        fixture_coefficient_class="SYNTHETIC_FIXTURE_NOT_DESIGN_STANDARD",
        derivation_method="Static equilibrium for asymmetric support reactions and moment at load point",
        theory_source_description=STATIC_EQUILIBRIUM_SOURCE,
        approval_status=PACKAGE_APPROVAL_STATUS,
    ),
    "AG-LC-LIN": CaseDefinition(
        case_id="AG-LC-LIN",
        canonical_golden_ref="EA-02_MINIMAL_LINEAR_COMBINATION",
        model_description="Synthetic two-case linear combination of support reactions",
        boundary_conditions="Abstract equilibrium reactions for LC1 and LC2",
        load_description="LC1 reaction 10 kN with factor 1.0; LC2 reaction 5 kN with factor 0.6",
        coordinate_system="Scalar reaction combination without spatial DOF",
        sign_convention="Positive reaction upward; combination is linear superposition",
        member_end_convention="NOT_APPLICABLE",
        fixture_coefficient_class="SYNTHETIC_FIXTURE_NOT_DESIGN_STANDARD",
        derivation_method="Explicit rational linear combination of two reaction scalars",
        theory_source_description=SYNTHETIC_COMBINATION_SOURCE,
        approval_status=PACKAGE_APPROVAL_STATUS,
    ),
    "AG-TORSION": CaseDefinition(
        case_id="AG-TORSION",
        canonical_golden_ref="GOLD-005",
        model_description="Prismatic cantilever under Saint-Venant torque at free end",
        boundary_conditions="Fixed support at N1 restraining all DOF; free tip N2",
        load_description="Torque T about global X at N2",
        coordinate_system="Global X along member axis; rotation rx about X",
        sign_convention="Positive torque about +X; fixed-end reaction torque opposes applied end torque",
        member_end_convention="I at N1 fixed end; J at N2 free end",
        fixture_coefficient_class="SYNTHETIC_FIXTURE_NOT_DESIGN_STANDARD",
        derivation_method="Saint-Venant torsion angle and fixed-end torque reaction",
        theory_source_description=TORSION_THEORY_SOURCE,
        approval_status=PACKAGE_APPROVAL_STATUS,
    ),
}


def fraction_to_decimal_string(value: Fraction) -> str:
    previous = getcontext().prec
    getcontext().prec = DECIMAL_PRECISION
    try:
        decimal_value = Decimal(value.numerator) / Decimal(value.denominator)
    finally:
        getcontext().prec = previous
    normalized = format(decimal_value, "f")
    if "." in normalized:
        normalized = normalized.rstrip("0").rstrip(".")
    return normalized or "0"


def parse_decimal(value: str) -> Decimal:
    text = value.strip()
    if not text:
        raise AnalyticalGoldenValidationError("empty decimal value")
    try:
        parsed = Decimal(text)
    except Exception as exc:  # noqa: BLE001 - fail closed on any parse failure
        raise AnalyticalGoldenValidationError(f"invalid decimal value: {value!r}") from exc
    if not parsed.is_finite():
        raise AnalyticalGoldenValidationError(f"nonfinite decimal value: {value!r}")
    return parsed


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def compute_derivation_checksum(
    *,
    case_id: str,
    quantity_id: str,
    formula_id: str,
    input_parameters: Mapping[str, str],
    expected_fraction: Fraction,
) -> str:
    payload = {
        "case_id": case_id,
        "quantity_id": quantity_id,
        "formula_id": formula_id,
        "input_parameters": dict(sorted(input_parameters.items())),
        "expected_fraction": f"{expected_fraction.numerator}/{expected_fraction.denominator}",
    }
    return sha256_text(json.dumps(payload, sort_keys=True, separators=(",", ":")))


def canonical_csv_bytes(
    fieldnames: Sequence[str],
    rows: Iterable[Mapping[str, str]],
) -> bytes:
    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=fieldnames,
        lineterminator="\n",
        quoting=csv.QUOTE_MINIMAL,
    )
    writer.writeheader()
    for row in rows:
        writer.writerow({name: row[name] for name in fieldnames})
    return buffer.getvalue().encode("utf-8")


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise AnalyticalGoldenValidationError(f"missing CSV header: {path}")
        rows = list(reader)
    return rows


def write_csv_exclusive(path: Path, fieldnames: Sequence[str], rows: Sequence[Mapping[str, str]]) -> None:
    data = canonical_csv_bytes(fieldnames, rows)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("xb") as handle:
            handle.write(data)
    except FileExistsError as exc:
        raise ExclusiveWriteError(f"refusing to overwrite existing file: {path}") from exc


def _params(**kwargs: Fraction) -> dict[str, str]:
    return {key: f"{value.numerator}/{value.denominator}" for key, value in sorted(kwargs.items())}


def _quantity(
    case: CaseDefinition,
    *,
    quantity_id: str,
    entity_type: str,
    entity_id: str,
    component: str,
    member_end: str,
    unit: str,
    expected_fraction: Fraction,
    derivation_formula: str,
    formula_id: str,
    input_parameters: Mapping[str, str],
    sign_convention: str | None = None,
) -> QuantityRecord:
    return QuantityRecord(
        case_id=case.case_id,
        quantity_id=quantity_id,
        entity_type=entity_type,
        entity_id=entity_id,
        component=component,
        member_end=member_end,
        unit=unit,
        expected_fraction=expected_fraction,
        derivation_formula=derivation_formula,
        formula_id=formula_id,
        theory_source_description=case.theory_source_description,
        input_parameters=input_parameters,
        coordinate_system=case.coordinate_system,
        sign_convention=sign_convention or case.sign_convention,
        member_end_convention=case.member_end_convention,
        absolute_tolerance=DEFAULT_ABSOLUTE_TOLERANCE,
        relative_tolerance=DEFAULT_RELATIVE_TOLERANCE,
        zero_threshold=DEFAULT_ZERO_THRESHOLD,
        comparison_rule=COMPARISON_RULE_DEFAULT,
        approval_status=PACKAGE_APPROVAL_STATUS,
    )


def _gen_cant_tip_uy() -> Fraction:
    return -(FIXTURE_P_KN * FIXTURE_L_M**3) / (Fraction(3) * FIXTURE_E_KN_M2 * FIXTURE_I_M4)


def _gen_cant_tip_rz() -> Fraction:
    return -(FIXTURE_P_KN * FIXTURE_L_M**2) / (Fraction(2) * FIXTURE_E_KN_M2 * FIXTURE_I_M4)


def _gen_cant_tip_fy() -> Fraction:
    return FIXTURE_P_KN


def _gen_cant_tip_mz() -> Fraction:
    return FIXTURE_P_KN * FIXTURE_L_M


def _gen_ss_center_uy() -> Fraction:
    return -(FIXTURE_P_KN * FIXTURE_L_M**3) / (Fraction(48) * FIXTURE_E_KN_M2 * FIXTURE_I_M4)


def _gen_ss_center_r_left() -> Fraction:
    return FIXTURE_P_KN / Fraction(2)


def _gen_ss_center_mz_midspan() -> Fraction:
    return FIXTURE_P_KN * FIXTURE_L_M / Fraction(4)


def _gen_ss_udl_uy() -> Fraction:
    return -(Fraction(5) * FIXTURE_W_KN_M * FIXTURE_L_M**4) / (
        Fraction(384) * FIXTURE_E_KN_M2 * FIXTURE_I_M4
    )


def _gen_ss_udl_reaction() -> Fraction:
    return FIXTURE_W_KN_M * FIXTURE_L_M / Fraction(2)


def _gen_ss_udl_mz_midspan() -> Fraction:
    return FIXTURE_W_KN_M * FIXTURE_L_M**2 / Fraction(8)


def _gen_axial_dx() -> Fraction:
    return FIXTURE_F_AXIAL_KN * FIXTURE_L_M / (FIXTURE_E_KN_M2 * FIXTURE_A_M2)


def _gen_axial_reaction() -> Fraction:
    return -FIXTURE_F_AXIAL_KN


def _gen_asym_r_left() -> Fraction:
    return FIXTURE_ASYM_P_KN * (FIXTURE_ASYM_L_M - FIXTURE_ASYM_A_M) / FIXTURE_ASYM_L_M


def _gen_asym_r_right() -> Fraction:
    return FIXTURE_ASYM_P_KN * FIXTURE_ASYM_A_M / FIXTURE_ASYM_L_M


def _gen_asym_m_load() -> Fraction:
    return FIXTURE_ASYM_P_KN * FIXTURE_ASYM_A_M * (FIXTURE_ASYM_L_M - FIXTURE_ASYM_A_M) / FIXTURE_ASYM_L_M


def _gen_lc_combined() -> Fraction:
    return (
        FIXTURE_LC1_FACTOR * FIXTURE_LC1_REACTION_KN
        + FIXTURE_LC2_FACTOR * FIXTURE_LC2_REACTION_KN
    )


def _gen_torsion_rx() -> Fraction:
    return FIXTURE_T_KN_M * FIXTURE_L_M / (FIXTURE_G_KN_M2 * FIXTURE_J_M4)


def _gen_torsion_mx() -> Fraction:
    return -FIXTURE_T_KN_M


GENERATOR_FORMULAS: dict[str, Callable[[], Fraction]] = {
    "CANT_TIP_UY": _gen_cant_tip_uy,
    "CANT_TIP_RZ": _gen_cant_tip_rz,
    "CANT_TIP_FY": _gen_cant_tip_fy,
    "CANT_TIP_MZ": _gen_cant_tip_mz,
    "SS_CENTER_UY": _gen_ss_center_uy,
    "SS_CENTER_FY_LEFT": _gen_ss_center_r_left,
    "SS_CENTER_FY_RIGHT": _gen_ss_center_r_left,
    "SS_CENTER_MZ_MIDSPAN": _gen_ss_center_mz_midspan,
    "SS_CENTER_MZ_ZERO": lambda: Fraction(0),
    "SS_UDL_UY": _gen_ss_udl_uy,
    "SS_UDL_FY_LEFT": _gen_ss_udl_reaction,
    "SS_UDL_FY_RIGHT": _gen_ss_udl_reaction,
    "SS_UDL_MZ_MIDSPAN": _gen_ss_udl_mz_midspan,
    "SS_UDL_MZ_ZERO": lambda: Fraction(0),
    "AXIAL_DX": _gen_axial_dx,
    "AXIAL_FX_REACTION": _gen_axial_reaction,
    "ASYM_R_LEFT": _gen_asym_r_left,
    "ASYM_R_RIGHT": _gen_asym_r_right,
    "ASYM_M_LOAD": _gen_asym_m_load,
    "LC_COMBINED_REACTION": _gen_lc_combined,
    "TORSION_RX": _gen_torsion_rx,
    "TORSION_MX": _gen_torsion_mx,
}


def build_case_quantities(case_id: str) -> list[QuantityRecord]:
    case = CASE_DEFINITIONS[case_id]
    specs: list[tuple[str, str, str, str, str, str, str, str, dict[str, str], str | None]] = []

    if case_id == "AG-CANT-P":
        specs = [
            ("N2_UY", "node_displacement", "N2", "uy", "", "m", "CANT_TIP_UY", "-P*L^3/(3*E*I)", _params(P=FIXTURE_P_KN, L=FIXTURE_L_M, E=FIXTURE_E_KN_M2, I=FIXTURE_I_M4), None),
            ("N2_RZ", "node_displacement", "N2", "rz", "", "rad", "CANT_TIP_RZ", "-P*L^2/(2*E*I)", _params(P=FIXTURE_P_KN, L=FIXTURE_L_M, E=FIXTURE_E_KN_M2, I=FIXTURE_I_M4), None),
            ("N1_FY", "node_reaction", "N1", "fy", "", "kN", "CANT_TIP_FY", "P", _params(P=FIXTURE_P_KN), None),
            ("N1_MZ", "node_reaction", "N1", "mz", "", "kN_m", "CANT_TIP_MZ", "P*L", _params(P=FIXTURE_P_KN, L=FIXTURE_L_M), None),
        ]
    elif case_id == "AG-SS-CL":
        specs = [
            ("N2_UY", "node_displacement", "N2", "uy", "", "m", "SS_CENTER_UY", "-P*L^3/(48*E*I)", _params(P=FIXTURE_P_KN, L=FIXTURE_L_M, E=FIXTURE_E_KN_M2, I=FIXTURE_I_M4), None),
            ("N1_FY", "node_reaction", "N1", "fy", "", "kN", "SS_CENTER_FY_LEFT", "P/2", _params(P=FIXTURE_P_KN), None),
            ("N3_FY", "node_reaction", "N3", "fy", "", "kN", "SS_CENTER_FY_RIGHT", "P/2", _params(P=FIXTURE_P_KN), None),
            ("M1_MZ_I", "member_section_result", "M1", "mz", "I", "kN_m", "SS_CENTER_MZ_ZERO", "0", _params(), SECTION_MOMENT_SIGN),
            ("M1_MZ_J", "member_section_result", "M1", "mz", "J", "kN_m", "SS_CENTER_MZ_MIDSPAN", "P*L/4", _params(P=FIXTURE_P_KN, L=FIXTURE_L_M), SECTION_MOMENT_SIGN),
            ("M2_MZ_I", "member_section_result", "M2", "mz", "I", "kN_m", "SS_CENTER_MZ_MIDSPAN", "P*L/4", _params(P=FIXTURE_P_KN, L=FIXTURE_L_M), SECTION_MOMENT_SIGN),
            ("M2_MZ_J", "member_section_result", "M2", "mz", "J", "kN_m", "SS_CENTER_MZ_ZERO", "0", _params(), SECTION_MOMENT_SIGN),
        ]
    elif case_id == "AG-SS-UDL":
        specs = [
            ("N2_UY", "node_displacement", "N2", "uy", "", "m", "SS_UDL_UY", "-5*w*L^4/(384*E*I)", _params(w=FIXTURE_W_KN_M, L=FIXTURE_L_M, E=FIXTURE_E_KN_M2, I=FIXTURE_I_M4), None),
            ("N1_FY", "node_reaction", "N1", "fy", "", "kN", "SS_UDL_FY_LEFT", "w*L/2", _params(w=FIXTURE_W_KN_M, L=FIXTURE_L_M), None),
            ("N3_FY", "node_reaction", "N3", "fy", "", "kN", "SS_UDL_FY_RIGHT", "w*L/2", _params(w=FIXTURE_W_KN_M, L=FIXTURE_L_M), None),
            ("M1_MZ_I", "member_section_result", "M1", "mz", "I", "kN_m", "SS_UDL_MZ_ZERO", "0", _params(), SECTION_MOMENT_SIGN),
            ("M1_MZ_J", "member_section_result", "M1", "mz", "J", "kN_m", "SS_UDL_MZ_MIDSPAN", "w*L^2/8", _params(w=FIXTURE_W_KN_M, L=FIXTURE_L_M), SECTION_MOMENT_SIGN),
            ("M2_MZ_I", "member_section_result", "M2", "mz", "I", "kN_m", "SS_UDL_MZ_MIDSPAN", "w*L^2/8", _params(w=FIXTURE_W_KN_M, L=FIXTURE_L_M), SECTION_MOMENT_SIGN),
            ("M2_MZ_J", "member_section_result", "M2", "mz", "J", "kN_m", "SS_UDL_MZ_ZERO", "0", _params(), SECTION_MOMENT_SIGN),
        ]
    elif case_id == "AG-AXIAL":
        specs = [
            ("N2_UX", "node_displacement", "N2", "ux", "", "m", "AXIAL_DX", "F*L/(E*A)", _params(F=FIXTURE_F_AXIAL_KN, L=FIXTURE_L_M, E=FIXTURE_E_KN_M2, A=FIXTURE_A_M2), None),
            ("N1_FX", "node_reaction", "N1", "fx", "", "kN", "AXIAL_FX_REACTION", "-F", _params(F=FIXTURE_F_AXIAL_KN), None),
        ]
    elif case_id == "AG-ASYM-RC":
        specs = [
            ("N_LEFT_FY", "node_reaction", "N_LEFT", "fy", "", "kN", "ASYM_R_LEFT", "P*(L-a)/L", _params(P=FIXTURE_ASYM_P_KN, L=FIXTURE_ASYM_L_M, a=FIXTURE_ASYM_A_M), None),
            ("N_RIGHT_FY", "node_reaction", "N_RIGHT", "fy", "", "kN", "ASYM_R_RIGHT", "P*a/L", _params(P=FIXTURE_ASYM_P_KN, L=FIXTURE_ASYM_L_M, a=FIXTURE_ASYM_A_M), None),
            ("M_AT_LOAD", "equilibrium_check", "LOAD_POINT", "mz", "", "kN_m", "ASYM_M_LOAD", "P*a*(L-a)/L", _params(P=FIXTURE_ASYM_P_KN, L=FIXTURE_ASYM_L_M, a=FIXTURE_ASYM_A_M), None),
        ]
    elif case_id == "AG-LC-LIN":
        specs = [
            ("COMB_FY", "load_combination", "COMBINED", "fy", "", "kN", "LC_COMBINED_REACTION", "f1*q1+f2*q2", _params(f1=FIXTURE_LC1_FACTOR, q1=FIXTURE_LC1_REACTION_KN, f2=FIXTURE_LC2_FACTOR, q2=FIXTURE_LC2_REACTION_KN), None),
        ]
    elif case_id == "AG-TORSION":
        specs = [
            ("N2_RX", "node_displacement", "N2", "rx", "", "rad", "TORSION_RX", "T*L/(G*J)", _params(T=FIXTURE_T_KN_M, L=FIXTURE_L_M, G=FIXTURE_G_KN_M2, J=FIXTURE_J_M4), None),
            ("N1_MX", "node_reaction", "N1", "mx", "", "kN_m", "TORSION_MX", "-T", _params(T=FIXTURE_T_KN_M), None),
        ]
    else:
        raise AnalyticalGoldenValidationError(f"unknown case_id: {case_id}")

    records: list[QuantityRecord] = []
    for quantity_id, entity_type, entity_id, component, member_end, unit, formula_id, formula_expr, params, sign_override in specs:
        expected_fraction = GENERATOR_FORMULAS[formula_id]()
        records.append(
            _quantity(
                case,
                quantity_id=quantity_id,
                entity_type=entity_type,
                entity_id=entity_id,
                component=component,
                member_end=member_end,
                unit=unit,
                expected_fraction=expected_fraction,
                derivation_formula=formula_expr,
                formula_id=formula_id,
                input_parameters=params,
                sign_convention=sign_override,
            )
        )
    return records


def build_all_quantities() -> list[QuantityRecord]:
    records: list[QuantityRecord] = []
    for case_id in REQUIRED_CASE_IDS:
        records.extend(build_case_quantities(case_id))
    return sorted(records, key=lambda record: (record.case_id, record.quantity_id))


def verify_equilibrium(records: Sequence[QuantityRecord]) -> None:
    by_case: dict[str, list[QuantityRecord]] = {}
    for record in records:
        by_case.setdefault(record.case_id, []).append(record)

    asym = {record.quantity_id: record for record in by_case.get("AG-ASYM-RC", [])}
    if asym:
        total_reaction = asym["N_LEFT_FY"].expected_fraction + asym["N_RIGHT_FY"].expected_fraction
        if total_reaction != FIXTURE_ASYM_P_KN:
            raise AnalyticalGoldenValidationError("AG-ASYM-RC reactions do not sum to applied load")

    lc = by_case.get("AG-LC-LIN", [])
    if lc:
        expected = FIXTURE_LC1_FACTOR * FIXTURE_LC1_REACTION_KN + FIXTURE_LC2_FACTOR * FIXTURE_LC2_REACTION_KN
        if lc[0].expected_fraction != expected:
            raise AnalyticalGoldenValidationError("AG-LC-LIN combined reaction mismatch")


def _tolerance_justification(unit: str) -> str:
    return (
        f"EA-02 synthetic exact-arithmetic fixture; fixed-unit error budget 1E-15 {unit} absolute "
        "for Decimal/IEEE serialization; theory idealization exact (defined model, not physical error); "
        "relative 1E-12 away from zero per DS-07 default rule; frozen before comparison."
    )


def case_catalog_rows() -> list[dict[str, str]]:
    return [
        {
            "case_id": case.case_id,
            "canonical_golden_ref": case.canonical_golden_ref,
            "model_description": case.model_description,
            "boundary_conditions": case.boundary_conditions,
            "load_description": case.load_description,
            "coordinate_system": case.coordinate_system,
            "sign_convention": case.sign_convention,
            "member_end_convention": case.member_end_convention,
            "fixture_coefficient_class": case.fixture_coefficient_class,
            "derivation_method": case.derivation_method,
            "theory_source_description": case.theory_source_description,
            "approval_status": case.approval_status,
        }
        for case in CASE_DEFINITIONS.values()
    ]


def derivation_register_rows(records: Sequence[QuantityRecord]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for record in records:
        rows.append(
            {
                "case_id": record.case_id,
                "quantity_id": record.quantity_id,
                "formula_id": record.formula_id,
                "formula_expression": record.derivation_formula,
                "theory_source_description": record.theory_source_description,
                "input_parameters": json.dumps(record.input_parameters, sort_keys=True),
                "derivation_checksum": record.derivation_checksum(),
                "derivation_path": "generator",
                "approval_status": record.approval_status,
            }
        )
    return rows


def expected_values_rows(records: Sequence[QuantityRecord]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for record in records:
        rows.append(
            {
                "case_id": record.case_id,
                "quantity_id": record.quantity_id,
                "entity_type": record.entity_type,
                "entity_id": record.entity_id,
                "component": record.component,
                "member_end": record.member_end,
                "unit": record.unit,
                "expected_value": record.expected_value,
                "derivation_formula": record.derivation_formula,
                "derivation_checksum": record.derivation_checksum(),
                "coordinate_system": record.coordinate_system,
                "sign_convention": record.sign_convention,
                "member_end_convention": record.member_end_convention,
                "absolute_tolerance": str(record.absolute_tolerance),
                "relative_tolerance": str(record.relative_tolerance),
                "zero_threshold": str(record.zero_threshold),
                "comparison_rule": record.comparison_rule,
                "approval_status": record.approval_status,
            }
        )
    return rows


def tolerance_freeze_rows(records: Sequence[QuantityRecord]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for record in records:
        rows.append(
            {
                "quantity_key": record.quantity_key,
                "case_id": record.case_id,
                "quantity_id": record.quantity_id,
                "unit": record.unit,
                "absolute_tolerance": str(record.absolute_tolerance),
                "relative_tolerance": str(record.relative_tolerance),
                "zero_threshold": str(record.zero_threshold),
                "comparison_rule": record.comparison_rule,
                "freeze_justification": _tolerance_justification(record.unit),
            }
        )
    return rows


def compute_tolerance_freeze_sha256(rows: Sequence[Mapping[str, str]]) -> str:
    sorted_rows = sorted(rows, key=lambda row: row["quantity_key"])
    return sha256_bytes(canonical_csv_bytes(TOLERANCE_FREEZE_COLUMNS, sorted_rows))


def compute_raw_file_sha256(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def selected_blocker_snapshot_rows() -> list[dict[str, str]]:
    snapshot_rows = read_csv_rows(EA00_BLOCKER_SNAPSHOT_PATH)
    snapshot_by_id = {row["blocker_id"]: row for row in snapshot_rows}
    missing = [blocker_id for blocker_id in SELECTED_BLOCKER_IDS if blocker_id not in snapshot_by_id]
    if missing:
        raise AnalyticalGoldenValidationError(f"missing EA-00 snapshot rows for blockers: {missing}")
    return [dict(snapshot_by_id[blocker_id]) for blocker_id in SELECTED_BLOCKER_IDS]


def compute_selected_blocker_snapshot_sha256() -> str:
    rows = selected_blocker_snapshot_rows()
    return sha256_bytes(canonical_csv_bytes(BLOCKERS_COLUMNS, rows))


def blocker_register_rows() -> list[dict[str, str]]:
    return selected_blocker_snapshot_rows()


def _refuse_existing_artifacts(docs_dir: Path) -> None:
    existing = [name for name in PACKAGE_ARTIFACT_NAMES if (docs_dir / name).is_file()]
    if existing:
        raise ExclusiveWriteError(f"refusing to overwrite existing artifacts: {sorted(existing)}")


def _compare_generator_to_independent(records: Sequence[QuantityRecord]) -> None:
    independent = regenerate_independent_index()
    generator_index = {record.quantity_key: record for record in records}
    if set(generator_index) != set(independent):
        raise AnalyticalGoldenValidationError("generator and independent review quantity sets differ")
    for key, gen_record in generator_index.items():
        ind_record = independent[key]
        if gen_record.expected_fraction != ind_record.expected_fraction:
            raise AnalyticalGoldenValidationError(
                f"generator/independent mismatch for {key}: "
                f"{gen_record.expected_fraction} != {ind_record.expected_fraction}"
            )
        if gen_record.unit != ind_record.unit:
            raise AnalyticalGoldenValidationError(f"unit mismatch generator/independent for {key}")
        if gen_record.sign_convention != ind_record.sign_convention:
            raise AnalyticalGoldenValidationError(f"sign_convention mismatch generator/independent for {key}")


def generate_package(docs_dir: Path | None = None) -> dict[str, Any]:
    docs_dir = docs_dir or DOCS_DIR
    _refuse_existing_artifacts(docs_dir)

    records = build_all_quantities()
    verify_equilibrium(records)
    _compare_generator_to_independent(records)

    catalog_rows = sorted(case_catalog_rows(), key=lambda row: row["case_id"])
    derivation_rows = derivation_register_rows(records)
    expected_rows = expected_values_rows(records)
    tolerance_rows = sorted(tolerance_freeze_rows(records), key=lambda row: row["quantity_key"])
    tolerance_sha256 = compute_tolerance_freeze_sha256(tolerance_rows)

    write_csv_exclusive(docs_dir / CASE_CATALOG_NAME, CASE_CATALOG_COLUMNS, catalog_rows)
    write_csv_exclusive(docs_dir / DERIVATION_REGISTER_NAME, DERIVATION_REGISTER_COLUMNS, derivation_rows)
    write_csv_exclusive(docs_dir / EXPECTED_VALUES_NAME, EXPECTED_VALUES_COLUMNS, expected_rows)
    write_csv_exclusive(docs_dir / TOLERANCE_FREEZE_NAME, TOLERANCE_FREEZE_COLUMNS, tolerance_rows)

    independent_summary = generate_independent_review_artifact(docs_dir)
    blocker_rows = blocker_register_rows()
    write_csv_exclusive(docs_dir / BLOCKERS_NAME, BLOCKERS_COLUMNS, blocker_rows)

    on_disk_tolerance_sha256 = compute_raw_file_sha256(docs_dir / TOLERANCE_FREEZE_NAME)
    if on_disk_tolerance_sha256 != tolerance_sha256:
        raise AnalyticalGoldenValidationError("on-disk tolerance register SHA-256 mismatch after write")

    return {
        "package_version": PACKAGE_VERSION,
        "schema_version": SCHEMA_VERSION,
        "case_count": len(REQUIRED_CASE_IDS),
        "quantity_count": len(records),
        "tolerance_freeze_sha256": tolerance_sha256,
        "tolerance_freeze_on_disk_sha256": on_disk_tolerance_sha256,
        "independent_review_path": independent_summary["independent_review_path"],
        "independent_review_sha256": independent_summary["independent_review_sha256"],
        "selected_blocker_snapshot_sha256": compute_selected_blocker_snapshot_sha256(),
        "package_approval_status": PACKAGE_APPROVAL_STATUS,
        "package_completeness_status": PACKAGE_COMPLETENESS_STATUS,
        "canonical_gold_approval_status": CANONICAL_GOLD_APPROVAL_STATUS,
    }


def load_expected_records(path: Path) -> list[dict[str, str]]:
    rows = read_csv_rows(path)
    for column in EXPECTED_VALUES_COLUMNS:
        for row in rows:
            if column not in row or row[column] is None:
                raise AnalyticalGoldenValidationError(f"missing column {column} in expected_values.csv")
    return rows


def load_tolerance_freeze(path: Path) -> tuple[list[dict[str, str]], str]:
    rows = read_csv_rows(path)
    for column in TOLERANCE_FREEZE_COLUMNS:
        for row in rows:
            if column not in row or row[column] is None:
                raise AnalyticalGoldenValidationError(
                    f"missing column {column} in tolerance_freeze_register.csv"
                )
    return rows, compute_tolerance_freeze_sha256(rows)


def _validate_catalog(docs_dir: Path, errors: list[str]) -> None:
    catalog_path = docs_dir / CASE_CATALOG_NAME
    catalog_rows = read_csv_rows(catalog_path)
    expected_rows = sorted(case_catalog_rows(), key=lambda row: row["case_id"])
    if len(catalog_rows) != len(expected_rows):
        errors.append("analytical_case_catalog.csv row count mismatch")
    for expected, actual in zip(expected_rows, sorted(catalog_rows, key=lambda row: row["case_id"])):
        for column in CASE_CATALOG_COLUMNS:
            if actual.get(column) != expected[column]:
                errors.append(f"catalog column {column} mismatch for {expected['case_id']}")


def _validate_blockers(docs_dir: Path, errors: list[str]) -> str:
    blockers_path = docs_dir / BLOCKERS_NAME
    if not blockers_path.is_file():
        errors.append(f"missing required artifact: {blockers_path}")
        return ""

    blocker_rows = read_csv_rows(blockers_path)
    expected_rows = selected_blocker_snapshot_rows()
    actual_ids = [row["blocker_id"] for row in blocker_rows]
    if sorted(actual_ids) != sorted(SELECTED_BLOCKER_IDS):
        errors.append("analytical_golden_blockers.csv blocker_id selection mismatch")

    expected_by_id = {row["blocker_id"]: row for row in expected_rows}
    for row in blocker_rows:
        expected = expected_by_id.get(row["blocker_id"])
        if expected is None:
            errors.append(f"unexpected blocker_id in package: {row['blocker_id']}")
            continue
        for column in BLOCKERS_COLUMNS:
            if row.get(column) != expected[column]:
                errors.append(f"blocker {row['blocker_id']} column {column} not verbatim from EA-00 snapshot")

    on_disk_sha = sha256_bytes(blockers_path.read_bytes())
    expected_sha = compute_selected_blocker_snapshot_sha256()
    if on_disk_sha != expected_sha:
        errors.append("blocker register on-disk SHA-256 mismatch with EA-00 selected snapshot binding")
    return on_disk_sha


def _validate_independent_review(
    docs_dir: Path,
    generator_records: dict[str, QuantityRecord],
    errors: list[str],
) -> str:
    review_path = docs_dir / INDEPENDENT_REVIEW_EXPECTED_NAME
    if not review_path.is_file():
        errors.append(f"missing required artifact: {review_path}")
        return ""

    independent_rows, artifact_sha = read_independent_review(review_path)
    on_disk_sha = sha256_bytes(review_path.read_bytes())
    if on_disk_sha != artifact_sha:
        errors.append("independent_review_expected.csv on-disk SHA mismatch with canonicalized content")

    independent_live = regenerate_independent_index()
    if set(independent_live) != set(generator_records):
        errors.append("independent review quantity set mismatch with generator")

    review_index = {(row["case_id"], row["quantity_id"]): row for row in independent_rows}
    if len(review_index) != len(independent_rows):
        errors.append("duplicate rows in independent_review_expected.csv")

    for key, ind_live in independent_live.items():
        gen = generator_records.get(key)
        if gen is None:
            errors.append(f"missing generator record for independent quantity {key}")
            continue
        row = review_index.get((gen.case_id, gen.quantity_id))
        if row is None:
            errors.append(f"missing independent_review row for {key}")
            continue

        for column in INDEPENDENT_REVIEW_COLUMNS:
            if column == "derivation_checksum":
                if row[column] != ind_live.derivation_checksum():
                    errors.append(f"independent_review derivation_checksum mismatch for {key}")
            elif column == "expected_fraction":
                if row[column] != ind_live.expected_fraction_text:
                    errors.append(f"independent_review expected_fraction mismatch for {key}")
            elif column == "expected_value":
                if row[column] != ind_live.expected_value:
                    errors.append(f"independent_review expected_value mismatch for {key}")
            elif column == "formula_expression":
                if row[column] != ind_live.formula_expression:
                    errors.append(f"independent_review formula_expression mismatch for {key}")
            elif column == "input_parameters":
                if row[column] != json.dumps(ind_live.input_parameters, sort_keys=True):
                    errors.append(f"independent_review input_parameters mismatch for {key}")
            elif column == "unit":
                if row[column] != ind_live.unit:
                    errors.append(f"independent_review unit mismatch for {key}")
            elif column == "sign_convention":
                if row[column] != ind_live.sign_convention:
                    errors.append(f"independent_review sign_convention mismatch for {key}")
            elif column == "model_assumptions":
                if row[column] != ind_live.model_assumptions:
                    errors.append(f"independent_review model_assumptions mismatch for {key}")
            elif column == "case_id":
                if row[column] != ind_live.case_id:
                    errors.append(f"independent_review case_id mismatch for {key}")
            elif column == "quantity_id":
                if row[column] != ind_live.quantity_id:
                    errors.append(f"independent_review quantity_id mismatch for {key}")

        if gen.expected_fraction != ind_live.expected_fraction:
            errors.append(f"generator/independent value mismatch for {key}")
        if gen.expected_value != ind_live.expected_value:
            errors.append(f"generator/independent decimal value mismatch for {key}")
        if gen.unit != ind_live.unit:
            errors.append(f"generator/independent unit mismatch for {key}")
        if gen.sign_convention != ind_live.sign_convention:
            errors.append(f"generator/independent sign mismatch for {key}")

    return artifact_sha


def validate_package(
    docs_dir: Path | None = None,
    *,
    expected_tolerance_sha256: str,
) -> dict[str, Any]:
    docs_dir = docs_dir or DOCS_DIR
    errors: list[str] = []

    expected_path = docs_dir / EXPECTED_VALUES_NAME
    tolerance_path = docs_dir / TOLERANCE_FREEZE_NAME
    derivation_path = docs_dir / DERIVATION_REGISTER_NAME

    for required in (expected_path, tolerance_path, derivation_path, docs_dir / CASE_CATALOG_NAME):
        if not required.is_file():
            errors.append(f"missing required artifact: {required}")

    if errors:
        raise AnalyticalGoldenValidationError("; ".join(errors))

    _validate_catalog(docs_dir, errors)
    blocker_sha = _validate_blockers(docs_dir, errors)

    generator_records_list = build_all_quantities()
    verify_equilibrium(generator_records_list)
    generator_records = {record.quantity_key: record for record in generator_records_list}

    independent_sha = _validate_independent_review(docs_dir, generator_records, errors)

    expected_rows = load_expected_records(expected_path)
    tolerance_rows, tolerance_sha256 = load_tolerance_freeze(tolerance_path)
    on_disk_tolerance_sha = compute_raw_file_sha256(tolerance_path)

    if tolerance_sha256 != expected_tolerance_sha256.lower():
        errors.append("tolerance freeze SHA-256 mismatch")
    if on_disk_tolerance_sha != tolerance_sha256:
        errors.append("on-disk tolerance register raw SHA-256 mismatch with canonical freeze hash")

    expected_by_key = {(row["case_id"], row["quantity_id"]): row for row in expected_rows}
    tolerance_by_key = {row["quantity_key"]: row for row in tolerance_rows}

    if len(expected_by_key) != len(expected_rows):
        errors.append("duplicate quantity rows in expected_values.csv")

    if set(tolerance_by_key) != set(generator_records):
        errors.append("tolerance freeze quantity_key set mismatch with generator quantities")

    for key, gen_record in sorted(generator_records.items()):
        row = expected_by_key.get((gen_record.case_id, gen_record.quantity_id))
        if row is None:
            errors.append(f"missing expected row for {key}")
            continue

        for column in EXPECTED_VALUES_COLUMNS:
            if column == "expected_value":
                if row[column] != gen_record.expected_value:
                    errors.append(f"expected_value mismatch for {key}")
            elif column == "derivation_checksum":
                if row[column] != gen_record.derivation_checksum():
                    errors.append(f"derivation_checksum mismatch for {key}")
            elif column == "derivation_formula":
                if row[column] != gen_record.derivation_formula:
                    errors.append(f"derivation_formula mismatch for {key}")
            elif column == "approval_status":
                if row[column] != PACKAGE_APPROVAL_STATUS:
                    errors.append(f"approval_status mismatch for {key}")
            else:
                expected_value = getattr(gen_record, column, None)
                if expected_value is None:
                    field_map = {
                        "entity_type": gen_record.entity_type,
                        "entity_id": gen_record.entity_id,
                        "component": gen_record.component,
                        "member_end": gen_record.member_end,
                        "unit": gen_record.unit,
                        "coordinate_system": gen_record.coordinate_system,
                        "sign_convention": gen_record.sign_convention,
                        "member_end_convention": gen_record.member_end_convention,
                        "absolute_tolerance": str(gen_record.absolute_tolerance),
                        "relative_tolerance": str(gen_record.relative_tolerance),
                        "zero_threshold": str(gen_record.zero_threshold),
                        "comparison_rule": gen_record.comparison_rule,
                    }
                    expected_value = field_map.get(column)
                if str(expected_value) != row[column]:
                    errors.append(f"expected_values {column} mismatch for {key}")

        tol = tolerance_by_key.get(key)
        if tol is None:
            errors.append(f"missing tolerance row for {key}")
            continue

        expected_tol_row = next(
            row for row in tolerance_freeze_rows([gen_record])
        )
        for column in TOLERANCE_FREEZE_COLUMNS:
            if tol[column] != expected_tol_row[column]:
                errors.append(f"tolerance freeze {column} mismatch for {key}")

    derivation_rows = read_csv_rows(derivation_path)
    derivation_index = {(row["case_id"], row["quantity_id"]): row for row in derivation_rows}
    if len(derivation_index) != len(derivation_rows):
        errors.append("duplicate rows in derivation_register.csv")

    for key, gen_record in generator_records.items():
        deriv = derivation_index.get((gen_record.case_id, gen_record.quantity_id))
        if deriv is None:
            errors.append(f"missing derivation_register row for {key}")
            continue
        expected_deriv = derivation_register_rows([gen_record])[0]
        for column in DERIVATION_REGISTER_COLUMNS:
            if deriv.get(column) != expected_deriv[column]:
                errors.append(f"derivation_register {column} mismatch for {key}")

    if errors:
        raise AnalyticalGoldenValidationError("; ".join(errors))

    return {
        "valid": True,
        "package_version": PACKAGE_VERSION,
        "schema_version": SCHEMA_VERSION,
        "quantity_count": len(generator_records),
        "tolerance_freeze_sha256": tolerance_sha256,
        "tolerance_freeze_on_disk_sha256": on_disk_tolerance_sha,
        "independent_review_sha256": independent_sha,
        "selected_blocker_snapshot_sha256": blocker_sha,
        "package_approval_status": PACKAGE_APPROVAL_STATUS,
        "package_completeness_status": PACKAGE_COMPLETENESS_STATUS,
        "canonical_gold_approval_status": CANONICAL_GOLD_APPROVAL_STATUS,
    }


def evaluate_comparison(
    expected_value: Decimal,
    actual_value: Decimal,
    *,
    absolute_tolerance: Decimal,
    relative_tolerance: Decimal,
    zero_threshold: Decimal,
    comparison_rule: str,
) -> tuple[bool, Decimal, Decimal]:
    if not actual_value.is_finite() or not expected_value.is_finite():
        return False, Decimal("NaN"), Decimal("NaN")

    absolute_error = abs(actual_value - expected_value)
    if expected_value.copy_abs() <= zero_threshold:
        passed = absolute_error <= absolute_tolerance
        relative_error = Decimal(0) if expected_value == 0 else absolute_error / expected_value.copy_abs()
        return passed, absolute_error, relative_error

    if comparison_rule != COMPARISON_RULE_DEFAULT:
        raise AnalyticalGoldenComparisonError(f"unsupported comparison rule: {comparison_rule}")

    bound = max(absolute_tolerance, relative_tolerance * expected_value.copy_abs())
    relative_error = absolute_error / expected_value.copy_abs()
    return absolute_error <= bound, absolute_error, relative_error


def compare_actual_bundle(
    actual_rows: Sequence[Mapping[str, str]],
    docs_dir: Path | None = None,
    *,
    tolerance_freeze_sha256: str,
) -> dict[str, Any]:
    docs_dir = docs_dir or DOCS_DIR
    validate_package(docs_dir, expected_tolerance_sha256=tolerance_freeze_sha256)

    expected_rows = load_expected_records(docs_dir / EXPECTED_VALUES_NAME)
    tolerance_rows, computed_sha256 = load_tolerance_freeze(docs_dir / TOLERANCE_FREEZE_NAME)
    if computed_sha256 != tolerance_freeze_sha256.lower():
        raise AnalyticalGoldenComparisonError("tolerance freeze SHA-256 rejected")

    expected_index = {(row["case_id"], row["quantity_id"]): row for row in expected_rows}
    tolerance_index = {row["quantity_key"]: row for row in tolerance_rows}

    actual_index: dict[tuple[str, str], Mapping[str, str]] = {}
    results: list[dict[str, str]] = []
    failures: list[str] = []

    for row in actual_rows:
        case_id = row.get("case_id", "")
        quantity_id = row.get("quantity_id", "")
        key = (case_id, quantity_id)
        if key in actual_index:
            failures.append(f"duplicate actual quantity: {case_id}|{quantity_id}")
            continue
        actual_index[key] = row

    expected_keys = set(expected_index)
    actual_keys = set(actual_index)
    if expected_keys != actual_keys:
        missing = expected_keys - actual_keys
        extra = actual_keys - expected_keys
        if missing:
            failures.append(f"missing quantities: {sorted(missing)}")
        if extra:
            failures.append(f"extra quantities: {sorted(extra)}")

    for key in sorted(expected_keys & actual_keys):
        expected = expected_index[key]
        actual = actual_index[key]
        quantity_key = f"{key[0]}|{key[1]}"
        tol = tolerance_index[quantity_key]

        if actual.get("unit") != expected["unit"]:
            failures.append(f"unit mismatch for {quantity_key}")
            continue

        try:
            expected_decimal = parse_decimal(expected["expected_value"])
            actual_decimal = parse_decimal(str(actual.get("actual_value", "")))
            absolute_tolerance = parse_decimal(tol["absolute_tolerance"])
            relative_tolerance = parse_decimal(tol["relative_tolerance"])
            zero_threshold = parse_decimal(tol["zero_threshold"])
        except AnalyticalGoldenValidationError as exc:
            failures.append(f"{quantity_key}: {exc}")
            continue

        passed, abs_err, rel_err = evaluate_comparison(
            expected_decimal,
            actual_decimal,
            absolute_tolerance=absolute_tolerance,
            relative_tolerance=relative_tolerance,
            zero_threshold=zero_threshold,
            comparison_rule=tol["comparison_rule"],
        )
        verdict = "PASS" if passed else "FAIL"
        if not passed:
            failures.append(f"numeric mismatch for {quantity_key}")
        results.append(
            {
                "case_id": key[0],
                "quantity_id": key[1],
                "expected_value": expected["expected_value"],
                "actual_value": str(actual.get("actual_value", "")),
                "absolute_error": format(abs_err, "f"),
                "relative_error": format(rel_err, "f"),
                "verdict": verdict,
            }
        )

    overall = "PASS" if not failures else "FAIL"
    return {
        "overall_verdict": overall,
        "tolerance_freeze_sha256": computed_sha256,
        "comparison_count": len(results),
        "failures": failures,
        "results": results,
    }


SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")


def validate_sha256_argument(value: str) -> str:
    lowered = value.lower()
    if not SHA256_PATTERN.fullmatch(lowered):
        raise AnalyticalGoldenValidationError("tolerance-freeze-sha256 must be 64 lowercase hex characters")
    return lowered
