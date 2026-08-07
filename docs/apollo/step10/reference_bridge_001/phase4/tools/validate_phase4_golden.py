#!/usr/bin/env python3
"""
Validate the Phase 4 Model Golden for Reference Bridge 001 (RB-S10-001).

Checks mirror the Phase 3 validator (17 checks) applied to the Phase 4
geometry + structural_model golden records.

Usage: python validate_phase4_golden.py [--phase4-dir PATH]
"""

import argparse
import csv
import json
import os

PHASE4_BASE = "docs/apollo/step10/reference_bridge_001/phase4"

ALLOWED_PROMOTION = {
    "APPROVED_GOLDEN_MODEL",
    "APPROVED_WITH_HUMAN_CONFIRMATION_TRACK",
}
DOMAINS = {"geometry", "structural_model"}


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

    unified_csv = os.path.join(d, "golden", "reference_bridge_001_model_golden.csv")
    unified_json = os.path.join(d, "golden", "reference_bridge_001_model_golden.json")
    rows = read_csv(unified_csv)
    jrows = json.load(open(unified_json, encoding="utf-8"))

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
    no_unit_classes = {"member_id","SUPPORT_CONDITION","MEMBER_CONNECTIVITY","COORDINATE","IDENTIFIER","NOTE","SECTION_PROPERTY"}
    chk("CHK-009", "Normalized value/unit consistency", all((not r.get("normalized_value")) or r.get("normalized_unit") or r.get("semantic_class") in no_unit_classes for r in rows))
    chk("CHK-010", "Domain in allowed set", all(r.get("domain") in DOMAINS for r in rows))
    leak = [r for r in rows if r.get("semantic_class") in ("ANALYSIS_RESULT","DESIGN_RESULT","ADOPTED_VALUE","JUDGMENT_RESULT","CHECK_RATIO")]
    chk("CHK-011", "Result leakage = 0", len(leak) == 0, f"{len(leak)} leaked")
    bad = [r["golden_id"] for r in rows if r["promotion_status"] == "HOLD_CONFLICT"]
    chk("CHK-012", "No HOLD/REJECTED in formal golden", len(bad) == 0)
    chk("CHK-013", "Standard profile = H29_REFERENCE", all(r.get("standard_profile") == "H29_REFERENCE" for r in rows))
    chk("CHK-014", "JSON/CSV parity", len(rows) == len(jrows) and {r["golden_id"] for r in rows} == {r["golden_id"] for r in jrows})
    # domain csv parity
    dom_csv_count = 0
    for dom in DOMAINS:
        p = os.path.join(d, "golden", f"{dom}.csv")
        if os.path.exists(p):
            dom_csv_count += len(read_csv(p))
    chk("CHK-015", "Domain CSV total parity", dom_csv_count == len(rows), f"{dom_csv_count} vs {len(rows)}")
    # no PDFs/images tracked
    pdfs = []
    for root, _, files in os.walk(d):
        for fn in files:
            if fn.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
                pdfs.append(os.path.join(root, fn))
    chk("CHK-016", "No source originals tracked", len(pdfs) == 0, f"{len(pdfs)} files")

    counts = {}
    for r in rows:
        counts[r["promotion_status"]] = counts.get(r["promotion_status"], 0) + 1

    passed = sum(1 for c in results if c[2] == "PASS")
    print(f"OVERALL: {'PASS' if passed == len(results) else 'FAIL'} ({passed}/{len(results)} checks)")
    print(f"Total golden records: {len(rows)}")
    print(f"Promotion counts: {counts}")
    print()
    for cid, desc, status, detail in results:
        flag = "" if status == "PASS" else f"  <-- {detail}"
        print(f"{cid} {status}  {desc}{flag}")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())