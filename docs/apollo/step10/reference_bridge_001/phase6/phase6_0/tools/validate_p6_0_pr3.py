#!/usr/bin/env python3
"""
P6-0 PR-3 master validator — Phase 6-0 overall validation.

Runs the individual P6-0 validators (A, PR-1, PR-2, PR-3A mapping) and enforces
the Phase 6-0 completion gates defined in the Phase 6 README:

  - PHASE6_0_MASTER_VALIDATION (aggregate of all P6-0 validators)
  - DUPLICATE_GEOMETRY_RESPONSIBILITY_UNRESOLVED == 0
  - HIDDEN_COORDINATE_TRANSFORM_UNRESOLVED == 0
  - REFERENCE_BRIDGE_GEOMETRY_MAPPING == PASS
  - PHASE6_0_PR_CHAIN == PASS (no production source changed, no source originals)
  - PHASE6_0_FINAL_REPORT (checked by the PR-3 closeout validator when present)

The closeout validator (validate_p6_0_pr3_closeout.py) is introduced in PR-3C and
wired in automatically when present; until then the core verdict is reported.

Usage: python validate_p6_0_pr3.py --root <repo root>
Exit 0 on PASS, 1 on FAIL.
"""

import argparse
import csv
import os
import subprocess
import sys

RB = "docs/apollo/step10/reference_bridge_001/phase6/phase6_0"

VALIDATORS = [
    ("P6-0-A audit", "validate_p6_0_a.py"),
    ("P6-0 PR-1 architecture freeze", "validate_p6_0_pr1.py"),
    ("P6-0 PR-2 connector/coordinate/entity freeze", "validate_p6_0_pr2.py"),
    ("P6-0 PR-3A geometry mapping", "validate_p6_0_pr3a_mapping.py"),
]

CLOSEOUT_VALIDATOR = "validate_p6_0_pr3_closeout.py"

CORE_FILES = [
    "architecture/apollo_geometry_engine_architecture.md",
    "architecture/dependency_rules.md",
    "architecture/geometry_generation_sequence.md",
    "architecture/system_ownership_matrix.csv",
    "audit/01_existing_geometry_architecture_audit.md",
    "audit/duplicate_geometry_logic_register.csv",
    "audit/existing_connector_inventory.csv",
    "audit/responsibility_conflict_register.csv",
    "connectors/alignment_connector_spec.md",
    "connectors/geometry_input_adapter_spec.md",
    "connectors/structural_model_connector_spec.md",
    "connectors/3d_connector_spec.md",
    "connectors/drawing_connector_spec.md",
    "connectors/substructure_connector_spec.md",
    "connectors/export_connector_spec.md",
    "coordinates/coordinate_conversion_matrix.csv",
    "coordinates/global_coordinate_contract.md",
    "coordinates/local_bridge_coordinate_contract.md",
    "coordinates/member_local_axis_contract.md",
    "coordinates/skew_crossfall_contract.md",
    "coordinates/station_offset_elevation_contract.md",
    "coordinates/unit_tolerance_precision_contract.md",
    "geometry/geometry_entity_catalog.csv",
    "geometry/geometry_entity_contract.md",
    "geometry/geometry_relationship_contract.md",
    "geometry/unresolved_geometry_contract.md",
    "mapping/reference_bridge_001_geometry_mapping.csv",
    "mapping/README.md",
    "completion/p6_0_a_completion_report.md",
    "completion/p6_0_pr1_completion_report.md",
    "completion/p6_0_pr2_completion_report.md",
]


def run_validator(root, script):
    path = os.path.join(root, RB, "tools", script)
    r = subprocess.run([sys.executable, path, "--root", root],
                       capture_output=True, text=True)
    out = (r.stdout or "").strip().splitlines()
    first = out[0] if out else ""
    ok = first.startswith("OVERALL: PASS")
    return ok, first, (r.stderr or "").strip()


