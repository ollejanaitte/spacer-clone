#!/usr/bin/env python3
"""Compare two evidence bundles after approved metadata normalization."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from evidence_core import BundleValidationError, ExclusiveWriteError, compare_repeated_runs, load_bundle_manifest, write_json


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-a", required=True, help="First run workspace directory")
    parser.add_argument("--run-b", required=True, help="Second run workspace directory")
    parser.add_argument("--output", help="Optional JSON output path")
    args = parser.parse_args()

    try:
        bundle_a = load_bundle_manifest(Path(args.run_a))
        bundle_b = load_bundle_manifest(Path(args.run_b))
        result = compare_repeated_runs(bundle_a, bundle_b)
    except (BundleValidationError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        return 2

    if args.output:
        try:
            write_json(Path(args.output), result)
        except ExclusiveWriteError as exc:
            print(str(exc), file=sys.stderr)
            return 2

    json.dump(result, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
