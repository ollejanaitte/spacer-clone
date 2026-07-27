#!/usr/bin/env python3
"""Fail-closed verifier for EA-03 external run packages."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from external_run_package_core import (
    ExclusiveWriteError,
    ExternalRunPackageValidationError,
    verify_external_run_bundle,
    write_json,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--bundle",
        type=Path,
        required=True,
        help="External run package directory",
    )
    parser.add_argument(
        "--require-operator-complete",
        action="store_true",
        help=(
            "Deprecated: default verify already requires operator-complete execution evidence "
            "(38 probes, 3 repeats, import seal)"
        ),
    )
    parser.add_argument(
        "--package-only",
        action="store_true",
        help="Validate package structure only; do not require execution evidence",
    )
    parser.add_argument(
        "--expected-import-manifest-sha256",
        help="Out-of-band import_manifest_sha256 seal required for operator-complete verification",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional exclusive JSON verification report path",
    )
    args = parser.parse_args(argv)

    try:
        report = verify_external_run_bundle(
            args.bundle,
            require_operator_complete=args.require_operator_complete,
            expected_import_manifest_sha256=args.expected_import_manifest_sha256,
            package_only=args.package_only,
        )
    except ExternalRunPackageValidationError as exc:
        report = {
            "valid": False,
            "error": str(exc),
            "execution_verdict": "BLOCKED_WITH_EXACT_EVIDENCE_REQUIREMENT",
        }
        if args.output is not None:
            if args.output.exists():
                print(f"output exists: {args.output}", file=sys.stderr)
                return 1
            args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(json.dumps(report, indent=2, sort_keys=True))
        return 1

    report_path = args.bundle / "verification_report.json"
    if not report_path.exists():
        try:
            write_json(report_path, report)
        except ExclusiveWriteError:
            pass

    if args.output is not None:
        if args.output.exists():
            print(f"output exists: {args.output}", file=sys.stderr)
            return 1
        args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report.get("valid") else 1


if __name__ == "__main__":
    raise SystemExit(main())
