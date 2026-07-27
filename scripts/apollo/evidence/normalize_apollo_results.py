#!/usr/bin/env python3
"""Normalize Apollo raw results to canonical parity form (EA-04)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from parity_core import (
    ExclusiveWriteError,
    ParityNormalizationError,
    ParityValidationError,
    PathSafetyError,
    compute_raw_file_sha256,
    normalize_raw_results,
    read_json_file,
    validate_sha256_argument,
    write_json_exclusive,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, required=True, help="Apollo raw JSON document")
    parser.add_argument("--mapping", type=Path, required=True, help="Mapping JSON document")
    parser.add_argument("--output", type=Path, required=True, help="Exclusive canonical output path")
    parser.add_argument(
        "--expected-raw-sha256",
        required=True,
        help="Required file-byte SHA-256 for raw JSON input",
    )
    parser.add_argument(
        "--expected-mapping-sha256",
        required=True,
        help="Required file-byte SHA-256 for mapping JSON input",
    )
    args = parser.parse_args(argv)

    try:
        raw_byte_sha = compute_raw_file_sha256(args.raw)
        mapping_byte_sha = compute_raw_file_sha256(args.mapping)
        expected_raw = validate_sha256_argument(args.expected_raw_sha256, field_name="expected-raw-sha256")
        expected_mapping = validate_sha256_argument(
            args.expected_mapping_sha256,
            field_name="expected-mapping-sha256",
        )
        if raw_byte_sha != expected_raw:
            raise ParityValidationError(
                f"raw file byte SHA-256 mismatch: expected {expected_raw}, got {raw_byte_sha}"
            )
        if mapping_byte_sha != expected_mapping:
            raise ParityValidationError(
                f"mapping file byte SHA-256 mismatch: expected {expected_mapping}, got {mapping_byte_sha}"
            )
        raw_document = read_json_file(args.raw)
        mapping_document = read_json_file(args.mapping)
        canonical, audit = normalize_raw_results(
            raw_document,
            mapping_document,
            side="apollo",
            raw_file_byte_sha256=raw_byte_sha,
            mapping_file_byte_sha256=mapping_byte_sha,
        )
        if args.output.exists():
            print(f"output exists: {args.output}", file=sys.stderr)
            return 1
        write_json_exclusive(args.output, canonical)
        print(
            json.dumps(
                {
                    "status": "ok",
                    "side": "apollo",
                    "output": str(args.output),
                    "input_row_count": audit.input_row_count,
                    "output_row_count": audit.output_row_count,
                    "excluded_row_count": audit.excluded_row_count,
                    "raw_file_byte_sha256": raw_byte_sha,
                    "mapping_file_byte_sha256": mapping_byte_sha,
                },
                indent=2,
                sort_keys=True,
            )
        )
    except (
        ParityNormalizationError,
        ParityValidationError,
        ExclusiveWriteError,
        PathSafetyError,
    ) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
