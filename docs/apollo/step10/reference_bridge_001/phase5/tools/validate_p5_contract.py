#!/usr/bin/env python3
"""
P5-1 contract validator for STEP 10 Reference Bridge 001 Phase 5.

Verifies the Common Bridge Data Model contract freeze deliverables:
  - required contract documents exist with required sections
  - required ID types, value states, units, coordinate, versioning, serialization
  - Phase 3 and Phase 4 mapping registers have full coverage
  - carry-forward items are represented
  - production runtime unchanged (on the P5-1 branch)
  - source originals not committed

Usage: python validate_p5_contract.py [--root <repo root>]
Exit 0 on PASS, 1 on FAIL.
"""

import argparse
import csv
import os
import re
import subprocess
import sys

RB = "docs/apollo/step10/reference_bridge_001"
P5 = os.path.join(RB, "phase5")

REQUIRED_DOCS = {
    "contracts/common_bridge_model_contract.md": [
        "metadata", "alignment", "bridgeGeometry", "structuralModel", "materials",
        "sections", "loads", "analysisReference", "design", "reportSpecification",
        "drawingSpecification", "traceability", "Value state contract",
    ],
    "contracts/entity_id_contract.md": [
        "bridgeId", "alignmentId", "supportId", "girderId", "gridPointId",
        "nodeId", "memberId", "materialId", "sectionId", "loadCaseId",
        "loadCombinationId", "analysisResultId", "designCheckId", "reportItemId",
        "drawingSheetId", "drawingItemId", "sourceRecordId", "traceabilityId",
    ],
    "contracts/value_state_contract.md": [
        "CONFIRMED", "HUMAN_CONFIRMATION_REQUIRED", "CONFLICT",
        "HOLD_INSUFFICIENT_SOURCE", "NOT_APPLICABLE", "NOT_AVAILABLE",
    ],
    "contracts/unit_precision_contract.md": ["m", "kN", "rad"],
    "contracts/coordinate_axis_contract.md": ["right-handed", "x", "y", "z", "station", "offset"],
    "contracts/versioning_migration_contract.md": ["schemaVersion", "1.0.0", "migration"],
    "contracts/serialization_contract.md": ["JSON", "round-trip", "canonical", "semantic parity"],
    "contracts/reference_bridge_mapping_contract.md": ["HCR-001", "CONF-P2II-001", "HOLD"],
}

REQUIRED_LAYERS = [
    "metadata", "alignment", "bridgeGeometry", "structuralModel", "materials",
    "sections", "loads", "analysisReference", "design", "reportSpecification",
    "drawingSpecification", "traceability",
]

MAPPING_FILES = {
    "phase3": "mapping/phase3_input_to_common_model.csv",
    "phase4": "mapping/phase4_golden_to_common_model.csv",
}

UNMAPPED_STATUSES = {"ERROR_UNMAPPED"}


def read_text(root, rel):
    with open(os.path.join(root, rel), encoding="utf-8") as f:
        return f.read()


def check_docs(root):
    fails = []
    checks = 0
    for rel, markers in REQUIRED_DOCS.items():
        path = os.path.join(root, P5, rel)
        if not os.path.exists(path):
            fails.append(f"missing contract document: {rel}")
            continue
        text = read_text(root, os.path.join(P5, rel))
        for m in markers:
            checks += 1
            if m not in text:
                fails.append(f"contract {rel} missing marker: {m}")
        checks += 1
    # layers doc-level: the 12 logical layers must be present in the contract doc
    text = read_text(root, os.path.join(P5, "contracts/common_bridge_model_contract.md"))
    for layer in REQUIRED_LAYERS:
        checks += 1
        if layer not in text:
            fails.append(f"common model contract missing layer: {layer}")
    return checks, fails


def check_mapping(root):
    checks = 0
    fails = []
    for kind, rel in MAPPING_FILES.items():
        path = os.path.join(root, P5, rel)
        if not os.path.exists(path):
            fails.append(f"missing mapping register: {rel}")
            continue
        with open(path, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        if not rows:
            fails.append(f"mapping register empty: {rel}")
            continue
        statuses = {}
        for r in rows:
            statuses[r["mapping_status"]] = statuses.get(r["mapping_status"], 0) + 1
            checks += 1
            for col in ("common_layer", "target_id", "resolution_state", "mapping_status"):
                if not r.get(col):
                    fails.append(f"{rel} row {r.get('golden_id')} missing {col}")
        unmapped = statuses.get("ERROR_UNMAPPED", 0)
        if unmapped:
            fails.append(f"{rel} has {unmapped} ERROR_UNMAPPED")
        checks += 1
        print(f"[mapping:{kind}] {len(rows)} records, statuses={statuses}")
    return checks, fails


def check_carry_forward(root):
    text = read_text(root, os.path.join(P5, "contracts/value_state_contract.md"))
    map3 = read_text(root, os.path.join(P5, "mapping/phase3_input_to_common_model.csv"))
    map4 = read_text(root, os.path.join(P5, "mapping/phase4_golden_to_common_model.csv"))
    checks, fails = 0, []
    for token in ["HCR-001", "CONF-P2II-001", "1002", "2026"]:
        checks += 1
        if token not in text:
            fails.append(f"carry-forward {token} missing from value_state_contract.md")
    checks += 1
    if "HCR-001" not in map3:
        fails.append("phase3 mapping missing HCR-001 records")
    checks += 1
    if "CONF-P2II-001" not in map4:
        fails.append("phase4 mapping missing CONF-P2II-001 records")
    checks += 1
    if "HCR-001" not in map4:
        fails.append("phase4 mapping missing HCR-001 records")
    return checks, fails


def check_git_state(root):
    """On the P5-1 branch, production runtime must be unchanged and no source originals committed."""
    checks, fails = 0, []
    r = subprocess.run(["git", "diff", "--name-only", "origin/main...HEAD"],
                       cwd=root, capture_output=True, text=True)
    changed = [l for l in r.stdout.splitlines() if l]
    checks += 1
    prod_paths = ("frontend/src/", "backend/", "schemas/")
    prod = [c for c in changed if c.startswith(prod_paths)]
    if prod:
        fails.append(f"production files changed in P5-1: {prod}")
        print(f"[git] production files changed in P5-1: {prod}")
    else:
        print("[git] production runtime unchanged (PASS)")
    checks += 1
    binaries = [c for c in changed if c.lower().endswith((".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".dxf", ".stl"))]
    if binaries:
        fails.append(f"source originals committed: {binaries}")
        print(f"[git] source originals committed: {binaries}")
    else:
        print("[git] no source originals committed (PASS)")
    return checks, fails


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.getcwd())
    args = ap.parse_args()
    root = args.root
    total_checks, total_fails = 0, []
    c, f = check_docs(root)
    total_checks += c
    total_fails.extend(f)
    c, f = check_mapping(root)
    total_checks += c
    total_fails.extend(f)
    c, f = check_carry_forward(root)
    total_checks += c
    total_fails.extend(f)
    c, f = check_git_state(root)
    total_checks += c
    total_fails.extend(f)
    print(f"\nOVERALL: {'PASS' if not total_fails else 'FAIL'} ({total_checks} checks)")
    for x in total_fails:
        print(f"  FAIL: {x}")
    return 0 if not total_fails else 1


if __name__ == "__main__":
    raise SystemExit(main())