#!/usr/bin/env python3
"""Render UTF-8 JSON and CSV evidence summaries from a bundle manifest."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from evidence_core import BundleValidationError, ExclusiveWriteError, load_bundle_manifest, write_summaries


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", required=True, help="Run workspace directory")
    args = parser.parse_args()

    workspace = Path(args.workspace)
    try:
        manifest = load_bundle_manifest(workspace)
        json_path, csv_path = write_summaries(workspace, manifest)
    except (BundleValidationError, ExclusiveWriteError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        return 2

    payload = {
        "summary_json": str(json_path),
        "summary_csv": str(csv_path),
    }
    json.dump(payload, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
