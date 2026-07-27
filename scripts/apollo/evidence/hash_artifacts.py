#!/usr/bin/env python3
"""Compute SHA-256 records for one or more artifact files."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from evidence_core import ExclusiveWriteError, PathSafetyError, hash_artifacts, write_json


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", help="Artifact file paths")
    parser.add_argument("--output", help="Optional JSON output path")
    args = parser.parse_args()

    try:
        records = hash_artifacts([Path(path) for path in args.paths])
    except (FileNotFoundError, PathSafetyError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 2

    payload = {"artifacts": records}
    if args.output:
        try:
            write_json(Path(args.output), payload)
        except ExclusiveWriteError as exc:
            print(str(exc), file=sys.stderr)
            return 2

    json.dump(payload, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
