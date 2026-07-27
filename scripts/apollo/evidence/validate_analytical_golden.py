#!/usr/bin/env python3
"""Fail-closed validator for EA-02 analytical golden evidence artifacts."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from analytical_golden_core import (
    DOCS_DIR,
    AnalyticalGoldenError,
    AnalyticalGoldenValidationError,
    validate_package,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
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
        help="Optional exclusive JSON validation report path",
    )
    args = parser.parse_args(argv)

    report: dict[str, object]
    try:
        report = validate_package(
            args.docs_dir,
            expected_tolerance_sha256=args.tolerance_freeze_sha256,
        )
    except AnalyticalGoldenValidationError as exc:
        report = {"valid": False, "error": str(exc)}
        if args.output is not None:
            if args.output.exists():
                print(f"output exists: {args.output}", file=sys.stderr)
                return 1
            args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(json.dumps(report, indent=2, sort_keys=True))
        return 1
    except AnalyticalGoldenError as exc:
        print(f"validate_analytical_golden: {exc}", file=sys.stderr)
        return 1

    if args.output is not None:
        if args.output.exists():
            print(f"output exists: {args.output}", file=sys.stderr)
            return 1
        args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
