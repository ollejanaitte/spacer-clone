#!/usr/bin/env python3
"""Validate design-standards CSV files parse with stable exact column widths."""

from __future__ import annotations

import csv
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
DS_CSV_ROOT = REPO_ROOT / "docs" / "apollo" / "design-standards"


def validate_csv_file(path: Path) -> list[str]:
    errors: list[str] = []
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        try:
            header = next(reader)
        except StopIteration:
            errors.append(f"{path}: empty file")
            return errors
        width = len(header)
        if width == 0:
            errors.append(f"{path}: empty header")
            return errors
        for line_number, row in enumerate(reader, start=2):
            if len(row) != width:
                errors.append(
                    f"{path}:{line_number}: row width {len(row)} != header width {width}"
                )
    return errors


def validate() -> list[str]:
    csv_files = sorted(DS_CSV_ROOT.rglob("*.csv"))
    if not csv_files:
        return ["no design-standards CSV files found"]
    errors: list[str] = []
    for path in csv_files:
        errors.extend(validate_csv_file(path))
    return errors


def main() -> int:
    errors = validate()
    file_count = len(list(DS_CSV_ROOT.rglob("*.csv")))
    if errors:
        print("DESIGN_STANDARDS_CSV_VALIDATION: FAIL", file=sys.stderr)
        print(f"file_count={file_count}", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(
        f"DESIGN_STANDARDS_CSV_VALIDATION: PASS ({file_count} files; exact header widths)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
