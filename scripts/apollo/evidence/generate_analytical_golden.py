#!/usr/bin/env python3
"""Generate EA-02 analytical golden evidence artifacts from immutable case definitions."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from analytical_golden_core import (
    DOCS_DIR,
    AnalyticalGoldenError,
    generate_package,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--docs-dir",
        type=Path,
        default=DOCS_DIR,
        help="Output directory for analytical golden CSV artifacts",
    )
    parser.add_argument(
        "--report",
        type=Path,
        help="Optional JSON report path (exclusive create)",
    )
    args = parser.parse_args(argv)

    try:
        summary = generate_package(args.docs_dir)
    except AnalyticalGoldenError as exc:
        print(f"generate_analytical_golden: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(summary, indent=2, sort_keys=True))

    if args.report is not None:
        if args.report.exists():
            print(f"report exists: {args.report}", file=sys.stderr)
            return 1
        args.report.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
