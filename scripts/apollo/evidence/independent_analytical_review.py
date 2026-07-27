"""Independent stdlib analytical review for EA-02 (stdlib-only; no generator core imports)."""

from __future__ import annotations

import csv
import hashlib
import io
import json
from dataclasses import dataclass
from decimal import Decimal, getcontext
from fractions import Fraction
from pathlib import Path
from typing import Iterable, Mapping, Sequence

INDEPENDENT_REVIEW_EXPECTED_NAME = "independent_review_expected.csv"

INDEPENDENT_REVIEW_COLUMNS = (
    "case_id",
    "quantity_id",
    "formula_expression",
    "input_parameters",
    "expected_fraction",
    "expected_value",
    "unit",
    "sign_convention",
    "model_assumptions",
    "derivation_checksum",
)

DECIMAL_PRECISION = 50

# Literal rational fixture coefficients — independent literals, not shared with generator module.
_STEEL_E_KN_M2 = Fraction(205_000_000)
_POISSON_NU = Fraction(3, 10)
_SHEAR_G_KN_M2 = _STEEL_E_KN_M2 / (Fraction(2) * (Fraction(1) + _POISSON_NU))
_SECTION_A_M2 = Fraction(1, 50)
_SECTION_I_M4 = Fraction(1, 10_000)
_SECTION_J_M4 = Fraction(1, 20_000)
_BEAM_SPAN_L_M = Fraction(4)
_POINT_LOAD_P_KN = Fraction(10)
_UDL_W_KN_M = Fraction(2)
_TORQUE_T_KN_M = Fraction(5)
_AXIAL_FORCE_F_KN = Fraction(50)

_ASYM_SPAN_L_M = Fraction(6)
_ASYM_LOAD_P_KN = Fraction(12)
_ASYM_OFFSET_A_M = Fraction(2)

_LC_FACTOR_ONE = Fraction(1)
_LC_FACTOR_TWO = Fraction(3, 5)
_LC_REACTION_ONE_KN = Fraction(10)
_LC_REACTION_TWO_KN = Fraction(5)

EULER_BERNOULLI_IDEALIZATION = (
    "Euler-Bernoulli prismatic linear elastic small-displacement beam; shear deformation excluded; "
    "theory idealization is the defined model (no separate physical-model error budget)."
)
SAINT_VENANT_IDEALIZATION = (
    "Saint-Venant prismatic section with J explicitly the torsion constant; warping effects excluded; "
    "theory idealization is the defined model (no separate physical-model error budget)."
)
AXIAL_IDEALIZATION = (
    "Uniform prismatic bar linear elastic axial member; theory idealization is the defined model "
    "(no separate physical-model error budget)."
)
STATICS_IDEALIZATION = (
    "Rigid-body static equilibrium of simply-supported beam; theory idealization is the defined model "
    "(no separate physical-model error budget)."
)
SYNTHETIC_LC_IDEALIZATION = (
    "Synthetic EA-02 linear superposition fixture coefficient; not DS-04 adopted combination rule."
)

SECTION_MOMENT_SIGN = (
    "Section bending moment sagging positive; distinct from FE nodal end-action vector convention."
)
CANT_SIGN = "Positive load acts in +Y; downward load is -P; positive reaction opposes load"
SS_SIGN = "Positive load acts in +Y; downward load is -P; reactions positive upward"
UDL_SIGN = "Positive distributed load in +Y; applied load is -w; reactions positive upward"
AXIAL_SIGN = "Positive axial force is tension; elongation positive in +X; fixed-end reaction opposes applied end force"
TORSION_SIGN = "Positive torque about +X; fixed-end reaction torque opposes applied end torque"
ASYM_SIGN = "Downward load -P; reactions positive upward"


class IndependentReviewError(Exception):
    """Raised when independent review derivation or artifact validation fails."""


@dataclass(frozen=True)
class IndependentReviewRecord:
    case_id: str
    quantity_id: str
    formula_expression: str
    input_parameters: Mapping[str, str]
    expected_fraction: Fraction
    unit: str
    sign_convention: str
    model_assumptions: str

    @property
    def quantity_key(self) -> str:
        return f"{self.case_id}|{self.quantity_id}"

    @property
    def expected_value(self) -> str:
        return _fraction_to_decimal_string(self.expected_fraction)

    @property
    def expected_fraction_text(self) -> str:
        return f"{self.expected_fraction.numerator}/{self.expected_fraction.denominator}"

    def derivation_checksum(self) -> str:
        payload = {
            "case_id": self.case_id,
            "quantity_id": self.quantity_id,
            "formula_expression": self.formula_expression,
            "input_parameters": dict(sorted(self.input_parameters.items())),
            "expected_fraction": self.expected_fraction_text,
        }
        return _sha256_text(json.dumps(payload, sort_keys=True, separators=(",", ":")))


