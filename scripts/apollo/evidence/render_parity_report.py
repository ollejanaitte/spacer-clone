#!/usr/bin/env python3
"""Render consolidated parity harness report (EA-04)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from parity_core import (
    ExclusiveWriteError,
    ParityValidationError,
    read_json,
    render_parity_report,
    write_json_exclusive,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--comparison", type=Path, required=True, help="Comparison report JSON")
    parser.add_argument("--classification", type=Path, help="Optional classification report JSON")
    parser.add_argument("--output", type=Path, required=True, help="Exclusive rendered report path")
    args = parser.parse_args(argv)

    try:
        comparison_report = read_json(args.comparison)
        classification_report = (
            read_json(args.classification) if args.classification else None
        )
        if args.output.exists():
            print(f"output exists: {args.output}", file=sys.stderr)
            return 1
        report = render_parity_report(comparison_report, classification_report)
        write_json_exclusive(args.output, report)
        print(json.dumps(report, indent=2, sort_keys=True))
        return 0 if report.get("parity_pass") else 1
    except (ParityValidationError, ExclusiveWriteError) as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
