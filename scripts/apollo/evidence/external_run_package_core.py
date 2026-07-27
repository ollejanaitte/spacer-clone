"""Shared core for EA-03 external run package evidence (DS-06)."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import shutil
import stat
from pathlib import Path
from typing import Any, Mapping, Sequence

from evidence_core import (
    HARNESS_VERSION,
    SCHEMA_VERSION as EVIDENCE_BUNDLE_SCHEMA,
    BundleValidationError,
    ExclusiveWriteError,
    PathSafetyError,
    compare_repeated_runs,
    read_json,
    resolve_within_root,
    sha256_bytes,
    sha256_file,
    software_identity as harness_software_identity,
    utc_now_iso,
    validate_evidence_bundle,
    validate_run_id,
    write_json,
    write_text_exclusive,
)

PACKAGE_VERSION = "1.0.0"
SCHEMA_VERSION = "apollo.external_run.package.v1"

REQUIRED_OPERATOR_INPUT = "REQUIRED_OPERATOR_INPUT"
BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT = "BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT"

PACKAGE_VERDICT_COMPLETE = "COMPLETE"
EXECUTION_VERDICT_BLOCKED = BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT

REPO_ROOT = Path(__file__).resolve().parents[3]
DOCS_DIR = REPO_ROOT / "docs" / "apollo" / "evidence-collection" / "03_external_run_package"
TEMPLATES_DIR = DOCS_DIR / "templates"
INPUT_BUNDLE_DIR = DOCS_DIR / "input_bundle"

CANONICAL_PROBE_MATRIX = (
    REPO_ROOT
    / "docs"
    / "apollo"
    / "design-standards"
    / "06_analyzer"
    / "analyzer_probe_matrix.csv"
)
CANONICAL_ERROR_MATRIX = (
    REPO_ROOT
    / "docs"
    / "apollo"
    / "design-standards"
    / "06_analyzer"
    / "analyzer_error_exit_license_matrix.csv"
)
CANONICAL_IDENTITY_REGISTER = (
    REPO_ROOT
    / "docs"
    / "apollo"
    / "design-standards"
    / "06_analyzer"
    / "analyzer_identity_register.csv"
)

EXTERNAL_IDENTITY_IDS = ("AN-ID-004", "AN-ID-005", "AN-ID-006")
CANONICAL_POSITIVE_PROBE_IDS = tuple(f"AN-PRB-{index:03d}" for index in range(1, 23))
CANONICAL_NEGATIVE_PROBE_IDS = tuple(f"AN-ERR-{index:03d}" for index in range(1, 17))
CANONICAL_PROBE_SLOT_IDS = CANONICAL_POSITIVE_PROBE_IDS + CANONICAL_NEGATIVE_PROBE_IDS
REQUIRED_PROBE_EXECUTION_COUNT = len(CANONICAL_PROBE_SLOT_IDS)
REPEAT_RUN_COUNT = 3
REPEAT_RUN_DIR_PATTERN = re.compile(r"^repeat_0[1-3]$")
PROBE_SLOT_PATTERN = re.compile(r"^probe:(AN-PRB-\d{3}|AN-ERR-\d{3})$")
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
RUN_ID_PATTERN = re.compile(r"^[0-9a-f]{64}$")

PACKAGE_MANIFEST_NAME = "package_manifest.json"
OPERATOR_RECORD_NAME = "operator_record.json"
RUN_REQUEST_NAME = "run_request.json"
LICENSE_PREFLIGHT_NAME = "license_preflight.json"
MACHINE_PREFLIGHT_NAME = "machine_preflight.json"
FIXTURE_MANIFEST_NAME = "fixture_checksum_manifest.json"
IMPORT_MANIFEST_NAME = "import_manifest.json"
VERIFICATION_REPORT_NAME = "verification_report.json"
SUMMARY_NAME = "external_run_summary.json"
IDENTITY_BINDINGS_MANIFEST_NAME = "identity_bindings_manifest.json"
EXTERNAL_IDENTITY_BINDING_NAME = "external_identity_binding.json"
IMPORT_STAGING_DIR_PREFIX = ".import_staging_"

CONTENT_HASH_EXCLUDED_RELATIVES = frozenset(
    {
        IMPORT_MANIFEST_NAME,
        VERIFICATION_REPORT_NAME,
        SUMMARY_NAME,
    }
)

SOFTWARE_IDENTITIES_DIR = "software_identities"
INPUT_BUNDLE_SUBDIR = "input_bundle"
PROBE_EXECUTIONS_DIR = "probe_executions"
REPEAT_RUNS_DIR = "repeat_runs"

POSITIVE_PROBE_CATALOG_NAME = "positive_probe_catalog.csv"
NEGATIVE_PROBE_CATALOG_NAME = "negative_probe_catalog.csv"
EXTERNAL_RUN_BLOCKERS_NAME = "external_run_blockers.csv"

REFERENCE_ONLY_MANUAL_SHA = (
    "e08681a290904c13c702ed864e0753d85e5c43201a5881c48766c0417aa7d012"
)

_SECRET_ENV_NAME_SEGMENTS = frozenset(
    {
        "PASSWORD",
        "SECRET",
        "TOKEN",
        "APIKEY",
        "CREDENTIAL",
        "CREDENTIALS",
        "BEARER",
    }
)
_SECRET_ENV_NAME_EXACT = frozenset(
    {
        "API_KEY",
        "ACCESS_KEY",
        "PRIVATE_KEY",
        "LICENSE_KEY",
    }
)
_SECRET_ASSIGNMENT_PATTERNS = (
    re.compile(r"(?i)\bPASSWORD\s*="),
    re.compile(r"(?i)\bTOKEN\s*="),
    re.compile(r"(?i)\bAPI_KEY\s*="),
    re.compile(r"(?i)\bACCESS_KEY\s*="),
    re.compile(r"(?i)\bLICENSE_KEY\s*="),
    re.compile(r"(?i)-----BEGIN(?:\s+RSA)?\s+PRIVATE\s+KEY-----"),
)


class ExternalRunPackageError(Exception):
    """Base error for EA-03 external run package operations."""


class ExternalRunPackageValidationError(ExternalRunPackageError):
    """Raised when package validation fails fail-closed."""


def _read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def _write_csv_rows(path: Path, fieldnames: Sequence[str], rows: Sequence[Mapping[str, str]]) -> None:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({name: row.get(name, "") for name in fieldnames})
    write_text_exclusive(path, buffer.getvalue())


def _sha256_path(path: Path) -> str:
    return sha256_file(path)


def _is_placeholder(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, bool):
        return False
    if isinstance(value, (int, float)):
        return False
    if isinstance(value, str):
        stripped = value.strip()
        return not stripped or stripped == REQUIRED_OPERATOR_INPUT
    if isinstance(value, list):
        return not value or any(_is_placeholder(item) for item in value)
    if isinstance(value, dict):
        return any(_is_placeholder(v) for v in value.values())
    return False


def _env_name_looks_secret(name: str) -> str | None:
    upper = name.strip().upper()
    if not upper:
        return None
    if upper in _SECRET_ENV_NAME_EXACT:
        return upper
    for segment in upper.split("_"):
        if segment in _SECRET_ENV_NAME_SEGMENTS:
            return segment
    return None


def _scan_env_name_for_secrets(name: str, *, context: str) -> str | None:
    marker = _env_name_looks_secret(name)
    if marker is None:
        return None
    return f"{context} contains secret-like environment name segment: {marker}"


def _scan_text_for_secret_assignments(text: str, *, context: str) -> str | None:
    if not isinstance(text, str):
        return None
    for pattern in _SECRET_ASSIGNMENT_PATTERNS:
        match = pattern.search(text)
        if match:
            return f"{context} contains secret-like assignment pattern: {match.group(0)}"
    return None


def _require_nonempty_string_list(
    value: Any,
    field_name: str,
    *,
    scan_secrets: bool = False,
) -> list[str]:
    if not isinstance(value, list) or not value:
        raise ExternalRunPackageValidationError(f"{field_name} must be a non-empty list")
    result: list[str] = []
    for index, item in enumerate(value):
        if not isinstance(item, str) or _is_placeholder(item):
            raise ExternalRunPackageValidationError(
                f"{field_name}[{index}] is {REQUIRED_OPERATOR_INPUT}"
            )
        if scan_secrets:
            secret_error = _scan_env_name_for_secrets(item, context=f"{field_name}[{index}]")
            if secret_error:
                raise ExternalRunPackageValidationError(secret_error)
        result.append(item)
    return result


def _staging_slot_path(slot_kind: str, slot_id: str) -> Path:
    return Path(slot_kind) / slot_id


def _ensure_json_serializable(value: Any, *, context: str) -> None:
    try:
        json.dumps(value)
    except (TypeError, ValueError) as exc:
        raise ExternalRunPackageValidationError(
            f"{context} is not JSON-serializable: {exc}"
        ) from exc


def _prepare_identity_binding(binding: Mapping[str, Any], *, context: str) -> dict[str, Any]:
    prepared = dict(binding)
    errors = _validate_identity_binding_record(prepared, context=context)
    if errors:
        raise ExternalRunPackageValidationError("; ".join(errors))
    _ensure_json_serializable(prepared, context=context)
    return prepared


def _rollback_promoted_paths(paths: Sequence[Path]) -> None:
    for path in reversed(paths):
        if not path.exists():
            continue
        if path.is_dir() and not path.is_symlink():
            shutil.rmtree(path)
        else:
            path.unlink()


def _mkdir_parents_tracking(path: Path, created_parent_dirs: list[Path]) -> None:
    parent = path.parent.resolve()
    missing: list[Path] = []
    current = parent
    while not current.exists():
        missing.append(current)
        parent_of_current = current.parent
        if parent_of_current == current:
            break
        current = parent_of_current.resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    for directory in reversed(missing):
        resolved = directory.resolve()
        if resolved not in created_parent_dirs:
            created_parent_dirs.append(resolved)


def _rollback_import_transaction(
    promoted_paths: Sequence[Path],
    created_parent_dirs: Sequence[Path],
) -> None:
    _rollback_promoted_paths(promoted_paths)
    unique_parents = sorted(
        {directory.resolve() for directory in created_parent_dirs},
        key=lambda directory: len(directory.parts),
        reverse=True,
    )
    for directory in unique_parents:
        if not directory.is_dir():
            continue
        try:
            directory.rmdir()
        except OSError:
            continue


def _parse_evidence_slot(slot: str) -> tuple[str, str]:
    if REPEAT_RUN_DIR_PATTERN.fullmatch(slot):
        return "repeat", slot
    if not slot.startswith("probe:"):
        raise ExternalRunPackageError(f"unsupported evidence slot: {slot}")
    probe_id = slot.split(":", 1)[1]
    if probe_id != slot.split(":", 1)[1].strip():
        raise ExternalRunPackageError(f"invalid probe slot whitespace: {slot}")
    if "/" in probe_id or "\\" in probe_id or ".." in probe_id:
        raise ExternalRunPackageError(f"probe slot path traversal rejected: {slot}")
    if probe_id not in CANONICAL_PROBE_SLOT_IDS:
        raise ExternalRunPackageError(
            f"probe slot must be canonical AN-PRB-001..022 or AN-ERR-001..016: {probe_id}"
        )
    return "probe", probe_id


def _identity_binding_template() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "selected_identity_id": REQUIRED_OPERATOR_INPUT,
        "frozen_identity_bundle_id": REQUIRED_OPERATOR_INPUT,
        "executable_sha256": REQUIRED_OPERATOR_INPUT,
        "fixture_manifest_sha256": REQUIRED_OPERATOR_INPUT,
    }


def identity_bindings_manifest_template() -> dict[str, Any]:
    binding = _identity_binding_template()
    bindings: dict[str, Any] = {"run_request": dict(binding)}
    bindings.update({f"repeat_{index:02d}": dict(binding) for index in range(1, REPEAT_RUN_COUNT + 1)})
    for probe_id in CANONICAL_PROBE_SLOT_IDS:
        bindings[f"probe:{probe_id}"] = dict(binding)
    return {
        "schema_version": SCHEMA_VERSION,
        "bindings": bindings,
        "status": BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
    }


def _require_filled_string(value: Any, field_name: str) -> str:
    if not isinstance(value, str) or _is_placeholder(value):
        raise ExternalRunPackageValidationError(
            f"{field_name} is {REQUIRED_OPERATOR_INPUT}"
        )
    return value


def _validate_sha256_field(value: Any, field_name: str) -> str:
    text = _require_filled_string(value, field_name)
    if not SHA256_PATTERN.fullmatch(text):
        raise ExternalRunPackageValidationError(
            f"{field_name} must be a 64-char lowercase hex sha256"
        )
    return text


def _reject_reference_only_identity_sha(value: str, field_name: str) -> str | None:
    if value == REFERENCE_ONLY_MANUAL_SHA:
        return f"{field_name} uses reference-only manual SHA; operator must capture executable SHA"
    return None


def _load_canonical_probe_ids() -> tuple[list[str], list[str]]:
    probes = [row["probe_id"] for row in _read_csv_rows(CANONICAL_PROBE_MATRIX)]
    errors = [row["scenario_id"] for row in _read_csv_rows(CANONICAL_ERROR_MATRIX)]
    return probes, errors


def operator_record_template() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "operator_id": REQUIRED_OPERATOR_INPUT,
        "operator_name": REQUIRED_OPERATOR_INPUT,
        "organization": REQUIRED_OPERATOR_INPUT,
        "capture_started_at_utc": REQUIRED_OPERATOR_INPUT,
        "capture_completed_at_utc": REQUIRED_OPERATOR_INPUT,
        "authorized_machine_id": REQUIRED_OPERATOR_INPUT,
        "notes": "Operator attestation that no licensed program files were modified and no secrets were retained.",
    }


def software_identity_template(identity_id: str) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "identity_id": identity_id,
        "identity_name": REQUIRED_OPERATOR_INPUT,
        "identity_class": REQUIRED_OPERATOR_INPUT,
        "product_version": REQUIRED_OPERATOR_INPUT,
        "build_id": REQUIRED_OPERATOR_INPUT,
        "architecture": REQUIRED_OPERATOR_INPUT,
        "publisher": REQUIRED_OPERATOR_INPUT,
        "executable_path": REQUIRED_OPERATOR_INPUT,
        "executable_sha256": REQUIRED_OPERATOR_INPUT,
        "service_name": REQUIRED_OPERATOR_INPUT,
        "hosting_process": REQUIRED_OPERATOR_INPUT,
        "relationship_notes": REQUIRED_OPERATOR_INPUT,
        "identity_capture_command": REQUIRED_OPERATOR_INPUT,
        "identity_capture_stdout_sha256": REQUIRED_OPERATOR_INPUT,
        "frozen_identity_bundle_id": REQUIRED_OPERATOR_INPUT,
        "captured_at_utc": REQUIRED_OPERATOR_INPUT,
        "status": BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
    }


def run_request_template() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "selected_identity_id": REQUIRED_OPERATOR_INPUT,
        "invocation_command": [REQUIRED_OPERATOR_INPUT],
        "invocation_cwd": REQUIRED_OPERATOR_INPUT,
        "invocation_environment_allowlist": [REQUIRED_OPERATOR_INPUT],
        "invocation_notes": (
            "Vendor-supported command or GUI/service operation captured verbatim "
            "and checksum-bound before probe execution."
        ),
        "fixture_binding_sha256": REQUIRED_OPERATOR_INPUT,
        "frozen_identity_bundle_id": REQUIRED_OPERATOR_INPUT,
        "status": BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
    }


def fixture_checksum_manifest_template() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "manifest_id": REQUIRED_OPERATOR_INPUT,
        "fixtures": [
            {
                "fixture_id": REQUIRED_OPERATOR_INPUT,
                "workspace_relative_path": REQUIRED_OPERATOR_INPUT,
                "source_path": REQUIRED_OPERATOR_INPUT,
                "sha256": REQUIRED_OPERATOR_INPUT,
                "size_bytes": REQUIRED_OPERATOR_INPUT,
                "read_only": True,
            }
        ],
        "status": BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
    }


def license_preflight_template() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "entitlement_name": REQUIRED_OPERATOR_INPUT,
        "entitlement_state": REQUIRED_OPERATOR_INPUT,
        "license_server_reachable": REQUIRED_OPERATOR_INPUT,
        "seat_count_documented": REQUIRED_OPERATOR_INPUT,
        "license_key_captured": False,
        "license_artifact_sha256": REQUIRED_OPERATOR_INPUT,
        "status": BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
    }


def machine_preflight_template() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "host_os": REQUIRED_OPERATOR_INPUT,
        "host_architecture": REQUIRED_OPERATOR_INPUT,
        "host_locale": REQUIRED_OPERATOR_INPUT,
        "timezone": REQUIRED_OPERATOR_INPUT,
        "authorized_machine_id": REQUIRED_OPERATOR_INPUT,
        "supervisor_preflight_notes": (
            "Supervisor read-only preflight observation only; not accepted as capture host. "
            "Operator must record observed host facts on the authorized capture machine."
        ),
        "external_software_discovered": False,
        "discovery_evidence_sha256": REQUIRED_OPERATOR_INPUT,
        "discovery_search_paths": ["PATH", "/opt", "/usr/local", str(REPO_ROOT)],
        "status": BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
    }


def package_manifest_template(bundle_id: str) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "package_version": PACKAGE_VERSION,
        "bundle_id": bundle_id,
        "created_at_utc": utc_now_iso(),
        "harness_version": HARNESS_VERSION,
        "evidence_bundle_schema": EVIDENCE_BUNDLE_SCHEMA,
        "required_external_identities": list(EXTERNAL_IDENTITY_IDS),
        "required_repeat_run_count": REPEAT_RUN_COUNT,
        "package_verdict": PACKAGE_VERDICT_COMPLETE,
        "execution_verdict": EXECUTION_VERDICT_BLOCKED,
        "status": BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
    }


def _identity_file_name(identity_id: str) -> str:
    return f"{identity_id}.json"


def prepare_external_run_bundle(
    output_dir: Path,
    *,
    bundle_id: str | None = None,
) -> dict[str, Any]:
    if output_dir.exists():
        raise ExclusiveWriteError(f"refusing to overwrite existing bundle directory: {output_dir}")

    resolved_bundle_id = bundle_id or f"ea03-{utc_now_iso().replace(':', '').replace('-', '')}"
    output_dir.mkdir(parents=True, exist_ok=False)

    identities_dir = output_dir / SOFTWARE_IDENTITIES_DIR
    identities_dir.mkdir(parents=True, exist_ok=True)
    input_bundle = output_dir / INPUT_BUNDLE_SUBDIR
    input_bundle.mkdir(parents=True, exist_ok=True)
    (output_dir / PROBE_EXECUTIONS_DIR).mkdir(parents=True, exist_ok=True)
    repeat_dir = output_dir / REPEAT_RUNS_DIR
    repeat_dir.mkdir(parents=True, exist_ok=True)
    for index in range(1, REPEAT_RUN_COUNT + 1):
        (repeat_dir / f"repeat_{index:02d}").mkdir(parents=True, exist_ok=True)

    manifest = package_manifest_template(resolved_bundle_id)
    write_json(output_dir / PACKAGE_MANIFEST_NAME, manifest)
    write_json(output_dir / OPERATOR_RECORD_NAME, operator_record_template())
    write_json(output_dir / RUN_REQUEST_NAME, run_request_template())
    write_json(output_dir / LICENSE_PREFLIGHT_NAME, license_preflight_template())
    write_json(output_dir / MACHINE_PREFLIGHT_NAME, machine_preflight_template())
    write_json(input_bundle / FIXTURE_MANIFEST_NAME, fixture_checksum_manifest_template())
    write_json(output_dir / IDENTITY_BINDINGS_MANIFEST_NAME, identity_bindings_manifest_template())

    identity_records: list[dict[str, Any]] = []
    for identity_id in EXTERNAL_IDENTITY_IDS:
        record = software_identity_template(identity_id)
        write_json(identities_dir / _identity_file_name(identity_id), record)
        identity_records.append(record)

    return {
        "prepared_at_utc": utc_now_iso(),
        "bundle_id": resolved_bundle_id,
        "bundle_path": str(output_dir.resolve()),
        "package_verdict": PACKAGE_VERDICT_COMPLETE,
        "execution_verdict": EXECUTION_VERDICT_BLOCKED,
        "identity_count": len(identity_records),
        "repeat_run_slots": REPEAT_RUN_COUNT,
    }


def import_external_run_bundle(
    bundle_dir: Path,
    *,
    source_files: Mapping[str, Path] | None = None,
    evidence_bundle_dirs: Mapping[str, Path] | None = None,
    identity_bindings: Mapping[str, Mapping[str, Any]] | None = None,
) -> dict[str, Any]:
    bundle_root = bundle_dir.resolve()
    if not (bundle_root / PACKAGE_MANIFEST_NAME).exists():
        raise ExternalRunPackageError(f"missing package manifest: {bundle_root}")

    import_path = bundle_root / IMPORT_MANIFEST_NAME
    if import_path.exists():
        raise ExclusiveWriteError(f"refusing to overwrite import manifest: {import_path}")

    source_files = source_files or {}
    evidence_bundle_dirs = evidence_bundle_dirs or {}
    identity_bindings = identity_bindings or {}

    missing_bindings = sorted(set(evidence_bundle_dirs) - set(identity_bindings))
    if missing_bindings:
        raise ExternalRunPackageValidationError(
            f"missing identity binding for evidence slot(s): {missing_bindings}"
        )

    prepared_bindings: dict[str, dict[str, Any]] = {}
    for slot, binding in identity_bindings.items():
        prepared_bindings[slot] = _prepare_identity_binding(
            binding,
            context=f"identity_binding[{slot}]",
        )

    planned: list[dict[str, Any]] = []

    for relative, source in source_files.items():
        destination = resolve_within_root(bundle_root, relative)
        if not source.is_file():
            raise ExternalRunPackageError(f"source file missing: {source}")
        if source.is_symlink():
            raise PathSafetyError(f"symlink source rejected: {source}")
        if destination.exists():
            raise ExclusiveWriteError(f"refusing to overwrite: {destination}")
        planned.append(
            {
                "kind": "file",
                "source": source.resolve(),
                "destination": destination,
                "workspace_relative_path": relative,
            }
        )

    for slot, source in evidence_bundle_dirs.items():
        slot_kind, slot_id = _parse_evidence_slot(slot)
        if not source.is_dir():
            raise ExternalRunPackageError(f"evidence source must be a directory: {source}")
        if not (source / "bundle_manifest.json").exists():
            raise ExternalRunPackageError(f"missing bundle_manifest.json in {source}")
        if slot_kind == "repeat":
            dest_root = resolve_within_root(
                bundle_root, f"{REPEAT_RUNS_DIR}/{slot_id}/{source.name}"
            )
            binding_destination = resolve_within_root(
                bundle_root, f"{REPEAT_RUNS_DIR}/{slot_id}/{EXTERNAL_IDENTITY_BINDING_NAME}"
            )
        else:
            dest_root = resolve_within_root(
                bundle_root, f"{PROBE_EXECUTIONS_DIR}/{slot_id}/{source.name}"
            )
            binding_destination = resolve_within_root(
                bundle_root,
                f"{PROBE_EXECUTIONS_DIR}/{slot_id}/{EXTERNAL_IDENTITY_BINDING_NAME}",
            )
        if dest_root.exists():
            raise ExclusiveWriteError(f"evidence destination already exists: {dest_root}")
        if binding_destination.exists():
            raise ExclusiveWriteError(
                f"refusing to overwrite identity binding: {binding_destination}"
            )
        planned.append(
            {
                "kind": "evidence",
                "slot": slot,
                "slot_kind": slot_kind,
                "slot_id": slot_id,
                "source": source.resolve(),
                "destination": dest_root,
                "binding": prepared_bindings[slot],
                "binding_destination": binding_destination,
            }
        )

    staging_dir = bundle_root / f"{IMPORT_STAGING_DIR_PREFIX}{utc_now_iso().replace(':', '').replace('-', '')}"
    if staging_dir.exists():
        raise ExclusiveWriteError(f"staging directory already exists: {staging_dir}")

    imported: list[dict[str, Any]] = []
    promoted_paths: list[Path] = []
    created_parent_dirs: list[Path] = []
    try:
        staging_dir.mkdir(parents=True, exist_ok=False)
        for item in planned:
            if item["kind"] == "file":
                stage_destination = staging_dir / "files" / item["workspace_relative_path"]
                stage_destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(item["source"], stage_destination)
                if stage_destination.is_symlink():
                    raise PathSafetyError(f"symlink rejected during staging: {stage_destination}")
                stage_destination.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)
                item["stage_destination"] = stage_destination
            else:
                stage_destination = (
                    staging_dir
                    / "evidence"
                    / _staging_slot_path(item["slot_kind"], item["slot_id"])
                    / item["source"].name
                )
                stage_destination.parent.mkdir(parents=True, exist_ok=True)
                _import_evidence_bundle_tree(item["source"], stage_destination)
                validate_evidence_bundle(
                    read_json(stage_destination / "bundle_manifest.json"),
                    workspace=stage_destination,
                )
                item["stage_destination"] = stage_destination
                binding_stage = (
                    staging_dir
                    / "bindings"
                    / _staging_slot_path(item["slot_kind"], item["slot_id"])
                    / EXTERNAL_IDENTITY_BINDING_NAME
                )
                binding_stage.parent.mkdir(parents=True, exist_ok=True)
                write_json(binding_stage, item["binding"])
                binding_stage.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)
                item["binding_stage_destination"] = binding_stage

        for item in planned:
            if item["kind"] == "file":
                destination = item["destination"]
                _mkdir_parents_tracking(destination, created_parent_dirs)
                item["stage_destination"].replace(destination)
                promoted_paths.append(destination)
                destination.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)
                imported.append(
                    {
                        "workspace_relative_path": item["workspace_relative_path"],
                        "source_path": str(item["source"]),
                        "destination_path": str(destination.resolve()),
                        "sha256": sha256_file(destination),
                        "size_bytes": destination.stat().st_size,
                        "read_only": True,
                    }
                )
            else:
                destination = item["destination"]
                _mkdir_parents_tracking(destination, created_parent_dirs)
                item["stage_destination"].replace(destination)
                promoted_paths.append(destination)
                _reparent_evidence_bundle_workspace(destination)
                binding_destination = item["binding_destination"]
                item["binding_stage_destination"].replace(binding_destination)
                promoted_paths.append(binding_destination)
                binding_destination.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)
                imported.append(
                    {
                        "slot": item["slot"],
                        "destination_path": str(destination.resolve()),
                        "bundle_manifest_sha256": sha256_file(destination / "bundle_manifest.json"),
                    }
                )

        import_manifest = {
            "schema_version": SCHEMA_VERSION,
            "imported_at_utc": utc_now_iso(),
            "bundle_path": str(bundle_root),
            "imported_artifacts": imported,
            "content_hashes": _compute_content_hashes(bundle_root),
            "status": BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
        }
        write_json(import_path, import_manifest)
        promoted_paths.append(import_path)
        import_manifest_sha256 = sha256_file(import_path)
        return {
            **import_manifest,
            "import_manifest_sha256": import_manifest_sha256,
        }
    except Exception:
        _rollback_import_transaction(promoted_paths, created_parent_dirs)
        raise
    finally:
        if staging_dir.exists():
            shutil.rmtree(staging_dir)


def _reparent_evidence_bundle_workspace(destination: Path) -> None:
    manifest_path = destination / "bundle_manifest.json"
    if not manifest_path.exists():
        return
    manifest = read_json(manifest_path)
    run_id = manifest.get("run_id")
    if isinstance(run_id, str):
        validate_run_id(run_id)
    expected_workspace = destination.resolve()
    if manifest.get("workspace_path") != str(expected_workspace):
        manifest["workspace_path"] = str(expected_workspace)
        for section_name in ("invocation", "process_result"):
            section = manifest.get(section_name)
            if isinstance(section, dict):
                section["cwd"] = str(expected_workspace)
        manifest_path.chmod(stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH)
        manifest_path.write_text(
            json.dumps(manifest, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        manifest_path.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)


def _import_evidence_bundle_tree(source: Path, destination: Path) -> None:
    if not (source / "bundle_manifest.json").exists():
        raise ExternalRunPackageError(f"missing bundle_manifest.json in {source}")
    for root, dirnames, filenames in os_walk_sorted(source):
        rel_root = Path(root).relative_to(source)
        for dirname in dirnames:
            (destination / rel_root / dirname).mkdir(parents=True, exist_ok=True)
        for filename in filenames:
            src_file = Path(root) / filename
            if src_file.is_symlink():
                raise PathSafetyError(f"symlink rejected during import: {src_file}")
            dst_file = destination / rel_root / filename
            if dst_file.exists():
                raise ExclusiveWriteError(f"refusing to overwrite during import: {dst_file}")
            shutil.copy2(src_file, dst_file)
            dst_file.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)

    _reparent_evidence_bundle_workspace(destination)


def os_walk_sorted(root: Path) -> Any:
    import os

    for current_root, dirnames, filenames in os.walk(root):
        dirnames.sort()
        filenames.sort()
        yield current_root, dirnames, filenames


def _relative_bundle_path(bundle_root: Path, path: Path) -> str:
    return path.relative_to(bundle_root.resolve()).as_posix()


def _compute_content_hashes(bundle_root: Path) -> dict[str, str]:
    bundle_resolved = bundle_root.resolve()
    hashes: dict[str, str] = {}
    for path in sorted(bundle_resolved.rglob("*")):
        if not path.is_file():
            continue
        if path.is_symlink():
            raise PathSafetyError(f"symlink rejected during content hash: {path}")
        relative = _relative_bundle_path(bundle_resolved, path)
        if any(
            relative == excluded or relative.startswith(f"{excluded}/")
            for excluded in CONTENT_HASH_EXCLUDED_RELATIVES
        ):
            continue
        if relative.startswith(IMPORT_STAGING_DIR_PREFIX):
            continue
        hashes[relative] = sha256_file(path)
    return hashes


def _validate_operator_record(record: Mapping[str, Any]) -> list[str]:
    errors: list[str] = []
    for field in (
        "operator_id",
        "operator_name",
        "organization",
        "capture_started_at_utc",
        "capture_completed_at_utc",
        "authorized_machine_id",
    ):
        try:
            _require_filled_string(record.get(field), f"operator_record.{field}")
        except ExternalRunPackageValidationError as exc:
            errors.append(str(exc))
    return errors


def _validate_software_identity(record: Mapping[str, Any]) -> list[str]:
    errors: list[str] = []
    identity_id = record.get("identity_id")
    if identity_id not in EXTERNAL_IDENTITY_IDS:
        errors.append(f"software_identity.identity_id invalid: {identity_id!r}")

    for field in (
        "identity_name",
        "identity_class",
        "product_version",
        "build_id",
        "architecture",
        "publisher",
        "executable_path",
        "identity_capture_command",
        "frozen_identity_bundle_id",
        "captured_at_utc",
    ):
        try:
            _require_filled_string(record.get(field), f"software_identity.{field}")
        except ExternalRunPackageValidationError as exc:
            errors.append(str(exc))

    try:
        digest = _validate_sha256_field(record.get("executable_sha256"), "executable_sha256")
        ref_error = _reject_reference_only_identity_sha(digest, "executable_sha256")
        if ref_error:
            errors.append(ref_error)
    except ExternalRunPackageValidationError as exc:
        errors.append(str(exc))

    try:
        _validate_sha256_field(
            record.get("identity_capture_stdout_sha256"),
            "identity_capture_stdout_sha256",
        )
    except ExternalRunPackageValidationError as exc:
        errors.append(str(exc))

    if record.get("status") != BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT:
        for field in (
            "product_version",
            "build_id",
            "architecture",
            "executable_sha256",
            "frozen_identity_bundle_id",
        ):
            if _is_placeholder(record.get(field)):
                errors.append(f"software_identity.{field} is {REQUIRED_OPERATOR_INPUT}")

    return errors


def _validate_identity_binding_record(
    record: Mapping[str, Any],
    *,
    context: str,
) -> list[str]:
    errors: list[str] = []
    for field in (
        "selected_identity_id",
        "frozen_identity_bundle_id",
        "executable_sha256",
        "fixture_manifest_sha256",
    ):
        try:
            value = _require_filled_string(record.get(field), f"{context}.{field}")
            if field.endswith("_sha256"):
                _validate_sha256_field(value, f"{context}.{field}")
            if field == "selected_identity_id" and value not in EXTERNAL_IDENTITY_IDS:
                errors.append(f"{context}.selected_identity_id invalid: {value!r}")
        except ExternalRunPackageValidationError as exc:
            errors.append(str(exc))
    return errors


def _validate_run_request(
    record: Mapping[str, Any],
    *,
    bundle_root: Path,
) -> list[str]:
    errors: list[str] = []
    selected: str | None = None
    try:
        selected = _require_filled_string(record.get("selected_identity_id"), "selected_identity_id")
        identity_path = bundle_root / SOFTWARE_IDENTITIES_DIR / _identity_file_name(selected)
        if selected not in EXTERNAL_IDENTITY_IDS:
            errors.append(f"run_request.selected_identity_id invalid: {selected!r}")
        elif not identity_path.exists():
            errors.append(f"run_request.selected_identity_id missing software identity: {selected}")
    except ExternalRunPackageValidationError as exc:
        errors.append(str(exc))

    command = record.get("invocation_command")
    try:
        command_parts = _require_nonempty_string_list(
            command,
            "run_request.invocation_command",
        )
        for index, part in enumerate(command_parts):
            secret_error = _scan_text_for_secret_assignments(
                part,
                context=f"run_request.invocation_command[{index}]",
            )
            if secret_error:
                errors.append(secret_error)
    except ExternalRunPackageValidationError as exc:
        errors.append(str(exc))

    try:
        _require_filled_string(record.get("invocation_cwd"), "run_request.invocation_cwd")
    except ExternalRunPackageValidationError as exc:
        errors.append(str(exc))

    try:
        _require_nonempty_string_list(
            record.get("invocation_environment_allowlist"),
            "run_request.invocation_environment_allowlist",
            scan_secrets=True,
        )
    except ExternalRunPackageValidationError as exc:
        errors.append(str(exc))

    fixture_manifest_path = bundle_root / INPUT_BUNDLE_SUBDIR / FIXTURE_MANIFEST_NAME
    try:
        fixture_binding = _validate_sha256_field(
            record.get("fixture_binding_sha256"),
            "run_request.fixture_binding_sha256",
        )
        if fixture_manifest_path.exists() and fixture_binding != sha256_file(fixture_manifest_path):
            errors.append(
                "run_request.fixture_binding_sha256 does not match raw fixture manifest SHA-256"
            )
    except ExternalRunPackageValidationError as exc:
        errors.append(str(exc))

    try:
        _require_filled_string(
            record.get("frozen_identity_bundle_id"),
            "run_request.frozen_identity_bundle_id",
        )
    except ExternalRunPackageValidationError as exc:
        errors.append(str(exc))

    if selected is not None:
        identity_path = bundle_root / SOFTWARE_IDENTITIES_DIR / _identity_file_name(selected)
        bindings_manifest_path = bundle_root / IDENTITY_BINDINGS_MANIFEST_NAME
        if identity_path.exists() and bindings_manifest_path.exists():
            identity = read_json(identity_path)
            manifest = read_json(bindings_manifest_path)
            bindings = manifest.get("bindings")
            if not isinstance(bindings, dict):
                errors.append("identity_bindings_manifest.bindings must be an object")
            else:
                binding = bindings.get("run_request")
                if not isinstance(binding, dict):
                    errors.append("identity_bindings_manifest missing run_request binding")
                else:
                    errors.extend(
                        _validate_identity_binding_record(binding, context="run_request_binding")
                    )
                    if binding.get("selected_identity_id") != selected:
                        errors.append(
                            "run_request_binding.selected_identity_id does not match run_request"
                        )
                    if binding.get("frozen_identity_bundle_id") != record.get(
                        "frozen_identity_bundle_id"
                    ):
                        errors.append(
                            "run_request_binding.frozen_identity_bundle_id does not match run_request"
                        )
                    if binding.get("executable_sha256") != identity.get("executable_sha256"):
                        errors.append(
                            "run_request_binding.executable_sha256 does not match selected software identity"
                        )
                    if fixture_manifest_path.exists():
                        fixture_digest = sha256_file(fixture_manifest_path)
                        if binding.get("fixture_manifest_sha256") != fixture_digest:
                            errors.append(
                                "run_request_binding.fixture_manifest_sha256 does not match fixture manifest"
                            )

    notes = record.get("invocation_notes")
    if isinstance(notes, str):
        secret_error = _scan_text_for_secret_assignments(
            notes, context="run_request.invocation_notes"
        )
        if secret_error:
            errors.append(secret_error)

    return errors


def _validate_license_preflight(record: Mapping[str, Any]) -> list[str]:
    errors: list[str] = []
    if record.get("license_key_captured") is not False:
        errors.append("license_preflight.license_key_captured must be boolean false")

    for field in ("entitlement_name", "entitlement_state"):
        try:
            value = _require_filled_string(record.get(field), f"license_preflight.{field}")
            secret_error = _scan_text_for_secret_assignments(
                value, context=f"license_preflight.{field}"
            )
            if secret_error:
                errors.append(secret_error)
        except ExternalRunPackageValidationError as exc:
            errors.append(str(exc))

    reachable = record.get("license_server_reachable")
    if not isinstance(reachable, bool):
        errors.append("license_preflight.license_server_reachable must be a boolean")

    seat_count = record.get("seat_count_documented")
    if not isinstance(seat_count, int) or seat_count < 0:
        errors.append("license_preflight.seat_count_documented must be a non-negative integer")

    try:
        _validate_sha256_field(
            record.get("license_artifact_sha256"),
            "license_preflight.license_artifact_sha256",
        )
    except ExternalRunPackageValidationError as exc:
        errors.append(str(exc))

    return errors


def _validate_machine_preflight(
    record: Mapping[str, Any],
    *,
    operator_record: Mapping[str, Any] | None = None,
) -> list[str]:
    errors: list[str] = []
    for field in ("host_os", "host_architecture", "host_locale", "timezone"):
        try:
            _require_filled_string(record.get(field), f"machine_preflight.{field}")
        except ExternalRunPackageValidationError as exc:
            errors.append(str(exc))

    discovered = record.get("external_software_discovered")
    if discovered is not True:
        errors.append("machine_preflight.external_software_discovered must be boolean true")

    try:
        _validate_sha256_field(
            record.get("discovery_evidence_sha256"),
            "machine_preflight.discovery_evidence_sha256",
        )
    except ExternalRunPackageValidationError as exc:
        errors.append(str(exc))

    try:
        machine_id = _require_filled_string(
            record.get("authorized_machine_id"),
            "machine_preflight.authorized_machine_id",
        )
        if operator_record is not None:
            operator_machine_id = operator_record.get("authorized_machine_id")
            if not _is_placeholder(operator_machine_id) and machine_id != operator_machine_id:
                errors.append(
                    "machine_preflight.authorized_machine_id does not match operator_record"
                )
    except ExternalRunPackageValidationError as exc:
        errors.append(str(exc))

    notes = record.get("supervisor_preflight_notes")
    if isinstance(notes, str):
        secret_error = _scan_text_for_secret_assignments(
            notes, context="machine_preflight.supervisor_preflight_notes"
        )
        if secret_error:
            errors.append(secret_error)

    return errors


def _validate_fixture_manifest(record: Mapping[str, Any], bundle_root: Path) -> list[str]:
    errors: list[str] = []
    try:
        _require_filled_string(record.get("manifest_id"), "fixture_checksum_manifest.manifest_id")
    except ExternalRunPackageValidationError as exc:
        errors.append(str(exc))

    fixtures = record.get("fixtures")
    if not isinstance(fixtures, list) or not fixtures:
        errors.append("fixture_checksum_manifest.fixtures is empty")
        return errors

    for index, fixture in enumerate(fixtures):
        prefix = f"fixture_checksum_manifest.fixtures[{index}]"
        if not isinstance(fixture, dict):
            errors.append(f"{prefix} must be an object")
            continue
        for field in ("fixture_id", "workspace_relative_path", "source_path"):
            try:
                _require_filled_string(fixture.get(field), f"{prefix}.{field}")
            except ExternalRunPackageValidationError as exc:
                errors.append(str(exc))
        try:
            digest = _validate_sha256_field(fixture.get("sha256"), f"{prefix}.sha256")
        except ExternalRunPackageValidationError as exc:
            errors.append(str(exc))
            digest = ""
        size_bytes = fixture.get("size_bytes")
        if not isinstance(size_bytes, int) or size_bytes < 0:
            errors.append(f"{prefix}.size_bytes must be a non-negative integer")
        relative = fixture.get("workspace_relative_path")
        if isinstance(relative, str) and not _is_placeholder(relative):
            input_bundle = bundle_root / INPUT_BUNDLE_SUBDIR
            try:
                file_path = resolve_within_root(input_bundle, relative)
            except PathSafetyError as exc:
                errors.append(f"{prefix}.workspace_relative_path rejected: {exc}")
                continue
            if file_path.is_symlink():
                errors.append(f"{prefix}.workspace_relative_path symlink rejected: {relative}")
                continue
            if not file_path.is_file():
                errors.append(f"missing fixture file: {relative}")
            elif digest and sha256_file(file_path) != digest:
                errors.append(f"fixture checksum mismatch: {relative}")
    return errors


def _load_run_request_binding(bundle_root: Path) -> dict[str, Any] | None:
    bindings_manifest_path = bundle_root / IDENTITY_BINDINGS_MANIFEST_NAME
    if not bindings_manifest_path.exists():
        return None
    manifest = read_json(bindings_manifest_path)
    bindings = manifest.get("bindings")
    if not isinstance(bindings, dict):
        return None
    binding = bindings.get("run_request")
    return binding if isinstance(binding, dict) else None


def _validate_slot_identity_binding(
    bundle_root: Path,
    slot: str,
    slot_dir: Path,
    *,
    run_request: Mapping[str, Any] | None,
    run_request_binding: Mapping[str, Any] | None,
) -> list[str]:
    errors: list[str] = []
    binding_path = slot_dir / EXTERNAL_IDENTITY_BINDING_NAME
    if not binding_path.exists():
        errors.append(f"{slot} missing {EXTERNAL_IDENTITY_BINDING_NAME}")
        return errors

    binding = read_json(binding_path)
    errors.extend(_validate_identity_binding_record(binding, context=f"{slot}_binding"))

    if run_request_binding is not None:
        for field in (
            "selected_identity_id",
            "frozen_identity_bundle_id",
            "executable_sha256",
            "fixture_manifest_sha256",
        ):
            if binding.get(field) != run_request_binding.get(field):
                errors.append(f"{slot}_binding.{field} does not match run_request binding")

    if run_request is not None:
        if binding.get("selected_identity_id") != run_request.get("selected_identity_id"):
            errors.append(f"{slot}_binding.selected_identity_id does not match run_request")
        if binding.get("frozen_identity_bundle_id") != run_request.get("frozen_identity_bundle_id"):
            errors.append(
                f"{slot}_binding.frozen_identity_bundle_id does not match run_request"
            )

    bindings_manifest_path = bundle_root / IDENTITY_BINDINGS_MANIFEST_NAME
    if bindings_manifest_path.exists():
        manifest = read_json(bindings_manifest_path)
        declared = manifest.get("bindings", {})
        if isinstance(declared, dict):
            expected = declared.get(slot)
            if isinstance(expected, dict):
                for field in (
                    "selected_identity_id",
                    "frozen_identity_bundle_id",
                    "executable_sha256",
                    "fixture_manifest_sha256",
                ):
                    if binding.get(field) != expected.get(field):
                        errors.append(
                            f"{slot}_binding.{field} does not match identity_bindings_manifest"
                        )
    return errors


def _validate_probe_executions(
    bundle_root: Path,
    *,
    require_complete: bool,
    run_request: Mapping[str, Any] | None = None,
    run_request_binding: Mapping[str, Any] | None = None,
) -> list[str]:
    errors: list[str] = []
    probe_root = bundle_root / PROBE_EXECUTIONS_DIR
    if not probe_root.is_dir():
        errors.append(f"missing required directory: {PROBE_EXECUTIONS_DIR}")
        return errors

    found_ids: set[str] = set()
    for child in sorted(probe_root.iterdir()):
        if not child.is_dir():
            errors.append(f"{PROBE_EXECUTIONS_DIR} contains non-directory entry: {child.name}")
            continue
        probe_id = child.name
        if probe_id not in CANONICAL_PROBE_SLOT_IDS:
            errors.append(f"unknown probe execution directory: {probe_id}")
            continue
        found_ids.add(probe_id)
        bundle_dirs = [entry for entry in child.iterdir() if entry.is_dir()]
        if len(bundle_dirs) != 1:
            errors.append(
                f"{PROBE_EXECUTIONS_DIR}/{probe_id} must contain exactly one imported EA-01 workspace; "
                f"found {len(bundle_dirs)}"
            )
            continue
        workspace_path = bundle_dirs[0]
        manifest_path = workspace_path / "bundle_manifest.json"
        if not manifest_path.exists():
            errors.append(f"{PROBE_EXECUTIONS_DIR}/{probe_id} missing bundle_manifest.json")
            continue
        if require_complete:
            try:
                validate_evidence_bundle(read_json(manifest_path), workspace=workspace_path)
            except (BundleValidationError, PathSafetyError) as exc:
                errors.append(f"{PROBE_EXECUTIONS_DIR}/{probe_id} evidence validation failed: {exc}")
        errors.extend(
            _validate_slot_identity_binding(
                bundle_root,
                f"probe:{probe_id}",
                child,
                run_request=run_request,
                run_request_binding=run_request_binding,
            )
        )

    if require_complete:
        missing = sorted(set(CANONICAL_PROBE_SLOT_IDS) - found_ids)
        extra = sorted(found_ids - set(CANONICAL_PROBE_SLOT_IDS))
        if missing:
            errors.append(f"missing probe execution bundles: {missing}")
        if extra:
            errors.append(f"extra probe execution directories: {extra}")
        if len(found_ids) != REQUIRED_PROBE_EXECUTION_COUNT:
            errors.append(
                f"probe_executions must contain exactly {REQUIRED_PROBE_EXECUTION_COUNT} "
                f"canonical probe directories; found {len(found_ids)}"
            )
    return errors


def _load_evidence_bundle_manifest(bundle_path: Path) -> dict[str, Any]:
    manifest_path = bundle_path / "bundle_manifest.json"
    if not manifest_path.exists():
        raise ExternalRunPackageValidationError(f"missing evidence bundle: {manifest_path}")
    return read_json(manifest_path)


def _validate_repeat_runs(
    bundle_root: Path,
    *,
    require_complete: bool,
    run_request: Mapping[str, Any] | None = None,
    run_request_binding: Mapping[str, Any] | None = None,
) -> tuple[list[str], list[dict[str, Any]]]:
    errors: list[str] = []
    repeat_root = bundle_root / REPEAT_RUNS_DIR
    manifests: list[dict[str, Any]] = []

    slots = sorted(
        path.name
        for path in repeat_root.iterdir()
        if path.is_dir() and REPEAT_RUN_DIR_PATTERN.fullmatch(path.name)
    )
    if len(slots) != REPEAT_RUN_COUNT:
        errors.append(
            f"repeat_runs must contain exactly {REPEAT_RUN_COUNT} isolated slots; found {len(slots)}"
        )

    for slot in slots:
        slot_path = repeat_root / slot
        bundle_dirs = [child for child in slot_path.iterdir() if child.is_dir()]
        if len(bundle_dirs) != 1:
            errors.append(
                f"{REPEAT_RUNS_DIR}/{slot} must contain exactly one imported EA-01 workspace; "
                f"found {len(bundle_dirs)}"
            )
            continue
        workspace_path = bundle_dirs[0]
        manifest_path = workspace_path / "bundle_manifest.json"
        if not manifest_path.exists():
            errors.append(f"{REPEAT_RUNS_DIR}/{slot} missing bundle_manifest.json")
            continue
        try:
            manifest = read_json(manifest_path)
            if require_complete:
                validate_evidence_bundle(manifest, workspace=workspace_path)
            manifests.append(manifest)
        except (BundleValidationError, PathSafetyError) as exc:
            errors.append(f"{REPEAT_RUNS_DIR}/{slot} evidence validation failed: {exc}")
            continue
        errors.extend(
            _validate_slot_identity_binding(
                bundle_root,
                slot,
                slot_path,
                run_request=run_request,
                run_request_binding=run_request_binding,
            )
        )

    if require_complete and len(manifests) == REPEAT_RUN_COUNT:
        for index in range(REPEAT_RUN_COUNT - 1):
            comparison = compare_repeated_runs(manifests[index], manifests[index + 1])
            if not comparison.get("deterministic"):
                errors.append(
                    f"repeat run nondeterministic between repeat_{index + 1:02d} and "
                    f"repeat_{index + 2:02d}: {comparison.get('differences')}"
                )

    return errors, manifests


def _verify_import_integrity(
    bundle_root: Path,
    *,
    expected_import_manifest_sha256: str | None,
    require_seal: bool,
) -> list[str]:
    errors: list[str] = []
    import_path = bundle_root / IMPORT_MANIFEST_NAME
    if not import_path.exists():
        if require_seal:
            errors.append("import_manifest.json required for operator-complete verification")
        return errors

    actual_manifest_sha = sha256_file(import_path)
    if require_seal:
        if not expected_import_manifest_sha256:
            errors.append("expected_import_manifest_sha256 is required for operator-complete verification")
        elif expected_import_manifest_sha256 != actual_manifest_sha:
            errors.append("import_manifest_sha256 seal mismatch")

    import_manifest = read_json(import_path)
    recorded = import_manifest.get("content_hashes")
    if not isinstance(recorded, dict):
        errors.append("import_manifest.content_hashes missing or invalid")
        return errors

    recomputed = _compute_content_hashes(bundle_root)
    for relative, expected in recorded.items():
        actual = recomputed.get(relative)
        if actual is None:
            errors.append(f"tracked file removed after import: {relative}")
        elif actual != expected:
            errors.append(f"manual edit detected after import: {relative}")

    for relative in sorted(recomputed):
        if relative not in recorded:
            errors.append(f"untracked file added after import: {relative}")
    return errors


def _detect_version_mixing(bundle_root: Path) -> list[str]:
    errors: list[str] = []
    bundle_ids: set[str] = set()

    identities_dir = bundle_root / SOFTWARE_IDENTITIES_DIR
    for identity_id in EXTERNAL_IDENTITY_IDS:
        path = identities_dir / _identity_file_name(identity_id)
        if not path.exists():
            errors.append(f"missing software identity: {identity_id}")
            continue
        record = read_json(path)
        if _is_placeholder(record.get("frozen_identity_bundle_id")):
            errors.append(
                f"software_identity.{identity_id}.frozen_identity_bundle_id is {REQUIRED_OPERATOR_INPUT}"
            )
        else:
            bundle_ids.add(str(record["frozen_identity_bundle_id"]))
        if not _is_placeholder(record.get("executable_sha256")):
            digest = str(record["executable_sha256"])
            ref_error = _reject_reference_only_identity_sha(digest, f"{identity_id}.executable_sha256")
            if ref_error:
                errors.append(ref_error)

    if len(bundle_ids) > 1:
        errors.append("split frozen_identity_bundle_id detected across software identities")

    run_request_path = bundle_root / RUN_REQUEST_NAME
    if run_request_path.exists():
        run_request = read_json(run_request_path)
        frozen = run_request.get("frozen_identity_bundle_id")
        if not _is_placeholder(frozen) and bundle_ids and str(frozen) not in bundle_ids:
            errors.append("run_request.frozen_identity_bundle_id does not match software identities")
    return errors


def _validate_probe_catalog_coverage(bundle_root: Path) -> list[str]:
    errors: list[str] = []
    positive_path = DOCS_DIR / POSITIVE_PROBE_CATALOG_NAME
    negative_path = DOCS_DIR / NEGATIVE_PROBE_CATALOG_NAME

    canonical_probes, canonical_errors = _load_canonical_probe_ids()
    positive_rows = _read_csv_rows(positive_path)
    negative_rows = _read_csv_rows(negative_path)

    positive_ids = {row["probe_id"] for row in positive_rows}
    negative_ids = {row["scenario_id"] for row in negative_rows}

    missing_probes = [probe for probe in canonical_probes if probe not in positive_ids]
    missing_errors = [err for err in canonical_errors if err not in negative_ids]
    if missing_probes:
        errors.append(f"positive_probe_catalog missing canonical probes: {missing_probes}")
    if missing_errors:
        errors.append(f"negative_probe_catalog missing canonical errors: {missing_errors}")

    for row in positive_rows + negative_rows:
        status = row.get("package_status") or row.get("catalog_status")
        if status and status != BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT:
            key = row.get("probe_id") or row.get("scenario_id")
            errors.append(f"catalog status promotion detected for {key}: {status}")

    return errors


def _validate_package_structure(bundle_root: Path, manifest: Mapping[str, Any]) -> list[str]:
    errors: list[str] = []
    if manifest.get("schema_version") != SCHEMA_VERSION:
        errors.append(f"schema_version must be {SCHEMA_VERSION!r}")
    if manifest.get("package_version") != PACKAGE_VERSION:
        errors.append(f"package_version must be {PACKAGE_VERSION!r}")
    if manifest.get("package_verdict") != PACKAGE_VERDICT_COMPLETE:
        errors.append("package_manifest.package_verdict must be COMPLETE for tooling package")
    if manifest.get("execution_verdict") != EXECUTION_VERDICT_BLOCKED:
        errors.append("execution_verdict must remain BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT")

    for dirname in (
        SOFTWARE_IDENTITIES_DIR,
        INPUT_BUNDLE_SUBDIR,
        PROBE_EXECUTIONS_DIR,
        REPEAT_RUNS_DIR,
    ):
        if not (bundle_root / dirname).is_dir():
            errors.append(f"missing required directory: {dirname}")

    for identity_id in EXTERNAL_IDENTITY_IDS:
        if not (bundle_root / SOFTWARE_IDENTITIES_DIR / _identity_file_name(identity_id)).exists():
            errors.append(f"missing software identity template: {identity_id}")

    for filename in (
        OPERATOR_RECORD_NAME,
        RUN_REQUEST_NAME,
        LICENSE_PREFLIGHT_NAME,
        MACHINE_PREFLIGHT_NAME,
    ):
        if not (bundle_root / filename).exists():
            errors.append(f"missing required file: {filename}")

    fixture_manifest = bundle_root / INPUT_BUNDLE_SUBDIR / FIXTURE_MANIFEST_NAME
    if not fixture_manifest.exists():
        errors.append(f"missing {INPUT_BUNDLE_SUBDIR}/{FIXTURE_MANIFEST_NAME}")

    if not (bundle_root / IDENTITY_BINDINGS_MANIFEST_NAME).exists():
        errors.append(f"missing required file: {IDENTITY_BINDINGS_MANIFEST_NAME}")

    repeat_root = bundle_root / REPEAT_RUNS_DIR
    slots = [
        child.name
        for child in repeat_root.iterdir()
        if child.is_dir() and REPEAT_RUN_DIR_PATTERN.fullmatch(child.name)
    ] if repeat_root.exists() else []
    if len(slots) != REPEAT_RUN_COUNT:
        errors.append(
            f"repeat_runs must contain exactly {REPEAT_RUN_COUNT} isolated slots; found {len(slots)}"
        )

    errors.extend(_validate_probe_catalog_coverage(bundle_root))
    return errors


def _validate_operator_execution(
    bundle_root: Path,
    *,
    require_complete: bool,
    expected_import_manifest_sha256: str | None = None,
) -> tuple[list[str], list[dict[str, Any]], bool]:
    errors: list[str] = []

    operator_record: dict[str, Any] | None = None
    operator_path = bundle_root / OPERATOR_RECORD_NAME
    if operator_path.exists():
        operator_record = read_json(operator_path)
        errors.extend(_validate_operator_record(operator_record))
        notes = operator_record.get("notes")
        if isinstance(notes, str):
            secret_error = _scan_text_for_secret_assignments(
                notes, context="operator_record.notes"
            )
            if secret_error:
                errors.append(secret_error)

    license_path = bundle_root / LICENSE_PREFLIGHT_NAME
    if license_path.exists():
        errors.extend(_validate_license_preflight(read_json(license_path)))

    machine_path = bundle_root / MACHINE_PREFLIGHT_NAME
    if machine_path.exists():
        errors.extend(
            _validate_machine_preflight(
                read_json(machine_path),
                operator_record=operator_record,
            )
        )

    for identity_id in EXTERNAL_IDENTITY_IDS:
        path = bundle_root / SOFTWARE_IDENTITIES_DIR / _identity_file_name(identity_id)
        if path.exists():
            errors.extend(_validate_software_identity(read_json(path)))

    run_request: dict[str, Any] | None = None
    run_request_path = bundle_root / RUN_REQUEST_NAME
    if run_request_path.exists():
        run_request = read_json(run_request_path)
        errors.extend(_validate_run_request(run_request, bundle_root=bundle_root))

    run_request_binding = _load_run_request_binding(bundle_root)

    fixture_manifest_path = bundle_root / INPUT_BUNDLE_SUBDIR / FIXTURE_MANIFEST_NAME
    if fixture_manifest_path.exists():
        errors.extend(_validate_fixture_manifest(read_json(fixture_manifest_path), bundle_root))

    errors.extend(_detect_version_mixing(bundle_root))
    errors.extend(
        _verify_import_integrity(
            bundle_root,
            expected_import_manifest_sha256=expected_import_manifest_sha256,
            require_seal=require_complete,
        )
    )

    repeat_errors, repeat_manifests = _validate_repeat_runs(
        bundle_root,
        require_complete=require_complete,
        run_request=run_request,
        run_request_binding=run_request_binding,
    )
    errors.extend(repeat_errors)

    if require_complete:
        errors.extend(
            _validate_probe_executions(
                bundle_root,
                require_complete=True,
                run_request=run_request,
                run_request_binding=run_request_binding,
            )
        )

    operator_complete = len(errors) == 0
    return errors, repeat_manifests, operator_complete


def verify_external_run_bundle(
    bundle_dir: Path,
    *,
    require_operator_complete: bool = False,
    expected_import_manifest_sha256: str | None = None,
    package_only: bool = False,
) -> dict[str, Any]:
    bundle_root = bundle_dir.resolve()
    structure_errors: list[str] = []

    manifest_path = bundle_root / PACKAGE_MANIFEST_NAME
    if not manifest_path.exists():
        raise ExternalRunPackageValidationError(f"missing {PACKAGE_MANIFEST_NAME}")

    manifest = read_json(manifest_path)
    structure_errors.extend(_validate_package_structure(bundle_root, manifest))

    # package_only gates top-level valid/errors only; execution fields always use full rules.
    execution_errors, repeat_manifests, operator_complete = _validate_operator_execution(
        bundle_root,
        require_complete=True,
        expected_import_manifest_sha256=expected_import_manifest_sha256,
    )

    package_valid = len(structure_errors) == 0
    execution_valid = operator_complete and len(execution_errors) == 0

    errors = list(structure_errors)
    if not package_only:
        errors.extend(execution_errors)

    if package_only:
        valid = package_valid
    else:
        valid = execution_valid

    report = {
        "schema_version": SCHEMA_VERSION,
        "verified_at_utc": utc_now_iso(),
        "bundle_path": str(bundle_root),
        "valid": valid,
        "package_valid": package_valid,
        "package_verdict": PACKAGE_VERDICT_COMPLETE if package_valid else "INVALID",
        "execution_verdict": EXECUTION_VERDICT_BLOCKED,
        "operator_inputs_complete": operator_complete,
        "execution_valid": execution_valid,
        "execution_evidence_complete": execution_valid,
        "repeat_run_count": len(repeat_manifests),
        "required_probe_execution_count": REQUIRED_PROBE_EXECUTION_COUNT,
        "error_count": len(errors),
        "errors": errors,
        "structure_errors": structure_errors,
        "execution_errors": execution_errors,
        "structure_error_count": len(structure_errors),
        "execution_error_count": len(execution_errors),
        "package_only": package_only,
        "require_operator_complete_deprecated": require_operator_complete,
        "harness_software_identity": harness_software_identity(),
    }
    return report


def summarize_external_run_bundle(bundle_dir: Path) -> dict[str, Any]:
    bundle_root = bundle_dir.resolve()
    manifest = read_json(bundle_root / PACKAGE_MANIFEST_NAME)

    identities_summary = []
    for identity_id in EXTERNAL_IDENTITY_IDS:
        path = bundle_root / SOFTWARE_IDENTITIES_DIR / _identity_file_name(identity_id)
        if path.exists():
            record = read_json(path)
            identities_summary.append(
                {
                    "identity_id": identity_id,
                    "product_version": record.get("product_version"),
                    "architecture": record.get("architecture"),
                    "executable_sha256": record.get("executable_sha256"),
                    "status": record.get("status"),
                }
            )

    repeat_slots = sorted(
        child.name
        for child in (bundle_root / REPEAT_RUNS_DIR).iterdir()
        if child.is_dir() and REPEAT_RUN_DIR_PATTERN.fullmatch(child.name)
    )

    summary = {
        "schema_version": SCHEMA_VERSION,
        "summarized_at_utc": utc_now_iso(),
        "bundle_id": manifest.get("bundle_id"),
        "package_version": manifest.get("package_version"),
        "package_verdict": manifest.get("package_verdict"),
        "execution_verdict": manifest.get("execution_verdict"),
        "identity_summary": identities_summary,
        "repeat_run_slots": repeat_slots,
        "import_manifest_present": (bundle_root / IMPORT_MANIFEST_NAME).exists(),
        "verification_report_present": (bundle_root / VERIFICATION_REPORT_NAME).exists(),
        "package_valid_hint": "Structure-only validation uses verify --package-only",
        "execution_valid_hint": (
            "Default verify requires operator-complete execution evidence and import seal"
        ),
        "synthetic_evidence_label": (
            "NOT_MACHINE_EVIDENCE unless operator-imported on authorized external host"
        ),
    }
    return summary


def build_positive_probe_catalog_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for record in _read_csv_rows(CANONICAL_PROBE_MATRIX):
        rows.append(
            {
                "probe_id": record["probe_id"],
                "canonical_probe_ref": record["probe"],
                "identity_target": record["identity_target"],
                "blocker_id": record["blocker_id"],
                "required_operator_input": REQUIRED_OPERATOR_INPUT,
                "required_invocation": record["required_invocation"],
                "required_input_artifact": record["required_input_artifact"],
                "checksum_requirement": record["checksum_requirement"],
                "acceptance_criteria": record["acceptance_criteria"],
                "package_status": BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
                "execution_status": BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
            }
        )
    return rows


def build_negative_probe_catalog_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for record in _read_csv_rows(CANONICAL_ERROR_MATRIX):
        rows.append(
            {
                "scenario_id": record["scenario_id"],
                "probe_id": record["probe_id"],
                "canonical_scenario_ref": record["scenario"],
                "blocker_id": record["blocker_id"],
                "required_operator_input": REQUIRED_OPERATOR_INPUT,
                "required_invocation": record["required_invocation"],
                "required_input_artifact": record["required_input_artifact"],
                "checksum_requirement": record["checksum_requirement"],
                "acceptance_criteria": record["acceptance_criteria"],
                "package_status": BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
                "execution_status": BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
            }
        )
    return rows


POSITIVE_PROBE_COLUMNS = (
    "probe_id",
    "canonical_probe_ref",
    "identity_target",
    "blocker_id",
    "required_operator_input",
    "required_invocation",
    "required_input_artifact",
    "checksum_requirement",
    "acceptance_criteria",
    "package_status",
    "execution_status",
)

NEGATIVE_PROBE_COLUMNS = (
    "scenario_id",
    "probe_id",
    "canonical_scenario_ref",
    "blocker_id",
    "required_operator_input",
    "required_invocation",
    "required_input_artifact",
    "checksum_requirement",
    "acceptance_criteria",
    "package_status",
    "execution_status",
)


def write_package_catalogs(docs_dir: Path | None = None) -> dict[str, str]:
    target = docs_dir or DOCS_DIR
    positive_path = target / POSITIVE_PROBE_CATALOG_NAME
    negative_path = target / NEGATIVE_PROBE_CATALOG_NAME

    if positive_path.exists() or negative_path.exists():
        raise ExclusiveWriteError("refusing to overwrite existing probe catalogs")

    _write_csv_rows(positive_path, POSITIVE_PROBE_COLUMNS, build_positive_probe_catalog_rows())
    _write_csv_rows(negative_path, NEGATIVE_PROBE_COLUMNS, build_negative_probe_catalog_rows())
    return {
        "positive_probe_catalog_sha256": sha256_file(positive_path),
        "negative_probe_catalog_sha256": sha256_file(negative_path),
    }


def validate_docs_package(docs_dir: Path | None = None) -> dict[str, Any]:
    target = docs_dir or DOCS_DIR
    errors: list[str] = []

    for name in (
        "README.md",
        "analyzer_identity_capture.md",
        "spacer_identity_capture.md",
        "license_preflight.md",
        "machine_preflight.md",
        "execution_runbook.md",
        "reproducibility_runbook.md",
        POSITIVE_PROBE_CATALOG_NAME,
        NEGATIVE_PROBE_CATALOG_NAME,
        "evidence_acceptance_checklist.csv",
        "expected_artifact_catalog.csv",
        EXTERNAL_RUN_BLOCKERS_NAME,
    ):
        if not (target / name).exists():
            errors.append(f"missing required doc: {name}")

    canonical_probes, canonical_errors = _load_canonical_probe_ids()
    positive_rows = _read_csv_rows(target / POSITIVE_PROBE_CATALOG_NAME)
    negative_rows = _read_csv_rows(target / NEGATIVE_PROBE_CATALOG_NAME)

    if {row["probe_id"] for row in positive_rows} != set(canonical_probes):
        errors.append("positive_probe_catalog does not cover all canonical AN-PRB probes")
    if {row["scenario_id"] for row in negative_rows} != set(canonical_errors):
        errors.append("negative_probe_catalog does not cover all canonical AN-ERR scenarios")

    for path in target.rglob("*"):
        if path.is_file() and path.suffix in {".md", ".csv", ".json"}:
            text = path.read_text(encoding="utf-8")
            for forbidden in ("TODO", "TBD", "UNKNOWN"):
                if re.search(rf"\b{forbidden}\b", text):
                    errors.append(
                        f"forbidden marker {forbidden!r} in {path.relative_to(target)}"
                    )

    return {
        "validated_at_utc": utc_now_iso(),
        "docs_dir": str(target.resolve()),
        "valid": len(errors) == 0,
        "error_count": len(errors),
        "errors": errors,
        "package_verdict": PACKAGE_VERDICT_COMPLETE if not errors else "INVALID",
        "execution_verdict": EXECUTION_VERDICT_BLOCKED,
    }
