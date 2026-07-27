#!/usr/bin/env python3
"""Classify parity comparison mismatches with explicit evidence basis (EA-04)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from parity_core import (
    ExclusiveWriteError,
    ParityValidationError,
    classify_comparison_report,
    read_json,
    write_json_exclusive,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--comparison", type=Path, required=True, help="Comparison report JSON")
    parser.add_argument("--mapping", type=Path, help="Optional mapping JSON for context")
    parser.add_argument("--spacer-stale", action="store_true", help="SPACER canonical stale flag")
    parser.add_argument("--apollo-stale", action="store_true", help="Apollo canonical stale flag")
    parser.add_argument("--output", type=Path, help="Optional exclusive classification report path")
    args = parser.parse_args(argv)

    try:
        comparison_report = read_json(args.comparison)
        mapping_document = read_json(args.mapping) if args.mapping else None
        report = classify_comparison_report(
            comparison_report,
            mapping_document=mapping_document,
            spacer_stale=args.spacer_stale,
            apollo_stale=args.apollo_stale,
        )
        if args.output is not None:
            if args.output.exists():
                print(f"output exists: {args.output}", file=sys.stderr)
                return 1
            write_json_exclusive(args.output, report)
        print(json.dumps(report, indent=2, sort_keys=True))
    except (ParityValidationError, ExclusiveWriteError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
