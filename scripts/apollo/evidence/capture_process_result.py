#!/usr/bin/env python3
"""Execute a command and capture byte-preserving stdout/stderr with metadata."""

from __future__ import annotations

import argparse
import json
import shlex
import sys
from pathlib import Path

from evidence_core import (
    ExclusiveWriteError,
    capture_environment_record,
    capture_process_result,
    write_process_capture,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", required=True, help="Run workspace directory")
    parser.add_argument("--command", required=True, help="Shell-quoted command to execute")
    parser.add_argument("--cwd", help="Working directory (defaults to workspace)")
    parser.add_argument("--timeout", type=float, help="Timeout in seconds")
    parser.add_argument("--allow-env", action="append", default=[], help="Extra environment allowlist keys")
    args = parser.parse_args()

    workspace = Path(args.workspace)
    command = shlex.split(args.command)
    if not command:
        print("command is required", file=sys.stderr)
        return 2

    env_record = capture_environment_record(extra_allowlist=args.allow_env)
    capture = capture_process_result(
        command,
        cwd=args.cwd or workspace,
        timeout_seconds=args.timeout,
    )
    try:
        record = write_process_capture(
            workspace,
            command,
            capture,
            cwd=args.cwd or workspace,
            env_record=env_record,
        )
    except ExclusiveWriteError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    json.dump(record, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
