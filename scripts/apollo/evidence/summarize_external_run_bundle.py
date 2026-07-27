#!/usr/bin/env python3
"""Render a UTF-8 JSON summary for an EA-03 external run package."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from external_run_package_core import (
    ExclusiveWriteError,
    ExternalRunPackageError,
    SUMMARY_NAME,
    summarize_external_run_bundle,
    write_json,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--bundle",
        type=Path,
        required=True,
        help="External run package directory",
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write exclusive external_run_summary.json into the bundle",
    )
    args = parser.parse_args(argv)

    try:
        summary = summarize_external_run_bundle(args.bundle)
    except (ExternalRunPackageError, OSError) as exc:
        print(f"summarize_external_run_bundle: {exc}", file=sys.stderr)
        return 1

    if args.write:
        output = args.bundle / SUMMARY_NAME
        try:
            write_json(output, summary)
        except ExclusiveWriteError as exc:
            print(f"summarize_external_run_bundle: {exc}", file=sys.stderr)
            return 1

    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
