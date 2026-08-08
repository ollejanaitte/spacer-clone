#!/usr/bin/env python3
"""
P6-0-A validator — existing geometry architecture audit deliverables.

Verifies the audit registers + report exist with required columns/markers and
that no production source changed in this PR.

Usage: python validate_p6_0_a.py --root <repo root>
"""

import argparse
import csv
import os
import subprocess
import sys

RB = "docs/apollo/step10/reference_bridge_001/phase6/phase6_0"

REQUIRED_FILES = [
    "audit/duplicate_geometry_logic_register.csv",
    "audit/existing_connector_inventory.csv",
    "audit/responsibility_conflict_register.csv",
    "audit/01_existing_geometry_architecture_audit.md",
    "completion/p6_0_a_completion_report.md",
]

REQUIRED_COLUMNS = {
    "duplicate_geometry_logic_register.csv": [
        "audit_id", "subsystem", "file_path", "function_or_type", "responsibility",
        "geometry_operation", "current_source_of_truth", "duplicate_with", "risk",
        "proposed_owner", "proposed_action", "notes"],
    "existing_connector_inventory.csv": [
        "connector_id", "from_system", "to_system", "current_file", "input_type",
        "output_type", "coordinate_transform", "ownership", "duplication", "status",
        "proposed_future_role"],
    "responsibility_conflict_register.csv": [
        "conflict_id", "description", "subsystem_a", "subsystem_b", "current_behavior",
        "evidence", "resolution_plan", "phase"],
}

REQUIRED_MARKERS = {
    "01_existing_geometry_architecture_audit.md": [
        "current architecture", "duplicate geometry", "coordinate", "hidden",
        "conflicting ownership", "reusable", "obsolete", "risk", "required design changes",
        "existing_architecture_audit"],
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.getcwd())
    args = ap.parse_args()
    root = args.root
    base = os.path.join(root, RB)
    fails, checks = [], 0

    for rel in REQUIRED_FILES:
        checks += 1
        p = os.path.join(base, rel)
        if not os.path.exists(p):
            fails.append(f"missing: {rel}")
            continue
        if rel.endswith(".csv"):
            with open(p, newline="", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
            headers = list(rows[0].keys()) if rows else []
            for col in REQUIRED_COLUMNS.get(os.path.basename(rel), []):
                checks += 1
                if col not in headers:
                    fails.append(f"{rel} missing column: {col}")
            if not rows:
                fails.append(f"{rel} empty")
        else:
            text = open(p, encoding="utf-8").read().lower()
            for m in REQUIRED_MARKERS.get(os.path.basename(rel), []):
                checks += 1
                if m not in text:
                    fails.append(f"{rel} missing marker: {m}")

    # git: no production change
    r = subprocess.run(["git", "diff", "--name-only", "origin/main...HEAD"], cwd=root,
                       capture_output=True, text=True)
    changed = r.stdout.splitlines()
    checks += 1
    prod = [c for c in changed if c.startswith(("frontend/src/", "backend/", "schemas/"))]
    if prod:
        fails.append(f"production files changed in P6-0-A: {prod}")
    checks += 1
    binaries = [c for c in changed if c.lower().endswith((".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".dxf", ".stl"))]
    if binaries:
        fails.append(f"source originals committed: {binaries}")

    print(f"OVERALL: {'PASS' if not fails else 'FAIL'} ({checks} checks)")
    for f in fails:
        print(f"  FAIL: {f}")
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
