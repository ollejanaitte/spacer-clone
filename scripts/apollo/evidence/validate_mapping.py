#!/usr/bin/env python3
"""Validate parity mapping against optional SPACER and Apollo raw documents (EA-04)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from parity_core import (
    ExclusiveWriteError,
    ParityValidationError,
    PathSafetyError,
    compute_raw_file_sha256,
    read_json_file,
    validate_mapping_document,
    validate_sha256_argument,
    write_json_exclusive,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mapping", type=Path, required=True, help="Mapping JSON document")
    parser.add_argument(
        "--expected-mapping-sha256",
        required=True,
        help="Required file-byte SHA-256 for mapping JSON input",
    )
    parser.add_argument("--spacer-raw", type=Path, help="Optional SPACER raw JSON document")
    parser.add_argument("--apollo-raw", type=Path, help="Optional Apollo raw JSON document")
    parser.add_argument("--output", type=Path, help="Optional exclusive validation report path")
    args = parser.parse_args(argv)

    try:
        mapping_byte_sha = compute_raw_file_sha256(args.mapping)
        expected_mapping = validate_sha256_argument(
            args.expected_mapping_sha256,
            field_name="expected-mapping-sha256",
        )
        if mapping_byte_sha != expected_mapping:
            raise ParityValidationError(
                f"mapping file byte SHA-256 mismatch: expected {expected_mapping}, got {mapping_byte_sha}"
            )
        mapping_document = read_json_file(args.mapping)
        spacer_raw = read_json_file(args.spacer_raw) if args.spacer_raw else None
        apollo_raw = read_json_file(args.apollo_raw) if args.apollo_raw else None
        mapping_sha256 = validate_mapping_document(
            mapping_document,
            spacer_raw=spacer_raw,
            apollo_raw=apollo_raw,
            file_byte_sha256=mapping_byte_sha,
        )
        report = {
            "valid": True,
            "mapping_sha256": mapping_sha256,
            "mapping_file_byte_sha256": mapping_byte_sha,
            "mapping_id": mapping_document.get("mapping_id"),
        }
        if args.output is not None:
            if args.output.exists():
                print(f"output exists: {args.output}", file=sys.stderr)
                return 1
            write_json_exclusive(args.output, report)
        print(json.dumps(report, indent=2, sort_keys=True))
    except (ParityValidationError, ExclusiveWriteError, PathSafetyError) as exc:
        report = {"valid": False, "error": str(exc)}
        if args.output is not None and not args.output.exists():
            write_json_exclusive(args.output, report)
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