def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _fraction_to_decimal_string(value: Fraction) -> str:
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


def _params(**kwargs: Fraction) -> dict[str, str]:
    return {key: f"{value.numerator}/{value.denominator}" for key, value in sorted(kwargs.items())}


def _invert_sign_via_equilibrium(value: Fraction) -> Fraction:
    """Alternate invariant: fixed-end reaction equals negated applied end action."""
    return -value


# --- Alternate derivation paths (independent arithmetic structure) ---


def _alt_cant_tip_uy() -> Fraction:
    ell_cubed = _BEAM_SPAN_L_M ** 3
    numerator = _POINT_LOAD_P_KN * ell_cubed * _SECTION_I_M4.denominator * _STEEL_E_KN_M2.denominator
    denominator = 3 * _STEEL_E_KN_M2.numerator * _SECTION_I_M4.numerator * ell_cubed.denominator
    return -Fraction(numerator, denominator)


def _alt_cant_tip_rz() -> Fraction:
    ell_sq = _BEAM_SPAN_L_M ** 2
    numerator = _POINT_LOAD_P_KN * ell_sq * _SECTION_I_M4.denominator * _STEEL_E_KN_M2.denominator
    denominator = 2 * _STEEL_E_KN_M2.numerator * _SECTION_I_M4.numerator * ell_sq.denominator
    return -Fraction(numerator, denominator)


def _alt_ss_center_uy() -> Fraction:
    ell_cubed = _BEAM_SPAN_L_M ** 3
    numerator = _POINT_LOAD_P_KN * ell_cubed * _SECTION_I_M4.denominator * _STEEL_E_KN_M2.denominator
    denominator = 48 * _STEEL_E_KN_M2.numerator * _SECTION_I_M4.numerator * ell_cubed.denominator
    return -Fraction(numerator, denominator)


def _alt_ss_udl_uy() -> Fraction:
    ell_fourth = _BEAM_SPAN_L_M ** 4
    weighted = Fraction(5) * _UDL_W_KN_M * ell_fourth
    numerator = weighted.numerator * _SECTION_I_M4.denominator * _STEEL_E_KN_M2.denominator
    denominator = 384 * _STEEL_E_KN_M2.numerator * _SECTION_I_M4.numerator * weighted.denominator
    return -Fraction(numerator, denominator)


def _alt_asym_moment_direct() -> Fraction:
    """Direct asymmetric bending invariant: M = P*a*(L-a)/L at load point."""
    return _ASYM_LOAD_P_KN * _ASYM_OFFSET_A_M * (_ASYM_SPAN_L_M - _ASYM_OFFSET_A_M) / _ASYM_SPAN_L_M


def _alt_lc_combined() -> Fraction:
    return _LC_REACTION_ONE_KN * _LC_FACTOR_ONE + _LC_REACTION_TWO_KN * _LC_FACTOR_TWO


