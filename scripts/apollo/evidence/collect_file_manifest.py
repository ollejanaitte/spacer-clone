#!/usr/bin/env python3
"""Collect a recursive SHA-256 file manifest for a directory tree."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from evidence_core import (
    BundleValidationError,
    ExclusiveWriteError,
    PathSafetyError,
    collect_file_manifest,
    write_json,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, help="Directory root to manifest")
    parser.add_argument("--label", help="Manifest label")
    parser.add_argument("--output", help="Optional JSON output path")
    args = parser.parse_args()

    try:
        manifest = collect_file_manifest(Path(args.root), label=args.label)
    except (FileNotFoundError, PathSafetyError, BundleValidationError) as exc:
        print(str(exc), file=sys.stderr)
        return 2

    if args.output:
        try:
            write_json(Path(args.output), manifest)
        except ExclusiveWriteError as exc:
            print(str(exc), file=sys.stderr)
            return 2

    json.dump(manifest, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
