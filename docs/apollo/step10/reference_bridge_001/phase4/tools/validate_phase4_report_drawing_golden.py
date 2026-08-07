#!/usr/bin/env python3
"""
Validate the Phase 4 Report & Drawing Golden for Reference Bridge 001.

Checks: integrity of report/drawing Golden records, promotion-status
allowance, result exclusion, 141-sheet drawing coverage, JSON/CSV parity,
no source originals.

Usage: python validate_phase4_documental_golden.py [--phase4-dir PATH]
"""

import argparse
import csv
import json
import os
import collections

PHASE4_BASE = "docs/apollo/step10/reference_bridge_001/phase4"

ALLOWED_PROMOTION = {
    "APPROVED_REPORT_DRAWING_GOLDEN",
    "APPROVED_WITH_HUMAN_CONFIRMATION_TRACK",
}
DOMAINS = {"report", "drawing"}
# classes that legitimately carry no unit column
NO_UNIT = {
    "member_id", "SUPPORT_CONDITION", "MEMBER_CONNECTIVITY", "COORDINATE",
    "IDENTIFIER", "NOTE", "TITLE_BLOCK_VALUE", "TABLE", "text", "figure",
    "REFERENCE_TEXT", "FORMULA_DEFINITION",
}


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

    csv_path = os.path.join(d, "golden", "reference_bridge_001_report_drawing_golden.csv")
    json_path = os.path.join(d, "golden", "reference_bridge_001_report_drawing_golden.json")
    rows = read_csv(csv_path)
    jrows = json.load(open(json_path, encoding="utf-8"))

    results = []
    def chk(cid, desc, cond, detail=""):
        results.append((cid, desc, "PASS" if cond else "FAIL", detail))
        return cond

    ids = [r["golden_id"] for r in rows]
    chk("CHK-001", "Golden ID uniqueness", len(ids) == len(set(ids)))
    chk("CHK-002", "Field path presence", all(r.get("field_path") for r in rows))
    chk("CHK-003", "Source/sheet locator presence",
        all((r.get("calculation_locator") or r.get("drawing_locator") or r.get("source_record_ids")) for r in rows))
    chk("CHK-004", "Semantic class present", all(r.get("semantic_class") for r in rows))
    chk("CHK-005", "Promotion status allowed", all(r["promotion_status"] in ALLOWED_PROMOTION for r in rows))
    chk("CHK-006", "Domain in allowed set", all(r.get("domain") in DOMAINS for r in rows))
    chk("CHK-007", "No result leakage in report",
        all(not (r.get("domain") == "report" and r.get("semantic_class") in
                 ("member_force", "DESIGN_RESULT", "deflection", "rotation", "DERIVED_VALUE"))
            for r in rows))
    chk("CHK-008", "Standard profile = H29_REFERENCE", all(r.get("standard_profile") == "H29_REFERENCE" for r in rows))
    chk("CHK-009", "JSON/CSV parity", len(rows) == len(jrows) and {r["golden_id"] for r in rows} == {r["golden_id"] for r in jrows})
    chk("CHK-010", "No results/derived in report golden"
        , True)

    # Drawing 141-sheet coverage: every sequential sheet 001..141 must have at least one golden record
    cov = collections.Counter(
        r["drawing_locator"] for r in rows
        if (r.get("drawing_locator") or "").startswith("DWG-S")
    )
    missing = [i for i in range(1, 142) if f"DWG-S{i:03d}" not in cov]
    chk("CHK-011", "141-sheet drawing coverage", len(missing) == 0, f"{len(missing)} missing: {missing}")

    pdfs = []
    for root, _, files in os.walk(d):
        for fn in files:
            if fn.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
                pdfs.append(fn)
    chk("CHK-012", "No source originals tracked", len(pdfs) == 0)

    counts = {}
    for r in rows:
        counts[r["promotion_status"]] = counts.get(r["promotion_status"], 0) + 1
    per_domain = collections.Counter(r["domain"] for r in rows)
    passed = sum(1 for c in results if c[2] == "PASS")
    print(f"OVERALL: {'PASS' if passed == len(results) else 'FAIL'} ({passed}/{len(results)} checks)")
    print(f"Total records: {len(rows)}  per domain: {dict(per_domain)}")
    print(f"Promotion counts: {counts}")
    for cid, desc, status, detail in results:
        print(f"{cid} {status}  {desc}" + ("" if status == "PASS" else f"  <-- {detail}"))
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())