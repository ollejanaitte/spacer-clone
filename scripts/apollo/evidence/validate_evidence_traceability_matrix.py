#!/usr/bin/env python3
"""Validate evidence_traceability_matrix.csv linkage and path integrity."""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
EC = REPO_ROOT / "docs" / "apollo" / "evidence-collection"
MATRIX_PATH = EC / "evidence_traceability_matrix.csv"
SNAPSHOT_PATH = EC / "00_inventory" / "current_blocker_snapshot.csv"

MATRIX_COLUMNS = (
    "trace_id",
    "ea_stage",
    "deliverable_path",
    "checkpoint_sha",
    "linked_blocker_ids",
    "linked_control_ids",
    "enablement_verdict",
    "closure_verdict",
    "canonical_register_path",
    "status_note",
)

BLOCKER_PSEUDO_PATTERN = re.compile(
    r"(^ALL$|\.\.|\*|^WI-|^DR-|^GATE-|^STAGE-|^EXTERNAL$|ACTUAL_PARITY)"
)
CONTROL_ID_PATTERN = re.compile(
    r"^(WI-\d{3}|DR-\d{2}|GATE-NR-\d{2}|STAGE-\d{2}|"
    r"EXTERNAL_MACHINE_EVIDENCE_VERDICT|ACTUAL_SPACER_PARITY_VERDICT)$"
)
TRACE_ID_PATTERN = re.compile(r"^ETM-\d{3}$")


def load_snapshot_ids() -> set[str]:
    with SNAPSHOT_PATH.open(encoding="utf-8", newline="") as handle:
        ids = {row["blocker_id"] for row in csv.DictReader(handle)}
    if len(ids) != 76:
        raise ValueError(f"snapshot row count {len(ids)} != 76")
    return ids


def split_ids(value: str) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in value.split(";") if part.strip()]


def validate() -> list[str]:
    errors: list[str] = []
    snapshot_ids = load_snapshot_ids()
    covered_blockers: set[str] = set()

    with MATRIX_PATH.open(encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        header = next(reader)
        if list(header) != list(MATRIX_COLUMNS):
            errors.append("matrix header/schema mismatch")
            return errors

        trace_ids: set[str] = set()
        for line_number, row in enumerate(reader, start=2):
            if len(row) != len(MATRIX_COLUMNS):
                errors.append(
                    f"line {line_number}: row width {len(row)} != {len(MATRIX_COLUMNS)}"
                )
                continue
            record = dict(zip(MATRIX_COLUMNS, row, strict=True))
            trace_id = record["trace_id"]
            if not TRACE_ID_PATTERN.fullmatch(trace_id):
                errors.append(f"{trace_id}: invalid trace_id format")
            if trace_id in trace_ids:
                errors.append(f"{trace_id}: duplicate trace_id")
            trace_ids.add(trace_id)

            deliverable = REPO_ROOT / record["deliverable_path"]
            canonical = REPO_ROOT / record["canonical_register_path"]
            if not deliverable.is_file():
                errors.append(f"{trace_id}: orphan deliverable_path {record['deliverable_path']}")
            if not canonical.is_file():
                errors.append(
                    f"{trace_id}: orphan canonical_register_path {record['canonical_register_path']}"
                )

            for blocker_id in split_ids(record["linked_blocker_ids"]):
                if BLOCKER_PSEUDO_PATTERN.search(blocker_id):
                    errors.append(
                        f"{trace_id}: pseudo/wildcard blocker token {blocker_id!r}"
                    )
                if blocker_id not in snapshot_ids:
                    errors.append(
                        f"{trace_id}: linked blocker {blocker_id} not in 76-row snapshot"
                    )
                covered_blockers.add(blocker_id)

            for control_id in split_ids(record["linked_control_ids"]):
                if not CONTROL_ID_PATTERN.fullmatch(control_id):
                    errors.append(f"{trace_id}: invalid linked_control_id {control_id!r}")

    missing_blockers = sorted(snapshot_ids - covered_blockers)
    if missing_blockers:
        errors.append(
            f"blockers without trace row: {';'.join(missing_blockers[:5])}"
            + (f" (+{len(missing_blockers) - 5} more)" if len(missing_blockers) > 5 else "")
        )

    return errors


def main() -> int:
    errors = validate()
    if errors:
        print("TRACEABILITY_MATRIX_VALIDATION: FAIL", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(
        "TRACEABILITY_MATRIX_VALIDATION: PASS "
        "(76 blockers covered; exact IDs; paths exist; no pseudo syntax)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
