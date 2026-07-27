#!/usr/bin/env python3
"""Mechanical no-truncation consistency check: §12 table vs unresolved_evidence_register.csv."""

from __future__ import annotations

import csv
import hashlib
import sys
from pathlib import Path

from build_unresolved_evidence_register import (
    REGISTER_COLUMNS,
    REGISTER_PATH,
    REPORT_PATH,
    SECTION12_MAP,
    SNAPSHOT_BASELINE_MAP,
    SNAPSHOT_PATH,
    escape_md_cell,
    section12_software,
)

SECTION12_HEADER = (
    "| ID | Software | Version | License | Machine | Input | Procedure | Output | "
    "Checksum | Acceptance | Numeric impact |"
)
SECTION12_COLUMNS = list(SECTION12_MAP.keys())


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_register() -> list[dict[str, str]]:
    with REGISTER_PATH.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    if list(rows[0].keys()) != REGISTER_COLUMNS:
        raise ValueError("register header/schema mismatch")
    return rows


def load_snapshot_by_id() -> dict[str, dict[str, str]]:
    with SNAPSHOT_PATH.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    return {row["blocker_id"]: row for row in rows}


def parse_section12_rows(report_text: str) -> list[dict[str, str]]:
    start = report_text.find("## 12. Remaining External Evidence")
    if start < 0:
        raise ValueError("section 12 heading not found")
    table_start = report_text.find(SECTION12_HEADER, start)
    if table_start < 0:
        raise ValueError("section 12 table header not found")
    lines = report_text[table_start:].splitlines()
    parsed: list[dict[str, str]] = []
    for line in lines[2:]:
        if not line.startswith("|"):
            break
        if line.startswith("|---"):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) != len(SECTION12_COLUMNS) + 1:
            raise ValueError(f"unexpected column count in section 12 row: {line}")
        row = {"ID": cells[0]}
        for index, column in enumerate(SECTION12_COLUMNS, start=1):
            row[column] = cells[index].replace("\\|", "|")
        parsed.append(row)
    return parsed


def register_section12_view(row: dict[str, str]) -> dict[str, str]:
    return {
        "ID": row["blocker_id"],
        "Software": section12_software(row),
        **{column: getter(row) for column, getter in SECTION12_MAP.items() if column != "Software"},
    }


def validate_baseline_mapping(
    register_rows: list[dict[str, str]],
    snapshot_by_id: dict[str, dict[str, str]],
) -> list[str]:
    errors: list[str] = []
    if len(snapshot_by_id) != 76:
        errors.append(f"snapshot row count {len(snapshot_by_id)} != 76")

    for register_row in register_rows:
        blocker_id = register_row["blocker_id"]
        snapshot = snapshot_by_id.get(blocker_id)
        if snapshot is None:
            errors.append(f"missing snapshot row for {blocker_id}")
            continue
        for register_field, snapshot_field in SNAPSHOT_BASELINE_MAP.items():
            expected = snapshot[snapshot_field]
            actual = register_row[register_field]
            if actual != expected:
                errors.append(
                    f"{blocker_id}/{register_field}: baseline mismatch vs snapshot/{snapshot_field}\n"
                    f"  snapshot: {expected!r}\n"
                    f"  register: {actual!r}"
                )
    return errors


def validate() -> tuple[list[str], int]:
    errors: list[str] = []
    register_rows = load_register()
    if len(register_rows) != 76:
        errors.append(f"register row count {len(register_rows)} != 76")

    snapshot_by_id = load_snapshot_by_id()
    baseline_errors = validate_baseline_mapping(register_rows, snapshot_by_id)
    errors.extend(baseline_errors)
    baseline_mismatch_count = len(baseline_errors)

    report_text = REPORT_PATH.read_text(encoding="utf-8")
    section_rows = parse_section12_rows(report_text)
    if len(section_rows) != 76:
        errors.append(f"section 12 row count {len(section_rows)} != 76")

    register_by_id = {row["blocker_id"]: row for row in register_rows}
    section_by_id = {row["ID"]: row for row in section_rows}

    if set(register_by_id) != set(section_by_id):
        errors.append("section 12 IDs differ from register IDs")

    for blocker_id, register_row in register_by_id.items():
        expected = register_section12_view(register_row)
        actual = section_by_id.get(blocker_id)
        if actual is None:
            errors.append(f"missing section 12 row for {blocker_id}")
            continue
        for column in expected:
            if actual[column] != expected[column]:
                exp = expected[column]
                act = actual[column]
                if act in exp or exp.startswith(act):
                    errors.append(
                        f"{blocker_id}/{column}: truncated section 12 cell "
                        f"(register len={len(exp)} section len={len(act)})"
                    )
                else:
                    errors.append(
                        f"{blocker_id}/{column}: mismatch\n"
                        f"  register: {exp!r}\n"
                        f"  section12: {act!r}"
                    )

    blocked = sum(
        1
        for row in register_rows
        if row["current_status"] == "BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT"
    )
    not_approved = sum(1 for row in register_rows if row["current_status"] == "NOT_APPROVED")
    if blocked != 45:
        errors.append(f"BLOCKED count {blocked} != 45")
    if not_approved != 31:
        errors.append(f"NOT_APPROVED count {not_approved} != 31")

    for row in register_rows:
        if row["exact_procedure"] == row["required_tool"] and row["required_tool"] not in {
            "NOT_APPLICABLE",
            "",
        }:
            if row["blocker_id"].startswith(("GOLD-", "PAR-")):
                continue
            errors.append(
                f"{row['blocker_id']}: exact_procedure equals required_tool (procedure/tool conflation)"
            )

    for row in register_rows:
        machine = row["required_machine"]
        ext = row["external_dependency"]
        if machine == ext and not is_machine_like(machine):
            if machine not in {"NOT_APPLICABLE_NOT_SPECIFIED"}:
                errors.append(
                    f"{row['blocker_id']}: required_machine mirrors external_dependency without explicit machine"
                )

    return errors, baseline_mismatch_count


def is_machine_like(value: str) -> bool:
    lowered = value.lower()
    return (
        "authorized machine" in lowered
        or lowered.startswith("vendor-installed")
        or "installed analyzer" in lowered
    )


def main() -> int:
    errors, baseline_mismatch_count = validate()
    snapshot_sha = sha256_file(SNAPSHOT_PATH)
    register_sha = sha256_file(REGISTER_PATH)
    if errors:
        print("SECTION12_REGISTER_VALIDATION: FAIL", file=sys.stderr)
        print(
            f"baseline_mismatch_count={baseline_mismatch_count}; "
            f"snapshot_sha256={snapshot_sha}; register_sha256={register_sha}",
            file=sys.stderr,
        )
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(
        "SECTION12_REGISTER_VALIDATION: PASS "
        "(76 rows; baseline byte-exact; no truncation; procedure/tool distinct)"
    )
    print(f"baseline_mismatch_count={baseline_mismatch_count}")
    print(f"snapshot_sha256={snapshot_sha}")
    print(f"register_sha256={register_sha}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
