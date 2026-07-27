#!/usr/bin/env python3
"""Capture software identity and secret-safe environment metadata."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from evidence_core import ExclusiveWriteError, capture_environment_record, write_json, write_text_exclusive


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", help="Optional workspace to write captures/environment.json")
    parser.add_argument("--allow-env", action="append", default=[], help="Extra environment key allowlist")
    parser.add_argument("--output", help="Optional JSON output path")
    args = parser.parse_args()

    record = capture_environment_record(extra_allowlist=args.allow_env)
    payload = json.dumps(record, indent=2, sort_keys=True) + "\n"

    try:
        if args.workspace:
            destination = Path(args.workspace) / "captures" / "environment.json"
            write_json(destination, record)
        if args.output:
            write_text_exclusive(Path(args.output), payload)
    except ExclusiveWriteError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    sys.stdout.write(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