def load_register(root, rel):
    p = os.path.join(root, RB, rel)
    with open(p, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.getcwd())
    args = ap.parse_args()
    root = args.root
    base = os.path.join(root, RB)

    fails = []
    checks = 0
    rows = []

    # Core artifact existence
    for rel in CORE_FILES:
        checks += 1
        if not os.path.exists(os.path.join(base, rel)):
            fails.append(f"missing core artifact: {rel}")

    # Sub-validators
    for label, script in VALIDATORS:
        checks += 1
        ok, first, err = run_validator(root, script)
        rows.append((label, "PASS" if ok else "FAIL", first))
        if not ok:
            fails.append(f"{label}: {first}")
            if err:
                fails.append(f"{label} stderr: {err}")

    # Gate counters from frozen registers
    dup = load_register(root, "audit/duplicate_geometry_logic_register.csv")
    checks += 1
    unresolved_dup = [r["audit_id"] for r in dup if not (r.get("proposed_owner") or "").strip()]
    if unresolved_dup:
        fails.append(f"DUPLICATE_GEOMETRY_RESPONSIBILITY_UNRESOLVED != 0: {unresolved_dup}")

    rc = load_register(root, "audit/responsibility_conflict_register.csv")
    checks += 1
    unresolved_rc = [r["conflict_id"] for r in rc if not (r.get("proposed_authority") or "").strip()]
    if unresolved_rc:
        fails.append(f"HIDDEN_COORDINATE_TRANSFORM_UNRESOLVED != 0: {unresolved_rc}")

    # PR chain: no production source / no source originals
    r = subprocess.run(["git", "diff", "--name-only", "origin/main...HEAD"], cwd=root,
                       capture_output=True, text=True)
    changed = r.stdout.splitlines()
    checks += 1
    prod = [c for c in changed if c.startswith(("frontend/src/", "backend/", "schemas/"))]
    if prod:
        fails.append(f"production files changed in Phase 6-0: {prod}")
    checks += 1
    binaries = [c for c in changed if c.lower().endswith(
        (".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".dxf", ".stl"))]
    if binaries:
        fails.append(f"source originals committed: {binaries}")

    # Closeout validator (introduced in PR-3C) when present
    closeout_script = os.path.join(base, "tools", CLOSEOUT_VALIDATOR)
    closeout_ok = True
    if os.path.exists(closeout_script):
        checks += 1
        ok, first, err = run_validator(root, CLOSEOUT_VALIDATOR)
        rows.append(("P6-0 PR-3C closeout / final report", "PASS" if ok else "FAIL", first))
        closeout_ok = ok
        if not ok:
            fails.append(f"closeout: {first}")
            if err:
                fails.append(f"closeout stderr: {err}")

    overall = "PASS" if not fails else "FAIL"
    print(f"OVERALL: {overall} ({checks} checks)")
    for label, ok, first in rows:
        print(f"  {label}: {ok} {first}")
    print(f"DUPLICATE_GEOMETRY_RESPONSIBILITY_UNRESOLVED: {len(unresolved_dup)}")
    print(f"HIDDEN_COORDINATE_TRANSFORM_UNRESOLVED: {len(unresolved_rc)}")
    for f in fails:
        print(f"  FAIL: {f}")

    summary = os.path.join(base, "validation", "phase6_0_master_validation_summary.md")
    os.makedirs(os.path.dirname(summary), exist_ok=True)
    with open(summary, "w", encoding="utf-8") as fh:
        fh.write("# Phase 6-0 Master Validation Summary\n\n")
        fh.write(f"## Overall\n\n**PHASE6_0_MASTER_VALIDATION: {overall}** ({checks} checks)\n\n")
        fh.write("## Validators\n\n| Layer | Status | Detail |\n|-------|--------|--------|\n")
        for label, ok, first in rows:
            fh.write(f"| {label} | {ok} | `{first}` |\n")
        fh.write("\n## Gates\n\n")
        fh.write(f"- `DUPLICATE_GEOMETRY_RESPONSIBILITY_UNRESOLVED`: {len(unresolved_dup)}\n")
        fh.write(f"- `HIDDEN_COORDINATE_TRANSFORM_UNRESOLVED`: {len(unresolved_rc)}\n")
        fh.write(f"- `PHASE6_0_PR_CHAIN`: {'PASS' if not (prod or binaries) else 'FAIL'}\n")
        fh.write("\nGenerated by `tools/validate_p6_0_pr3.py`.\n")
    print(f"master summary written: {os.path.relpath(summary, root)}")

    return 0 if overall == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
