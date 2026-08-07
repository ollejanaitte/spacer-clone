#!/usr/bin/env python3
"""
Build Phase 4 Design Golden for Reference Bridge 001 (RB-S10-001).

Promotes Phase 2-II GOLDEN_ELIGIBLE design + adopted_design candidates to
the Phase 4 Design Golden, mirroring the Phase 4 promotion contract.

Usage: python build_phase4_design_envelope.py [--phase2-dir PATH] [--output-dir PATH]
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

SOURCE_FILES = {
    "design": [
        "section_property_candidate.csv",
        "limit_candidate.csv",
        "stress_candidate.csv",
        "judgment_candidate.csv",
        "formula_trace_candidate.csv",
        "check_ratio_candidate.csv",
    ],
    "adopted_design": [
        "adopted_section_candidate.csv",
        "adopted_dimension_candidate.csv",
        "adopted_material_candidate.csv",
        "adopted_bearing_candidate.csv",
    ],
}

DOMAIN_PREFIX = {"design": "G-DES", "adopted_design": "G-AD"}


def read_csv(p):
    if not os.path.exists(p):
        return []
    with open(p, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def is_excluded_semantic(semantic):
    excluded = [
        "ANALYSIS_RESULT", "DESIGN_RESULT", "JUDGMENT_RESULT", "CHECK_RATIO",
        "DERIVED_VALUE", "REACTION", "DISPLACEMENT", "ROTATION", "MEMBER_FORCE",
    ]
    return semantic in excluded


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase2-dir", default=os.path.join(os.getcwd(), PHASE2_II_BASE))
    parser.add_argument("--output-dir", default=os.path.join(os.getcwd(), PHASE4_BASE))
    args = parser.parse_args()

    counts = {"promoted": 0, "human_track": 0, "hold_conflict": 0,
              "hold_insufficient": 0, "rejected": 0, "excluded": 0}
    records = {"design": [], "adopted_design": []}
    counter = {"design": 0, "adopted_design": 0}

    for domain, files in SOURCE_FILES.items():
        for fn in files:
            for cand in read_csv(os.path.join(args.phase2_dir, "candidates", domain, fn)):
                adoption = cand.get("adoption_status", "")
                pa = cand.get("phase3_action", "")
                semantic = cand.get("semantic_class", "")

                if adoption == "EXCLUDED_DERIVED_VALUE":
                    counts["rejected"] += 1; continue
                if is_excluded_semantic(semantic):
                    counts["rejected"] += 1; continue
                if adoption == "CONFLICT_REQUIRES_REVIEW":
                    counts["hold_conflict"] += 1; continue
                if pa in ("HUMAN_VALIDATION", "GOLDEN_EXCLUDE", "ORPHAN_LOG"):
                    counts["hold_insufficient"] += 1; continue
                if pa != "GOLDEN_ELIGIBLE" or adoption != "CANDIDATE_ONLY":
                    counts["excluded"] += 1; continue

                counter[domain] += 1
                golden_id = f"{DOMAIN_PREFIX[domain]}-{counter[domain]:04d}"
                conf_id = cand.get("human_confirmation_id", "") or ""
                conflict_id = cand.get("conflict_id", "") or ""
                if conf_id:
                    ps = "APPROVED_WITH_HUMAN_CONFIRMATION_TRACK"; counts["human_track"] += 1
                else:
                    ps = "APPROVED_DESIGN_GOLDEN"; counts["promoted"] += 1

                cl = cand.get("calculation_locator", "") or ""
                dl = cand.get("drawing_locator", "") or ""
                if cl and dl: sp = "BOTH"
                elif cl: sp = "CALCULATION"
                elif dl: sp = "DRAWING"
                else: sp = "UNKNOWN"

                reason = f"design Golden from Phase 2-II candidate; {cand.get('confidence','UNKNOWN')} confidence"
                if conf_id: reason += f"; human confirmation {conf_id} tracked"
                if conflict_id: reason += f"; conflict {conflict_id} registered"

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
    all_recs = records["design"] + records["adopted_design"]

    for domain in ("design", "adopted_design"):
        with open(os.path.join(golden_dir, f"{domain}.csv"), "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=GOLDEN_RECORD_FIELDS); w.writeheader()
            for r in records[domain]: w.writerow(r)

    with open(os.path.join(golden_dir, "reference_bridge_001_design_golden.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=GOLDEN_RECORD_FIELDS); w.writeheader()
        for r in all_recs: w.writerow(r)
    with open(os.path.join(golden_dir, "reference_bridge_001_design_golden.json"), "w", encoding="utf-8") as f:
        json.dump(all_recs, f, ensure_ascii=False, indent=2)

    print(f"Design Golden records: {len(all_recs)}  (design={len(records['design'])}, adopted_design={len(records['adopted_design'])})")
    print(f"  APPROVED_DESIGN_GOLDEN: {counts['promoted']}, TRACK: {counts['human_track']}, HOLD_CONFLICT: {counts['hold_conflict']}, HOLD_INSUFFICIENT: {counts['hold_insufficient']}, REJECTED: {counts['rejected']}, EXCLUDED: {counts['excluded']}")


if __name__ == "__main__":
    main()