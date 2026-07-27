#!/usr/bin/env python3
"""Prepare an EA-03 external run package skeleton."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from external_run_package_core import (
    ExclusiveWriteError,
    ExternalRunPackageError,
    prepare_external_run_bundle,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Exclusive output directory for the external run package",
    )
    parser.add_argument(
        "--bundle-id",
        help="Optional bundle identifier (default: time-based ea03- prefix)",
    )
    args = parser.parse_args(argv)

    try:
        report = prepare_external_run_bundle(args.output, bundle_id=args.bundle_id)
    except (ExclusiveWriteError, ExternalRunPackageError, OSError) as exc:
        print(f"prepare_external_run_bundle: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
