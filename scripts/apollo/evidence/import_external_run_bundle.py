#!/usr/bin/env python3
"""Import operator-provided artifacts into an EA-03 external run package."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from external_run_package_core import (
    ExclusiveWriteError,
    ExternalRunPackageError,
    ExternalRunPackageValidationError,
    PathSafetyError,
    import_external_run_bundle,
)


def _parse_mapping(pairs: list[str]) -> dict[str, Path]:
    mapping: dict[str, Path] = {}
    for pair in pairs:
        if "=" not in pair:
            raise ValueError(f"expected key=path mapping, got {pair!r}")
        key, raw_path = pair.split("=", 1)
        mapping[key] = Path(raw_path)
    return mapping


def _parse_binding_mapping(pairs: list[str]) -> dict[str, dict]:
    mapping: dict[str, dict] = {}
    for pair in pairs:
        if "=" not in pair:
            raise ValueError(f"expected key=path mapping, got {pair!r}")
        key, raw_path = pair.split("=", 1)
        binding_path = Path(raw_path)
        mapping[key] = json.loads(binding_path.read_text(encoding="utf-8"))
    return mapping


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--bundle",
        type=Path,
        required=True,
        help="Existing external run package directory",
    )
    parser.add_argument(
        "--file",
        action="append",
        default=[],
        metavar="REL=PATH",
        help="Copy a read-only file into the bundle at REL path",
    )
    parser.add_argument(
        "--evidence",
        action="append",
        default=[],
        metavar="SLOT=PATH",
        help="Import an EA-01 evidence bundle tree into SLOT (repeat_01..03 or probe:AN-PRB-001..022/AN-ERR-001..016)",
    )
    parser.add_argument(
        "--binding",
        action="append",
        default=[],
        metavar="SLOT=PATH",
        help="JSON identity binding file for SLOT (repeat_01..03 or probe:AN-PRB-001..022/AN-ERR-001..016)",
    )
    args = parser.parse_args(argv)

    try:
        source_files = _parse_mapping(args.file)
        evidence_dirs = _parse_mapping(args.evidence)
        identity_bindings = _parse_binding_mapping(args.binding)
        report = import_external_run_bundle(
            args.bundle,
            source_files=source_files,
            evidence_bundle_dirs=evidence_dirs,
            identity_bindings=identity_bindings,
        )
    except (
        ExclusiveWriteError,
        ExternalRunPackageError,
        ExternalRunPackageValidationError,
        PathSafetyError,
        ValueError,
        OSError,
    ) as exc:
        print(f"import_external_run_bundle: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
