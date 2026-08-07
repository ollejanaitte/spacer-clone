#!/usr/bin/env python3
"""
Build Phase 5 mapping registers from STEP 10 Phase 3 + Phase 4 Golden CSVs.

Outputs (deterministic):
  docs/apollo/step10/reference_bridge_001/phase5/mapping/phase3_input_to_common_model.csv
  docs/apollo/step10/reference_bridge_001/phase5/mapping/phase4_golden_to_common_model.csv

The target_id scheme documented here is the SAME scheme reused by the P5-3
Golden adapter (tools/build_common_model_fixture.py), so mapping registers and
fixture Common entity IDs agree by construction.

Usage: python build_mapping_registers.py --root <repo root>
"""

import argparse
import csv
import os
import re
from collections import Counter

RB = "docs/apollo/step10/reference_bridge_001"


def clean(entity_id: str) -> str:
    """Stable token from a source entity id (ENT-X -> X)."""
    t = entity_id.strip()
    if t.startswith("ENT-"):
        t = t[4:]
    t = re.sub(r"[^A-Za-z0-9_-]", "_", t)
    return t


def section_prefix_from_field_path(fp: str) -> str:
    """Map field_path first token to a stable Common section prefix."""
    tok = (fp or "").split(".")[0]
    table = {
        "alignment": "ALN",
        "span": "SPAN",
        "girder_line": "GIRDER",
        "girder": "GIRDER",
        "support": "SUP",
        "cross_section": "SECTION",
        "section": "SECTION",
        "section_property": "SECTION",
        "deck": "DECK",
        "material": "MAT",
        "load": "LOAD",
        "load_case": "LOADCASE",
        "load_combination": "LOADCOMB",
        "cross_member": "XBEAM",
        "structural": "SM",
        "structural_model": "SM",
        "node": "SM",
        "member": "SM",
        "report": "RPT",
        "drawing": "DWG",
        "metadata": "META",
        "bridge": "META",
        "analysis": "ANL",
        "design": "DES",
    }
    return table.get(tok, tok.upper()[:5])


def resolution_state(row) -> tuple:
    """Derive (resolution_state, mapping_status, reason) from a golden row."""
    prom = row.get("promotion_status", "")
    hcr = row.get("human_confirmation_id", "").strip()
    conf = row.get("conflict_id", "").strip()
    if conf:
        return ("CONFLICT", "MAPPED_CONFLICT",
                f"conflict {conf} preserved; selected value null until human resolution")
    if hcr:
        return ("HUMAN_CONFIRMATION_REQUIRED", "MAPPED_WITH_HUMAN_TRACK",
                f"human confirmation {hcr} preserved; value present, confirmation pending")
    if "HUMAN_CONFIRMATION" in prom:
        return ("HUMAN_CONFIRMATION_REQUIRED", "MAPPED_WITH_HUMAN_TRACK",
                "promoted with human confirmation track")
    if prom:
        return ("CONFIRMED", "MAPPED", f"promotion {prom}")
    return ("NOT_AVAILABLE", "MAPPED", "no promotion status")


def target_id(row, idx: int) -> str:
    domain = row.get("domain", "")
    fp = row.get("field_path", "")
    ent = row.get("entity_id", "")
    gid = row.get("golden_id", "")
    if domain == "report":
        m = re.search(r"G-RPT-(\d+)", gid)
        n = int(m.group(1)) if m else idx
        return f"RPT-{n:05d}"
    if domain == "drawing":
        m = re.search(r"G-DWG-(\d+)", gid)
        n = int(m.group(1)) if m else idx
        return f"DWG-{n:05d}"
    # geometry / structural_model / design / adopted_design / metadata
    prefix = section_prefix_from_field_path(fp)
    tok = clean(ent)
    if tok:
        return f"{prefix}-{tok}"
    m = re.search(r"G-([A-Z]+)-(\d+)", gid)
    return f"{prefix}-{m.group(2) if m else idx}"


