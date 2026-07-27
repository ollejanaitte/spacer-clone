#!/usr/bin/env python3
"""Fail-closed semantic validation for an evidence bundle manifest."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from evidence_core import (
    BundleValidationError,
    ExclusiveWriteError,
    PathSafetyError,
    read_json,
    validate_evidence_bundle,
    write_json,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", help="Bundle manifest JSON path")
    parser.add_argument("--workspace", help="Run workspace directory (loads bundle_manifest.json)")
    parser.add_argument("--output", help="Optional validation report JSON path")
    args = parser.parse_args()

    if not args.manifest and not args.workspace:
        print("either --manifest or --workspace is required", file=sys.stderr)
        return 2

    workspace = Path(args.workspace) if args.workspace else None
    manifest_path = Path(args.manifest) if args.manifest else workspace / "bundle_manifest.json"

    try:
        manifest = read_json(manifest_path)
        report = validate_evidence_bundle(manifest, workspace=workspace)
    except (BundleValidationError, PathSafetyError) as exc:
        report = {
            "valid": False,
            "error_count": 1,
            "errors": [str(exc)],
        }
        if args.output:
            try:
                write_json(Path(args.output), report)
            except ExclusiveWriteError as exc:
                print(str(exc), file=sys.stderr)
                return 2
        json.dump(report, sys.stdout, indent=2, sort_keys=True)
        sys.stdout.write("\n")
        return 1

    if args.output:
        try:
            write_json(Path(args.output), report)
        except ExclusiveWriteError as exc:
            print(str(exc), file=sys.stderr)
            return 2

    json.dump(report, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
