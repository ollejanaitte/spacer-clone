#!/usr/bin/env python3
"""Compare normalized SPACER and Apollo canonical numeric parity results (EA-04)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from parity_core import (
    DOCS_DIR,
    TOLERANCE_FREEZE_NAME,
    ExclusiveWriteError,
    ParityComparisonError,
    ParityValidationError,
    PathSafetyError,
    compare_canonical_documents,
    compute_raw_file_sha256,
    load_tolerance_freeze,
    read_json_file,
    validate_sha256_argument,
    write_json_exclusive,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spacer-canonical", type=Path, required=True)
    parser.add_argument("--apollo-canonical", type=Path, required=True)
    parser.add_argument("--spacer-raw", type=Path, required=True)
    parser.add_argument("--apollo-raw", type=Path, required=True)
    parser.add_argument("--mapping", type=Path, required=True, help="Mapping JSON for identity binding check")
    parser.add_argument(
        "--expected-spacer-canonical-sha256",
        required=True,
        help="Required file-byte SHA-256 for spacer canonical JSON input",
    )
    parser.add_argument(
        "--expected-apollo-canonical-sha256",
        required=True,
        help="Required file-byte SHA-256 for apollo canonical JSON input",
    )
    parser.add_argument(
        "--expected-spacer-raw-sha256",
        required=True,
        help="Required file-byte SHA-256 for spacer raw JSON input",
    )
    parser.add_argument(
        "--expected-apollo-raw-sha256",
        required=True,
        help="Required file-byte SHA-256 for apollo raw JSON input",
    )
    parser.add_argument(
        "--expected-mapping-sha256",
        required=True,
        help="Required file-byte SHA-256 for mapping JSON input",
    )
    parser.add_argument(
        "--docs-dir",
        type=Path,
        default=DOCS_DIR,
        help="Directory containing tolerance_freeze_register.csv",
    )
    parser.add_argument(
        "--tolerance-freeze-sha256",
        required=True,
        help="Required frozen tolerance register SHA-256 (64 lowercase hex)",
    )
    parser.add_argument("--output", type=Path, help="Optional exclusive comparison report path")
    args = parser.parse_args(argv)

    try:
        tolerance_sha256 = validate_sha256_argument(
            args.tolerance_freeze_sha256,
            field_name="tolerance-freeze-sha256",
        )
        expected_spacer_canonical_byte_sha = validate_sha256_argument(
            args.expected_spacer_canonical_sha256,
            field_name="expected-spacer-canonical-sha256",
        )
        expected_apollo_canonical_byte_sha = validate_sha256_argument(
            args.expected_apollo_canonical_sha256,
            field_name="expected-apollo-canonical-sha256",
        )
        expected_spacer_raw_byte_sha = validate_sha256_argument(
            args.expected_spacer_raw_sha256,
            field_name="expected-spacer-raw-sha256",
        )
        expected_apollo_raw_byte_sha = validate_sha256_argument(
            args.expected_apollo_raw_sha256,
            field_name="expected-apollo-raw-sha256",
        )
        expected_mapping_byte_sha = validate_sha256_argument(
            args.expected_mapping_sha256,
            field_name="expected-mapping-sha256",
        )

        spacer_canonical_byte_sha = compute_raw_file_sha256(args.spacer_canonical)
        apollo_canonical_byte_sha = compute_raw_file_sha256(args.apollo_canonical)
        spacer_raw_byte_sha = compute_raw_file_sha256(args.spacer_raw)
        apollo_raw_byte_sha = compute_raw_file_sha256(args.apollo_raw)
        mapping_byte_sha = compute_raw_file_sha256(args.mapping)
        if spacer_canonical_byte_sha != expected_spacer_canonical_byte_sha:
            raise ParityValidationError(
                f"spacer canonical file byte SHA-256 mismatch: "
                f"expected {expected_spacer_canonical_byte_sha}, got {spacer_canonical_byte_sha}"
            )
        if apollo_canonical_byte_sha != expected_apollo_canonical_byte_sha:
            raise ParityValidationError(
                f"apollo canonical file byte SHA-256 mismatch: "
                f"expected {expected_apollo_canonical_byte_sha}, got {apollo_canonical_byte_sha}"
            )
        if spacer_raw_byte_sha != expected_spacer_raw_byte_sha:
            raise ParityValidationError(
                f"spacer raw file byte SHA-256 mismatch: "
                f"expected {expected_spacer_raw_byte_sha}, got {spacer_raw_byte_sha}"
            )
        if apollo_raw_byte_sha != expected_apollo_raw_byte_sha:
            raise ParityValidationError(
                f"apollo raw file byte SHA-256 mismatch: "
                f"expected {expected_apollo_raw_byte_sha}, got {apollo_raw_byte_sha}"
            )
        if mapping_byte_sha != expected_mapping_byte_sha:
            raise ParityValidationError(
                f"mapping file byte SHA-256 mismatch: "
                f"expected {expected_mapping_byte_sha}, got {mapping_byte_sha}"
            )

        tolerance_rows, computed_sha = load_tolerance_freeze(args.docs_dir / TOLERANCE_FREEZE_NAME)
        if computed_sha != tolerance_sha256:
            raise ParityComparisonError("tolerance freeze SHA-256 rejected")

        spacer_canonical = read_json_file(args.spacer_canonical)
        apollo_canonical = read_json_file(args.apollo_canonical)
        spacer_raw = read_json_file(args.spacer_raw)
        apollo_raw = read_json_file(args.apollo_raw)
        mapping_document = read_json_file(args.mapping)
        report = compare_canonical_documents(
            spacer_canonical,
            apollo_canonical,
            spacer_raw=spacer_raw,
            apollo_raw=apollo_raw,
            tolerance_rows=tolerance_rows,
            tolerance_freeze_sha256=tolerance_sha256,
            mapping_document=mapping_document,
            expected_mapping_file_byte_sha256=expected_mapping_byte_sha,
            spacer_canonical_file_byte_sha256=spacer_canonical_byte_sha,
            apollo_canonical_file_byte_sha256=apollo_canonical_byte_sha,
            expected_spacer_raw_file_byte_sha256=spacer_raw_byte_sha,
            expected_apollo_raw_file_byte_sha256=apollo_raw_byte_sha,
        )
        if args.output is not None:
            if args.output.exists():
                print(f"output exists: {args.output}", file=sys.stderr)
                return 1
            write_json_exclusive(args.output, report)
        print(json.dumps(report, indent=2, sort_keys=True))
        return 0 if report.get("overall_verdict") == "PASS" else 1
    except (ParityComparisonError, ParityValidationError, ExclusiveWriteError, PathSafetyError) as exc:
        report = {"overall_verdict": "FAIL", "error": str(exc)}
        if args.output is not None and not args.output.exists():
            write_json_exclusive(args.output, report)
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
