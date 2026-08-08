#!/usr/bin/env python3
"""
P6-0 PR-3A mapping validator — Reference Bridge 001 geometry mapping CSV.

Validates that docs/.../phase6_0/mapping/reference_bridge_001_geometry_mapping.csv
is canonical and internally consistent:

  - required header columns present (exact order not enforced)
  - stable unique mapping_id
  - required fields non-empty on every row
  - resolution_state / readiness enums correct
  - geometry_entity_type in the frozen entity catalog
  - golden_reference IDs resolve against the Phase 3 input golden and the
    Phase 4 model / design / report-drawing goldens (ranges expanded)
  - informal shorthand tokens (e.g. "G-GEO-00xx", "G-DES-0003/0005/0011",
    "G-DES bearings") are allowed and counted separately, never invented
  - expected HOLD ranges (intermediate panel points) are NOT required to resolve

Usage: python validate_p6_0_pr3a_mapping.py --root <repo root>
Exit 0 on PASS, 1 on FAIL.
"""

import argparse
import csv
import os
import re

RB = "docs/apollo/step10/reference_bridge_001"
MAPPING_REL = os.path.join(RB, "phase6", "phase6_0", "mapping",
                           "reference_bridge_001_geometry_mapping.csv")

REQUIRED_COLUMNS = [
    "mapping_id", "common_model_entity", "common_model_id", "geometry_input_entity",
    "geometry_entity_type", "geometry_entity_id_rule", "golden_reference",
    "source_reference", "resolution_state", "readiness", "notes",
]

RESOLUTION_STATES = {
    "CONFIRMED", "HUMAN_CONFIRMATION_REQUIRED", "CONFLICT",
    "HOLD_INSUFFICIENT_SOURCE", "NOT_AVAILABLE",
}

READINESS = {
    "READY", "HOLD", "CONFLICT", "READY_WITH_HUMAN_TRACK", "NOT_APPLICABLE",
}

ENTITY_TYPES = {
    "AlignmentReference",
    "SupportLine+SupportPoint",
    "GirderLine+GirderStationPoint",
    "GridPoint",
    "DeckReferenceLine+DeckBoundary",
    "CrossSectionFrame input",
    "GridPoint/StructuralModel node",
    "StructuralModel node",
    "MemberPlacementReference",
    "CrossGirderReference",
    "BearingReferencePoint",
    "drawing reference",
    "N/A",
    "material reference",
}

# HOLD ranges that intentionally do not resolve to individual golden records.
EXPECTED_HOLD_ABSENT = {"GRID-1002..1026", "GRID-2002..1026"}

GOLDEN_FILES = [
    os.path.join(RB, "phase3", "golden", "reference_bridge_001_input_golden.csv"),
    os.path.join(RB, "phase4", "golden", "reference_bridge_001_model_golden.csv"),
    os.path.join(RB, "phase4", "golden", "reference_bridge_001_design_golden.csv"),
    os.path.join(RB, "phase4", "golden", "reference_bridge_001_report_drawing_golden.csv"),
]


def load_golden_ids(root):
    ids = set()
    for rel in GOLDEN_FILES:
        p = os.path.join(root, rel)
        if not os.path.exists(p):
            continue
        with open(p, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                gid = (row.get("golden_id") or "").strip()
                if gid:
                    ids.add(gid)
    return ids


def expand_references(text, ids):
    """Expand 'P-0001..0004' ranges and validate each concrete ID.

    Returns (resolvable, missing, informal).
    """
    resolvable = []
    missing = []
    informal = []
    for token in re.split(r"[;]", text):
        token = token.strip()
        if not token:
            continue
        m = re.match(r"^([A-Za-z0-9-]+?)-(\d+)\.\.(\d+)$", token)
        if m:
            prefix, n1, n2 = m.group(1), int(m.group(2)), int(m.group(3))
            for n in range(n1, n2 + 1):
                gid = f"{prefix}-{n:04d}"
                if gid in ids:
                    resolvable.append(gid)
                else:
                    missing.append(gid)
            continue
        if "/" in token or "xx" in token or "(" in token or re.search(r"[a-z ]", token):
            informal.append(token)
            continue
        if token in ids:
            resolvable.append(token)
        else:
            missing.append(token)
    return resolvable, missing, informal


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.getcwd())
    args = ap.parse_args()
    root = args.root

    path = os.path.join(root, MAPPING_REL)
    fails = []
    checks = 0

    if not os.path.exists(path):
        print(f"OVERALL: FAIL (mapping CSV missing: {path})")
        return 1
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        print("OVERALL: FAIL (mapping CSV empty)")
        return 1

    headers = list(rows[0].keys())
    for col in REQUIRED_COLUMNS:
        checks += 1
        if col not in headers:
            fails.append(f"missing header column: {col}")

    ids = load_golden_ids(root)
    if not ids:
        fails.append("no golden IDs loaded (Phase 3/4 golden CSVs not found)")
        checks += 1

    seen = {}
    total_informal = 0
    for row in rows:
        mid = (row.get("mapping_id") or "").strip()
        checks += 1
        if not mid:
            fails.append("row with empty mapping_id")
            continue
        if mid in seen:
            fails.append(f"duplicate mapping_id: {mid}")
        seen[mid] = True

        for col in ("common_model_id", "geometry_input_entity", "resolution_state",
                    "readiness"):
            checks += 1
            if not (row.get(col) or "").strip():
                fails.append(f"{mid} empty required field: {col}")

        rs = (row.get("resolution_state") or "").strip()
        checks += 1
        if rs and rs not in RESOLUTION_STATES:
            fails.append(f"{mid} invalid resolution_state: {rs}")

        rd = (row.get("readiness") or "").strip()
        checks += 1
        if rd and rd not in READINESS:
            fails.append(f"{mid} invalid readiness: {rd}")

        et = (row.get("geometry_entity_type") or "").strip()
        checks += 1
        if et and et not in ENTITY_TYPES:
            fails.append(f"{mid} unknown geometry_entity_type: {et}")

        g = (row.get("golden_reference") or "").strip()
        checks += 1
        if not g:
            fails.append(f"{mid} empty golden_reference")
            continue
        if g in ("none", "none (Phase 2 not extracted)"):
            continue
        resolvable, missing, informal = expand_references(g, ids)
        total_informal += len(informal)
        for m in missing:
            if m in EXPECTED_HOLD_ABSENT:
                continue
            fails.append(f"{mid} golden reference not found: {m}")

    print(f"OVERALL: {'PASS' if not fails else 'FAIL'} ({checks} checks)")
    print(f"GOLDEN_REFERENCE_RESOLVED: {len(ids) and 'OK' or 'NO_GOLDEN'}")
    print(f"INFORMAL_REFERENCE_TOKENS: {total_informal} (allowed shorthand)")
    for f in fails:
        print(f"  FAIL: {f}")
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
