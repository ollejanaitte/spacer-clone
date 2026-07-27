#!/usr/bin/env python3
"""Detect stale outputs that were unchanged between before and after manifests."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from evidence_core import BundleValidationError, ExclusiveWriteError, detect_stale_outputs, read_json, write_json


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--before", required=True, help="Before manifest JSON path")
    parser.add_argument("--after", required=True, help="After manifest JSON path")
    parser.add_argument("--outputs-prefix", default="outputs/", help="Relative path prefix to evaluate")
    parser.add_argument("--output", help="Optional JSON output path")
    args = parser.parse_args()

    try:
        before = read_json(Path(args.before))
        after = read_json(Path(args.after))
        result = detect_stale_outputs(before, after, outputs_prefix=args.outputs_prefix)
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