def common_layer(row) -> str:
    domain = row.get("domain", "")
    fp = row.get("field_path", "")
    if domain == "report":
        return "reportSpecification"
    if domain == "drawing":
        return "drawingSpecification"
    if domain == "design" or domain == "adopted_design":
        return "design"
    if domain == "structural_model":
        return "structuralModel"
    tok = (fp or "").split(".")[0]
    table = {
        "alignment": "alignment",
        "span": "bridgeGeometry",
        "girder_line": "bridgeGeometry",
        "girder": "bridgeGeometry",
        "support": "bridgeGeometry",
        "cross_section": "sections",
        "section": "sections",
        "section_property": "sections",
        "deck": "bridgeGeometry",
        "material": "materials",
        "load": "loads",
        "load_case": "loads",
        "load_combination": "loads",
        "cross_member": "bridgeGeometry",
        "metadata": "metadata",
        "bridge": "metadata",
        "analysis": "analysisReference",
        "structural": "structuralModel",
    }
    return table.get(tok, "bridgeGeometry")


def common_section(row) -> str:
    domain = row.get("domain", "")
    fp = row.get("field_path", "")
    if domain == "report":
        return "report_item"
    if domain == "drawing":
        return "drawing_item"
    if domain in ("design", "adopted_design"):
        return "design_item"
    if domain == "structural_model":
        return "structural_model"
    return (fp or "").split(".")[0] or "bridgeGeometry"


def drawing_sheet_id(row) -> str:
    fp = row.get("field_path", "")
    m = re.search(r"drawing\.sheet\.(\d+)", fp)
    if m:
        return f"DWG-S{int(m.group(1)):03d}"
    return ""


def write_register(path, rows, kind):
    fields = ["golden_id", "domain", "field_path", "entity_id", "promotion_status",
              "human_confirmation_id", "conflict_id", "common_layer", "common_section",
              "target_id", "drawing_sheet_id", "resolution_state", "mapping_status",
              "mapping_reason"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for i, r in enumerate(rows, start=1):
            st, mstat, reason = resolution_state(r)
            d = {
                "golden_id": r.get("golden_id", ""),
                "domain": r.get("domain", ""),
                "field_path": r.get("field_path", ""),
                "entity_id": r.get("entity_id", ""),
                "promotion_status": r.get("promotion_status", ""),
                "human_confirmation_id": r.get("human_confirmation_id", ""),
                "conflict_id": r.get("conflict_id", ""),
                "common_layer": common_layer(r),
                "common_section": common_section(r),
                "target_id": target_id(r, i),
                "drawing_sheet_id": drawing_sheet_id(r),
                "resolution_state": st,
                "mapping_status": mstat,
                "mapping_reason": reason,
            }
            w.writerow(d)
    stats = Counter()
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            stats[r["mapping_status"]] += 1
    print(f"[{kind}] wrote {path}: {len(rows)} rows  statuses={dict(stats)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.getcwd())
    args = ap.parse_args()
    root = args.root
    base = os.path.join(root, RB)

    # Phase 3 input golden
    p3_path = os.path.join(base, "phase3", "golden", "reference_bridge_001_input_golden.csv")
    with open(p3_path, newline="", encoding="utf-8") as f:
        p3 = list(csv.DictReader(f))
    # annotate domains for phase3 (field_path based)
    for r in p3:
        r.setdefault("domain", (r.get("field_path", "").split(".")[0] or "geometry"))
    write_register(os.path.join(root, RB, "phase5", "mapping", "phase3_input_to_common_model.csv"),
                   p3, "phase3")

    # Phase 4 goldens
    p4 = []
    for sub in ["reference_bridge_001_model_golden.csv",
                "reference_bridge_001_design_golden.csv",
                "reference_bridge_001_report_drawing_golden.csv"]:
        p = os.path.join(base, "phase4", "golden", sub)
        with open(p, newline="", encoding="utf-8") as f:
            p4.extend(csv.DictReader(f))
    write_register(os.path.join(root, RB, "phase5", "mapping", "phase4_golden_to_common_model.csv"),
                   p4, "phase4")


if __name__ == "__main__":
    main()