#!/usr/bin/env python3
"""
Build Phase 5 mapping registers from STEP 10 Phase 3 + Phase 4 Golden CSVs.

Uses the authoritative mapping rules in cbdm_mapping.py (shared with the P5-3
Golden adapter build_common_model_fixture.py) so the registers agree with the
Common Bridge Data Model fixture by construction.

Outputs:
  phase5/mapping/phase3_input_to_common_model.csv
  phase5/mapping/phase4_golden_to_common_model.csv

Usage: python build_mapping_registers.py --root <repo root>
"""

import argparse
import csv
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cbdm_mapping as M  # noqa: E402

RB = "docs/apollo/step10/reference_bridge_001"

FIELDS = ["golden_id", "domain", "field_path", "entity_id", "promotion_status",
          "human_confirmation_id", "conflict_id", "common_layer", "common_section",
          "target_id", "drawing_sheet_id", "resolution_state", "mapping_status",
          "mapping_reason"]

def resolve(rec, index):
    layer, section, eid = M.resolve_target(rec, index)
    st, mstat, reason = ("CONFIRMED", "MAPPED", "promotion " + rec.get("promotion_status", ""))
    if rec.get("conflict_id", "").strip():
        st, mstat, reason = ("CONFLICT", "MAPPED_CONFLICT",
                             "conflict " + rec["conflict_id"].strip() + " preserved")
    elif rec.get("human_confirmation_id", "").strip():
        st, mstat, reason = ("HUMAN_CONFIRMATION_REQUIRED", "MAPPED_WITH_HUMAN_TRACK",
                             "human confirmation " + rec["human_confirmation_id"].strip() + " preserved")
    return {
        "golden_id": rec.get("golden_id", ""),
        "domain": rec.get("domain", ""),
        "field_path": rec.get("field_path", ""),
        "entity_id": rec.get("entity_id", ""),
        "promotion_status": rec.get("promotion_status", ""),
        "human_confirmation_id": rec.get("human_confirmation_id", ""),
        "conflict_id": rec.get("conflict_id", ""),
        "common_layer": layer,
        "common_section": section,
        "target_id": eid,
        "drawing_sheet_id": "",
        "resolution_state": st,
        "mapping_status": mstat,
        "mapping_reason": reason,
    }


def write(path, rows, kind):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    stats = Counter(r["mapping_status"] for r in rows)
    print(f"[{kind}] wrote {path}: {len(rows)} rows  statuses={dict(stats)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.getcwd())
    args = ap.parse_args()
    root = args.root
    base = os.path.join(root, RB)
    p3_path = os.path.join(base, "phase3", "golden", "reference_bridge_001_input_golden.csv")
    with open(p3_path, newline="", encoding="utf-8") as f:
        p3 = list(csv.DictReader(f))
    p3_rows = [resolve(r, i) for i, r in enumerate(p3, start=1)]
    write(os.path.join(root, RB, "phase5", "mapping", "phase3_input_to_common_model.csv"),
          p3_rows, "phase3")
    p4 = []
    for sub in ["reference_bridge_001_model_golden.csv",
                "reference_bridge_001_design_golden.csv",
                "reference_bridge_001_report_drawing_golden.csv"]:
        with open(os.path.join(base, "phase4", "golden", sub), newline="", encoding="utf-8") as f:
            p4.extend(csv.DictReader(f))
    p4_rows = [resolve(r, i) for i, r in enumerate(p4, start=1)]
    write(os.path.join(root, RB, "phase5", "mapping", "phase4_golden_to_common_model.csv"),
          p4_rows, "phase4")


if __name__ == "__main__":
    main()
