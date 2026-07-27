#!/usr/bin/env python3
"""Create an isolated, non-overwriting evidence run workspace."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from evidence_core import (
    BundleValidationError,
    ExclusiveWriteError,
    PathSafetyError,
    WorkspaceExistsError,
    create_run_workspace,
    write_json,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-dir", required=True, help="Parent directory for run workspaces")
    parser.add_argument("--run-id", help="Explicit run id (generated when omitted)")
    parser.add_argument("--input", action="append", default=[], help="Input file to copy read-only")
    parser.add_argument("--record", help="Optional JSON record output path")
    args = parser.parse_args()

    try:
        record = create_run_workspace(
            Path(args.base_dir),
            run_id=args.run_id,
            input_paths=[Path(item) for item in args.input],
        )
    except (
        WorkspaceExistsError,
        ExclusiveWriteError,
        FileNotFoundError,
        ValueError,
        PathSafetyError,
        BundleValidationError,
    ) as exc:
        print(str(exc), file=sys.stderr)
        return 2

    if args.record:
        try:
            write_json(Path(args.record), record)
        except ExclusiveWriteError as exc:
            print(str(exc), file=sys.stderr)
            return 2

    json.dump(record, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
