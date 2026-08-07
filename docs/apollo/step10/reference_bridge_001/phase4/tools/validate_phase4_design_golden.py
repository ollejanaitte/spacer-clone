#!/usr/bin/env python3
"""
Validate the Phase 4 Design Golden for Reference Bridge 001 (RB-S10-001).

Mirrors the Phase 4 validator applied to the design + adopted_design golden.

Usage: python validate_phase4_design_golden.py [--phase4-dir PATH]
"""

import argparse
import csv
import json
import os

PHASE4_BASE = "docs/apollo/step10/reference_bridge_001/phase4"

ALLOWED_PROMOTION = {"APPROVED_DESIGN_GOLDEN", "APPROVED_WITH_HUMAN_CONFIRMATION_TRACK"}
DOMAINS = {"design", "adopted_design"}


def read_csv(p):
    if not os.path.exists(p):
        return []
    with open(p, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase4-dir", default=os.path.join(os.getcwd(), PHASE4_BASE))
    args = parser.parse_args()
    d = args.phase4_dir

    csv_path = os.path.join(d, "golden", "reference_bridge_001_design_golden.csv")
    json_path = os.path.join(d, "golden", "reference_bridge_001_design_golden.json")
    rows = read_csv(csv_path)
    jrows = json.load(open(json_path, encoding="utf-8"))

    results = []
    def chk(cid, desc, cond, detail=""):
        results.append((cid, desc, "PASS" if cond else "FAIL", detail))
        return cond

    ids = [r["golden_id"] for r in rows]
    chk("CHK-001", "Golden ID uniqueness", len(ids) == len(set(ids)))
    chk("CHK-002", "Field path presence", all(r.get("field_path") for r in rows))
    chk("CHK-003", "Entity ID presence", all(r.get("entity_id") for r in rows))
    chk("CHK-004", "Source record resolution", all(r.get("source_record_ids") for r in rows))
    chk("CHK-005", "Candidate ID resolution", all(r.get("candidate_ids") for r in rows))
    chk("CHK-006", "Source locator presence", all(r.get("calculation_locator") or r.get("drawing_locator") for r in rows))
    chk("CHK-007", "Semantic class present", all(r.get("semantic_class") for r in rows))
    chk("CHK-008", "Promotion status allowed", all(r["promotion_status"] in ALLOWED_PROMOTION for r in rows))
    no_unit = {"member_id","SUPPORT_CONDITION","MEMBER_CONNECTIVITY","COORDINATE","IDENTIFIER","NOTE","SECTION_PROPERTY","MATERIAL_PROPERTY","bearing_type","LIMIT_VALUE"}
    chk("CHK-009", "Normalized value/unit consistency", all((not r.get("normalized_value")) or r.get("normalized_unit") or r.get("semantic_class") in no_unit for r in rows))
    chk("CHK-010", "Domain in allowed set", all(r.get("domain") in DOMAINS for r in rows))
    leak = [r for r in rows if r.get("semantic_class") in ("ANALYSIS_RESULT","DESIGN_RESULT","JUDGMENT_RESULT","CHECK_RATIO")]
    chk("CHK-011", "Result leakage = 0", len(leak) == 0)
    bad = [r["golden_id"] for r in rows if r["promotion_status"] == "HOLD_CONFLICT"]
    chk("CHK-012", "No HOLD/REJECTED in formal golden", len(bad) == 0)
    chk("CHK-013", "Standard profile = H29_REFERENCE", all(r.get("standard_profile") == "H29_REFERENCE" for r in rows))
    chk("CHK-014", "JSON/CSV parity", len(rows) == len(jrows) and {r["golden_id"] for r in rows} == {r["golden_id"] for r in jrows})
    dom_csv = 0
    for dom in DOMAINS:
        p = os.path.join(d, "golden", f"{dom}.csv")
        if os.path.exists(p):
            dom_csv += len(read_csv(p))
    chk("CHK-015", "Domain CSV total parity", dom_csv == len(rows))
    pdfs = []
    for root, _, files in os.walk(d):
        for fn in files:
            if fn.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
                pdfs.append(fn)
    chk("CHK-016", "No source originals tracked", len(pdfs) == 0)

    counts = {}
    for r in rows:
        counts[r["promotion_status"]] = counts.get(r["promotion_status"], 0) + 1
    gone = sum(1 for c in results if c[2] == "PASS")
    print(f"OVERALL: {'PASS' if gone == len(results) else 'FAIL'} ({gone}/{len(results)} checks)")
    print(f"Total Design Golden records: {len(rows)}")
    print(f"Promotion counts: {counts}")
    for cid, desc, status, detail in results:
        print(f"{cid} {status}  {desc}" + ("" if status == "PASS" else f"  <-- {detail}"))
    return 0 if gone == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())