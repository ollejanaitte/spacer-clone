"""Shared core for EA-04 SPACER numeric parity harness (DS-08 PAR-BLK-006)."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import re
from dataclasses import dataclass, field
from decimal import Decimal, getcontext
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

getcontext().prec = 50

PACKAGE_VERSION = "1.0.0"
HARNESS_VERSION = "1.1.0"
SCHEMA_VERSION_RAW = "apollo.parity.raw.v1"
SCHEMA_VERSION_CANONICAL = "apollo.parity.canonical.v1"
SCHEMA_VERSION_MAPPING = "apollo.parity.mapping.v1"
SCHEMA_VERSION_COMPARISON = "apollo.parity.comparison.v1"
SCHEMA_VERSION_MISMATCH = "apollo.parity.mismatch.v1"
COMPARISON_RULE_DEFAULT = "abs(a-e) <= max(A, R*|e|)"
EVIDENCE_LABEL_SYNTHETIC = "NOT_ACTUAL_SPACER_PARITY"

REPO_ROOT = Path(__file__).resolve().parents[3]
DOCS_DIR = REPO_ROOT / "docs" / "apollo" / "evidence-collection" / "04_parity_harness"
TOLERANCE_FREEZE_NAME = "tolerance_freeze_register.csv"

ENTITY_TYPES = frozenset({"node", "member", "material", "support"})
COORDINATE_CONTEXTS = frozenset({"global", "local", "support"})
MEMBER_ENDS = frozenset({"", "I", "J"})
PRODUCERS = frozenset({"spacer", "apollo"})
DOF_COMPONENTS = ("ux", "uy", "uz", "rx", "ry", "rz")
SIGN_COMPONENTS = ("ux", "uy", "uz", "rx", "ry", "rz", "fx", "fy", "fz", "mx", "my", "mz")
VECTOR_GROUPS: dict[str, tuple[str, ...]] = {
    "translation": ("ux", "uy", "uz"),
    "rotation": ("rx", "ry", "rz"),
    "force": ("fx", "fy", "fz"),
    "moment": ("mx", "my", "mz"),
}

MISMATCH_CLASSIFICATIONS = (
    "MODEL_MAPPING_ERROR",
    "UNIT_CONVERSION_ERROR",
    "SIGN_CONVENTION_ERROR",
    "MEMBER_END_ERROR",
    "COORDINATE_TRANSFORM_ERROR",
    "LOAD_CASE_MAPPING_ERROR",
    "COMBINATION_RULE_ERROR",
    "SOLVER_NUMERIC_DIFFERENCE",
    "ROUNDING_DISPLAY_DIFFERENCE",
    "MISSING_OUTPUT",
    "EXTRA_OUTPUT",
    "STALE_OUTPUT",
    "UNSUPPORTED_FEATURE",
    "UNKNOWN_REQUIRES_EVIDENCE",
)

TOLERANCE_FREEZE_COLUMNS = (
    "quantity_key",
    "entity_type",
    "entity_id",
    "load_case_id",
    "combination_id",
    "coordinate_context",
    "dof",
    "member_end",
    "quantity",
    "feature",
    "unit",
    "absolute_tolerance",
    "relative_tolerance",
    "zero_threshold",
    "comparison_rule",
    "freeze_justification",
)

RAW_REQUIRED_TOP = (
    "schema_version",
    "producer",
    "producer_version",
    "producer_build",
    "executable_sha256",
    "model_identity",
    "model_version",
    "source_artifact_sha256",
    "stale",
    "evidence_label",
    "rows",
)

RAW_ROW_REQUIRED = (
    "entity_type",
    "entity_id",
    "load_case_id",
    "combination_id",
    "coordinate_context",
    "dof",
    "member_end",
    "quantity",
    "unit",
    "internal_value",
    "display_value",
    "internal_precision",
    "display_precision",
    "feature",
)

CANONICAL_REQUIRED_TOP = (
    "schema_version",
    "producer",
    "producer_version",
    "producer_build",
    "executable_sha256",
    "model_identity",
    "model_version",
    "source_artifact_sha256",
    "raw_sha256",
    "mapping_sha256",
    "raw_file_byte_sha256",
    "mapping_file_byte_sha256",
    "stale",
    "evidence_label",
    "rows",
    "exclusions",
)

MAPPING_REQUIRED_TOP = (
    "schema_version",
    "mapping_id",
    "spacer_model_identity",
    "apollo_model_identity",
    "spacer_model_version",
    "apollo_model_version",
    "spacer_source_artifact_sha256",
    "apollo_source_artifact_sha256",
    "spacer_producer_version",
    "spacer_producer_build",
    "spacer_executable_sha256",
    "apollo_producer_version",
    "apollo_producer_build",
    "apollo_executable_sha256",
    "node_map",
    "member_map",
    "material_map",
    "support_map",
    "load_case_map",
    "combination_map",
    "quantity_map",
    "coordinate_transforms",
    "dof_permutation",
    "member_end_transform",
    "sign_transform",
    "quantity_sign_transform",
    "unit_conversion",
    "exclusions",
)

SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")

SYNTHETIC_FIXTURE_QUANTITIES: tuple[dict[str, str], ...] = (
    {
        "entity_type": "node",
        "entity_id": "N1",
        "load_case_id": "LC1",
        "combination_id": "",
        "coordinate_context": "global",
        "dof": "ux",
        "member_end": "",
        "quantity": "displacement",
        "feature": "",
        "unit": "m",
        "absolute_tolerance": "1E-12",
        "relative_tolerance": "1E-9",
        "zero_threshold": "1E-15",
    },
    {
        "entity_type": "node",
        "entity_id": "N1",
        "load_case_id": "LC1",
        "combination_id": "",
        "coordinate_context": "global",
        "dof": "uy",
        "member_end": "",
        "quantity": "displacement",
        "feature": "",
        "unit": "m",
        "absolute_tolerance": "1E-12",
        "relative_tolerance": "1E-9",
        "zero_threshold": "1E-15",
    },
    {
        "entity_type": "member",
        "entity_id": "M1",
        "load_case_id": "LC1",
        "combination_id": "",
        "coordinate_context": "local",
        "dof": "",
        "member_end": "I",
        "quantity": "shear_y",
        "feature": "",
        "unit": "kN",
        "absolute_tolerance": "1E-12",
        "relative_tolerance": "1E-9",
        "zero_threshold": "1E-15",
    },
    {
        "entity_type": "member",
        "entity_id": "M1",
        "load_case_id": "LC1",
        "combination_id": "",
        "coordinate_context": "local",
        "dof": "",
        "member_end": "J",
        "quantity": "shear_y",
        "feature": "",
        "unit": "kN",
        "absolute_tolerance": "1E-12",
        "relative_tolerance": "1E-9",
        "zero_threshold": "1E-15",
    },
    {
        "entity_type": "node",
        "entity_id": "N2",
        "load_case_id": "LC1",
        "combination_id": "",
        "coordinate_context": "global",
        "dof": "fz",
        "member_end": "",
        "quantity": "reaction",
        "feature": "",
        "unit": "kN",
        "absolute_tolerance": "1E-12",
        "relative_tolerance": "1E-9",
        "zero_threshold": "1E-15",
    },
    {
        "entity_type": "node",
        "entity_id": "N1",
        "load_case_id": "LC1",
        "combination_id": "COMB1",
        "coordinate_context": "global",
        "dof": "fx",
        "member_end": "",
        "quantity": "reaction",
        "feature": "",
        "unit": "kN",
        "absolute_tolerance": "1E-12",
        "relative_tolerance": "1E-9",
        "zero_threshold": "1E-15",
    },
    {
        "entity_type": "node",
        "entity_id": "N1",
        "load_case_id": "LC1",
        "combination_id": "",
        "coordinate_context": "global",
        "dof": "ux",
        "member_end": "",
        "quantity": "displacement",
        "feature": "near_zero",
        "unit": "m",
        "absolute_tolerance": "1E-18",
        "relative_tolerance": "1E-9",
        "zero_threshold": "1E-12",
    },
)


class ParityError(Exception):
    """Base error for EA-04 parity harness operations."""


class ParityValidationError(ParityError, ValueError):
    """Raised when raw, mapping, or canonical documents fail validation."""


class ParityNormalizationError(ParityError, ValueError):
    """Raised when normalization cannot proceed fail-closed."""


class ParityComparisonError(ParityError, ValueError):
    """Raised when numeric comparison cannot proceed."""


class ExclusiveWriteError(ParityError, FileExistsError):
    """Raised when an evidence artifact would overwrite an existing file."""


class PathSafetyError(ParityError, ValueError):
    """Raised when an input path violates read-only safety rules."""


@dataclass(frozen=True)
class CanonicalRow:
    entity_type: str
    entity_id: str
    load_case_id: str
    combination_id: str
    coordinate_context: str
    dof: str
    member_end: str
    quantity: str
    feature: str
    unit: str
    internal_value: str
    display_value: str
    internal_precision: int
    display_precision: int

    def quantity_key(self) -> str:
        return build_quantity_key(
            self.entity_type,
            self.entity_id,
            self.load_case_id,
            self.combination_id,
            self.coordinate_context,
            self.dof,
            self.member_end,
            self.quantity,
            self.feature,
        )

    def as_dict(self) -> dict[str, Any]:
        return {
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "load_case_id": self.load_case_id,
            "combination_id": self.combination_id,
            "coordinate_context": self.coordinate_context,
            "dof": self.dof,
            "member_end": self.member_end,
            "quantity": self.quantity,
            "feature": self.feature,
            "unit": self.unit,
            "internal_value": self.internal_value,
            "display_value": self.display_value,
            "internal_precision": self.internal_precision,
            "display_precision": self.display_precision,
        }


@dataclass
class NormalizationAudit:
    input_row_count: int = 0
    output_row_count: int = 0
    excluded_row_count: int = 0
    applied_transforms: list[str] = field(default_factory=list)


@dataclass
class _PendingRow:
    source_key: str
    index: int
    entity_type: str
    entity_id: str
    load_case_id: str
    combination_id: str
    coordinate_context: str
    dof: str
    member_end: str
    quantity: str
    feature: str
    unit: str
    internal_value: Decimal
    display_value: Decimal
    internal_precision: int
    display_precision: int
    vector_group: str | None
    group_key: str | None


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    return sha256_bytes(text.encode("utf-8"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def compute_raw_file_sha256(path: Path) -> str:
    return sha256_file(path)


def validate_sha256_argument(value: str, *, field_name: str = "sha256") -> str:
    lowered = value.lower()
    if not SHA256_PATTERN.fullmatch(lowered):
        raise ParityValidationError(f"{field_name} must be 64 lowercase hex characters")
    return lowered


def validate_input_file(path: Path, *, field_name: str = "input") -> None:
    if not path.exists():
        raise PathSafetyError(f"{field_name} path does not exist: {path}")
    if path.is_symlink():
        raise PathSafetyError(f"{field_name} symlink rejected: {path}")
    if not path.is_file():
        raise PathSafetyError(f"{field_name} must be a regular file: {path}")


def read_json_file(path: Path) -> dict[str, Any]:
    validate_input_file(path, field_name="json")
    return read_json(path)


def parse_decimal(value: str) -> Decimal:
    if not isinstance(value, str) or not value.strip():
        raise ParityValidationError("decimal value must be a non-empty string")
    try:
        parsed = Decimal(value.strip())
    except Exception as exc:
        raise ParityValidationError(f"invalid decimal: {value!r}") from exc
    if not parsed.is_finite():
        raise ParityValidationError(f"nonfinite decimal: {value!r}")
    return parsed


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
    validate_input_file(path, field_name="csv")
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ParityValidationError(f"missing CSV header: {path}")
        return list(reader)


def write_csv_exclusive(path: Path, fieldnames: Sequence[str], rows: Sequence[Mapping[str, str]]) -> None:
    data = canonical_csv_bytes(fieldnames, rows)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("xb") as handle:
            handle.write(data)
    except FileExistsError as exc:
        raise ExclusiveWriteError(f"refusing to overwrite existing file: {path}") from exc


def write_json_exclusive(path: Path, payload: Mapping[str, Any]) -> None:
    data = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("x", encoding="utf-8") as handle:
            handle.write(data)
    except FileExistsError as exc:
        raise ExclusiveWriteError(f"refusing to overwrite existing file: {path}") from exc


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ParityValidationError(f"JSON root must be an object: {path}")
    return payload


def build_quantity_key(
    entity_type: str,
    entity_id: str,
    load_case_id: str,
    combination_id: str,
    coordinate_context: str,
    dof: str,
    member_end: str,
    quantity: str,
    feature: str,
) -> str:
    return "|".join(
        (
            entity_type,
            entity_id,
            load_case_id,
            combination_id,
            coordinate_context,
            dof,
            member_end,
            quantity,
            feature,
        )
    )


def parse_quantity_key(key: str) -> tuple[str, ...]:
    parts = key.split("|")
    if len(parts) != 9:
        raise ParityValidationError(f"invalid quantity_key: {key!r}")
    return tuple(parts)


def row_source_key(row: Mapping[str, Any]) -> str:
    return build_quantity_key(
        str(row["entity_type"]),
        str(row["entity_id"]),
        str(row["load_case_id"]),
        str(row["combination_id"]),
        str(row["coordinate_context"]),
        str(row["dof"]),
        str(row["member_end"]),
        str(row["quantity"]),
        str(row["feature"]),
    )


def vector_group_for_row(quantity: str, dof: str) -> tuple[str | None, tuple[str, ...] | None]:
    if quantity == "displacement" and dof in VECTOR_GROUPS["translation"]:
        return "translation", VECTOR_GROUPS["translation"]
    if quantity == "displacement" and dof in VECTOR_GROUPS["rotation"]:
        return "rotation", VECTOR_GROUPS["rotation"]
    if quantity in ("reaction", "force") and dof in VECTOR_GROUPS["force"]:
        return "force", VECTOR_GROUPS["force"]
    if quantity in ("reaction", "moment") and dof in VECTOR_GROUPS["moment"]:
        return "moment", VECTOR_GROUPS["moment"]
    return None, None


def tolerance_freeze_rows_from_fixtures() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for fixture in SYNTHETIC_FIXTURE_QUANTITIES:
        quantity_key = build_quantity_key(
            fixture["entity_type"],
            fixture["entity_id"],
            fixture["load_case_id"],
            fixture["combination_id"],
            fixture["coordinate_context"],
            fixture["dof"],
            fixture["member_end"],
            fixture["quantity"],
            fixture["feature"],
        )
        rows.append(
            {
                "quantity_key": quantity_key,
                "entity_type": fixture["entity_type"],
                "entity_id": fixture["entity_id"],
                "load_case_id": fixture["load_case_id"],
                "combination_id": fixture["combination_id"],
                "coordinate_context": fixture["coordinate_context"],
                "dof": fixture["dof"],
                "member_end": fixture["member_end"],
                "quantity": fixture["quantity"],
                "feature": fixture["feature"],
                "unit": fixture["unit"],
                "absolute_tolerance": fixture["absolute_tolerance"],
                "relative_tolerance": fixture["relative_tolerance"],
                "zero_threshold": fixture["zero_threshold"],
                "comparison_rule": COMPARISON_RULE_DEFAULT,
                "freeze_justification": (
                    "EA-04 synthetic harness fixture; tolerance frozen before comparison; "
                    "NOT_ACTUAL_SPACER_PARITY evidence."
                ),
            }
        )
    return sorted(rows, key=lambda row: row["quantity_key"])


def compute_tolerance_freeze_sha256(rows: Sequence[Mapping[str, str]]) -> str:
    sorted_rows = sorted(rows, key=lambda row: row["quantity_key"])
    return sha256_bytes(canonical_csv_bytes(TOLERANCE_FREEZE_COLUMNS, sorted_rows))


def load_tolerance_freeze(path: Path) -> tuple[list[dict[str, str]], str]:
    rows = read_csv_rows(path)
    for column in TOLERANCE_FREEZE_COLUMNS:
        for row in rows:
            if column not in row or row[column] is None:
                raise ParityValidationError(f"missing column {column} in {path.name}")
    seen_keys: set[str] = set()
    for row in rows:
        key = row["quantity_key"]
        if key in seen_keys:
            raise ParityValidationError(f"duplicate tolerance quantity_key: {key}")
        seen_keys.add(key)
    canonical_sha = compute_tolerance_freeze_sha256(rows)
    on_disk_sha = compute_raw_file_sha256(path)
    if on_disk_sha != canonical_sha:
        raise ParityValidationError(
            f"tolerance register raw SHA-256 {on_disk_sha} != canonical SHA-256 {canonical_sha}"
        )
    return rows, canonical_sha


def _validate_raw_row(row: Mapping[str, Any], *, index: int) -> None:
    if not isinstance(row, dict):
        raise ParityValidationError(f"raw row {index} must be an object")
    for column in RAW_ROW_REQUIRED:
        if column not in row:
            raise ParityValidationError(f"raw row {index} missing column {column}")
    entity_type = row["entity_type"]
    if entity_type not in ENTITY_TYPES:
        raise ParityValidationError(f"raw row {index} invalid entity_type: {entity_type!r}")
    coordinate_context = row["coordinate_context"]
    if coordinate_context not in COORDINATE_CONTEXTS:
        raise ParityValidationError(
            f"raw row {index} invalid coordinate_context: {coordinate_context!r}"
        )
    member_end = row["member_end"]
    if member_end not in MEMBER_ENDS:
        raise ParityValidationError(f"raw row {index} invalid member_end: {member_end!r}")
    parse_decimal(str(row["internal_value"]))
    parse_decimal(str(row["display_value"]))
    try:
        internal_precision = int(row["internal_precision"])
        display_precision = int(row["display_precision"])
    except (TypeError, ValueError) as exc:
        raise ParityValidationError(f"raw row {index} invalid precision fields") from exc
    if internal_precision < 0 or display_precision < 0:
        raise ParityValidationError(f"raw row {index} precision must be non-negative")


def validate_raw_document(
    document: Mapping[str, Any],
    *,
    expected_sha256: str | None = None,
    expected_producer: str | None = None,
) -> str:
    for field_name in RAW_REQUIRED_TOP:
        if field_name not in document:
            raise ParityValidationError(f"raw document missing field {field_name}")
    if document["schema_version"] != SCHEMA_VERSION_RAW:
        raise ParityValidationError(
            f"raw schema_version must be {SCHEMA_VERSION_RAW!r}, got {document['schema_version']!r}"
        )
    producer = document["producer"]
    if producer not in PRODUCERS:
        raise ParityValidationError(f"invalid producer: {producer!r}")
    if expected_producer is not None and producer != expected_producer:
        raise ParityValidationError(
            f"producer mismatch: expected {expected_producer!r}, got {producer!r}"
        )
    validate_sha256_argument(str(document["executable_sha256"]), field_name="executable_sha256")
    validate_sha256_argument(
        str(document["source_artifact_sha256"]),
        field_name="source_artifact_sha256",
    )
    if not isinstance(document["stale"], bool):
        raise ParityValidationError("raw stale must be a boolean")
    rows = document["rows"]
    if not isinstance(rows, list):
        raise ParityValidationError("raw rows must be a list")
    seen_keys: set[str] = set()
    for index, row in enumerate(rows):
        _validate_raw_row(row, index=index)
        key = row_source_key(row)
        if key in seen_keys:
            raise ParityValidationError(f"duplicate raw quantity key: {key}")
        seen_keys.add(key)
    canonical = json.dumps(document, sort_keys=True, separators=(",", ":"))
    computed = sha256_text(canonical)
    if expected_sha256 is not None and computed != expected_sha256.lower():
        raise ParityValidationError(
            f"raw document SHA-256 mismatch: expected {expected_sha256}, computed {computed}"
        )
    return computed


def _parse_matrix(matrix: Any, *, field_name: str) -> list[list[Decimal]]:
    if not isinstance(matrix, list) or len(matrix) != 3:
        raise ParityValidationError(f"{field_name} must be a 3x3 matrix")
    parsed: list[list[Decimal]] = []
    for row_index, row in enumerate(matrix):
        if not isinstance(row, list) or len(row) != 3:
            raise ParityValidationError(f"{field_name} row {row_index} must have length 3")
        parsed_row: list[Decimal] = []
        for col_index, value in enumerate(row):
            try:
                parsed_row.append(parse_decimal(str(value)))
            except ParityValidationError as exc:
                raise ParityValidationError(
                    f"{field_name}[{row_index}][{col_index}] invalid: {exc}"
                ) from exc
        parsed.append(parsed_row)
    return parsed


def _matrix_multiply(a: Sequence[Sequence[Decimal]], b: Sequence[Sequence[Decimal]]) -> list[list[Decimal]]:
    result = [[Decimal(0) for _ in range(3)] for _ in range(3)]
    for i in range(3):
        for j in range(3):
            for k in range(3):
                result[i][j] += a[i][k] * b[k][j]
    return result


def _matrix_transpose(matrix: Sequence[Sequence[Decimal]]) -> list[list[Decimal]]:
    return [[matrix[j][i] for j in range(3)] for i in range(3)]


def _matrix_determinant(matrix: Sequence[Sequence[Decimal]]) -> Decimal:
    a, b, c = matrix[0]
    d, e, f = matrix[1]
    g, h, i = matrix[2]
    return (
        a * (e * i - f * h)
        - b * (d * i - f * g)
        + c * (d * h - e * g)
    )


def _matrix_is_identity(matrix: Sequence[Sequence[Decimal]], *, tolerance: Decimal) -> bool:
    for i in range(3):
        for j in range(3):
            expected = Decimal(1) if i == j else Decimal(0)
            if abs(matrix[i][j] - expected) > tolerance:
                return False
    return True


def _apply_matrix_vector(
    matrix: Sequence[Sequence[Decimal]],
    vector: Sequence[Decimal],
) -> list[Decimal]:
    return [
        matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
        matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
        matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2],
    ]


def validate_coordinate_transform(matrix: Sequence[Sequence[Decimal]], *, field_name: str) -> None:
    identity = [[Decimal(1) if i == j else Decimal(0) for j in range(3)] for i in range(3)]
    transpose = _matrix_transpose(matrix)
    product = _matrix_multiply(matrix, transpose)
    tolerance = Decimal("1E-12")
    for i in range(3):
        for j in range(3):
            if abs(product[i][j] - identity[i][j]) > tolerance:
                raise ParityValidationError(
                    f"{field_name} is not orthonormal: R R^T != I at [{i}][{j}]"
                )
    determinant = _matrix_determinant(matrix)
    if abs(determinant - Decimal(1)) > tolerance:
        raise ParityValidationError(
            f"{field_name} determinant must be +1, got {determinant}"
        )


def _validate_side_maps(name: str, mapping: Any) -> dict[str, dict[str, str]]:
    if not isinstance(mapping, dict):
        raise ParityValidationError(f"{name} must be an object with spacer and apollo maps")
    result: dict[str, dict[str, str]] = {}
    for side in ("spacer", "apollo"):
        if side not in mapping:
            raise ParityValidationError(f"{name} missing {side} map")
        result[side] = _validate_bijective_map(f"{name}.{side}", mapping[side])
    return result


def _validate_bijective_map(name: str, mapping: Any) -> dict[str, str]:
    if not isinstance(mapping, dict) or not mapping:
        raise ParityValidationError(f"{name} must be a non-empty object")
    normalized: dict[str, str] = {}
    target_seen: set[str] = set()
    for source, target in mapping.items():
        source_text = str(source)
        target_text = str(target)
        if source_text in normalized:
            raise ParityValidationError(f"duplicate source key in {name}: {source_text}")
        if target_text in target_seen:
            raise ParityValidationError(f"non-injective {name}: duplicate target {target_text}")
        normalized[source_text] = target_text
        target_seen.add(target_text)
    return normalized


def _validate_per_side_transforms(name: str, transforms: Any) -> dict[str, Any]:
    if not isinstance(transforms, dict):
        raise ParityValidationError(f"{name} must be an object with spacer and apollo sides")
    result: dict[str, Any] = {}
    for side in ("spacer", "apollo"):
        if side not in transforms:
            raise ParityValidationError(f"{name} missing {side}")
        result[side] = transforms[side]
    return result


def _validate_coordinate_transforms_side(
    side_transforms: Any,
    *,
    field_name: str,
) -> dict[str, list[list[Decimal]]]:
    if not isinstance(side_transforms, dict):
        raise ParityValidationError(f"{field_name} must be an object")
    parsed: dict[str, list[list[Decimal]]] = {}
    for context in ("global", "local", "support"):
        if context not in side_transforms:
            raise ParityValidationError(f"{field_name} missing {context}")
        matrix = _parse_matrix(side_transforms[context], field_name=f"{field_name}.{context}")
        validate_coordinate_transform(matrix, field_name=f"{field_name}.{context}")
        parsed[context] = matrix
    return parsed


def _validate_dof_permutation_side(permutation: Any, *, field_name: str) -> list[str]:
    if not isinstance(permutation, list) or sorted(permutation) != sorted(DOF_COMPONENTS):
        raise ParityValidationError(f"{field_name} must be a permutation of ux..rz")
    return [str(item) for item in permutation]


def _validate_sign_transform_side(sign_transform: Any, *, field_name: str) -> dict[str, int]:
    if not isinstance(sign_transform, dict):
        raise ParityValidationError(f"{field_name} must be an object")
    result: dict[str, int] = {}
    for component in SIGN_COMPONENTS:
        if component not in sign_transform:
            raise ParityValidationError(f"{field_name} missing {component}")
        factor = int(sign_transform[component])
        if factor not in (-1, 1):
            raise ParityValidationError(f"{field_name}.{component} must be -1 or 1")
        result[component] = factor
    return result


def _validate_quantity_sign_transform_side(transform: Any, *, field_name: str) -> dict[str, int]:
    if not isinstance(transform, dict):
        raise ParityValidationError(f"{field_name} must be an object")
    result: dict[str, int] = {}
    for quantity, factor_raw in transform.items():
        factor = int(factor_raw)
        if factor not in (-1, 1):
            raise ParityValidationError(f"{field_name}.{quantity} must be -1 or 1")
        result[str(quantity)] = factor
    return result


def _validate_member_end_transform_side(config: Any, *, field_name: str) -> dict[str, Any]:
    if not isinstance(config, dict):
        raise ParityValidationError(f"{field_name} must be an object")
    end_map = config.get("end_map")
    if not isinstance(end_map, dict):
        raise ParityValidationError(f"{field_name}.end_map must be an object")
    for end in ("I", "J"):
        if end not in end_map or end_map[end] not in ("I", "J"):
            raise ParityValidationError(f"{field_name}.end_map must map I/J to I/J")
    normalized_end_map = {str(k): str(v) for k, v in end_map.items()}
    target_values = set(normalized_end_map.values())
    if len(target_values) != 2:
        raise ParityValidationError(
            f"{field_name}.end_map must be bijective on I/J; duplicate targets rejected"
        )
    swap_ij = bool(config.get("swap_ij", False))
    if swap_ij and end_map != {"I": "J", "J": "I"}:
        raise ParityValidationError(
            f"{field_name}.swap_ij true requires end_map I->J and J->I"
        )
    if not swap_ij and end_map == {"I": "J", "J": "I"}:
        raise ParityValidationError(
            f"{field_name}.swap_ij false inconsistent with swapped end_map"
        )
    return {"swap_ij": swap_ij, "end_map": normalized_end_map}


def _validate_unit_conversion_side(side_rules: Any, *, field_name: str) -> dict[str, dict[str, str]]:
    if not isinstance(side_rules, dict) or not side_rules:
        raise ParityValidationError(f"{field_name} must be a non-empty object")
    parsed: dict[str, dict[str, str]] = {}
    for quantity, rule in side_rules.items():
        quantity_name = str(quantity)
        if not isinstance(rule, dict):
            raise ParityValidationError(f"{field_name}.{quantity_name} must be an object")
        for field in ("from_unit", "to_unit", "scale", "offset"):
            if field not in rule:
                raise ParityValidationError(f"{field_name}.{quantity_name} missing {field}")
        parse_decimal(str(rule["scale"]))
        parse_decimal(str(rule["offset"]))
        parsed[quantity_name] = {
            "from_unit": str(rule["from_unit"]),
            "to_unit": str(rule["to_unit"]),
            "scale": str(rule["scale"]),
            "offset": str(rule["offset"]),
        }
    return parsed


def _validate_exclusion(entry: Mapping[str, Any], *, index: int) -> None:
    required = ("side", "source_key", "reason", "classification")
    for field_name in required:
        if field_name not in entry or not str(entry[field_name]).strip():
            raise ParityValidationError(f"exclusion {index} missing {field_name}")
    if entry["side"] not in PRODUCERS:
        raise ParityValidationError(f"exclusion {index} side must be spacer or apollo")
    if entry["classification"] != "UNSUPPORTED_FEATURE":
        raise ParityValidationError(
            f"exclusion {index} classification must be UNSUPPORTED_FEATURE"
        )


def _validate_producer_bindings(
    document: Mapping[str, Any],
    mapping_document: Mapping[str, Any],
    *,
    side: str,
) -> None:
    prefix = side
    for field in ("producer_version", "producer_build", "executable_sha256"):
        mapping_field = f"{prefix}_{field}"
        if document[field] != mapping_document[mapping_field]:
            raise ParityValidationError(
                f"{side} {field} mismatch with mapping {mapping_field}"
            )


def validate_mapping_document(
    document: Mapping[str, Any],
    *,
    spacer_raw: Mapping[str, Any] | None = None,
    apollo_raw: Mapping[str, Any] | None = None,
    expected_sha256: str | None = None,
    file_byte_sha256: str | None = None,
) -> str:
    for field_name in MAPPING_REQUIRED_TOP:
        if field_name not in document:
            raise ParityValidationError(f"mapping document missing field {field_name}")
    if document["schema_version"] != SCHEMA_VERSION_MAPPING:
        raise ParityValidationError(
            f"mapping schema_version must be {SCHEMA_VERSION_MAPPING!r}"
        )
    validate_sha256_argument(
        str(document["spacer_source_artifact_sha256"]),
        field_name="spacer_source_artifact_sha256",
    )
    validate_sha256_argument(
        str(document["apollo_source_artifact_sha256"]),
        field_name="apollo_source_artifact_sha256",
    )
    validate_sha256_argument(
        str(document["spacer_executable_sha256"]),
        field_name="spacer_executable_sha256",
    )
    validate_sha256_argument(
        str(document["apollo_executable_sha256"]),
        field_name="apollo_executable_sha256",
    )

    node_map = _validate_side_maps("node_map", document["node_map"])
    member_map = _validate_side_maps("member_map", document["member_map"])
    material_map = _validate_side_maps("material_map", document["material_map"])
    support_map = _validate_side_maps("support_map", document["support_map"])
    load_case_map = _validate_side_maps("load_case_map", document["load_case_map"])
    combination_map = _validate_side_maps("combination_map", document["combination_map"])
    quantity_map = _validate_side_maps("quantity_map", document["quantity_map"])
    canonical_quantities_spacer = set(quantity_map["spacer"].values())
    canonical_quantities_apollo = set(quantity_map["apollo"].values())
    if canonical_quantities_spacer != canonical_quantities_apollo:
        raise ParityValidationError(
            "quantity_map canonical targets must match across spacer and apollo sides"
        )
    canonical_quantities = canonical_quantities_spacer

    coord_sides = _validate_per_side_transforms("coordinate_transforms", document["coordinate_transforms"])
    for side, side_transforms in coord_sides.items():
        _validate_coordinate_transforms_side(
            side_transforms,
            field_name=f"coordinate_transforms.{side}",
        )

    dof_sides = _validate_per_side_transforms("dof_permutation", document["dof_permutation"])
    for side, permutation in dof_sides.items():
        _validate_dof_permutation_side(permutation, field_name=f"dof_permutation.{side}")

    end_sides = _validate_per_side_transforms("member_end_transform", document["member_end_transform"])
    for side, config in end_sides.items():
        _validate_member_end_transform_side(config, field_name=f"member_end_transform.{side}")

    sign_sides = _validate_per_side_transforms("sign_transform", document["sign_transform"])
    for side, sign_map in sign_sides.items():
        _validate_sign_transform_side(sign_map, field_name=f"sign_transform.{side}")

    qty_sign_sides = _validate_per_side_transforms(
        "quantity_sign_transform",
        document["quantity_sign_transform"],
    )
    for side, qty_sign in qty_sign_sides.items():
        _validate_quantity_sign_transform_side(
            qty_sign,
            field_name=f"quantity_sign_transform.{side}",
        )

    unit_sides = _validate_per_side_transforms("unit_conversion", document["unit_conversion"])
    canonical_units: dict[str, str] = {}
    for side, side_rules in unit_sides.items():
        parsed_rules = _validate_unit_conversion_side(
            side_rules,
            field_name=f"unit_conversion.{side}",
        )
        missing_quantities = canonical_quantities - set(parsed_rules)
        if missing_quantities:
            raise ParityValidationError(
                f"unit_conversion.{side} missing rules for canonical quantities: "
                f"{sorted(missing_quantities)}"
            )
        extra_quantities = set(parsed_rules) - canonical_quantities
        if extra_quantities:
            raise ParityValidationError(
                f"unit_conversion.{side} has undeclared quantities not in quantity_map: "
                f"{sorted(extra_quantities)}"
            )
        for quantity, rule in parsed_rules.items():
            to_unit = rule["to_unit"]
            if quantity in canonical_units and canonical_units[quantity] != to_unit:
                raise ParityValidationError(
                    f"unit_conversion.{quantity} to_unit mismatch across sides"
                )
            canonical_units[quantity] = to_unit

    canonical_display_precision = document.get("canonical_display_precision")
    if canonical_display_precision is not None:
        if not isinstance(canonical_display_precision, dict):
            raise ParityValidationError("canonical_display_precision must be an object")
        for quantity, precision_raw in canonical_display_precision.items():
            try:
                precision = int(precision_raw)
            except (TypeError, ValueError) as exc:
                raise ParityValidationError(
                    f"canonical_display_precision.{quantity} must be a non-negative integer"
                ) from exc
            if precision < 0:
                raise ParityValidationError(
                    f"canonical_display_precision.{quantity} must be non-negative"
                )

    exclusions = document["exclusions"]
    if not isinstance(exclusions, list):
        raise ParityValidationError("exclusions must be a list")
    seen_exclusion_keys: set[tuple[str, str]] = set()
    for index, entry in enumerate(exclusions):
        if not isinstance(entry, dict):
            raise ParityValidationError(f"exclusion {index} must be an object")
        _validate_exclusion(entry, index=index)
        exclusion_key = (str(entry["side"]), str(entry["source_key"]))
        if exclusion_key in seen_exclusion_keys:
            raise ParityValidationError(
                f"duplicate exclusion (side, source_key): {exclusion_key}"
            )
        seen_exclusion_keys.add(exclusion_key)

    if spacer_raw is not None:
        if spacer_raw["model_identity"] != document["spacer_model_identity"]:
            raise ParityValidationError("spacer model_identity mismatch with mapping")
        if spacer_raw["model_version"] != document["spacer_model_version"]:
            raise ParityValidationError("spacer model_version mismatch with mapping")
        if spacer_raw["source_artifact_sha256"] != document["spacer_source_artifact_sha256"]:
            raise ParityValidationError("spacer source_artifact_sha256 mismatch with mapping")
        _validate_producer_bindings(spacer_raw, document, side="spacer")

    if apollo_raw is not None:
        if apollo_raw["model_identity"] != document["apollo_model_identity"]:
            raise ParityValidationError("apollo model_identity mismatch with mapping")
        if apollo_raw["model_version"] != document["apollo_model_version"]:
            raise ParityValidationError("apollo model_version mismatch with mapping")
        if apollo_raw["source_artifact_sha256"] != document["apollo_source_artifact_sha256"]:
            raise ParityValidationError("apollo source_artifact_sha256 mismatch with mapping")
        _validate_producer_bindings(apollo_raw, document, side="apollo")

    for side_name, raw_document in (("spacer", spacer_raw), ("apollo", apollo_raw)):
        if raw_document is None:
            continue
        side_quantity_map = quantity_map[side_name]
        for index, row in enumerate(raw_document.get("rows", [])):
            source_quantity = str(row["quantity"])
            if source_quantity not in side_quantity_map:
                raise ParityValidationError(
                    f"{side_name} raw row {index} quantity {source_quantity!r} "
                    f"not covered by quantity_map.{side_name}"
                )

    _ = (node_map, member_map, material_map, support_map, load_case_map, combination_map, unit_sides)

    canonical = json.dumps(document, sort_keys=True, separators=(",", ":"))
    computed = sha256_text(canonical)
    if expected_sha256 is not None and computed != expected_sha256.lower():
        raise ParityValidationError(
            f"mapping document SHA-256 mismatch: expected {expected_sha256}, computed {computed}"
        )
    if file_byte_sha256 is not None:
        validate_sha256_argument(file_byte_sha256, field_name="mapping_file_byte_sha256")
    return computed


def _side_config(mapping: Mapping[str, Any], field: str, side: str) -> Any:
    container = mapping[field]
    if not isinstance(container, dict) or side not in container:
        raise ParityNormalizationError(f"missing {field}.{side}")
    return container[side]


def _map_entity_id(
    entity_type: str,
    entity_id: str,
    mapping: Mapping[str, Any],
    *,
    side: str,
) -> str:
    if entity_type == "node":
        entity_maps = mapping["node_map"]
    elif entity_type == "member":
        entity_maps = mapping["member_map"]
    elif entity_type == "material":
        entity_maps = mapping["material_map"]
    elif entity_type == "support":
        entity_maps = mapping["support_map"]
    else:
        raise ParityNormalizationError(f"unsupported entity_type: {entity_type}")
    side_map = entity_maps.get(side)
    if not isinstance(side_map, dict):
        raise ParityNormalizationError(f"missing {entity_type} map for side {side!r}")
    if entity_id not in side_map:
        raise ParityNormalizationError(f"missing {entity_type} mapping for {entity_id!r}")
    return str(side_map[entity_id])


def _map_load_case(load_case_id: str, mapping: Mapping[str, Any], *, side: str) -> str:
    side_map = mapping["load_case_map"].get(side)
    if not isinstance(side_map, dict) or load_case_id not in side_map:
        raise ParityNormalizationError(f"missing load_case_map for {load_case_id!r}")
    return str(side_map[load_case_id])


def _map_combination(combination_id: str, mapping: Mapping[str, Any], *, side: str) -> str:
    if not combination_id:
        return ""
    side_map = mapping["combination_map"].get(side)
    if not isinstance(side_map, dict) or combination_id not in side_map:
        raise ParityNormalizationError(f"missing combination_map for {combination_id!r}")
    return str(side_map[combination_id])


def _map_quantity(source_quantity: str, mapping: Mapping[str, Any], *, side: str) -> str:
    side_map = mapping["quantity_map"].get(side)
    if not isinstance(side_map, dict) or source_quantity not in side_map:
        raise ParityNormalizationError(
            f"missing quantity_map.{side} for source quantity {source_quantity!r}"
        )
    return str(side_map[source_quantity])


def _apply_member_end_transform(member_end: str, mapping: Mapping[str, Any], *, side: str) -> str:
    if not member_end:
        return ""
    end_config = _side_config(mapping, "member_end_transform", side)
    end_map = end_config["end_map"]
    if member_end not in end_map:
        raise ParityNormalizationError(f"missing member_end_transform for {member_end!r}")
    return str(end_map[member_end])


def _canonical_dof_from_source(source_dof: str, dof_permutation: Sequence[str]) -> str:
    if not source_dof:
        return ""
    for canonical_dof, mapped_source in zip(DOF_COMPONENTS, dof_permutation):
        if mapped_source == source_dof:
            return canonical_dof
    return source_dof


def _apply_sign(value: Decimal, *, component: str, mapping: Mapping[str, Any], side: str) -> Decimal:
    if not component:
        return value
    sign_map = _side_config(mapping, "sign_transform", side)
    if component not in sign_map:
        raise ParityNormalizationError(f"missing sign_transform for {component!r}")
    return value * Decimal(int(sign_map[component]))


def _apply_quantity_sign(value: Decimal, *, quantity: str, mapping: Mapping[str, Any], side: str) -> Decimal:
    qty_sign = _side_config(mapping, "quantity_sign_transform", side)
    factor = int(qty_sign.get(quantity, 1))
    if factor not in (-1, 1):
        raise ParityNormalizationError(f"invalid quantity_sign_transform for {quantity!r}")
    return value * Decimal(factor)


def _apply_unit_conversion(
    value: Decimal,
    *,
    canonical_quantity: str,
    unit: str,
    mapping: Mapping[str, Any],
    side: str,
) -> tuple[Decimal, str]:
    side_rules = _side_config(mapping, "unit_conversion", side)
    if canonical_quantity not in side_rules:
        raise ParityNormalizationError(
            f"missing unit_conversion.{side} for canonical quantity {canonical_quantity!r}"
        )
    rule = side_rules[canonical_quantity]
    if not isinstance(rule, dict):
        raise ParityNormalizationError(
            f"unit_conversion.{side}.{canonical_quantity} must be an object"
        )
    from_unit = str(rule.get("from_unit", ""))
    to_unit = str(rule.get("to_unit", ""))
    if unit != from_unit:
        raise ParityNormalizationError(
            f"unit {unit!r} does not match conversion from_unit {from_unit!r} "
            f"for canonical quantity {canonical_quantity} on side {side!r}"
        )
    scale = parse_decimal(str(rule.get("scale", "1")))
    offset = parse_decimal(str(rule.get("offset", "0")))
    converted = (value + offset) * scale
    return converted, to_unit


def _decimal_string(value: Decimal) -> str:
    return str(value)


def _quantize_display(value: Decimal, precision: int) -> str:
    if precision < 0:
        raise ParityValidationError("display precision must be non-negative")
    quantizer = Decimal(1).scaleb(-precision)
    return str(value.quantize(quantizer))


def _build_group_key(
    entity_type: str,
    entity_id: str,
    load_case_id: str,
    combination_id: str,
    coordinate_context: str,
    member_end: str,
    quantity: str,
    feature: str,
    vector_group: str,
) -> str:
    return "|".join(
        (
            entity_type,
            entity_id,
            load_case_id,
            combination_id,
            coordinate_context,
            member_end,
            quantity,
            feature,
            vector_group,
        )
    )


def _find_exclusion(
    source_key: str,
    exclusions: Sequence[Mapping[str, Any]],
    *,
    side: str,
) -> Mapping[str, Any] | None:
    for exclusion in exclusions:
        if str(exclusion["side"]) == side and str(exclusion["source_key"]) == source_key:
            return exclusion
    return None


def normalize_raw_results(
    raw_document: Mapping[str, Any],
    mapping_document: Mapping[str, Any],
    *,
    side: str,
    expected_raw_sha256: str | None = None,
    raw_file_byte_sha256: str,
    mapping_file_byte_sha256: str,
) -> tuple[dict[str, Any], NormalizationAudit]:
    if side not in PRODUCERS:
        raise ParityNormalizationError(f"invalid side: {side!r}")
    raw_byte_sha = validate_sha256_argument(raw_file_byte_sha256, field_name="raw_file_byte_sha256")
    mapping_byte_sha = validate_sha256_argument(
        mapping_file_byte_sha256,
        field_name="mapping_file_byte_sha256",
    )
    raw_sha256 = validate_raw_document(
        raw_document,
        expected_sha256=expected_raw_sha256,
        expected_producer=side,
    )

    if raw_document.get("stale"):
        raise ParityNormalizationError("stale raw output rejected")

    mapping_sha256 = validate_mapping_document(
        mapping_document,
        spacer_raw=raw_document if side == "spacer" else None,
        apollo_raw=raw_document if side == "apollo" else None,
        file_byte_sha256=mapping_byte_sha,
    )
    _validate_producer_bindings(raw_document, mapping_document, side=side)

    audit = NormalizationAudit(input_row_count=len(raw_document["rows"]))
    pending: list[_PendingRow] = []
    exclusions_out: list[dict[str, Any]] = []
    excluded_count = 0
    exclusions = mapping_document.get("exclusions", [])

    coord_matrices = {
        context: _parse_matrix(
            _side_config(mapping_document, "coordinate_transforms", side)[context],
            field_name=f"coordinate_transforms.{side}.{context}",
        )
        for context in ("global", "local", "support")
    }
    dof_permutation = _validate_dof_permutation_side(
        _side_config(mapping_document, "dof_permutation", side),
        field_name=f"dof_permutation.{side}",
    )

    for index, row in enumerate(raw_document["rows"]):
        source_key = row_source_key(row)
        matched_exclusion = _find_exclusion(source_key, exclusions, side=side)
        if matched_exclusion is not None:
            excluded_count += 1
            entity_type = str(row["entity_type"])
            entity_id = _map_entity_id(entity_type, str(row["entity_id"]), mapping_document, side=side)
            canonical_key = build_quantity_key(
                entity_type,
                entity_id,
                _map_load_case(str(row["load_case_id"]), mapping_document, side=side),
                _map_combination(str(row["combination_id"]), mapping_document, side=side),
                str(row["coordinate_context"]),
                _canonical_dof_from_source(str(row["dof"]), dof_permutation),
                _apply_member_end_transform(str(row["member_end"]), mapping_document, side=side),
                _map_quantity(str(row["quantity"]), mapping_document, side=side),
                str(row["feature"]),
            )
            exclusions_out.append(
                {
                    "side": side,
                    "source_key": source_key,
                    "canonical_key": canonical_key,
                    "reason": str(matched_exclusion["reason"]),
                    "classification": str(matched_exclusion["classification"]),
                }
            )
            audit.applied_transforms.append(
                f"row[{index}] excluded: {matched_exclusion['reason']}"
            )
            continue

        entity_type = str(row["entity_type"])
        entity_id = _map_entity_id(entity_type, str(row["entity_id"]), mapping_document, side=side)
        canonical_load_case = _map_load_case(str(row["load_case_id"]), mapping_document, side=side)
        canonical_combination = _map_combination(str(row["combination_id"]), mapping_document, side=side)
        coordinate_context = str(row["coordinate_context"])
        source_dof = str(row["dof"])
        member_end = _apply_member_end_transform(str(row["member_end"]), mapping_document, side=side)
        source_quantity = str(row["quantity"])
        canonical_quantity = _map_quantity(source_quantity, mapping_document, side=side)
        feature = str(row["feature"])
        unit = str(row["unit"])

        internal_value = parse_decimal(str(row["internal_value"]))
        internal_value, canonical_unit = _apply_unit_conversion(
            internal_value,
            canonical_quantity=canonical_quantity,
            unit=unit,
            mapping=mapping_document,
            side=side,
        )
        display_value = parse_decimal(str(row["display_value"]))
        display_value, _ = _apply_unit_conversion(
            display_value,
            canonical_quantity=canonical_quantity,
            unit=unit,
            mapping=mapping_document,
            side=side,
        )

        vector_group, _ = vector_group_for_row(canonical_quantity, source_dof)
        group_key = None
        if vector_group is not None:
            group_key = _build_group_key(
                entity_type,
                entity_id,
                canonical_load_case,
                canonical_combination,
                coordinate_context,
                member_end,
                canonical_quantity,
                feature,
                vector_group,
            )

        pending.append(
            _PendingRow(
                source_key=source_key,
                index=index,
                entity_type=entity_type,
                entity_id=entity_id,
                load_case_id=canonical_load_case,
                combination_id=canonical_combination,
                coordinate_context=coordinate_context,
                dof=source_dof,
                member_end=member_end,
                quantity=canonical_quantity,
                feature=feature,
                unit=canonical_unit,
                internal_value=internal_value,
                display_value=display_value,
                internal_precision=int(row["internal_precision"]),
                display_precision=int(row["display_precision"]),
                vector_group=vector_group,
                group_key=group_key,
            )
        )

    canonical_rows: list[CanonicalRow] = []
    seen_keys: set[str] = set()
    identity_tol = Decimal("1E-12")

    vector_groups: dict[str, list[_PendingRow]] = {}
    scalar_rows: list[_PendingRow] = []
    for pending_row in pending:
        if pending_row.vector_group is not None and pending_row.group_key is not None:
            vector_groups.setdefault(pending_row.group_key, []).append(pending_row)
        else:
            scalar_rows.append(pending_row)

    for group_key, members in vector_groups.items():
        if not members:
            continue
        sample = members[0]
        vector_group = sample.vector_group
        assert vector_group is not None
        components = VECTOR_GROUPS[vector_group]
        matrix = coord_matrices[sample.coordinate_context]
        non_identity = not _matrix_is_identity(matrix, tolerance=identity_tol)

        by_dof: dict[str, _PendingRow] = {}
        for member in members:
            if member.dof in by_dof:
                raise ParityNormalizationError(
                    f"duplicate dof collision in vector group {group_key}: {member.dof}"
                )
            by_dof[member.dof] = member

        if non_identity and set(by_dof) != set(components):
            raise ParityNormalizationError(
                f"incomplete vector group {group_key} for non-identity transform: "
                f"have {sorted(by_dof)}, need {list(components)}"
            )

        source_vector = [by_dof[dof].internal_value if dof in by_dof else Decimal(0) for dof in components]
        display_vector = [by_dof[dof].display_value if dof in by_dof else Decimal(0) for dof in components]

        if non_identity:
            transformed_internal = _apply_matrix_vector(matrix, source_vector)
            transformed_display = _apply_matrix_vector(matrix, display_vector)
        else:
            transformed_internal = list(source_vector)
            transformed_display = list(display_vector)

        for idx, component in enumerate(components):
            if component not in by_dof and not non_identity:
                continue
            if component not in by_dof and non_identity:
                continue
            member = by_dof[component]
            canonical_dof = _canonical_dof_from_source(component, dof_permutation)
            internal = _apply_sign(transformed_internal[idx], component=canonical_dof, mapping=mapping_document, side=side)
            display = _apply_sign(transformed_display[idx], component=canonical_dof, mapping=mapping_document, side=side)
            canonical_row = CanonicalRow(
                entity_type=sample.entity_type,
                entity_id=sample.entity_id,
                load_case_id=sample.load_case_id,
                combination_id=sample.combination_id,
                coordinate_context=sample.coordinate_context,
                dof=canonical_dof,
                member_end=sample.member_end,
                quantity=sample.quantity,
                feature=sample.feature,
                unit=sample.unit,
                internal_value=_decimal_string(internal),
                display_value=_quantize_display(display, member.display_precision),
                internal_precision=member.internal_precision,
                display_precision=member.display_precision,
            )
            key = canonical_row.quantity_key()
            if key in seen_keys:
                raise ParityNormalizationError(f"duplicate canonical quantity key: {key}")
            seen_keys.add(key)
            canonical_rows.append(canonical_row)
            audit.applied_transforms.append(
                f"row[{member.index}] vector group {group_key} -> {key}"
            )

    for member in scalar_rows:
        canonical_dof = _canonical_dof_from_source(member.dof, dof_permutation)
        internal = _apply_quantity_sign(
            member.internal_value,
            quantity=member.quantity,
            mapping=mapping_document,
            side=side,
        )
        if canonical_dof:
            internal = _apply_sign(internal, component=canonical_dof, mapping=mapping_document, side=side)
        display = _apply_quantity_sign(
            member.display_value,
            quantity=member.quantity,
            mapping=mapping_document,
            side=side,
        )
        if canonical_dof:
            display = _apply_sign(display, component=canonical_dof, mapping=mapping_document, side=side)
        canonical_row = CanonicalRow(
            entity_type=member.entity_type,
            entity_id=member.entity_id,
            load_case_id=member.load_case_id,
            combination_id=member.combination_id,
            coordinate_context=member.coordinate_context,
            dof=canonical_dof,
            member_end=member.member_end,
            quantity=member.quantity,
            feature=member.feature,
            unit=member.unit,
            internal_value=_decimal_string(internal),
            display_value=_quantize_display(display, member.display_precision),
            internal_precision=member.internal_precision,
            display_precision=member.display_precision,
        )
        key = canonical_row.quantity_key()
        if key in seen_keys:
            raise ParityNormalizationError(f"duplicate canonical quantity key: {key}")
        seen_keys.add(key)
        canonical_rows.append(canonical_row)
        audit.applied_transforms.append(f"row[{member.index}] normalized to {key}")

    audit.output_row_count = len(canonical_rows)
    audit.excluded_row_count = excluded_count
    accounted = audit.output_row_count + audit.excluded_row_count
    if accounted != audit.input_row_count:
        raise ParityNormalizationError(
            f"silent row drop detected: input={audit.input_row_count} "
            f"output+excluded={accounted}"
        )

    canonical_document: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION_CANONICAL,
        "producer": raw_document["producer"],
        "producer_version": raw_document["producer_version"],
        "producer_build": raw_document["producer_build"],
        "executable_sha256": raw_document["executable_sha256"],
        "model_identity": (
            mapping_document["spacer_model_identity"]
            if side == "spacer"
            else mapping_document["apollo_model_identity"]
        ),
        "model_version": (
            mapping_document["spacer_model_version"]
            if side == "spacer"
            else mapping_document["apollo_model_version"]
        ),
        "source_artifact_sha256": raw_document["source_artifact_sha256"],
        "raw_sha256": raw_sha256,
        "mapping_sha256": mapping_sha256,
        "raw_file_byte_sha256": raw_byte_sha,
        "mapping_file_byte_sha256": mapping_byte_sha,
        "stale": raw_document["stale"],
        "evidence_label": raw_document.get("evidence_label", EVIDENCE_LABEL_SYNTHETIC),
        "rows": [row.as_dict() for row in sorted(canonical_rows, key=lambda item: item.quantity_key())],
        "exclusions": sorted(
            exclusions_out,
            key=lambda item: (item["side"], item["source_key"]),
        ),
    }
    return canonical_document, audit


def validate_canonical_document(document: Mapping[str, Any]) -> str:
    for field_name in CANONICAL_REQUIRED_TOP:
        if field_name not in document:
            raise ParityValidationError(f"canonical document missing field {field_name}")
    if document["schema_version"] != SCHEMA_VERSION_CANONICAL:
        raise ParityValidationError(
            f"canonical schema_version must be {SCHEMA_VERSION_CANONICAL!r}"
        )
    validate_sha256_argument(str(document["raw_sha256"]), field_name="raw_sha256")
    validate_sha256_argument(str(document["mapping_sha256"]), field_name="mapping_sha256")
    validate_sha256_argument(
        str(document["raw_file_byte_sha256"]),
        field_name="raw_file_byte_sha256",
    )
    validate_sha256_argument(
        str(document["mapping_file_byte_sha256"]),
        field_name="mapping_file_byte_sha256",
    )
    rows = document["rows"]
    if not isinstance(rows, list):
        raise ParityValidationError("canonical rows must be a list")
    exclusions = document["exclusions"]
    if not isinstance(exclusions, list):
        raise ParityValidationError("canonical exclusions must be a list")
    seen_keys: set[str] = set()
    for index, row in enumerate(rows):
        _validate_raw_row(row, index=index)
        key = build_quantity_key(
            str(row["entity_type"]),
            str(row["entity_id"]),
            str(row["load_case_id"]),
            str(row["combination_id"]),
            str(row["coordinate_context"]),
            str(row["dof"]),
            str(row["member_end"]),
            str(row["quantity"]),
            str(row["feature"]),
        )
        if key in seen_keys:
            raise ParityValidationError(f"duplicate canonical quantity key: {key}")
        seen_keys.add(key)
    canonical = json.dumps(document, sort_keys=True, separators=(",", ":"))
    return sha256_text(canonical)


def compute_tolerance_bound(
    expected_value: Decimal,
    *,
    absolute_tolerance: Decimal,
    relative_tolerance: Decimal,
    zero_threshold: Decimal,
) -> Decimal:
    if expected_value.copy_abs() <= zero_threshold:
        return absolute_tolerance
    return max(absolute_tolerance, relative_tolerance * expected_value.copy_abs())


def evaluate_comparison(
    expected_value: Decimal,
    actual_value: Decimal,
    *,
    absolute_tolerance: Decimal,
    relative_tolerance: Decimal,
    zero_threshold: Decimal,
    comparison_rule: str,
) -> tuple[bool, Decimal, Decimal, Decimal]:
    if not actual_value.is_finite() or not expected_value.is_finite():
        return False, Decimal("NaN"), Decimal("NaN"), Decimal("NaN")

    absolute_error = abs(actual_value - expected_value)
    if expected_value.copy_abs() <= zero_threshold:
        passed = absolute_error <= absolute_tolerance
        relative_error = (
            Decimal(0)
            if expected_value == 0
            else absolute_error / expected_value.copy_abs()
        )
        bound = absolute_tolerance
        utilization = absolute_error / bound if bound > 0 else absolute_error
        return passed, absolute_error, relative_error, utilization

    if comparison_rule != COMPARISON_RULE_DEFAULT:
        raise ParityComparisonError(f"unsupported comparison rule: {comparison_rule}")

    bound = max(absolute_tolerance, relative_tolerance * expected_value.copy_abs())
    relative_error = absolute_error / expected_value.copy_abs()
    passed = absolute_error <= bound
    utilization = absolute_error / bound if bound > 0 else absolute_error
    return passed, absolute_error, relative_error, utilization


def _resolve_canonical_display_precision(
    spacer_row: Mapping[str, Any],
    apollo_row: Mapping[str, Any],
    mapping_document: Mapping[str, Any],
    *,
    quantity: str,
) -> int | None:
    mapping_precision = mapping_document.get("canonical_display_precision")
    if isinstance(mapping_precision, dict) and quantity in mapping_precision:
        return int(mapping_precision[quantity])
    spacer_precision = int(spacer_row["display_precision"])
    apollo_precision = int(apollo_row["display_precision"])
    if spacer_precision != apollo_precision:
        return None
    return spacer_precision


def _validate_canonical_identity_bindings(
    canonical: Mapping[str, Any],
    mapping_document: Mapping[str, Any],
    *,
    side: str,
) -> None:
    prefix = side
    for field, mapping_suffix in (
        ("model_identity", "model_identity"),
        ("model_version", "model_version"),
        ("source_artifact_sha256", "source_artifact_sha256"),
    ):
        mapping_field = f"{prefix}_{mapping_suffix}"
        if canonical[field] != mapping_document[mapping_field]:
            raise ParityComparisonError(
                f"{side} canonical {field} mismatch with mapping {mapping_field}"
            )
    _validate_producer_bindings(canonical, mapping_document, side=side)


def _seal_canonical_provenance(
    provided_canonical: Mapping[str, Any],
    raw_document: Mapping[str, Any],
    mapping_document: Mapping[str, Any],
    *,
    side: str,
    raw_file_byte_sha256: str,
    mapping_file_byte_sha256: str,
) -> None:
    recomputed, _ = normalize_raw_results(
        raw_document,
        mapping_document,
        side=side,
        raw_file_byte_sha256=raw_file_byte_sha256,
        mapping_file_byte_sha256=mapping_file_byte_sha256,
    )
    if dict(provided_canonical) != recomputed:
        raise ParityComparisonError(
            f"{side} canonical document fails mandatory re-normalization seal"
        )


def _merge_exclusions(
    spacer_canonical: Mapping[str, Any],
    apollo_canonical: Mapping[str, Any],
) -> list[dict[str, Any]]:
    merged: dict[tuple[str, str], dict[str, Any]] = {}
    for side, document in (("spacer", spacer_canonical), ("apollo", apollo_canonical)):
        for entry in document.get("exclusions", []):
            source_key = str(entry["source_key"])
            side_name = str(entry.get("side", side))
            merge_key = (side_name, source_key)
            merged[merge_key] = {
                "side": side_name,
                "source_key": source_key,
                "canonical_key": entry.get("canonical_key"),
                "reason": entry.get("reason"),
                "classification": entry.get("classification"),
            }
    return sorted(merged.values(), key=lambda item: (item["side"], item["source_key"]))


def compare_canonical_documents(
    spacer_canonical: Mapping[str, Any],
    apollo_canonical: Mapping[str, Any],
    *,
    spacer_raw: Mapping[str, Any],
    apollo_raw: Mapping[str, Any],
    tolerance_rows: Sequence[Mapping[str, str]],
    tolerance_freeze_sha256: str,
    mapping_document: Mapping[str, Any],
    expected_mapping_file_byte_sha256: str,
    spacer_canonical_file_byte_sha256: str,
    apollo_canonical_file_byte_sha256: str,
    expected_spacer_raw_file_byte_sha256: str,
    expected_apollo_raw_file_byte_sha256: str,
) -> dict[str, Any]:
    computed_sha = compute_tolerance_freeze_sha256(tolerance_rows)
    if computed_sha != tolerance_freeze_sha256.lower():
        raise ParityComparisonError("tolerance freeze SHA-256 rejected")

    validate_canonical_document(spacer_canonical)
    validate_canonical_document(apollo_canonical)

    expected_mapping_byte_sha = validate_sha256_argument(
        expected_mapping_file_byte_sha256,
        field_name="expected_mapping_file_byte_sha256",
    )
    spacer_canonical_byte_sha = validate_sha256_argument(
        spacer_canonical_file_byte_sha256,
        field_name="spacer_canonical_file_byte_sha256",
    )
    apollo_canonical_byte_sha = validate_sha256_argument(
        apollo_canonical_file_byte_sha256,
        field_name="apollo_canonical_file_byte_sha256",
    )
    expected_spacer_raw_byte_sha = validate_sha256_argument(
        expected_spacer_raw_file_byte_sha256,
        field_name="expected_spacer_raw_file_byte_sha256",
    )
    expected_apollo_raw_byte_sha = validate_sha256_argument(
        expected_apollo_raw_file_byte_sha256,
        field_name="expected_apollo_raw_file_byte_sha256",
    )
    for side_name, document in (("spacer", spacer_canonical), ("apollo", apollo_canonical)):
        document_mapping_byte_sha = str(document["mapping_file_byte_sha256"])
        if document_mapping_byte_sha != expected_mapping_byte_sha:
            raise ParityComparisonError(
                f"{side_name} canonical mapping_file_byte_sha256 mismatch: "
                f"expected {expected_mapping_byte_sha}, got {document_mapping_byte_sha}"
            )
        document_raw_byte_sha = str(document["raw_file_byte_sha256"])
        expected_raw_byte_sha = (
            expected_spacer_raw_byte_sha if side_name == "spacer" else expected_apollo_raw_byte_sha
        )
        if document_raw_byte_sha != expected_raw_byte_sha:
            raise ParityComparisonError(
                f"{side_name} canonical raw_file_byte_sha256 mismatch: "
                f"expected {expected_raw_byte_sha}, got {document_raw_byte_sha}"
            )

    expected_mapping_sha = validate_mapping_document(
        mapping_document,
        spacer_raw=spacer_raw,
        apollo_raw=apollo_raw,
        file_byte_sha256=expected_mapping_byte_sha,
    )
    _validate_canonical_identity_bindings(spacer_canonical, mapping_document, side="spacer")
    _validate_canonical_identity_bindings(apollo_canonical, mapping_document, side="apollo")

    _seal_canonical_provenance(
        spacer_canonical,
        spacer_raw,
        mapping_document,
        side="spacer",
        raw_file_byte_sha256=expected_spacer_raw_byte_sha,
        mapping_file_byte_sha256=expected_mapping_byte_sha,
    )
    _seal_canonical_provenance(
        apollo_canonical,
        apollo_raw,
        mapping_document,
        side="apollo",
        raw_file_byte_sha256=expected_apollo_raw_byte_sha,
        mapping_file_byte_sha256=expected_mapping_byte_sha,
    )

    input_checksums = {
        "spacer_canonical_file_byte_sha256": spacer_canonical_byte_sha,
        "apollo_canonical_file_byte_sha256": apollo_canonical_byte_sha,
        "spacer_raw_file_byte_sha256": expected_spacer_raw_byte_sha,
        "apollo_raw_file_byte_sha256": expected_apollo_raw_byte_sha,
        "mapping_file_byte_sha256": expected_mapping_byte_sha,
    }

    exclusions = _merge_exclusions(spacer_canonical, apollo_canonical)
    has_exclusions = bool(exclusions)

    if spacer_canonical.get("stale") or apollo_canonical.get("stale"):
        return {
            "schema_version": SCHEMA_VERSION_COMPARISON,
            "harness_version": HARNESS_VERSION,
            "overall_verdict": "FAIL",
            "parity_pass": False,
            "actual_spacer_parity_verdict": "BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT",
            "tolerance_freeze_sha256": computed_sha,
            "failure_reason": "stale canonical output",
            "input_checksums": input_checksums,
            "rows": [],
            "exclusions": exclusions,
            "exclusion_blocks_pass": has_exclusions,
            "worst_case": None,
        }

    if spacer_canonical["mapping_sha256"] != apollo_canonical["mapping_sha256"]:
        raise ParityComparisonError("mapping_sha256 mismatch between spacer and apollo canonical")

    if spacer_canonical["mapping_sha256"] != expected_mapping_sha:
        raise ParityComparisonError("canonical mapping_sha256 does not match mapping document")

    tolerance_index = {row["quantity_key"]: row for row in tolerance_rows}
    spacer_index = {
        build_quantity_key(
            str(row["entity_type"]),
            str(row["entity_id"]),
            str(row["load_case_id"]),
            str(row["combination_id"]),
            str(row["coordinate_context"]),
            str(row["dof"]),
            str(row["member_end"]),
            str(row["quantity"]),
            str(row["feature"]),
        ): row
        for row in spacer_canonical["rows"]
    }
    apollo_index = {
        build_quantity_key(
            str(row["entity_type"]),
            str(row["entity_id"]),
            str(row["load_case_id"]),
            str(row["combination_id"]),
            str(row["coordinate_context"]),
            str(row["dof"]),
            str(row["member_end"]),
            str(row["quantity"]),
            str(row["feature"]),
        ): row
        for row in apollo_canonical["rows"]
    }

    spacer_keys = set(spacer_index)
    apollo_keys = set(apollo_index)
    tolerance_keys = set(tolerance_index)

    failures: list[str] = []
    if spacer_keys != apollo_keys:
        failures.append(
            f"spacer/apollo key mismatch: spacer-only={sorted(spacer_keys - apollo_keys)} "
            f"apollo-only={sorted(apollo_keys - spacer_keys)}"
        )
    if spacer_keys != tolerance_keys:
        failures.append(
            f"key/tolerance mismatch: missing_tol={sorted(spacer_keys - tolerance_keys)} "
            f"unused_tol={sorted(tolerance_keys - spacer_keys)}"
        )

    all_keys = sorted(spacer_keys | apollo_keys | tolerance_keys)
    comparison_rows: list[dict[str, Any]] = []
    worst_case: dict[str, Any] | None = None

    for key in all_keys:
        spacer_row = spacer_index.get(key)
        apollo_row = apollo_index.get(key)
        tol = tolerance_index.get(key)

        row_report: dict[str, Any] = {
            "quantity_key": key,
            "spacer_present": spacer_row is not None,
            "apollo_present": apollo_row is not None,
        }

        if spacer_row is None or apollo_row is None or tol is None:
            row_report["verdict"] = "FAIL"
            if spacer_row is None and apollo_row is not None:
                row_report["classification_hint"] = "EXTRA_OUTPUT"
            elif apollo_row is None:
                row_report["classification_hint"] = "MISSING_OUTPUT"
            else:
                row_report["classification_hint"] = "UNKNOWN_REQUIRES_EVIDENCE"
            comparison_rows.append(row_report)
            continue

        if spacer_row["unit"] != apollo_row["unit"]:
            row_report["verdict"] = "FAIL"
            row_report["classification_hint"] = "UNIT_CONVERSION_ERROR"
            row_report["unit_evidence"] = {
                "spacer_unit": spacer_row["unit"],
                "apollo_unit": apollo_row["unit"],
            }
            failures.append(f"unit mismatch for {key}")
            comparison_rows.append(row_report)
            continue

        if spacer_row["unit"] != tol["unit"]:
            failures.append(f"tolerance unit mismatch for {key}")

        display_precision = _resolve_canonical_display_precision(
            spacer_row,
            apollo_row,
            mapping_document,
            quantity=str(spacer_row["quantity"]),
        )
        if display_precision is None:
            row_report["verdict"] = "FAIL"
            row_report["classification_hint"] = "ROUNDING_DISPLAY_DIFFERENCE"
            row_report["display_precision_evidence"] = {
                "spacer_display_precision": int(spacer_row["display_precision"]),
                "apollo_display_precision": int(apollo_row["display_precision"]),
            }
            failures.append(f"display precision mismatch for {key}")
            comparison_rows.append(row_report)
            continue

        spacer_internal = parse_decimal(str(spacer_row["internal_value"]))
        apollo_internal = parse_decimal(str(apollo_row["internal_value"]))
        absolute_tolerance = parse_decimal(tol["absolute_tolerance"])
        relative_tolerance = parse_decimal(tol["relative_tolerance"])
        zero_threshold = parse_decimal(tol["zero_threshold"])

        passed, abs_err, rel_err, utilization = evaluate_comparison(
            spacer_internal,
            apollo_internal,
            absolute_tolerance=absolute_tolerance,
            relative_tolerance=relative_tolerance,
            zero_threshold=zero_threshold,
            comparison_rule=tol["comparison_rule"],
        )

        display_quantizer = Decimal(1).scaleb(-display_precision)
        spacer_display = parse_decimal(str(spacer_row["display_value"]))
        apollo_display = parse_decimal(str(apollo_row["display_value"]))
        spacer_display_q = spacer_display.quantize(display_quantizer)
        apollo_display_q = apollo_display.quantize(display_quantizer)
        display_match = spacer_display_q == apollo_display_q
        rounding_difference = str(spacer_display_q - apollo_display_q)

        row_report.update(
            {
                "spacer_internal_value": str(spacer_internal),
                "apollo_internal_value": str(apollo_internal),
                "spacer_display_value": str(spacer_row["display_value"]),
                "apollo_display_value": str(apollo_row["display_value"]),
                "canonical_display_precision": display_precision,
                "rounding_difference": rounding_difference,
                "absolute_error": format(abs_err, "f"),
                "relative_error": format(rel_err, "f"),
                "tolerance_bound": format(
                    compute_tolerance_bound(
                        spacer_internal,
                        absolute_tolerance=absolute_tolerance,
                        relative_tolerance=relative_tolerance,
                        zero_threshold=zero_threshold,
                    ),
                    "f",
                ),
                "utilization_ratio": format(utilization, "f"),
                "absolute_tolerance": tol["absolute_tolerance"],
                "relative_tolerance": tol["relative_tolerance"],
                "zero_threshold": tol["zero_threshold"],
                "internal_verdict": "PASS" if passed else "FAIL",
                "display_verdict": "PASS" if display_match else "FAIL",
            }
        )

        if passed and display_match:
            row_report["verdict"] = "PASS"
            row_report["classification_hint"] = None
        elif passed and not display_match:
            row_report["verdict"] = "FAIL"
            row_report["classification_hint"] = "ROUNDING_DISPLAY_DIFFERENCE"
            failures.append(f"display mismatch for {key}")
        else:
            row_report["verdict"] = "FAIL"
            row_report["classification_hint"] = "SOLVER_NUMERIC_DIFFERENCE"
            failures.append(f"numeric mismatch for {key}")

        comparison_rows.append(row_report)

        if row_report["verdict"] == "FAIL":
            candidate = {
                "quantity_key": key,
                "absolute_error": row_report.get("absolute_error"),
                "relative_error": row_report.get("relative_error"),
                "utilization_ratio": row_report.get("utilization_ratio"),
            }
            if worst_case is None:
                worst_case = candidate
            else:
                current_util = parse_decimal(str(worst_case["utilization_ratio"]))
                if utilization > current_util:
                    worst_case = candidate

    if has_exclusions:
        failures.append(f"exclusions present: {len(exclusions)}")

    overall = "PASS" if not failures else "FAIL"
    return {
        "schema_version": SCHEMA_VERSION_COMPARISON,
        "harness_version": HARNESS_VERSION,
        "overall_verdict": overall,
        "parity_pass": overall == "PASS",
        "actual_spacer_parity_verdict": "BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT",
        "tolerance_freeze_sha256": computed_sha,
        "input_checksums": input_checksums,
        "comparison_count": len(comparison_rows),
        "failures": failures,
        "rows": comparison_rows,
        "exclusions": exclusions,
        "exclusion_blocks_pass": has_exclusions,
        "worst_case": worst_case,
    }


def classify_mismatch_row(
    comparison_row: Mapping[str, Any],
    *,
    mapping_document: Mapping[str, Any] | None = None,
    spacer_stale: bool = False,
    apollo_stale: bool = False,
) -> dict[str, Any]:
    quantity_key = str(comparison_row.get("quantity_key", ""))
    classification = "UNKNOWN_REQUIRES_EVIDENCE"
    evidence_basis: list[str] = []

    if spacer_stale or apollo_stale:
        classification = "STALE_OUTPUT"
        evidence_basis.append("canonical stale flag true")
    elif not comparison_row.get("spacer_present"):
        classification = "EXTRA_OUTPUT"
        evidence_basis.append("apollo-only quantity key in symmetric coverage")
    elif not comparison_row.get("apollo_present"):
        classification = "MISSING_OUTPUT"
        evidence_basis.append("spacer-only quantity key in symmetric coverage")
    elif comparison_row.get("classification_hint") == "UNIT_CONVERSION_ERROR":
        unit_evidence = comparison_row.get("unit_evidence")
        if isinstance(unit_evidence, dict):
            classification = "UNIT_CONVERSION_ERROR"
            evidence_basis.append(
                f"unit fields differ: spacer={unit_evidence.get('spacer_unit')} "
                f"apollo={unit_evidence.get('apollo_unit')}"
            )
    elif comparison_row.get("classification_hint") == "ROUNDING_DISPLAY_DIFFERENCE":
        if (
            comparison_row.get("internal_verdict") == "PASS"
            and comparison_row.get("display_verdict") == "FAIL"
        ):
            classification = "ROUNDING_DISPLAY_DIFFERENCE"
            evidence_basis.append(
                "internal values within tolerance; display values differ; "
                f"rounding_difference={comparison_row.get('rounding_difference')}"
            )
    elif comparison_row.get("classification_hint") == "SOLVER_NUMERIC_DIFFERENCE":
        if (
            mapping_document is not None
            and comparison_row.get("internal_verdict") == "FAIL"
        ):
            classification = "SOLVER_NUMERIC_DIFFERENCE"
            evidence_basis.append("internal numeric comparison failed with matched units")
    elif mapping_document is not None:
        hint = comparison_row.get("classification_hint")
        if hint in MISMATCH_CLASSIFICATIONS:
            classification = str(hint)
            evidence_basis.append(f"comparison hint {hint}")

    if classification not in MISMATCH_CLASSIFICATIONS:
        classification = "UNKNOWN_REQUIRES_EVIDENCE"
        evidence_basis.append("no explicit evidence basis matched")

    return {
        "schema_version": SCHEMA_VERSION_MISMATCH,
        "quantity_key": quantity_key,
        "classification": classification,
        "evidence_basis": evidence_basis,
        "comparison_row": dict(comparison_row),
    }


def classify_comparison_report(
    comparison_report: Mapping[str, Any],
    *,
    mapping_document: Mapping[str, Any] | None = None,
    spacer_stale: bool = False,
    apollo_stale: bool = False,
) -> dict[str, Any]:
    rows = comparison_report.get("rows", [])
    if not isinstance(rows, list):
        raise ParityValidationError("comparison report rows must be a list")

    classified: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            raise ParityValidationError("comparison row must be an object")
        if row.get("verdict") != "FAIL":
            continue
        classified.append(
            classify_mismatch_row(
                row,
                mapping_document=mapping_document,
                spacer_stale=spacer_stale,
                apollo_stale=apollo_stale,
            )
        )

    classified_sorted = sorted(classified, key=lambda item: item["quantity_key"])
    return {
        "schema_version": SCHEMA_VERSION_MISMATCH,
        "harness_version": HARNESS_VERSION,
        "classification_count": len(classified_sorted),
        "rows": classified_sorted,
    }


def render_parity_report(
    comparison_report: Mapping[str, Any],
    classification_report: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    exclusions = comparison_report.get("exclusions", [])
    has_exclusions = bool(exclusions) or comparison_report.get("exclusion_blocks_pass", False)
    parity_pass = comparison_report.get("parity_pass", False) and not has_exclusions
    return {
        "schema_version": "apollo.parity.report.v1",
        "harness_version": HARNESS_VERSION,
        "package_version": PACKAGE_VERSION,
        "comparison_overall_verdict": comparison_report.get("overall_verdict"),
        "parity_pass": parity_pass,
        "parity_harness_verdict": "COMPLETE",
        "actual_spacer_parity_verdict": "BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT",
        "tolerance_freeze_sha256": comparison_report.get("tolerance_freeze_sha256"),
        "comparison_count": comparison_report.get("comparison_count", 0),
        "failure_count": len(comparison_report.get("failures", [])),
        "worst_case": comparison_report.get("worst_case"),
        "exclusions": exclusions,
        "exclusion_blocks_pass": has_exclusions,
        "classification_count": (
            classification_report.get("classification_count", 0)
            if classification_report
            else 0
        ),
        "evidence_label": EVIDENCE_LABEL_SYNTHETIC,
    }


def generate_tolerance_freeze_register(docs_dir: Path | None = None) -> dict[str, Any]:
    docs_dir = docs_dir or DOCS_DIR
    rows = tolerance_freeze_rows_from_fixtures()
    sha256 = compute_tolerance_freeze_sha256(rows)
    path = docs_dir / TOLERANCE_FREEZE_NAME
    if path.exists():
        raise ExclusiveWriteError(f"refusing to overwrite existing file: {path}")
    write_csv_exclusive(path, TOLERANCE_FREEZE_COLUMNS, rows)
    on_disk = compute_raw_file_sha256(path)
    if on_disk != sha256:
        raise ParityValidationError("tolerance register on-disk SHA mismatch after write")
    return {
        "tolerance_freeze_sha256": sha256,
        "tolerance_freeze_on_disk_sha256": on_disk,
        "quantity_count": len(rows),
    }


def _identity_matrix_strings() -> list[list[str]]:
    return [
        ["1", "0", "0"],
        ["0", "1", "0"],
        ["0", "0", "1"],
    ]


def _per_side_identity_transforms() -> dict[str, dict[str, list[list[str]]]]:
    identity = _identity_matrix_strings()
    return {
        "spacer": {"global": identity, "local": identity, "support": identity},
        "apollo": {"global": identity, "local": identity, "support": identity},
    }


def build_identity_mapping(
    *,
    mapping_id: str = "NOT_ACTUAL_SPACER_PARITY_SYNTHETIC",
    spacer_model_identity: str = "SYNTHETIC_SPACER_MODEL",
    apollo_model_identity: str = "SYNTHETIC_APOLLO_MODEL",
    spacer_model_version: str = "1.0.0",
    apollo_model_version: str = "1.0.0",
    spacer_source_sha256: str = "a" * 64,
    apollo_source_sha256: str = "b" * 64,
    spacer_producer_version: str = "SYNTHETIC",
    spacer_producer_build: str = "SYNTHETIC",
    spacer_executable_sha256: str = "c" * 64,
    apollo_producer_version: str = "SYNTHETIC",
    apollo_producer_build: str = "SYNTHETIC",
    apollo_executable_sha256: str = "d" * 64,
) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION_MAPPING,
        "mapping_id": mapping_id,
        "spacer_model_identity": spacer_model_identity,
        "apollo_model_identity": apollo_model_identity,
        "spacer_model_version": spacer_model_version,
        "apollo_model_version": apollo_model_version,
        "spacer_source_artifact_sha256": spacer_source_sha256,
        "apollo_source_artifact_sha256": apollo_source_sha256,
        "spacer_producer_version": spacer_producer_version,
        "spacer_producer_build": spacer_producer_build,
        "spacer_executable_sha256": spacer_executable_sha256,
        "apollo_producer_version": apollo_producer_version,
        "apollo_producer_build": apollo_producer_build,
        "apollo_executable_sha256": apollo_executable_sha256,
        "node_map": {
            "spacer": {"N1": "N1", "N2": "N2"},
            "apollo": {"N1": "N1", "N2": "N2"},
        },
        "member_map": {
            "spacer": {"M1": "M1"},
            "apollo": {"M1": "M1"},
        },
        "material_map": {
            "spacer": {"MAT1": "MAT1"},
            "apollo": {"MAT1": "MAT1"},
        },
        "support_map": {
            "spacer": {"S1": "S1"},
            "apollo": {"S1": "S1"},
        },
        "load_case_map": {
            "spacer": {"LC1": "LC1"},
            "apollo": {"LC1": "LC1"},
        },
        "combination_map": {
            "spacer": {"COMB1": "COMB1"},
            "apollo": {"COMB1": "COMB1"},
        },
        "quantity_map": {
            "spacer": {
                "displacement": "displacement",
                "shear_y": "shear_y",
                "reaction": "reaction",
            },
            "apollo": {
                "displacement": "displacement",
                "shear_y": "shear_y",
                "reaction": "reaction",
            },
        },
        "coordinate_transforms": _per_side_identity_transforms(),
        "dof_permutation": {
            "spacer": list(DOF_COMPONENTS),
            "apollo": list(DOF_COMPONENTS),
        },
        "member_end_transform": {
            "spacer": {"swap_ij": False, "end_map": {"I": "I", "J": "J"}},
            "apollo": {"swap_ij": False, "end_map": {"I": "I", "J": "J"}},
        },
        "sign_transform": {
            "spacer": {component: 1 for component in SIGN_COMPONENTS},
            "apollo": {component: 1 for component in SIGN_COMPONENTS},
        },
        "quantity_sign_transform": {
            "spacer": {"shear_y": 1, "displacement": 1, "reaction": 1},
            "apollo": {"shear_y": 1, "displacement": 1, "reaction": 1},
        },
        "unit_conversion": {
            "spacer": {
                "displacement": {
                    "from_unit": "m",
                    "to_unit": "m",
                    "scale": "1",
                    "offset": "0",
                },
                "reaction": {
                    "from_unit": "kN",
                    "to_unit": "kN",
                    "scale": "1",
                    "offset": "0",
                },
                "shear_y": {
                    "from_unit": "kN",
                    "to_unit": "kN",
                    "scale": "1",
                    "offset": "0",
                },
            },
            "apollo": {
                "displacement": {
                    "from_unit": "m",
                    "to_unit": "m",
                    "scale": "1",
                    "offset": "0",
                },
                "reaction": {
                    "from_unit": "kN",
                    "to_unit": "kN",
                    "scale": "1",
                    "offset": "0",
                },
                "shear_y": {
                    "from_unit": "kN",
                    "to_unit": "kN",
                    "scale": "1",
                    "offset": "0",
                },
            },
        },
        "canonical_display_precision": {
            "displacement": 6,
            "reaction": 6,
            "shear_y": 6,
        },
        "exclusions": [],
    }


def build_raw_row(
    *,
    entity_type: str,
    entity_id: str,
    load_case_id: str = "LC1",
    combination_id: str = "",
    coordinate_context: str = "global",
    dof: str = "",
    member_end: str = "",
    quantity: str,
    unit: str,
    internal_value: str,
    display_value: str | None = None,
    internal_precision: int = 15,
    display_precision: int = 6,
    feature: str = "",
) -> dict[str, Any]:
    display = display_value if display_value is not None else internal_value
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "load_case_id": load_case_id,
        "combination_id": combination_id,
        "coordinate_context": coordinate_context,
        "dof": dof,
        "member_end": member_end,
        "quantity": quantity,
        "unit": unit,
        "internal_value": internal_value,
        "display_value": display,
        "internal_precision": internal_precision,
        "display_precision": display_precision,
        "feature": feature,
    }


def build_fixture_raw_rows() -> list[dict[str, Any]]:
    return [
        build_raw_row(
            entity_type=fixture["entity_type"],
            entity_id=fixture["entity_id"],
            load_case_id=fixture["load_case_id"],
            combination_id=fixture["combination_id"],
            coordinate_context=fixture["coordinate_context"],
            dof=fixture["dof"],
            member_end=fixture["member_end"],
            quantity=fixture["quantity"],
            unit=fixture["unit"],
            internal_value="0.001" if fixture["feature"] != "near_zero" else "0",
            display_value="0.001000" if fixture["feature"] != "near_zero" else "0.000000",
            feature=fixture["feature"],
        )
        if fixture["quantity"] == "displacement"
        else build_raw_row(
            entity_type=fixture["entity_type"],
            entity_id=fixture["entity_id"],
            load_case_id=fixture["load_case_id"],
            combination_id=fixture["combination_id"],
            coordinate_context=fixture["coordinate_context"],
            dof=fixture["dof"],
            member_end=fixture["member_end"],
            quantity=fixture["quantity"],
            unit=fixture["unit"],
            internal_value="10" if fixture["quantity"] == "shear_y" else "5",
            display_value="10.000000" if fixture["quantity"] == "shear_y" else "5.000000",
            feature=fixture["feature"],
        )
        for fixture in SYNTHETIC_FIXTURE_QUANTITIES
    ]


def build_raw_document(
    *,
    producer: str,
    rows: Sequence[Mapping[str, Any]],
    model_identity: str,
    model_version: str = "1.0.0",
    source_artifact_sha256: str,
    stale: bool = False,
    producer_version: str = "SYNTHETIC",
    producer_build: str = "SYNTHETIC",
    executable_sha256: str | None = None,
) -> dict[str, Any]:
    default_exe = "c" * 64 if producer == "spacer" else "d" * 64
    return {
        "schema_version": SCHEMA_VERSION_RAW,
        "producer": producer,
        "producer_version": producer_version,
        "producer_build": producer_build,
        "executable_sha256": executable_sha256 or default_exe,
        "model_identity": model_identity,
        "model_version": model_version,
        "source_artifact_sha256": source_artifact_sha256,
        "stale": stale,
        "evidence_label": EVIDENCE_LABEL_SYNTHETIC,
        "rows": list(rows),
    }
