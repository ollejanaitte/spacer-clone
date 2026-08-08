#!/usr/bin/env python3
"""
P6-0 PR-2 validator — connector + coordinate + geometry entity freeze.

Verifies connector specs, coordinate contracts, geometry entity contracts and the
unresolved-geometry contract exist with required markers/columns, and that no
production source changed.

Usage: python validate_p6_0_pr2.py --root <repo root>
"""

import argparse
import csv
import os
import subprocess

RB = "docs/apollo/step10/reference_bridge_001/phase6/phase6_0"

REQUIRED_FILES = [
    "connectors/alignment_connector_spec.md",
    "connectors/geometry_input_adapter_spec.md",
    "connectors/structural_model_connector_spec.md",
    "connectors/3d_connector_spec.md",
    "connectors/drawing_connector_spec.md",
    "connectors/substructure_connector_spec.md",
    "connectors/export_connector_spec.md",
    "coordinates/global_coordinate_contract.md",
    "coordinates/local_bridge_coordinate_contract.md",
    "coordinates/member_local_axis_contract.md",
    "coordinates/station_offset_elevation_contract.md",
    "coordinates/skew_crossfall_contract.md",
    "coordinates/unit_tolerance_precision_contract.md",
    "coordinates/coordinate_conversion_matrix.csv",
    "geometry/geometry_entity_contract.md",
    "geometry/geometry_entity_catalog.csv",
    "geometry/geometry_relationship_contract.md",
    "geometry/unresolved_geometry_contract.md",
    "completion/p6_0_pr2_completion_report.md",
]

REQUIRED_COLUMNS = {
    "coordinate_conversion_matrix.csv": ["conversion_id", "from", "to", "formula",
                                         "owner", "allowed_consumers", "declared", "notes"],
    "geometry_entity_catalog.csv": ["entity_type", "entity_id_rule", "parent", "source",
                                    "has_global_coords", "has_local_frame", "has_station",
                                    "resolution_state_carried", "traceability", "notes"],
}

REQUIRED_MARKERS = {
    "connectors/alignment_connector_spec.md": ["LINER", "adapter", "station", "offset",
                                               "azimuth", "crossfall", "must not"],
    "connectors/geometry_input_adapter_spec.md": ["Common Bridge Data Model", "CONFIRMED",
                                                  "HUMAN_CONFIRMATION_REQUIRED", "CONFLICT",
                                                  "HOLD_INSUFFICIENT_SOURCE", "NOT_AVAILABLE",
                                                  "no geometry calculation"],
    "connectors/structural_model_connector_spec.md": ["GeometrySnapshot", "node", "member",
                                                      "local axis", "station->XYZ"],
    "connectors/3d_connector_spec.md": ["GeometrySnapshot", "Three.js", "render", "picking"],
    "connectors/drawing_connector_spec.md": ["GeometrySnapshot", "dimension", "recompute"],
    "connectors/substructure_connector_spec.md": ["supportId", "skew", "elevation",
                                                  "transverse axis"],
    "connectors/export_connector_spec.md": ["STL", "DXF", "IFC", "unit conversion"],
    "coordinates/global_coordinate_contract.md": ["X", "Y", "Z", "right-handed", "up"],
    "coordinates/local_bridge_coordinate_contract.md": ["longitudinal", "transverse", "vertical",
                                                        "datum"],
    "coordinates/member_local_axis_contract.md": ["local x", "local y", "local z", "frame"],
    "coordinates/station_offset_elevation_contract.md": ["station", "offset", "elevation",
                                                         "right-positive"],
    "coordinates/skew_crossfall_contract.md": ["skew", "rad", "crossfall", "right-down-positive"],
    "coordinates/unit_tolerance_precision_contract.md": ["m", "rad", "tolerance", "precision"],
    "geometry/geometry_entity_contract.md": ["stable ID", "resolution state", "traceability"],
    "geometry/geometry_relationship_contract.md": ["parent", "hierarchy"],
    "geometry/unresolved_geometry_contract.md": ["HCR-001", "CONF-P2II-001",
                                                 "HOLD_INSUFFICIENT_SOURCE", "dummy"],
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

    r = subprocess.run(["git", "diff", "--name-only", "origin/main...HEAD"], cwd=root,
                       capture_output=True, text=True)
    changed = r.stdout.splitlines()
    checks += 1
    prod = [c for c in changed if c.startswith(("frontend/src/", "backend/", "schemas/"))]
    if prod:
        fails.append(f"production files changed in P6-0 PR-2: {prod}")
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
