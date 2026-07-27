#!/usr/bin/env python3
"""Compare an Apollo actual-value bundle against EA-02 analytical golden expected values."""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from pathlib import Path

from analytical_golden_core import (
    DOCS_DIR,
    AnalyticalGoldenComparisonError,
    AnalyticalGoldenError,
    AnalyticalGoldenValidationError,
    compare_actual_bundle,
    validate_sha256_argument,
)


def _load_actual_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        if path.suffix.lower() == ".json":
            payload = json.load(handle)
            if not isinstance(payload, list):
                raise AnalyticalGoldenValidationError("actual JSON bundle must be a list of rows")
            rows: list[dict[str, str]] = []
            for item in payload:
                if not isinstance(item, dict):
                    raise AnalyticalGoldenValidationError("actual JSON rows must be objects")
                rows.append({str(key): str(value) for key, value in item.items()})
            return rows

        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise AnalyticalGoldenValidationError("actual CSV missing header")
        required = {"case_id", "quantity_id", "unit", "actual_value"}
        if not required.issubset(reader.fieldnames):
            raise AnalyticalGoldenValidationError(
                f"actual CSV requires columns: {sorted(required)}"
            )
        return [dict(row) for row in reader]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--actual",
        type=Path,
        required=True,
        help="CSV or JSON bundle with case_id quantity_id unit actual_value",
    )
    parser.add_argument(
        "--docs-dir",
        type=Path,
        default=DOCS_DIR,
        help="Directory containing analytical golden CSV artifacts",
    )
    parser.add_argument(
        "--tolerance-freeze-sha256",
        required=True,
        help="Required frozen tolerance register SHA-256 (64 lowercase hex)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional exclusive JSON comparison report path",
    )
    args = parser.parse_args(argv)

    try:
        tolerance_sha256 = validate_sha256_argument(args.tolerance_freeze_sha256)
        actual_rows = _load_actual_rows(args.actual)
        for row in actual_rows:
            value_text = row.get("actual_value", "")
            try:
                numeric = float(value_text)
            except ValueError as exc:
                raise AnalyticalGoldenValidationError(
                    f"non-numeric actual_value for {row.get('case_id')}|{row.get('quantity_id')}"
                ) from exc
            if not math.isfinite(numeric):
                raise AnalyticalGoldenValidationError(
                    f"nonfinite actual_value for {row.get('case_id')}|{row.get('quantity_id')}"
                )

        report = compare_actual_bundle(
            actual_rows,
            args.docs_dir,
            tolerance_freeze_sha256=tolerance_sha256,
        )
    except (AnalyticalGoldenComparisonError, AnalyticalGoldenValidationError) as exc:
        report = {"overall_verdict": "FAIL", "error": str(exc)}
        if args.output is not None:
            if args.output.exists():
                print(f"output exists: {args.output}", file=sys.stderr)
                return 1
            args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(json.dumps(report, indent=2, sort_keys=True))
        return 1
    except AnalyticalGoldenError as exc:
        print(f"compare_apollo_to_analytical_golden: {exc}", file=sys.stderr)
        return 1

    if args.output is not None:
        if args.output.exists():
            print(f"output exists: {args.output}", file=sys.stderr)
            return 1
        args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report.get("overall_verdict") == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
