#!/usr/bin/env python3
"""Execute EA-05 synthetic-only evidence acquisition dry run."""

from __future__ import annotations

import argparse
import copy
import csv
import os
import io
import json
import shutil
import stat
import sys
import tempfile
import time
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path
from typing import Any, Mapping

from analytical_golden_core import (
    DOCS_DIR as ANALYTICAL_DOCS_DIR,
    TOLERANCE_FREEZE_NAME as ANALYTICAL_TOLERANCE_NAME,
    compare_actual_bundle,
)
from independent_analytical_review import (
    INDEPENDENT_REVIEW_EXPECTED_NAME,
    compute_independent_review_sha256,
    independent_review_rows,
    regenerate_independent_index,
)
from evidence_core import (
    NORMALIZED_METADATA_FIELDS,
    BundleValidationError,
    capture_environment_record,
    capture_process_result,
    collect_file_manifest,
    compare_repeated_runs,
    comparison_projection,
    create_run_workspace,
    detect_stale_outputs,
    finalize_workspace_bundle,
    read_json,
    render_evidence_summary,
    sha256_bytes,
    sha256_file,
    validate_evidence_bundle,
    write_process_capture,
    write_summaries,
)
from external_run_package_core import (
    BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
    EXECUTION_VERDICT_BLOCKED,
    PACKAGE_VERDICT_COMPLETE,
    prepare_external_run_bundle,
    verify_external_run_bundle,
)
from parity_core import (
    DOCS_DIR as PARITY_DOCS_DIR,
    TOLERANCE_FREEZE_NAME as PARITY_TOLERANCE_NAME,
    build_fixture_raw_rows,
    build_identity_mapping,
    build_quantity_key,
    build_raw_document,
    build_raw_row,
    classify_comparison_report,
    compare_canonical_documents,
    load_tolerance_freeze as load_parity_tolerance_freeze,
    normalize_raw_results,
    render_parity_report,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
DOCS_DIR = REPO_ROOT / "docs" / "apollo" / "evidence-collection" / "05_dry_run"
ARTIFACTS_DIRNAME = "artifacts"

DRY_RUN_VERSION = "1.0.0"
EVIDENCE_LABEL = "EA-05_SYNTHETIC_DRY_RUN_NOT_MACHINE_EVIDENCE"
FIXED_HARNESS_RUN_ID = "0" * 64

ANALYTICAL_TOLERANCE_SHA256 = "4dd51a92df802a94fec4629858019afc451b90605e68ce56185aa083abbd910a"
PARITY_TOLERANCE_SHA256 = "7ea474a42ecf039868279ccd084d3cb7ebae6b92ca89858e610ac4229c0c3683"

EXECUTION_REGISTER_COLUMNS = (
    "case_id",
    "case_name",
    "pipeline",
    "command",
    "input_paths",
    "output_paths",
    "output_sha256",
    "expected_outcome",
    "observed_outcome",
    "exit_code",
    "case_acceptance",
    "provenance",
    "evidence_label",
)

ARTIFACT_MANIFEST_COLUMNS = (
    "relative_path",
    "sha256",
    "size_bytes",
    "case_id",
)

FAILURES_COLUMNS = (
    "case_id",
    "case_name",
    "failure_kind",
    "detail",
)

VERDICT_TOKENS = (
    "HARNESS_OPERATIONAL_VERDICT",
    "ANALYTICAL_GOLDEN_PIPELINE_VERDICT",
    "PARITY_COMPARISON_PIPELINE_VERDICT",
    "EXTERNAL_MACHINE_EVIDENCE_VERDICT",
    "ACTUAL_SPACER_PARITY_VERDICT",
)


@dataclass
class CaseResult:
    case_id: str
    case_name: str
    pipeline: str
    command: str
    input_paths: list[str]
    output_paths: list[str]
    output_sha256: str
    expected_outcome: str
    observed_outcome: str
    exit_code: int
    case_acceptance: str
    provenance: str
    evidence_label: str
    artifacts: dict[str, Any] = field(default_factory=dict)
    failure_detail: str | None = None


def normalize_for_commit(value: Any) -> Any:
    if isinstance(value, dict):
        normalized: dict[str, Any] = {}
        for key in sorted(value):
            if key in NORMALIZED_METADATA_FIELDS:
                continue
            normalized[key] = normalize_for_commit(value[key])
        return normalized
    if isinstance(value, list):
        return [normalize_for_commit(item) for item in value]
    return value


def canonical_json_text(payload: Mapping[str, Any]) -> str:
    normalized = normalize_for_commit(payload)
    return json.dumps(normalized, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def write_committed_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def write_committed_json(path: Path, payload: Mapping[str, Any]) -> None:
    write_committed_text(path, canonical_json_text(payload))


def relative_repo_path(path: Path) -> str:
    resolved = path.resolve()
    try:
        text = resolved.relative_to(REPO_ROOT.resolve()).as_posix()
    except ValueError:
        text = resolved.as_posix()
    scratch_marker = "/ea05_dry_run_"
    if scratch_marker in text:
        suffix = text.split(scratch_marker, 1)[1]
        slash = suffix.find("/")
        if slash >= 0:
            return f"<ephemeral_scratch>{suffix[slash:]}"
        return "<ephemeral_scratch>"
    if text.startswith("/tmp/"):
        return f"<ephemeral_scratch>/{resolved.name}"
    return text


def _python_command(*args: str) -> str:
    return " ".join([sys.executable, *args])


def _build_harness_bundle(
    parent: Path,
    *,
    command: list[str],
    write_output: bool = True,
    timeout_seconds: float | None = None,
    run_id: str = FIXED_HARNESS_RUN_ID,
) -> Path:
    parent.mkdir(parents=True, exist_ok=True)
    input_file = parent / "fixture_input.txt"
    input_file.write_text("ea05-fixture\n", encoding="utf-8")
    workspace_info = create_run_workspace(parent / "runs", run_id=run_id, input_paths=[input_file])
    workspace = Path(workspace_info["workspace_path"])
    before = collect_file_manifest(workspace, label="before")
    captures = workspace / "captures"
    captures.mkdir(parents=True, exist_ok=True)
    (captures / "before_manifest.json").write_text(
        json.dumps(before, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    capture = capture_process_result(command, cwd=workspace, timeout_seconds=timeout_seconds)
    process_record = write_process_capture(
        workspace,
        command,
        capture,
        cwd=workspace,
        env_record=capture_environment_record(),
    )

    if write_output:
        outputs = workspace / "outputs"
        outputs.mkdir(exist_ok=True)
        (outputs / "result.txt").write_text("synthetic-output\n", encoding="utf-8")

    after = collect_file_manifest(workspace, label="after")
    (captures / "after_manifest.json").write_text(
        json.dumps(after, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    stale = detect_stale_outputs(before, after)

    manifest = finalize_workspace_bundle(
        workspace,
        run_id=workspace_info["run_id"],
        created_at_utc=workspace_info["created_at_utc"],
        input_artifacts=workspace_info["input_artifacts"],
        invocation={
            "command": command,
            "cwd": str(workspace),
            "environment": capture_environment_record(),
        },
        process_result=process_record,
        before_manifest=before,
        after_manifest=after,
        stale_detection=stale,
    )
    write_summaries(workspace, manifest)
    return workspace


def _parity_base_mapping() -> dict[str, Any]:
    return build_identity_mapping(
        spacer_source_sha256="a" * 64,
        apollo_source_sha256="b" * 64,
    )


def _write_raw_pair(
    work_dir: Path,
    spacer_rows: list[dict[str, Any]],
    apollo_rows: list[dict[str, Any]],
    mapping: dict[str, Any],
) -> tuple[Path, Path, Path, str, str, str]:
    work_dir.mkdir(parents=True, exist_ok=True)
    mapping_path = work_dir / "mapping.json"
    spacer_raw_path = work_dir / "spacer_raw.json"
    apollo_raw_path = work_dir / "apollo_raw.json"
    mapping_text = json.dumps(mapping, indent=2, sort_keys=True) + "\n"
    spacer_raw = build_raw_document(
        producer="spacer",
        rows=spacer_rows,
        model_identity=mapping["spacer_model_identity"],
        model_version=mapping["spacer_model_version"],
        source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
        executable_sha256=mapping["spacer_executable_sha256"],
    )
    apollo_raw = build_raw_document(
        producer="apollo",
        rows=apollo_rows,
        model_identity=mapping["apollo_model_identity"],
        model_version=mapping["apollo_model_version"],
        source_artifact_sha256=mapping["apollo_source_artifact_sha256"],
        executable_sha256=mapping["apollo_executable_sha256"],
    )
    spacer_text = json.dumps(spacer_raw, indent=2, sort_keys=True) + "\n"
    apollo_text = json.dumps(apollo_raw, indent=2, sort_keys=True) + "\n"
    mapping_path.write_text(mapping_text, encoding="utf-8")
    spacer_raw_path.write_text(spacer_text, encoding="utf-8")
    apollo_raw_path.write_text(apollo_text, encoding="utf-8")
    return (
        mapping_path,
        spacer_raw_path,
        apollo_raw_path,
        sha256_bytes(mapping_text.encode("utf-8")),
        sha256_bytes(spacer_text.encode("utf-8")),
        sha256_bytes(apollo_text.encode("utf-8")),
    )


def _normalize_pair(
    spacer_rows: list[dict[str, Any]],
    apollo_rows: list[dict[str, Any]],
    mapping: dict[str, Any],
    work_dir: Path,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any], str, str, str, str]:
    mapping_path, spacer_raw_path, apollo_raw_path, mapping_sha, spacer_raw_sha, apollo_raw_sha = (
        _write_raw_pair(work_dir, spacer_rows, apollo_rows, mapping)
    )
    spacer_raw = json.loads(spacer_raw_path.read_text(encoding="utf-8"))
    apollo_raw = json.loads(apollo_raw_path.read_text(encoding="utf-8"))
    spacer_canonical, _ = normalize_raw_results(
        spacer_raw,
        mapping,
        side="spacer",
        raw_file_byte_sha256=spacer_raw_sha,
        mapping_file_byte_sha256=mapping_sha,
    )
    apollo_canonical, _ = normalize_raw_results(
        apollo_raw,
        mapping,
        side="apollo",
        raw_file_byte_sha256=apollo_raw_sha,
        mapping_file_byte_sha256=mapping_sha,
    )
    spacer_canonical_path = work_dir / "spacer_canonical.json"
    apollo_canonical_path = work_dir / "apollo_canonical.json"
    spacer_canonical_text = json.dumps(spacer_canonical, indent=2, sort_keys=True) + "\n"
    apollo_canonical_text = json.dumps(apollo_canonical, indent=2, sort_keys=True) + "\n"
    spacer_canonical_path.write_text(spacer_canonical_text, encoding="utf-8")
    apollo_canonical_path.write_text(apollo_canonical_text, encoding="utf-8")
    return (
        spacer_raw,
        apollo_raw,
        spacer_canonical,
        apollo_canonical,
        mapping_sha,
        spacer_raw_sha,
        apollo_raw_sha,
        sha256_bytes(spacer_canonical_text.encode("utf-8")),
    )


def _compare_pair(
    spacer_rows: list[dict[str, Any]],
    apollo_rows: list[dict[str, Any]],
    mapping: dict[str, Any],
    work_dir: Path,
) -> dict[str, Any]:
    tolerance_rows, _ = load_parity_tolerance_freeze(PARITY_DOCS_DIR / PARITY_TOLERANCE_NAME)
    (
        spacer_raw,
        apollo_raw,
        spacer_canonical,
        apollo_canonical,
        mapping_sha,
        spacer_raw_sha,
        apollo_raw_sha,
        spacer_canonical_sha,
    ) = _normalize_pair(spacer_rows, apollo_rows, mapping, work_dir)
    apollo_canonical_text = (work_dir / "apollo_canonical.json").read_text(encoding="utf-8")
    apollo_canonical_sha = sha256_bytes(apollo_canonical_text.encode("utf-8"))
    return compare_canonical_documents(
        spacer_canonical,
        apollo_canonical,
        spacer_raw=spacer_raw,
        apollo_raw=apollo_raw,
        tolerance_rows=tolerance_rows,
        tolerance_freeze_sha256=PARITY_TOLERANCE_SHA256,
        mapping_document=mapping,
        expected_mapping_file_byte_sha256=mapping_sha,
        spacer_canonical_file_byte_sha256=spacer_canonical_sha,
        apollo_canonical_file_byte_sha256=apollo_canonical_sha,
        expected_spacer_raw_file_byte_sha256=spacer_raw_sha,
        expected_apollo_raw_file_byte_sha256=apollo_raw_sha,
    )


def _case_record_path(artifacts_dir: Path, case_id: str) -> Path:
    return artifacts_dir / "cases" / case_id / "case_record.json"


def _finalize_case(
    artifacts_dir: Path,
    *,
    case_id: str,
    case_name: str,
    pipeline: str,
    command: str,
    input_paths: list[Path],
    artifact_payload: Mapping[str, Any],
    expected_outcome: str,
    observed_outcome: str,
    exit_code: int,
    provenance: str,
    acceptance: bool,
    failure_detail: str | None = None,
) -> CaseResult:
    case_dir = artifacts_dir / "cases" / case_id
    case_dir.mkdir(parents=True, exist_ok=True)
    record_path = case_dir / "case_record.json"
    write_committed_json(record_path, artifact_payload)
    digest = sha256_file(record_path)
    return CaseResult(
        case_id=case_id,
        case_name=case_name,
        pipeline=pipeline,
        command=command,
        input_paths=[relative_repo_path(path) for path in input_paths],
        output_paths=[relative_repo_path(record_path)],
        output_sha256=digest,
        expected_outcome=expected_outcome,
        observed_outcome=observed_outcome,
        exit_code=exit_code,
        case_acceptance="PASS" if acceptance else "FAIL",
        provenance=provenance,
        evidence_label=EVIDENCE_LABEL,
        artifacts=artifact_payload,
        failure_detail=failure_detail,
    )


class DryRunExecutor:
    def __init__(self, artifacts_dir: Path) -> None:
        self.artifacts_dir = artifacts_dir
        self._scratch = Path(tempfile.mkdtemp(prefix="ea05_dry_run_"))

    def cleanup(self) -> None:
        shutil.rmtree(self._scratch, ignore_errors=True)

    def run_all(self) -> list[CaseResult]:
        return [
            self.run_dr01_synthetic_analyzer_process(),
            self.run_dr02_deterministic(),
            self.run_dr03_nondeterministic(),
            self.run_dr04_nonzero(),
            self.run_dr05_timeout(),
            self.run_dr06_stale_output(),
            self.run_dr07_malformed_manifest(),
            self.run_dr08_analytical_golden_compare(),
            self.run_dr09_spacer_normalization(),
            self.run_dr10_apollo_normalization(),
            self.run_dr11_sign_transform(),
            self.run_dr12_ij_transform(),
            self.run_dr13_unit_conversion(),
            self.run_dr14_tolerance_pass(),
            self.run_dr15_tolerance_fail(),
            self.run_dr16_missing_output(),
            self.run_dr17_extra_output(),
            self.run_dr18_mismatch_classification(),
            self.run_dr19_evidence_bundle_validation(),
            self.run_dr20_report_generation(),
        ]

    def run_dr01_synthetic_analyzer_process(self) -> CaseResult:
        command = [sys.executable, "-c", "print('synthetic-analyzer-ok')"]
        workspace = _build_harness_bundle(self._scratch / "dr01", command=command)
        manifest = read_json(workspace / "bundle_manifest.json")
        validation = validate_evidence_bundle(manifest, workspace=workspace)
        payload = {
            "case_id": "DR-01",
            "projection": comparison_projection(manifest),
            "validation_valid": validation["valid"],
            "bundle_exit_code": manifest["process_result"]["exit_code"],
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-01",
            case_name="synthetic_analyzer_process",
            pipeline="EA-01",
            command=_python_command("-c", "print('synthetic-analyzer-ok')"),
            input_paths=[workspace / "inputs" / "fixture_input.txt"],
            artifact_payload=payload,
            expected_outcome="valid_bundle_exit_0",
            observed_outcome=f"valid={validation['valid']};exit=0",
            exit_code=0 if validation["valid"] else 1,
            provenance="evidence_core.create_run_workspace+capture_process_result+validate_evidence_bundle",
            acceptance=validation["valid"] and manifest["process_result"]["exit_code"] == 0,
        )

    def run_dr02_deterministic(self) -> CaseResult:
        command = [sys.executable, "-c", "print('deterministic')"]
        run_a = _build_harness_bundle(
            self._scratch / "dr02a",
            command=command,
            run_id="1" * 64,
        )
        run_b = _build_harness_bundle(
            self._scratch / "dr02b",
            command=command,
            run_id="2" * 64,
        )
        bundle_a = read_json(run_a / "bundle_manifest.json")
        bundle_b = read_json(run_b / "bundle_manifest.json")
        comparison = compare_repeated_runs(bundle_a, bundle_b)
        payload = {
            "case_id": "DR-02",
            "verdict": comparison["verdict"],
            "deterministic": comparison["deterministic"],
            "differences": comparison["differences"],
            "projection_a": comparison["projection_a"],
            "projection_b": comparison["projection_b"],
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-02",
            case_name="deterministic",
            pipeline="EA-01",
            command=_python_command("-c", "print('deterministic')"),
            input_paths=[],
            artifact_payload=payload,
            expected_outcome="deterministic",
            observed_outcome=comparison["verdict"],
            exit_code=0,
            provenance="evidence_core.compare_repeated_runs",
            acceptance=comparison["verdict"] == "deterministic",
        )

    def run_dr03_nondeterministic(self) -> CaseResult:
        run_a = _build_harness_bundle(
            self._scratch / "dr03a",
            command=[sys.executable, "-c", "print('a')"],
            run_id="3" * 64,
        )
        run_b = _build_harness_bundle(
            self._scratch / "dr03b",
            command=[sys.executable, "-c", "print('b')"],
            run_id="4" * 64,
        )
        bundle_a = read_json(run_a / "bundle_manifest.json")
        bundle_b = read_json(run_b / "bundle_manifest.json")
        comparison = compare_repeated_runs(bundle_a, bundle_b)
        payload = {
            "case_id": "DR-03",
            "verdict": comparison["verdict"],
            "deterministic": comparison["deterministic"],
            "differences": comparison["differences"],
            "normalized_representation": {
                "verdict": comparison["verdict"],
                "deterministic": comparison["deterministic"],
                "differences": comparison["differences"],
            },
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-03",
            case_name="nondeterministic",
            pipeline="EA-01",
            command=_python_command("-c", "print('a')") + " vs " + _python_command("-c", "print('b')"),
            input_paths=[],
            artifact_payload=payload,
            expected_outcome="nondeterministic",
            observed_outcome=comparison["verdict"],
            exit_code=0,
            provenance="evidence_core.compare_repeated_runs",
            acceptance=comparison["verdict"] == "nondeterministic",
        )

    def run_dr04_nonzero(self) -> CaseResult:
        command = [sys.executable, "-c", "import sys; sys.exit(7)"]
        workspace = _build_harness_bundle(
            self._scratch / "dr04",
            command=command,
            write_output=False,
            run_id="5" * 64,
        )
        manifest = read_json(workspace / "bundle_manifest.json")
        exit_code = int(manifest["process_result"]["exit_code"])
        payload = {
            "case_id": "DR-04",
            "exit_code": exit_code,
            "projection": comparison_projection(manifest),
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-04",
            case_name="nonzero",
            pipeline="EA-01",
            command=_python_command("-c", "import sys; sys.exit(7)"),
            input_paths=[],
            artifact_payload=payload,
            expected_outcome="nonzero_exit",
            observed_outcome=f"exit={exit_code}",
            exit_code=exit_code,
            provenance="evidence_core.capture_process_result",
            acceptance=exit_code == 7,
        )

    def run_dr05_timeout(self) -> CaseResult:
        command = [sys.executable, "-c", "import time; time.sleep(5)"]
        workspace = _build_harness_bundle(
            self._scratch / "dr05",
            command=command,
            write_output=False,
            timeout_seconds=0.2,
            run_id="6" * 64,
        )
        manifest = read_json(workspace / "bundle_manifest.json")
        process = manifest["process_result"]
        payload = {
            "case_id": "DR-05",
            "cancelled": process["cancelled"],
            "cancellation_reason": process["cancellation_reason"],
            "exit_code": process["exit_code"],
            "cleanup_attempted": process["cleanup_attempted"],
            "cleanup_succeeded": process["cleanup_succeeded"],
        }
        accepted = (
            process["cancelled"] is True
            and process["cancellation_reason"] == "timeout"
            and process["exit_code"] == 124
            and process["cleanup_attempted"] is True
            and process["cleanup_succeeded"] is True
        )
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-05",
            case_name="timeout",
            pipeline="EA-01",
            command=_python_command("-c", "import time; time.sleep(5)") + " (timeout=0.2)",
            input_paths=[],
            artifact_payload=payload,
            expected_outcome="timeout_cancelled_exit_124",
            observed_outcome=f"cancelled={process['cancelled']};reason={process['cancellation_reason']}",
            exit_code=int(process["exit_code"]),
            provenance="evidence_core.capture_process_result timeout path",
            acceptance=accepted,
        )

    def run_dr06_stale_output(self) -> CaseResult:
        parent = self._scratch / "dr06"
        parent.mkdir(parents=True, exist_ok=True)
        input_file = parent / "input.txt"
        input_file.write_text("in\n", encoding="utf-8")
        info = create_run_workspace(parent / "runs", run_id="7" * 64, input_paths=[input_file])
        workspace = Path(info["workspace_path"])
        outputs = workspace / "outputs"
        outputs.mkdir(exist_ok=True)
        stale_file = outputs / "preexisting.out"
        stale_file.write_text("seed\n", encoding="utf-8")
        before = collect_file_manifest(workspace, label="before")
        time.sleep(0.05)
        os.utime(stale_file, None)
        after = collect_file_manifest(workspace, label="after")
        stale = detect_stale_outputs(before, after)
        payload = {
            "case_id": "DR-06",
            "stale_detected": stale["stale_detected"],
            "stale_entries": stale["stale_entries"],
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-06",
            case_name="stale_output",
            pipeline="EA-01",
            command="evidence_core.detect_stale_outputs",
            input_paths=[input_file],
            artifact_payload=payload,
            expected_outcome="stale_detected_true",
            observed_outcome=f"stale_detected={stale['stale_detected']}",
            exit_code=0,
            provenance="evidence_core.detect_stale_outputs",
            acceptance=stale["stale_detected"] is True,
        )

    def run_dr07_malformed_manifest(self) -> CaseResult:
        malformed = {"schema_version": "wrong", "run_id": ""}
        rejected = False
        error_message = ""
        try:
            validate_evidence_bundle(malformed)
        except BundleValidationError as exc:
            rejected = True
            error_message = str(exc)
        payload = {
            "case_id": "DR-07",
            "rejected": rejected,
            "error": error_message,
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-07",
            case_name="malformed_manifest",
            pipeline="EA-01",
            command="evidence_core.validate_evidence_bundle",
            input_paths=[],
            artifact_payload=payload,
            expected_outcome="validation_rejected",
            observed_outcome="rejected" if rejected else "accepted",
            exit_code=0 if rejected else 1,
            provenance="evidence_core.validate_evidence_bundle fail-closed",
            acceptance=rejected,
        )

    def run_dr08_analytical_golden_compare(self) -> CaseResult:
        independent_index = regenerate_independent_index()
        independent_records = sorted(independent_index.values(), key=lambda record: record.quantity_key)
        independent_source = ANALYTICAL_DOCS_DIR / INDEPENDENT_REVIEW_EXPECTED_NAME
        independent_review_sha256 = compute_independent_review_sha256(
            independent_review_rows(independent_records)
        )
        actual_rows = [
            {
                "case_id": record.case_id,
                "quantity_id": record.quantity_id,
                "unit": record.unit,
                "actual_value": record.expected_value,
            }
            for record in independent_records
        ]
        report = compare_actual_bundle(
            actual_rows,
            ANALYTICAL_DOCS_DIR,
            tolerance_freeze_sha256=ANALYTICAL_TOLERANCE_SHA256,
        )
        payload = {
            "case_id": "DR-08",
            "overall_verdict": report["overall_verdict"],
            "comparison_count": report["comparison_count"],
            "tolerance_freeze_sha256": report["tolerance_freeze_sha256"],
            "failure_count": len(report["failures"]),
            "independent_review_source": relative_repo_path(independent_source),
            "independent_review_sha256": independent_review_sha256,
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-08",
            case_name="analytical_golden_compare",
            pipeline="EA-02",
            command="independent_analytical_review.regenerate_independent_index+compare_actual_bundle",
            input_paths=[independent_source, ANALYTICAL_DOCS_DIR / ANALYTICAL_TOLERANCE_NAME],
            artifact_payload=payload,
            expected_outcome="overall_PASS",
            observed_outcome=report["overall_verdict"],
            exit_code=0 if report["overall_verdict"] == "PASS" else 1,
            provenance="analytical_golden_core.compare_actual_bundle",
            acceptance=report["overall_verdict"] == "PASS",
        )

    def run_dr09_spacer_normalization(self) -> CaseResult:
        mapping = _parity_base_mapping()
        rows = build_fixture_raw_rows()
        work_dir = self._scratch / "dr09"
        work_dir.mkdir(parents=True, exist_ok=True)
        spacer_raw_path = work_dir / "spacer_raw.json"
        mapping_path = work_dir / "mapping.json"
        mapping_text = json.dumps(mapping, indent=2, sort_keys=True) + "\n"
        mapping_path.write_text(mapping_text, encoding="utf-8")
        mapping_sha = sha256_bytes(mapping_text.encode("utf-8"))
        spacer_raw = build_raw_document(
            producer="spacer",
            rows=rows,
            model_identity=mapping["spacer_model_identity"],
            model_version=mapping["spacer_model_version"],
            source_artifact_sha256=mapping["spacer_source_artifact_sha256"],
            executable_sha256=mapping["spacer_executable_sha256"],
        )
        spacer_text = json.dumps(spacer_raw, indent=2, sort_keys=True) + "\n"
        spacer_raw_path.write_text(spacer_text, encoding="utf-8")
        spacer_raw_sha = sha256_bytes(spacer_text.encode("utf-8"))
        canonical, audit = normalize_raw_results(
            spacer_raw,
            mapping,
            side="spacer",
            raw_file_byte_sha256=spacer_raw_sha,
            mapping_file_byte_sha256=mapping_sha,
        )
        first_row = canonical["rows"][0]
        sample_key = build_quantity_key(
            first_row["entity_type"],
            first_row["entity_id"],
            first_row["load_case_id"],
            first_row["combination_id"],
            first_row["coordinate_context"],
            first_row["dof"],
            first_row["member_end"],
            first_row["quantity"],
            first_row["feature"],
        )
        payload = {
            "case_id": "DR-09",
            "producer": "spacer",
            "input_row_count": audit.input_row_count,
            "output_row_count": len(canonical["rows"]),
            "sample_quantity_key": sample_key,
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-09",
            case_name="synthetic_spacer_normalization",
            pipeline="EA-04",
            command="parity_core.normalize_raw_results side=spacer",
            input_paths=[PARITY_DOCS_DIR / PARITY_TOLERANCE_NAME],
            artifact_payload=payload,
            expected_outcome="normalization_success",
            observed_outcome=f"rows={len(canonical['rows'])}",
            exit_code=0,
            provenance="parity_core.normalize_raw_results",
            acceptance=len(canonical["rows"]) == audit.input_row_count,
        )

    def run_dr10_apollo_normalization(self) -> CaseResult:
        mapping = _parity_base_mapping()
        rows = build_fixture_raw_rows()
        work_dir = self._scratch / "dr10"
        work_dir.mkdir(parents=True, exist_ok=True)
        mapping_path = work_dir / "mapping.json"
        mapping_text = json.dumps(mapping, indent=2, sort_keys=True) + "\n"
        mapping_path.write_text(mapping_text, encoding="utf-8")
        mapping_sha = sha256_bytes(mapping_text.encode("utf-8"))
        apollo_raw = build_raw_document(
            producer="apollo",
            rows=rows,
            model_identity=mapping["apollo_model_identity"],
            model_version=mapping["apollo_model_version"],
            source_artifact_sha256=mapping["apollo_source_artifact_sha256"],
            executable_sha256=mapping["apollo_executable_sha256"],
        )
        apollo_text = json.dumps(apollo_raw, indent=2, sort_keys=True) + "\n"
        apollo_raw_sha = sha256_bytes(apollo_text.encode("utf-8"))
        canonical, audit = normalize_raw_results(
            apollo_raw,
            mapping,
            side="apollo",
            raw_file_byte_sha256=apollo_raw_sha,
            mapping_file_byte_sha256=mapping_sha,
        )
        first_row = canonical["rows"][0]
        sample_key = build_quantity_key(
            first_row["entity_type"],
            first_row["entity_id"],
            first_row["load_case_id"],
            first_row["combination_id"],
            first_row["coordinate_context"],
            first_row["dof"],
            first_row["member_end"],
            first_row["quantity"],
            first_row["feature"],
        )
        payload = {
            "case_id": "DR-10",
            "producer": "apollo",
            "input_row_count": audit.input_row_count,
            "output_row_count": len(canonical["rows"]),
            "sample_quantity_key": sample_key,
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-10",
            case_name="synthetic_apollo_normalization",
            pipeline="EA-04",
            command="parity_core.normalize_raw_results side=apollo",
            input_paths=[PARITY_DOCS_DIR / PARITY_TOLERANCE_NAME],
            artifact_payload=payload,
            expected_outcome="normalization_success",
            observed_outcome=f"rows={len(canonical['rows'])}",
            exit_code=0,
            provenance="parity_core.normalize_raw_results",
            acceptance=len(canonical["rows"]) == audit.input_row_count,
        )

    def run_dr11_sign_transform(self) -> CaseResult:
        mapping = _parity_base_mapping()
        mapping["sign_transform"]["spacer"]["ux"] = -1
        rows = build_fixture_raw_rows()
        spacer_rows = copy.deepcopy(rows)
        apollo_rows = copy.deepcopy(rows)
        for row in apollo_rows:
            if row["dof"] == "ux" and not row.get("feature"):
                row["internal_value"] = "-0.001"
        work_dir = self._scratch / "dr11"
        _, _, spacer_canonical, apollo_canonical, *_ = _normalize_pair(
            spacer_rows, apollo_rows, mapping, work_dir
        )
        ux_key = build_quantity_key(
            "node", "N1", "LC1", "", "global", "ux", "", "displacement", ""
        )
        spacer_ux = next(
            row
            for row in spacer_canonical["rows"]
            if build_quantity_key(
                row["entity_type"],
                row["entity_id"],
                row["load_case_id"],
                row["combination_id"],
                row["coordinate_context"],
                row["dof"],
                row["member_end"],
                row["quantity"],
                row["feature"],
            )
            == ux_key
        )
        apollo_ux = next(
            row
            for row in apollo_canonical["rows"]
            if build_quantity_key(
                row["entity_type"],
                row["entity_id"],
                row["load_case_id"],
                row["combination_id"],
                row["coordinate_context"],
                row["dof"],
                row["member_end"],
                row["quantity"],
                row["feature"],
            )
            == ux_key
        )
        equal = Decimal(spacer_ux["internal_value"]) == Decimal(apollo_ux["internal_value"])
        payload = {
            "case_id": "DR-11",
            "sign_transform_spacer_ux": -1,
            "spacer_internal_value": spacer_ux["internal_value"],
            "apollo_internal_value": apollo_ux["internal_value"],
            "canonical_equal": equal,
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-11",
            case_name="sign_transform",
            pipeline="EA-04",
            command="parity_core.normalize_raw_results sign_transform.spacer.ux=-1",
            input_paths=[],
            artifact_payload=payload,
            expected_outcome="canonical_values_equal",
            observed_outcome=f"equal={equal}",
            exit_code=0,
            provenance="parity_core.sign_transform per-side",
            acceptance=equal,
        )

    def run_dr12_ij_transform(self) -> CaseResult:
        mapping = _parity_base_mapping()
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
        work_dir = self._scratch / "dr12"
        _, _, spacer_canonical, _, *_ = _normalize_pair(spacer_rows, spacer_rows, mapping, work_dir)
        i_row = next(row for row in spacer_canonical["rows"] if row["member_end"] == "I")
        j_row = next(row for row in spacer_canonical["rows"] if row["member_end"] == "J")
        swapped = Decimal(i_row["internal_value"]) == Decimal("200") and Decimal(
            j_row["internal_value"]
        ) == Decimal("100")
        payload = {
            "case_id": "DR-12",
            "swap_ij": True,
            "i_internal_value": i_row["internal_value"],
            "j_internal_value": j_row["internal_value"],
            "swap_observed": swapped,
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-12",
            case_name="ij_transform",
            pipeline="EA-04",
            command="parity_core.member_end_transform swap_ij",
            input_paths=[],
            artifact_payload=payload,
            expected_outcome="i_j_values_swapped",
            observed_outcome=f"swap_observed={swapped}",
            exit_code=0,
            provenance="parity_core.member_end_transform",
            acceptance=swapped,
        )

    def run_dr13_unit_conversion(self) -> CaseResult:
        mapping = _parity_base_mapping()
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
        rows = build_fixture_raw_rows()
        spacer_rows = copy.deepcopy(rows)
        apollo_rows = copy.deepcopy(rows)
        for row in spacer_rows:
            if row["quantity"] == "displacement":
                row["unit"] = "mm"
                row["internal_value"] = "1"
        work_dir = self._scratch / "dr13"
        _, _, spacer_canonical, apollo_canonical, *_ = _normalize_pair(
            spacer_rows, apollo_rows, mapping, work_dir
        )
        spacer_disp = next(
            row
            for row in spacer_canonical["rows"]
            if row["quantity"] == "displacement" and not row["feature"]
        )
        apollo_disp = next(
            row
            for row in apollo_canonical["rows"]
            if row["quantity"] == "displacement" and not row["feature"]
        )
        converted = (
            spacer_disp["unit"] == "m"
            and apollo_disp["unit"] == "m"
            and Decimal(spacer_disp["internal_value"]) == Decimal("0.001")
            and Decimal(apollo_disp["internal_value"]) == Decimal("0.001")
        )
        payload = {
            "case_id": "DR-13",
            "spacer_from_unit": "mm",
            "apollo_from_unit": "m",
            "canonical_unit": "m",
            "spacer_internal_value": spacer_disp["internal_value"],
            "apollo_internal_value": apollo_disp["internal_value"],
            "conversion_ok": converted,
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-13",
            case_name="unit_conversion",
            pipeline="EA-04",
            command="parity_core.unit_conversion per-side",
            input_paths=[],
            artifact_payload=payload,
            expected_outcome="both_sides_canonical_m_0.001",
            observed_outcome=f"conversion_ok={converted}",
            exit_code=0,
            provenance="parity_core._apply_unit_conversion",
            acceptance=converted,
        )

    def run_dr14_tolerance_pass(self) -> CaseResult:
        rows = build_fixture_raw_rows()
        work_dir = self._scratch / "dr14"
        report = _compare_pair(rows, copy.deepcopy(rows), _parity_base_mapping(), work_dir)
        payload = {
            "case_id": "DR-14",
            "overall_verdict": report["overall_verdict"],
            "parity_pass": report["parity_pass"],
            "actual_spacer_parity_verdict": report["actual_spacer_parity_verdict"],
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-14",
            case_name="tolerance_pass",
            pipeline="EA-04",
            command="parity_core.compare_canonical_documents",
            input_paths=[PARITY_DOCS_DIR / PARITY_TOLERANCE_NAME],
            artifact_payload=payload,
            expected_outcome="overall_PASS_synthetic_only",
            observed_outcome=report["overall_verdict"],
            exit_code=0 if report["overall_verdict"] == "PASS" else 1,
            provenance="parity_core.compare_canonical_documents",
            acceptance=report["overall_verdict"] == "PASS"
            and report["actual_spacer_parity_verdict"] == BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT,
        )

    def run_dr15_tolerance_fail(self) -> CaseResult:
        rows = build_fixture_raw_rows()
        apollo_rows = copy.deepcopy(rows)
        for row in apollo_rows:
            if row["dof"] == "ux" and not row.get("feature"):
                row["internal_value"] = "0.002"
        work_dir = self._scratch / "dr15"
        report = _compare_pair(rows, apollo_rows, _parity_base_mapping(), work_dir)
        payload = {
            "case_id": "DR-15",
            "overall_verdict": report["overall_verdict"],
            "worst_case_quantity_key": (report.get("worst_case") or {}).get("quantity_key"),
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-15",
            case_name="tolerance_fail",
            pipeline="EA-04",
            command="parity_core.compare_canonical_documents",
            input_paths=[],
            artifact_payload=payload,
            expected_outcome="overall_FAIL",
            observed_outcome=report["overall_verdict"],
            exit_code=0 if report["overall_verdict"] == "FAIL" else 1,
            provenance="parity_core.compare_canonical_documents",
            acceptance=report["overall_verdict"] == "FAIL",
        )

    def run_dr16_missing_output(self) -> CaseResult:
        rows = build_fixture_raw_rows()
        work_dir = self._scratch / "dr16"
        report = _compare_pair(rows, copy.deepcopy(rows[:-1]), _parity_base_mapping(), work_dir)
        hints = [row.get("classification_hint") for row in report.get("rows", [])]
        payload = {
            "case_id": "DR-16",
            "overall_verdict": report["overall_verdict"],
            "classification_hints": hints,
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-16",
            case_name="missing_output",
            pipeline="EA-04",
            command="parity_core.compare_canonical_documents",
            input_paths=[],
            artifact_payload=payload,
            expected_outcome="overall_FAIL_with_MISSING_OUTPUT",
            observed_outcome=f"verdict={report['overall_verdict']};hints={hints}",
            exit_code=0 if report["overall_verdict"] == "FAIL" else 1,
            provenance="parity_core.compare_canonical_documents",
            acceptance=report["overall_verdict"] == "FAIL" and "MISSING_OUTPUT" in hints,
        )

    def run_dr17_extra_output(self) -> CaseResult:
        rows = build_fixture_raw_rows()
        work_dir = self._scratch / "dr17"
        report = _compare_pair(rows[:-1], copy.deepcopy(rows), _parity_base_mapping(), work_dir)
        hints = [row.get("classification_hint") for row in report.get("rows", [])]
        payload = {
            "case_id": "DR-17",
            "overall_verdict": report["overall_verdict"],
            "classification_hints": hints,
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-17",
            case_name="extra_output",
            pipeline="EA-04",
            command="parity_core.compare_canonical_documents",
            input_paths=[],
            artifact_payload=payload,
            expected_outcome="overall_FAIL_with_EXTRA_OUTPUT",
            observed_outcome=f"verdict={report['overall_verdict']};hints={hints}",
            exit_code=0 if report["overall_verdict"] == "FAIL" else 1,
            provenance="parity_core.compare_canonical_documents",
            acceptance=report["overall_verdict"] == "FAIL" and "EXTRA_OUTPUT" in hints,
        )

    def run_dr18_mismatch_classification(self) -> CaseResult:
        rows = build_fixture_raw_rows()
        apollo_rows = copy.deepcopy(rows)
        for row in apollo_rows:
            if row["dof"] == "ux" and not row.get("feature"):
                row["internal_value"] = "0.002"
        mapping = _parity_base_mapping()
        work_dir = self._scratch / "dr18"
        comparison = _compare_pair(rows, apollo_rows, mapping, work_dir)
        classification = classify_comparison_report(comparison, mapping_document=mapping)
        classified = classification.get("rows", [])
        payload = {
            "case_id": "DR-18",
            "classification_count": classification["classification_count"],
            "first_classification": classified[0]["classification"] if classified else None,
            "comparison_overall_verdict": comparison["overall_verdict"],
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-18",
            case_name="mismatch_classification",
            pipeline="EA-04",
            command="parity_core.classify_comparison_report",
            input_paths=[],
            artifact_payload=payload,
            expected_outcome="classification_rows_present",
            observed_outcome=f"count={classification['classification_count']}",
            exit_code=0,
            provenance="parity_core.classify_comparison_report",
            acceptance=classification["classification_count"] > 0,
        )

    def run_dr19_evidence_bundle_validation(self) -> CaseResult:
        workspace = _build_harness_bundle(
            self._scratch / "dr19",
            command=[sys.executable, "-c", "print('bundle-validate')"],
            run_id="8" * 64,
        )
        manifest = read_json(workspace / "bundle_manifest.json")
        validation = validate_evidence_bundle(manifest, workspace=workspace)
        payload = {
            "case_id": "DR-19",
            "validation_valid": validation["valid"],
            "error_count": validation.get("error_count", 0),
        }
        return _finalize_case(
            self.artifacts_dir,
            case_id="DR-19",
            case_name="evidence_bundle_validation",
            pipeline="EA-01",
            command="evidence_core.validate_evidence_bundle",
            input_paths=[workspace / "bundle_manifest.json"],
            artifact_payload=payload,
            expected_outcome="validation_valid_true",
            observed_outcome=f"valid={validation['valid']}",
            exit_code=0 if validation["valid"] else 1,
            provenance="evidence_core.validate_evidence_bundle",
            acceptance=validation["valid"] is True,
        )

    def run_dr20_report_generation(self) -> CaseResult:
        workspace = _build_harness_bundle(
            self._scratch / "dr20",
            command=[sys.executable, "-c", "print('report')"],
            run_id="9" * 64,
        )
        manifest = read_json(workspace / "bundle_manifest.json")
        summary_json, summary_csv = render_evidence_summary(manifest)
        rows = build_fixture_raw_rows()
        work_dir = self._scratch / "dr20_parity"
        comparison = _compare_pair(rows, copy.deepcopy(rows), _parity_base_mapping(), work_dir)
        classification = classify_comparison_report(comparison, mapping_document=_parity_base_mapping())
        parity_report = render_parity_report(comparison, classification)
        reports_dir = self.artifacts_dir / "cases" / "DR-20"
        reports_dir.mkdir(parents=True, exist_ok=True)
        evidence_summary_path = reports_dir / "evidence_summary.json"
        parity_report_path = reports_dir / "parity_report.json"
        write_committed_json(evidence_summary_path, summary_json)
        write_committed_json(parity_report_path, parity_report)
        combined_sha = sha256_bytes(
            (evidence_summary_path.read_bytes() + parity_report_path.read_bytes())
        )
        payload = {
            "case_id": "DR-20",
            "evidence_summary_path": relative_repo_path(evidence_summary_path),
            "parity_report_path": relative_repo_path(parity_report_path),
            "evidence_exit_code": summary_json.get("exit_code"),
            "parity_harness_verdict": parity_report.get("parity_harness_verdict"),
            "actual_spacer_parity_verdict": parity_report.get("actual_spacer_parity_verdict"),
        }
        reports_exist = evidence_summary_path.is_file() and parity_report_path.is_file()
        evidence_successful = (
            summary_json.get("exit_code") == 0 and summary_json.get("cancelled") is not True
        )
        parity_harness_complete = parity_report.get("parity_harness_verdict") == "COMPLETE"
        actual_parity_blocked = (
            parity_report.get("actual_spacer_parity_verdict") == BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
        )
        accepted = (
            reports_exist
            and evidence_successful
            and parity_harness_complete
            and actual_parity_blocked
        )
        write_committed_json(reports_dir / "case_record.json", payload)
        return CaseResult(
            case_id="DR-20",
            case_name="report_generation",
            pipeline="EA-01+EA-04",
            command="render_evidence_summary+render_parity_report",
            input_paths=[relative_repo_path(workspace / "bundle_manifest.json")],
            output_paths=[
                relative_repo_path(reports_dir / "case_record.json"),
                relative_repo_path(evidence_summary_path),
                relative_repo_path(parity_report_path),
            ],
            output_sha256=combined_sha,
            expected_outcome="reports_generated_blocked_actual_parity",
            observed_outcome=(
                f"reports={reports_exist};evidence_ok={evidence_successful};"
                f"parity_harness={parity_report.get('parity_harness_verdict')};"
                f"actual={parity_report.get('actual_spacer_parity_verdict')}"
            ),
            exit_code=0,
            case_acceptance="PASS" if accepted else "FAIL",
            provenance="evidence_core.render_evidence_summary;parity_core.render_parity_report",
            evidence_label=EVIDENCE_LABEL,
            artifacts=payload,
            failure_detail=None if accepted else "DR-20 acceptance gates not satisfied",
        )


def compute_verdicts(case_results: list[CaseResult]) -> dict[str, str]:
    harness_cases = {"DR-01", "DR-02", "DR-03", "DR-04", "DR-05", "DR-06", "DR-07", "DR-19", "DR-20"}
    analytical_cases = {"DR-08"}
    parity_cases = {
        "DR-09",
        "DR-10",
        "DR-11",
        "DR-12",
        "DR-13",
        "DR-14",
        "DR-15",
        "DR-16",
        "DR-17",
        "DR-18",
        "DR-20",
    }

    def pipeline_pass(case_ids: set[str]) -> bool:
        return all(
            result.case_acceptance == "PASS"
            for result in case_results
            if result.case_id in case_ids
        )

    external_report: dict[str, Any]
    with tempfile.TemporaryDirectory(prefix="ea05_external_") as temp_dir:
        bundle_dir = Path(temp_dir) / "external_package"
        prepare_external_run_bundle(bundle_dir, bundle_id="ea05-synthetic-package-only")
        external_report = verify_external_run_bundle(bundle_dir, package_only=True)

    harness_verdict = "OPERATIONAL" if pipeline_pass(harness_cases) else "DEGRADED"
    analytical_verdict = "OPERATIONAL" if pipeline_pass(analytical_cases) else "DEGRADED"
    parity_verdict = "OPERATIONAL" if pipeline_pass(parity_cases) else "DEGRADED"

    external_verdict = BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
    if (
        external_report.get("package_verdict") != PACKAGE_VERDICT_COMPLETE
        or external_report.get("execution_verdict") != EXECUTION_VERDICT_BLOCKED
    ):
        external_verdict = "INVALID_PACKAGE_STRUCTURE"

    actual_parity_verdict = BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT

    return {
        "HARNESS_OPERATIONAL_VERDICT": harness_verdict,
        "ANALYTICAL_GOLDEN_PIPELINE_VERDICT": analytical_verdict,
        "PARITY_COMPARISON_PIPELINE_VERDICT": parity_verdict,
        "EXTERNAL_MACHINE_EVIDENCE_VERDICT": external_verdict,
        "ACTUAL_SPACER_PARITY_VERDICT": actual_parity_verdict,
    }


def collect_artifact_manifest(artifacts_dir: Path, case_results: list[CaseResult]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for path in sorted(artifacts_dir.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(artifacts_dir).as_posix()
        case_id = ""
        parts = relative.split("/")
        if len(parts) >= 2 and parts[0] == "cases":
            case_id = parts[1]
        rows.append(
            {
                "relative_path": relative,
                "sha256": sha256_file(path),
                "size_bytes": str(path.stat().st_size),
                "case_id": case_id,
            }
        )
    rows.sort(key=lambda item: item["relative_path"])
    return rows


def write_csv(path: Path, columns: tuple[str, ...], rows: list[dict[str, str]]) -> None:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=list(columns), lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({column: row.get(column, "") for column in columns})
    write_committed_text(path, buffer.getvalue())


def case_results_to_register_rows(case_results: list[CaseResult]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for result in case_results:
        rows.append(
            {
                "case_id": result.case_id,
                "case_name": result.case_name,
                "pipeline": result.pipeline,
                "command": result.command,
                "input_paths": ";".join(result.input_paths),
                "output_paths": ";".join(result.output_paths),
                "output_sha256": result.output_sha256,
                "expected_outcome": result.expected_outcome,
                "observed_outcome": result.observed_outcome,
                "exit_code": str(result.exit_code),
                "case_acceptance": result.case_acceptance,
                "provenance": result.provenance,
                "evidence_label": result.evidence_label,
            }
        )
    return rows


def failures_from_results(case_results: list[CaseResult]) -> list[dict[str, str]]:
    failures: list[dict[str, str]] = []
    for result in case_results:
        if result.case_acceptance != "PASS":
            failures.append(
                {
                    "case_id": result.case_id,
                    "case_name": result.case_name,
                    "failure_kind": "case_acceptance",
                    "detail": result.failure_detail or result.observed_outcome,
                }
            )
    return failures


def write_dry_run_plan(docs_dir: Path) -> None:
    text = """# EA-05 Evidence Acquisition Dry Run Plan

**Work item:** EA-05 (synthetic-only end-to-end evidence pipeline dry run)
**Dry run version:** `1.0.0`
**Evidence label:** `EA-05_SYNTHETIC_DRY_RUN_NOT_MACHINE_EVIDENCE`

## Purpose

Execute a reproducible synthetic-only dry run across EA-01 harness, EA-02 analytical golden tooling, EA-03 external package validators (package-only), and EA-04 parity harness. This dry run proves pipeline wiring, fail-closed behavior, checksum binding, and report generation without claiming external machine evidence, reference software capture, licensed-source numerics, GOLD approval, or actual SPACER parity.

## Scope boundary

| In scope | Out of scope |
|---|---|
| Twenty registered synthetic cases with machine-verifiable artifacts | External Analyzer or SPACER machine capture |
| Deterministic committed summary and artifact manifest | Promoting canonical register blockers to closed |
| EA-01..04 tooling invocation with real validators/comparators | Numeric implementation release |
| Fail-closed negative-path cases (malformed manifest, tolerance FAIL, missing/extra output) | Writing PASS constants without execution |

## Registered cases

| case_id | case_name | pipeline |
|---|---|---|
| DR-01 | synthetic_analyzer_process | EA-01 |
| DR-02 | deterministic | EA-01 |
| DR-03 | nondeterministic | EA-01 |
| DR-04 | nonzero | EA-01 |
| DR-05 | timeout | EA-01 |
| DR-06 | stale_output | EA-01 |
| DR-07 | malformed_manifest | EA-01 |
| DR-08 | analytical_golden_compare | EA-02 |
| DR-09 | synthetic_spacer_normalization | EA-04 |
| DR-10 | synthetic_apollo_normalization | EA-04 |
| DR-11 | sign_transform | EA-04 |
| DR-12 | ij_transform | EA-04 |
| DR-13 | unit_conversion | EA-04 |
| DR-14 | tolerance_pass | EA-04 |
| DR-15 | tolerance_fail | EA-04 |
| DR-16 | missing_output | EA-04 |
| DR-17 | extra_output | EA-04 |
| DR-18 | mismatch_classification | EA-04 |
| DR-19 | evidence_bundle_validation | EA-01 |
| DR-20 | report_generation | EA-01+EA-04 |

## Artifact policy

- Generated case and report artifacts live under `artifacts/` only (including `artifacts/dry_run_summary.json`).
- Root-level control records (`dry_run_execution_register.csv`, `dry_run_artifact_manifest.csv`, `dry_run_failures.csv`, and narrative docs) are not listed in the artifact manifest.
- Committed case records exclude volatile metadata fields (`run_id`, timestamps, workspace paths).
- Nondeterministic case DR-03 records a normalized reproducible representation of differences.
- Synthetic parity PASS (DR-14) does not advance `ACTUAL_SPACER_PARITY_VERDICT`.

## Execution

```bash
cd scripts/apollo/evidence && python3 run_evidence_dry_run.py
```

Re-run determinism is verified by executing the runner twice and comparing `dry_run_artifact_manifest.csv` SHA-256.
"""
    write_committed_text(docs_dir / "dry_run_plan.md", text)


def write_dry_run_results(docs_dir: Path, case_results: list[CaseResult], verdicts: dict[str, str]) -> None:
    accepted = sum(1 for result in case_results if result.case_acceptance == "PASS")
    lines = [
        "# EA-05 Dry Run Results",
        "",
        f"**Dry run version:** `{DRY_RUN_VERSION}`",
        f"**Registered cases:** {len(case_results)}",
        f"**Case acceptance PASS:** {accepted}",
        f"**Case acceptance FAIL:** {len(case_results) - accepted}",
        "",
        "## Per-case summary",
        "",
        "| case_id | case_name | pipeline | expected | observed | acceptance |",
        "|---|---|---|---|---|---|",
    ]
    for result in case_results:
        lines.append(
            f"| {result.case_id} | {result.case_name} | {result.pipeline} | "
            f"{result.expected_outcome} | {result.observed_outcome} | {result.case_acceptance} |"
        )
    lines.extend(
        [
            "",
            "## Verdict tokens (synthetic dry run only)",
            "",
        ]
    )
    for token in VERDICT_TOKENS:
        lines.append(f"- **{token}:** `{verdicts[token]}`")
    lines.extend(
        [
            "",
            "## Non-promotion statement",
            "",
            "This dry run exercises repository tooling only. `EXTERNAL_MACHINE_EVIDENCE_VERDICT` "
            "and `ACTUAL_SPACER_PARITY_VERDICT` remain blocked. Synthetic parity PASS does not "
            "constitute actual SPACER parity or numeric release evidence.",
            "",
        ]
    )
    write_committed_text(docs_dir / "dry_run_results.md", "\n".join(lines))


def write_dry_run_verdicts(docs_dir: Path, verdicts: dict[str, str]) -> None:
    lines = [
        "# EA-05 Dry Run Verdicts",
        "",
        "Synthetic-only dry run verdict tokens. These do not modify canonical DS-06/DS-07/DS-08 registers.",
        "",
    ]
    for token in VERDICT_TOKENS:
        lines.append(f"{token}: {verdicts[token]}")
    lines.append("")
    write_committed_text(docs_dir / "dry_run_verdicts.md", "\n".join(lines))


def write_dry_run_usage(docs_dir: Path, manifest_sha256: str) -> None:
    text = f"""# EA-05 Dry Run Usage

## Layout

- `artifacts/` — generated case records, DR-20 reports, and `dry_run_summary.json`
- Root control records — `dry_run_execution_register.csv`, `dry_run_artifact_manifest.csv`, `dry_run_failures.csv`, and narrative docs

## Execute

```bash
cd scripts/apollo/evidence && python3 run_evidence_dry_run.py
```

Re-run determinism: execute the runner twice; `dry_run_artifact_manifest.csv` byte SHA-256 must be identical across runs.

## Verify committed artifacts

```bash
cd scripts/apollo/evidence
python3 verify_dry_run_artifacts.py \\
  --dry-run-root ../../../docs/apollo/evidence-collection/05_dry_run \\
  --expected-manifest-sha256 {manifest_sha256}
```

The manifest SHA-256 is stored out-of-band in this usage doc. `artifacts/dry_run_summary.json` must not self-reference the manifest hash.

## Tests

```bash
cd scripts/apollo/evidence && python3 -m unittest tests.test_evidence_dry_run -v
```
"""
    write_committed_text(docs_dir / "dry_run_usage.md", text)


def reset_artifacts_dir(artifacts_dir: Path) -> None:
    if artifacts_dir.exists():
        shutil.rmtree(artifacts_dir)
    artifacts_dir.mkdir(parents=True, exist_ok=True)


def execute_dry_run(output_root: Path) -> dict[str, Any]:
    docs_dir = output_root
    artifacts_dir = docs_dir / ARTIFACTS_DIRNAME
    reset_artifacts_dir(artifacts_dir)

    executor = DryRunExecutor(artifacts_dir)
    try:
        case_results = executor.run_all()
    finally:
        executor.cleanup()

    verdicts = compute_verdicts(case_results)
    register_rows = case_results_to_register_rows(case_results)
    failure_rows = failures_from_results(case_results)

    write_csv(docs_dir / "dry_run_execution_register.csv", EXECUTION_REGISTER_COLUMNS, register_rows)
    write_csv(docs_dir / "dry_run_failures.csv", FAILURES_COLUMNS, failure_rows)
    write_dry_run_plan(docs_dir)
    write_dry_run_results(docs_dir, case_results, verdicts)
    write_dry_run_verdicts(docs_dir, verdicts)

    summary_committed = {
        "dry_run_version": DRY_RUN_VERSION,
        "case_count": len(case_results),
        "case_acceptance_pass": sum(1 for result in case_results if result.case_acceptance == "PASS"),
        "execution_register_sha256": sha256_file(docs_dir / "dry_run_execution_register.csv"),
        "verdicts": verdicts,
        "evidence_label": EVIDENCE_LABEL,
    }
    write_committed_json(artifacts_dir / "dry_run_summary.json", summary_committed)

    artifact_rows = collect_artifact_manifest(artifacts_dir, case_results)
    write_csv(docs_dir / "dry_run_artifact_manifest.csv", ARTIFACT_MANIFEST_COLUMNS, artifact_rows)
    manifest_sha256 = sha256_file(docs_dir / "dry_run_artifact_manifest.csv")
    write_dry_run_usage(docs_dir, manifest_sha256)

    return {**summary_committed, "artifact_manifest_sha256": manifest_sha256}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-root",
        type=Path,
        default=DOCS_DIR,
        help="EA-05 docs output root (default: docs/apollo/evidence-collection/05_dry_run)",
    )
    args = parser.parse_args(argv)

    summary = execute_dry_run(args.output_root.resolve())
    print(json.dumps(summary, indent=2, sort_keys=True))
    failures = summary["case_count"] - summary["case_acceptance_pass"]
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
