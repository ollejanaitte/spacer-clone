#!/usr/bin/env python3
"""Compare reported counts against actual artifact counts (P2II-J).

Reads the `final_report.txt` "Phase 2-II CURRENT" block and compares each
reported CSV count against the actual data-row count of the file on disk.
Covers candidate CSVs, source catalogs, registers and traceability.

Prints PASS/FAIL per item and exits 0 when all reported counts match.

Authority: STEP 10 Reference Bridge 001 (RB-S10-001) - Phase 2-II closeout.
Python 3.10, standard library only.

Usage:
    python3 compare_reported_counts.py [--root <phase2_ii_dir>]
"""

from __future__ import annotations

import argparse
import os
import sys

P2II = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read_current_counts(path):
    counts = {}
    in_current = False
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line.startswith("== PHASE 2-II CURRENT =="):
                in_current = True
                continue
            if in_current and line.startswith("=="):
                break
            if in_current and "," in line:
                key, _, val = line.partition(",")
                key = key.strip()
                val = val.strip()
                if key.endswith(".csv") and val.isdigit():
                    counts[key] = int(val)
    return counts


def actual_row_count(path):
    if not path.endswith(".csv"):
        return None
    with open(path, encoding="utf-8", newline="") as fh:
        return sum(1 for _ in fh) - 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--root", default=None)
    args = ap.parse_args()

    root = os.path.abspath(args.root) if args.root else P2II
    final_report = os.path.join(root, "final_report.txt")
    if not os.path.exists(final_report):
        print(f"[ERROR] final_report.txt not found: {final_report}", file=sys.stderr)
        return 1

    counts = read_current_counts(final_report)
    if not counts:
        print("[ERROR] no counts found under == PHASE 2-II CURRENT ==", file=sys.stderr)
        return 1

    print(f"Comparing reported counts against artifacts under {root}")
    print("=" * 68)
    all_pass = True
    for key in sorted(counts):
        reported = counts[key]
        full = os.path.join(root, key)
        if not os.path.exists(full):
            print(f"  [FAIL] {key}: file missing")
            all_pass = False
            continue
        actual = actual_row_count(full)
        if actual is None:
            print(f"  [SKIP] {key}: not a CSV")
            continue
        status = "PASS" if actual == reported else "FAIL"
        if status == "FAIL":
            all_pass = False
        print(f"  [{status}] {key}: reported={reported} actual={actual}")

    print("=" * 68)
    if all_pass:
        print("OVERALL: PASS")
        return 0
    print("OVERALL: FAIL - one or more reported counts do not match artifacts")
    return 1


if __name__ == "__main__":
    sys.exit(main())
