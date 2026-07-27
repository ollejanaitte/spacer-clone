#!/usr/bin/env python3
"""Fail-closed verifier for EA-05 committed dry-run artifacts."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any

from evidence_core import sha256_file
from external_run_package_core import BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT
from run_evidence_dry_run import (
    ARTIFACT_MANIFEST_COLUMNS,
    ARTIFACTS_DIRNAME,
    EXECUTION_REGISTER_COLUMNS,
    FAILURES_COLUMNS,
    VERDICT_TOKENS,
)

EXPECTED_CASE_IDS = tuple(f"DR-{index:02d}" for index in range(1, 21))
NON_PROMOTION_VERDICTS = (
    "EXTERNAL_MACHINE_EVIDENCE_VERDICT",
    "ACTUAL_SPACER_PARITY_VERDICT",
)


class DryRunArtifactVerificationError(Exception):
    """Raised when dry-run artifact verification fails."""


def _reject_unsafe_relative_path(relative_path: str) -> str | None:
    if not relative_path:
        return "empty relative path"
    if relative_path.startswith("/") or "\\" in relative_path:
        return f"absolute or backslash path rejected: {relative_path}"
    parts = relative_path.split("/")
    if ".." in parts or "" in parts:
        return f"path traversal rejected: {relative_path}"
    return None


def _load_manifest_rows(manifest_path: Path, errors: list[str]) -> list[dict[str, str]]:
    if not manifest_path.is_file():
        errors.append(f"missing artifact manifest: {manifest_path}")
        return []
    with manifest_path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            errors.append("artifact manifest missing header")
            return []
        if list(reader.fieldnames) != list(ARTIFACT_MANIFEST_COLUMNS):
            errors.append(
                "artifact manifest columns mismatch: "
                f"expected {list(ARTIFACT_MANIFEST_COLUMNS)}, got {reader.fieldnames}"
            )
        rows = list(reader)
    seen: set[str] = set()
    for row in rows:
        relative_path = row.get("relative_path", "")
        unsafe = _reject_unsafe_relative_path(relative_path)
        if unsafe:
            errors.append(unsafe)
        if relative_path in seen:
            errors.append(f"duplicate manifest path: {relative_path}")
        seen.add(relative_path)
        sha256 = row.get("sha256") or ""
        if len(sha256) != 64 or any(char not in "0123456789abcdef" for char in sha256):
            errors.append(f"invalid sha256 for manifest row: {relative_path}")
        size_text = row.get("size_bytes") or ""
        if not size_text.isdigit():
            errors.append(f"invalid size_bytes for manifest row: {relative_path}")
    return rows


def _load_register_rows(register_path: Path, errors: list[str]) -> list[dict[str, str]]:
    if not register_path.is_file():
        errors.append(f"missing execution register: {register_path}")
        return []
    with register_path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            errors.append("execution register missing header")
            return []
        if list(reader.fieldnames) != list(EXECUTION_REGISTER_COLUMNS):
            errors.append(
                "execution register columns mismatch: "
                f"expected {list(EXECUTION_REGISTER_COLUMNS)}, got {reader.fieldnames}"
            )
        return list(reader)


def _load_failures_rows(failures_path: Path, errors: list[str]) -> list[dict[str, str]]:
    if not failures_path.is_file():
        errors.append(f"missing failures register: {failures_path}")
        return []
    with failures_path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            errors.append("failures register missing header")
            return []
        if list(reader.fieldnames) != list(FAILURES_COLUMNS):
            errors.append(
                "failures register columns mismatch: "
                f"expected {list(FAILURES_COLUMNS)}, got {reader.fieldnames}"
            )
        return list(reader)


def verify_dry_run_artifacts(
    dry_run_root: Path,
    *,
    expected_manifest_sha256: str,
) -> dict[str, Any]:
    dry_run_root = dry_run_root.resolve()
    errors: list[str] = []

    expected_manifest_sha256 = expected_manifest_sha256.lower()
    if len(expected_manifest_sha256) != 64:
        errors.append("expected manifest sha256 must be 64 lowercase hex characters")

    manifest_path = dry_run_root / "dry_run_artifact_manifest.csv"
    manifest_rows = _load_manifest_rows(manifest_path, errors)
    if manifest_path.is_file():
        manifest_sha = sha256_file(manifest_path)
        if manifest_sha != expected_manifest_sha256:
            errors.append(
                "artifact manifest file sha256 mismatch: "
                f"expected {expected_manifest_sha256}, got {manifest_sha}"
            )

    manifest_paths = {row["relative_path"] for row in manifest_rows if row.get("relative_path")}
    artifacts_dir = dry_run_root / ARTIFACTS_DIRNAME
    if not artifacts_dir.is_dir():
        errors.append(f"missing artifacts directory: {artifacts_dir}")
        disk_paths: set[str] = set()
    else:
        disk_paths = set()
        manifest_by_path = {row["relative_path"]: row for row in manifest_rows if row.get("relative_path")}
        for path in sorted(artifacts_dir.rglob("*")):
            if path.is_symlink():
                errors.append(f"symlink rejected: {path}")
                continue
            if not path.is_file():
                continue
            relative_path = path.relative_to(artifacts_dir).as_posix()
            unsafe = _reject_unsafe_relative_path(relative_path)
            if unsafe:
                errors.append(unsafe)
            disk_paths.add(relative_path)
            manifest_row = manifest_by_path.get(relative_path)
            if manifest_row is None:
                errors.append(f"orphan artifact (on disk, not in manifest): {relative_path}")
                continue
            actual_size = path.stat().st_size
            expected_size = int(manifest_row["size_bytes"])
            if actual_size != expected_size:
                errors.append(
                    f"size mismatch for {relative_path}: expected {expected_size}, got {actual_size}"
                )
            actual_sha = sha256_file(path)
            if actual_sha != manifest_row["sha256"]:
                errors.append(f"sha256 mismatch for {relative_path}")

        for relative_path in sorted(manifest_paths - disk_paths):
            errors.append(f"missing artifact (in manifest, not on disk): {relative_path}")

    register_path = dry_run_root / "dry_run_execution_register.csv"
    register_rows = _load_register_rows(register_path, errors)
    register_sha256: str | None = sha256_file(register_path) if register_path.is_file() else None
    register_ids = [row.get("case_id", "") for row in register_rows]
    if register_ids != list(EXPECTED_CASE_IDS):
        errors.append(
            "execution register case_id sequence mismatch: "
            f"expected {list(EXPECTED_CASE_IDS)}, got {register_ids}"
        )
    for row in register_rows:
        case_id = row.get("case_id", "")
        acceptance = row.get("case_acceptance", "")
        if case_id in EXPECTED_CASE_IDS and acceptance != "PASS":
            errors.append(f"register acceptance mismatch for {case_id}: {acceptance}")

    failure_rows = _load_failures_rows(dry_run_root / "dry_run_failures.csv", errors)
    if failure_rows:
        errors.append(f"failures register must be empty for promotion-safe dry run: {len(failure_rows)} rows")

    cases_dir = artifacts_dir / "cases"
    found_case_ids: set[str] = set()
    if cases_dir.is_dir():
        for child in cases_dir.iterdir():
            if child.is_symlink():
                errors.append(f"symlink rejected: {child}")
            if child.is_dir():
                found_case_ids.add(child.name)
    extra_case_ids = sorted(found_case_ids - set(EXPECTED_CASE_IDS))
    missing_case_ids = sorted(set(EXPECTED_CASE_IDS) - found_case_ids)
    if extra_case_ids:
        errors.append(f"unexpected case directories: {extra_case_ids}")
    if missing_case_ids:
        errors.append(f"missing case directories: {missing_case_ids}")

    for case_id in EXPECTED_CASE_IDS:
        case_record_path = cases_dir / case_id / "case_record.json"
        if not case_record_path.is_file():
            errors.append(f"missing case record: {case_record_path}")
            continue
        if case_record_path.is_symlink():
            errors.append(f"symlink rejected: {case_record_path}")
            continue
        try:
            payload = json.loads(case_record_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errors.append(f"malformed case JSON for {case_id}: {exc}")
            continue
        if not isinstance(payload, dict):
            errors.append(f"case record must be a JSON object: {case_id}")
            continue
        if payload.get("case_id") != case_id:
            errors.append(
                f"case record case_id mismatch for {case_id}: {payload.get('case_id')!r}"
            )

    summary_path = artifacts_dir / "dry_run_summary.json"
    if not summary_path.is_file():
        errors.append(f"missing dry run summary: {summary_path}")
    else:
        if summary_path.is_symlink():
            errors.append(f"symlink rejected: {summary_path}")
        try:
            summary = json.loads(summary_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errors.append(f"malformed dry_run_summary.json: {exc}")
            summary = {}
        if isinstance(summary, dict):
            if "artifact_manifest_sha256" in summary:
                errors.append("dry_run_summary.json must not self-reference artifact_manifest_sha256")
            verdicts = summary.get("verdicts", {})
            if not isinstance(verdicts, dict):
                errors.append("dry_run_summary.json verdicts must be an object")
            else:
                for token in VERDICT_TOKENS:
                    if token not in verdicts:
                        errors.append(f"missing verdict token in summary: {token}")
                for token in NON_PROMOTION_VERDICTS:
                    if verdicts.get(token) != BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT:
                        errors.append(
                            f"non-promotion verdict drift for {token}: {verdicts.get(token)!r}"
                        )
            if summary.get("case_count") != len(EXPECTED_CASE_IDS):
                errors.append("summary case_count mismatch")
            if summary.get("case_acceptance_pass") != len(EXPECTED_CASE_IDS):
                errors.append("summary case_acceptance_pass mismatch")
            execution_register_sha256 = summary.get("execution_register_sha256")
            if not isinstance(execution_register_sha256, str):
                errors.append("dry_run_summary.json missing execution_register_sha256")
            elif (
                len(execution_register_sha256) != 64
                or any(char not in "0123456789abcdef" for char in execution_register_sha256)
            ):
                errors.append(
                    "dry_run_summary.json execution_register_sha256 must be 64 lowercase hex"
                )
            elif register_sha256 is not None and execution_register_sha256 != register_sha256:
                errors.append(
                    "dry_run_summary.json execution_register_sha256 mismatch: "
                    f"expected {register_sha256}, got {execution_register_sha256}"
                )

    return {
        "valid": not errors,
        "error_count": len(errors),
        "errors": errors,
        "artifact_count": len(manifest_paths),
        "artifact_tree_count": len(disk_paths),
        "dry_run_root": str(dry_run_root),
        "expected_manifest_sha256": expected_manifest_sha256,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run-root",
        type=Path,
        required=True,
        help="EA-05 dry run docs root (contains artifacts/ and control registers)",
    )
    parser.add_argument(
        "--expected-manifest-sha256",
        required=True,
        help="Out-of-band SHA-256 of dry_run_artifact_manifest.csv",
    )
    args = parser.parse_args(argv)

    report = verify_dry_run_artifacts(
        args.dry_run_root.resolve(),
        expected_manifest_sha256=args.expected_manifest_sha256,
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