def build_all_independent_records() -> list[IndependentReviewRecord]:
    records: list[IndependentReviewRecord] = []

    records.extend(
        [
            IndependentReviewRecord(
                case_id="AG-CANT-P",
                quantity_id="N2_UY",
                formula_expression="-P*L^3/(3*E*I)",
                input_parameters=_params(P=_POINT_LOAD_P_KN, L=_BEAM_SPAN_L_M, E=_STEEL_E_KN_M2, I=_SECTION_I_M4),
                expected_fraction=_alt_cant_tip_uy(),
                unit="m",
                sign_convention=CANT_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-CANT-P",
                quantity_id="N2_RZ",
                formula_expression="-P*L^2/(2*E*I)",
                input_parameters=_params(P=_POINT_LOAD_P_KN, L=_BEAM_SPAN_L_M, E=_STEEL_E_KN_M2, I=_SECTION_I_M4),
                expected_fraction=_alt_cant_tip_rz(),
                unit="rad",
                sign_convention=CANT_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-CANT-P",
                quantity_id="N1_FY",
                formula_expression="P",
                input_parameters=_params(P=_POINT_LOAD_P_KN),
                expected_fraction=_POINT_LOAD_P_KN,
                unit="kN",
                sign_convention=CANT_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-CANT-P",
                quantity_id="N1_MZ",
                formula_expression="P*L",
                input_parameters=_params(P=_POINT_LOAD_P_KN, L=_BEAM_SPAN_L_M),
                expected_fraction=_POINT_LOAD_P_KN * _BEAM_SPAN_L_M,
                unit="kN_m",
                sign_convention=CANT_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
        ]
    )

    half_reaction = _POINT_LOAD_P_KN / Fraction(2)
    midspan_moment = _POINT_LOAD_P_KN * _BEAM_SPAN_L_M / Fraction(4)
    records.extend(
        [
            IndependentReviewRecord(
                case_id="AG-SS-CL",
                quantity_id="N2_UY",
                formula_expression="-P*L^3/(48*E*I)",
                input_parameters=_params(P=_POINT_LOAD_P_KN, L=_BEAM_SPAN_L_M, E=_STEEL_E_KN_M2, I=_SECTION_I_M4),
                expected_fraction=_alt_ss_center_uy(),
                unit="m",
                sign_convention=SS_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-SS-CL",
                quantity_id="N1_FY",
                formula_expression="P/2",
                input_parameters=_params(P=_POINT_LOAD_P_KN),
                expected_fraction=half_reaction,
                unit="kN",
                sign_convention=SS_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-SS-CL",
                quantity_id="N3_FY",
                formula_expression="P/2",
                input_parameters=_params(P=_POINT_LOAD_P_KN),
                expected_fraction=half_reaction,
                unit="kN",
                sign_convention=SS_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-SS-CL",
                quantity_id="M1_MZ_I",
                formula_expression="0",
                input_parameters=_params(),
                expected_fraction=Fraction(0),
                unit="kN_m",
                sign_convention=SECTION_MOMENT_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-SS-CL",
                quantity_id="M1_MZ_J",
                formula_expression="P*L/4",
                input_parameters=_params(P=_POINT_LOAD_P_KN, L=_BEAM_SPAN_L_M),
                expected_fraction=midspan_moment,
                unit="kN_m",
                sign_convention=SECTION_MOMENT_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-SS-CL",
                quantity_id="M2_MZ_I",
                formula_expression="P*L/4",
                input_parameters=_params(P=_POINT_LOAD_P_KN, L=_BEAM_SPAN_L_M),
                expected_fraction=midspan_moment,
                unit="kN_m",
                sign_convention=SECTION_MOMENT_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-SS-CL",
                quantity_id="M2_MZ_J",
                formula_expression="0",
                input_parameters=_params(),
                expected_fraction=Fraction(0),
                unit="kN_m",
                sign_convention=SECTION_MOMENT_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
        ]
    )

    udl_reaction = _UDL_W_KN_M * _BEAM_SPAN_L_M / Fraction(2)
    udl_midspan_moment = _UDL_W_KN_M * _BEAM_SPAN_L_M ** 2 / Fraction(8)
    records.extend(
        [
            IndependentReviewRecord(
                case_id="AG-SS-UDL",
                quantity_id="N2_UY",
                formula_expression="-5*w*L^4/(384*E*I)",
                input_parameters=_params(w=_UDL_W_KN_M, L=_BEAM_SPAN_L_M, E=_STEEL_E_KN_M2, I=_SECTION_I_M4),
                expected_fraction=_alt_ss_udl_uy(),
                unit="m",
                sign_convention=UDL_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-SS-UDL",
                quantity_id="N1_FY",
                formula_expression="w*L/2",
                input_parameters=_params(w=_UDL_W_KN_M, L=_BEAM_SPAN_L_M),
                expected_fraction=udl_reaction,
                unit="kN",
                sign_convention=UDL_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-SS-UDL",
                quantity_id="N3_FY",
                formula_expression="w*L/2",
                input_parameters=_params(w=_UDL_W_KN_M, L=_BEAM_SPAN_L_M),
                expected_fraction=udl_reaction,
                unit="kN",
                sign_convention=UDL_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-SS-UDL",
                quantity_id="M1_MZ_I",
                formula_expression="0",
                input_parameters=_params(),
                expected_fraction=Fraction(0),
                unit="kN_m",
                sign_convention=SECTION_MOMENT_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-SS-UDL",
                quantity_id="M1_MZ_J",
                formula_expression="w*L^2/8",
                input_parameters=_params(w=_UDL_W_KN_M, L=_BEAM_SPAN_L_M),
                expected_fraction=udl_midspan_moment,
                unit="kN_m",
                sign_convention=SECTION_MOMENT_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-SS-UDL",
                quantity_id="M2_MZ_I",
                formula_expression="w*L^2/8",
                input_parameters=_params(w=_UDL_W_KN_M, L=_BEAM_SPAN_L_M),
                expected_fraction=udl_midspan_moment,
                unit="kN_m",
                sign_convention=SECTION_MOMENT_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-SS-UDL",
                quantity_id="M2_MZ_J",
                formula_expression="0",
                input_parameters=_params(),
                expected_fraction=Fraction(0),
                unit="kN_m",
                sign_convention=SECTION_MOMENT_SIGN,
                model_assumptions=EULER_BERNOULLI_IDEALIZATION,
            ),
        ]
    )

    records.extend(
        [
            IndependentReviewRecord(
                case_id="AG-AXIAL",
                quantity_id="N2_UX",
                formula_expression="F*L/(E*A)",
                input_parameters=_params(F=_AXIAL_FORCE_F_KN, L=_BEAM_SPAN_L_M, E=_STEEL_E_KN_M2, A=_SECTION_A_M2),
                expected_fraction=_AXIAL_FORCE_F_KN * _BEAM_SPAN_L_M / (_STEEL_E_KN_M2 * _SECTION_A_M2),
                unit="m",
                sign_convention=AXIAL_SIGN,
                model_assumptions=AXIAL_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-AXIAL",
                quantity_id="N1_FX",
                formula_expression="-F",
                input_parameters=_params(F=_AXIAL_FORCE_F_KN),
                expected_fraction=_invert_sign_via_equilibrium(_AXIAL_FORCE_F_KN),
                unit="kN",
                sign_convention=AXIAL_SIGN,
                model_assumptions=AXIAL_IDEALIZATION,
            ),
        ]
    )

    asym_left = _ASYM_LOAD_P_KN * (_ASYM_SPAN_L_M - _ASYM_OFFSET_A_M) / _ASYM_SPAN_L_M
    asym_right = _ASYM_LOAD_P_KN * _ASYM_OFFSET_A_M / _ASYM_SPAN_L_M
    asym_moment = _alt_asym_moment_direct()
    records.extend(
        [
            IndependentReviewRecord(
                case_id="AG-ASYM-RC",
                quantity_id="N_LEFT_FY",
                formula_expression="P*(L-a)/L",
                input_parameters=_params(P=_ASYM_LOAD_P_KN, L=_ASYM_SPAN_L_M, a=_ASYM_OFFSET_A_M),
                expected_fraction=asym_left,
                unit="kN",
                sign_convention=ASYM_SIGN,
                model_assumptions=STATICS_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-ASYM-RC",
                quantity_id="N_RIGHT_FY",
                formula_expression="P*a/L",
                input_parameters=_params(P=_ASYM_LOAD_P_KN, L=_ASYM_SPAN_L_M, a=_ASYM_OFFSET_A_M),
                expected_fraction=asym_right,
                unit="kN",
                sign_convention=ASYM_SIGN,
                model_assumptions=STATICS_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-ASYM-RC",
                quantity_id="M_AT_LOAD",
                formula_expression="P*a*(L-a)/L",
                input_parameters=_params(P=_ASYM_LOAD_P_KN, L=_ASYM_SPAN_L_M, a=_ASYM_OFFSET_A_M),
                expected_fraction=asym_moment,
                unit="kN_m",
                sign_convention=ASYM_SIGN,
                model_assumptions=STATICS_IDEALIZATION,
            ),
        ]
    )

    records.append(
        IndependentReviewRecord(
            case_id="AG-LC-LIN",
            quantity_id="COMB_FY",
            formula_expression="f1*q1+f2*q2",
            input_parameters=_params(
                f1=_LC_FACTOR_ONE,
                q1=_LC_REACTION_ONE_KN,
                f2=_LC_FACTOR_TWO,
                q2=_LC_REACTION_TWO_KN,
            ),
            expected_fraction=_alt_lc_combined(),
            unit="kN",
            sign_convention="Positive reaction upward; combination is linear superposition",
            model_assumptions=SYNTHETIC_LC_IDEALIZATION,
        )
    )

    records.extend(
        [
            IndependentReviewRecord(
                case_id="AG-TORSION",
                quantity_id="N2_RX",
                formula_expression="T*L/(G*J)",
                input_parameters=_params(
                    T=_TORQUE_T_KN_M,
                    L=_BEAM_SPAN_L_M,
                    G=_SHEAR_G_KN_M2,
                    J=_SECTION_J_M4,
                ),
                expected_fraction=_TORQUE_T_KN_M * _BEAM_SPAN_L_M / (_SHEAR_G_KN_M2 * _SECTION_J_M4),
                unit="rad",
                sign_convention=TORSION_SIGN,
                model_assumptions=SAINT_VENANT_IDEALIZATION,
            ),
            IndependentReviewRecord(
                case_id="AG-TORSION",
                quantity_id="N1_MX",
                formula_expression="-T",
                input_parameters=_params(T=_TORQUE_T_KN_M),
                expected_fraction=_invert_sign_via_equilibrium(_TORQUE_T_KN_M),
                unit="kN_m",
                sign_convention=TORSION_SIGN,
                model_assumptions=SAINT_VENANT_IDEALIZATION,
            ),
        ]
    )

    return records


def verify_independent_invariants(records: Sequence[IndependentReviewRecord]) -> None:
    by_case: dict[str, list[IndependentReviewRecord]] = {}
    for record in records:
        by_case.setdefault(record.case_id, []).append(record)

    asym = {record.quantity_id: record for record in by_case.get("AG-ASYM-RC", [])}
    if asym:
        total = asym["N_LEFT_FY"].expected_fraction + asym["N_RIGHT_FY"].expected_fraction
        if total != _ASYM_LOAD_P_KN:
            raise IndependentReviewError("AG-ASYM-RC vertical equilibrium invariant failed")
        direct_moment = _alt_asym_moment_direct()
        if asym["M_AT_LOAD"].expected_fraction != direct_moment:
            raise IndependentReviewError("AG-ASYM-RC moment must equal P*a*(L-a)/L invariant")

    lc = by_case.get("AG-LC-LIN", [])
    if lc and lc[0].expected_fraction != _alt_lc_combined():
        raise IndependentReviewError("AG-LC-LIN combination invariant failed")


def independent_review_rows(records: Sequence[IndependentReviewRecord]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for record in records:
        rows.append(
            {
                "case_id": record.case_id,
                "quantity_id": record.quantity_id,
                "formula_expression": record.formula_expression,
                "input_parameters": json.dumps(record.input_parameters, sort_keys=True),
                "expected_fraction": record.expected_fraction_text,
                "expected_value": record.expected_value,
                "unit": record.unit,
                "sign_convention": record.sign_convention,
                "model_assumptions": record.model_assumptions,
                "derivation_checksum": record.derivation_checksum(),
            }
        )
    return rows


def _canonical_csv_bytes(fieldnames: Sequence[str], rows: Iterable[Mapping[str, str]]) -> bytes:
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


def compute_independent_review_sha256(rows: Sequence[Mapping[str, str]]) -> str:
    sorted_rows = sorted(rows, key=lambda row: (row["case_id"], row["quantity_id"]))
    return _sha256_bytes(_canonical_csv_bytes(INDEPENDENT_REVIEW_COLUMNS, sorted_rows))


def write_independent_review_exclusive(path: Path, rows: Sequence[Mapping[str, str]]) -> None:
    sorted_rows = sorted(rows, key=lambda row: (row["case_id"], row["quantity_id"]))
    data = _canonical_csv_bytes(INDEPENDENT_REVIEW_COLUMNS, sorted_rows)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("xb") as handle:
            handle.write(data)
    except FileExistsError as exc:
        raise IndependentReviewError(f"refusing to overwrite existing file: {path}") from exc


def read_independent_review(path: Path) -> tuple[list[dict[str, str]], str]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise IndependentReviewError(f"missing CSV header: {path}")
        rows = list(reader)
    for column in INDEPENDENT_REVIEW_COLUMNS:
        for row in rows:
            if column not in row or row[column] is None:
                raise IndependentReviewError(f"missing column {column} in {path}")
    return rows, compute_independent_review_sha256(rows)


def generate_independent_review_artifact(docs_dir: Path) -> dict[str, object]:
    records = build_all_independent_records()
    verify_independent_invariants(records)
    rows = independent_review_rows(records)
    artifact_path = docs_dir / INDEPENDENT_REVIEW_EXPECTED_NAME
    write_independent_review_exclusive(artifact_path, rows)
    sha256 = compute_independent_review_sha256(rows)
    return {
        "independent_review_path": str(artifact_path),
        "independent_review_sha256": sha256,
        "independent_review_quantity_count": len(records),
    }


def regenerate_independent_index() -> dict[str, IndependentReviewRecord]:
    records = build_all_independent_records()
    verify_independent_invariants(records)
    return {record.quantity_key: record for record in records}
