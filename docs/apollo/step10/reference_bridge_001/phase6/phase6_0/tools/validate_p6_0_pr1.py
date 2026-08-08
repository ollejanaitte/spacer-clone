#!/usr/bin/env python3
"""
P6-0 PR-1 validator — architecture audit + Geometry Engine architecture freeze.

Verifies audit registers (new column spec) + architecture documents exist with
required columns/markers, and that no production source changed in this PR.

Usage: python validate_p6_0_pr1.py --root <repo root>
"""

import argparse
import csv
import os
import subprocess

RB = "docs/apollo/step10/reference_bridge_001/phase6/phase6_0"

REQUIRED_FILES = [
    "audit/01_existing_geometry_architecture_audit.md",
    "audit/duplicate_geometry_logic_register.csv",
    "audit/existing_connector_inventory.csv",
    "audit/responsibility_conflict_register.csv",
    "architecture/apollo_geometry_engine_architecture.md",
    "architecture/system_ownership_matrix.csv",
    "architecture/dependency_rules.md",
    "architecture/geometry_generation_sequence.md",
    "completion/p6_0_pr1_completion_report.md",
]

REQUIRED_COLUMNS = {
    "duplicate_geometry_logic_register.csv": [
        "audit_id", "subsystem", "file_path", "function_or_type", "geometry_operation",
        "current_owner", "duplicate_with", "risk", "proposed_owner", "proposed_action",
        "status", "notes"],
    "existing_connector_inventory.csv": [
        "connector_id", "from_system", "to_system", "file_path", "input_type",
        "output_type", "transform", "current_owner", "future_owner", "reuse_status"],
    "responsibility_conflict_register.csv": [
        "conflict_id", "responsibility", "system_a", "system_b", "current_behavior",
        "proposed_authority", "migration_action", "severity", "status"],
    "system_ownership_matrix.csv": [
        "concern_id", "concern", "primary_owner", "boundary_system", "rationale",
        "source_of_truth"],
}

REQUIRED_MARKERS = {'apollo_geometry_engine_architecture.md': ['liner', 'geometry input adapter', 'apollo geometry engine', 'geometrysnapshot', 'structural model connector', '3d connector', 'drawing connector', 'substructure connector', 'export connector', 'single source of alignment', 'single source of bridge geometry', 'no hidden coordinate transform', 'ui-agnostic'], 'dependency_rules.md': ['must not import', 'circular', 'geometry engine must not depend'], 'geometry_generation_sequence.md': ['project load', 'geometrysnapshot', '3d', 'structural', 'drawing', 'substructure', 'export']}


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
        fails.append(f"production files changed in P6-0 PR-1: {prod}")
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
