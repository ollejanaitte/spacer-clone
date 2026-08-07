#!/usr/bin/env python3
"""
Build Phase 4 Report & Drawing Golden for Reference Bridge 001 (RB-S10-001).

Selects Phase 2-II GOLDEN_ELIGIBLE report + drawing candidates needed for
Reference reproduction:

- Report: structure and reference content (chapters/sections/tables/figures/
  notes/FORMULA_DEFINITION/reference input values). Result classes
  (member_force, DESIGN_RESULT, deflection, DERIVED_VALUE, rotation) are
  excluded per the promotion contract.
- Drawing: all eligible (NOTE/TITLE_BLOCK_VALUE/DIMENSION/figure/member_id/
  text/REFERENCE_TEXT/table/LOAD_VALUE) — 141-sheet coverage metadata.

Writes Report Golden, Drawing Golden, and 141-sheet coverage register.

Usage: python build_phase4_report_drawing_golden.py
"""

import argparse
import csv
import json
import os
from collections import OrderedDict

PHASE2_II_BASE = "docs/apollo/step10/reference_bridge_001/phase2/phase2_ii"
PHASE4_BASE = "docs/apollo/step10/reference_bridge_001/phase4"

GOLDEN_RECORD_FIELDS = [
    "golden_id", "domain", "field_path", "entity_id",
    "raw_value", "raw_unit", "normalized_value", "normalized_unit",
    "semantic_class", "source_record_ids", "candidate_ids",
    "calculation_locator", "drawing_locator", "source_priority",
    "confidence", "verification_status", "promotion_status",
    "promotion_reason", "human_confirmation_id", "conflict_id",
    "standard_profile", "notes",
]

REPORT_FILES = [
    "report_chapter_candidate.csv",
    "report_section_candidate.csv",
    "report_table_candidate.csv",
    "report_figure_candidate.csv",
    "report_note_candidate.csv",
    "report_formula_candidate.csv",
    "report_layout_candidate.csv",
]

DRAWING_FILES = [
    "drawing_sheet_candidate.csv",
    "drawing_title_block_candidate.csv",
    "drawing_view_candidate.csv",
    "drawing_member_candidate.csv",
    "drawing_dimension_candidate.csv",
    "drawing_annotation_candidate.csv",
    "drawing_reference_candidate.csv",
    "drawing_table_candidate.csv",
]

# Result/derived classes excluded from report reproduction golden
REPORT_EXCLUDED = {
    "member_force", "DESIGN_RESULT", "deflection", "DERIVED_VALUE",
    "rotation", "ANALYSIS_RESULT", "JUDGMENT_RESULT", "CHECK_RATIO",
}

PREFIX = {"report": "G-RPT", "drawing": "G-DWG"}


def read_csv(p):
    if not os.path.exists(p):
        return []
    with open(p, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def build(args):
    stats = {"promoted": 0, "excluded_result": 0, "excluded_other": 0}
    records = {"report": [], "drawing": []}
    counters = {"report": 0, "drawing": 0}

    sources = {"report": REPORT_FILES, "drawing": DRAWING_FILES}
    for domain, files in sources.items():
        for fn in files:
            for cand in read_csv(os.path.join(args.phase2_dir, "candidates", domain, fn)):
                pa = cand.get("phase3_action", "")
                if pa != "GOLDEN_ELIGIBLE":
                    stats["excluded_other"] += 1
                    continue
                semantic = cand.get("semantic_class", "")
                if domain == "report" and semantic in REPORT_EXCLUDED:
                    stats["excluded_result"] += 1
                    continue

                counters[domain] += 1
                golden_id = f"{PREFIX[domain]}-{counters[domain]:04d}"
                conf_id = cand.get("human_confirmation_id", "") or ""
                conflict_id = cand.get("conflict_id", "") or ""
                ps = "APPROVED_REPORT_DRAWING_GOLDEN" if not conf_id else "APPROVED_WITH_HUMAN_CONFIRMATION_TRACK"
                stats["promoted"] += 1

                cl = cand.get("calculation_locator", "") or ""
                dl = cand.get("drawing_locator", "") or ""
                if cl and dl: sp = "BOTH"
                elif cl: sp = "CALCULATION"
                elif dl: sp = "DRAWING"
                else: sp = "UNKNOWN"

                reason = f"{domain} Golden from Phase 2-II candidate; {cand.get('confidence','UNKNOWN')} confidence"

                rec = OrderedDict()
                rec["golden_id"] = golden_id
                rec["domain"] = domain
                rec["field_path"] = cand.get("field_path_candidate", "")
                rec["entity_id"] = cand.get("entity_id", "")
                rec["raw_value"] = cand.get("raw_value", "")
                rec["raw_unit"] = cand.get("raw_unit", "")
                rec["normalized_value"] = cand.get("normalized_value", "")
                rec["normalized_unit"] = cand.get("normalized_unit", "")
                rec["semantic_class"] = semantic
                rec["source_record_ids"] = cand.get("source_record_ids", "")
                rec["candidate_ids"] = cand.get("candidate_id", "")
                rec["calculation_locator"] = cl
                rec["drawing_locator"] = dl
                rec["source_priority"] = sp
                rec["confidence"] = cand.get("confidence", "UNKNOWN")
                rec["verification_status"] = cand.get("verification_status", "UNVERIFIED")
                rec["promotion_status"] = ps
                rec["promotion_reason"] = reason
                rec["human_confirmation_id"] = conf_id
                rec["conflict_id"] = conflict_id
                rec["standard_profile"] = "H29_REFERENCE"
                rec["notes"] = cand.get("notes", "")
                records[domain].append(rec)

    golden_dir = os.path.join(args.output_dir, "golden")
    os.makedirs(golden_dir, exist_ok=True)

    for domain in ("report", "drawing"):
        with open(os.path.join(golden_dir, f"{domain}.csv"), "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=GOLDEN_RECORD_FIELDS); w.writeheader()
            for r in records[domain]: w.writerow(r)

    all_recs = records["report"] + records["drawing"]
    with open(os.path.join(golden_dir, "reference_bridge_001_report_drawing_golden.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=GOLDEN_RECORD_FIELDS); w.writeheader()
        for r in all_recs: w.writerow(r)
    with open(os.path.join(golden_dir, "reference_bridge_001_report_drawing_golden.json"), "w", encoding="utf-8") as f:
        json.dump(all_recs, f, ensure_ascii=False, indent=2)

    # drawing 141-sheet coverage register
    sheet = {}
    for r in records["drawing"]:
        dl = r["drawing_locator"]
        if dl and dl.startswith("DWG-S"):
            sheet[dl] = sheet.get(dl, 0) + 1
    with open(os.path.join(args.output_dir, "review", "drawing_sheet_coverage.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["drawing_locator", "golden_record_count"])
        for k in sorted(sheet): w.writerow([k, sheet[k]])

    print(f"Report Golden: {len(records['report'])}   Drawing Golden: {len(records['drawing'])}   Total: {len(all_recs)}")
    print(f"  promoted={stats['promoted']} excluded_result={stats['excluded_result']} excluded_other={stats['excluded_other']}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase2-dir", default=os.path.join(os.getcwd(), PHASE2_II_BASE))
    parser.add_argument("--output-dir", default=os.path.join(os.getcwd(), PHASE4_BASE))
    args = parser.parse_args()
    build(args)


if __name__ == "__main__":
    main()