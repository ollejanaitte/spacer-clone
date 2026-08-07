#!/usr/bin/env python3
"""
Build Phase 4 Golden for Reference Bridge 001 (RB-S10-001).

Promotes Phase 2-II GOLDEN_ELIGIBLE candidates (geometry, structural_model)
to APPROVED Phase 4 Golden records per the Phase 4 promotion contract,
mirroring the Phase 3 input golden record schema.

Usage: python build_phase4_golden.py [--phase2-dir PATH] [--output-dir PATH]
"""

import argparse
import csv
import json
import os
from collections import OrderedDict

PHASE2_II_BASE = "docs/apollo/step10/reference_bridge_001/phase2/phase2_ii"
PHASE4_BASE = "docs/apollo/step10/reference_bridge_001/phase4"

GOLDEN_RECORD_FIELDS = [
    "golden_id",
    "domain",
    "field_path",
    "entity_id",
    "raw_value",
    "raw_unit",
    "normalized_value",
    "normalized_unit",
    "semantic_class",
    "source_record_ids",
    "candidate_ids",
    "calculation_locator",
    "drawing_locator",
    "source_priority",
    "confidence",
    "verification_status",
    "promotion_status",
    "promotion_reason",
    "human_confirmation_id",
    "conflict_id",
    "standard_profile",
    "notes",
]

DOMAIN_GROUPS = {
    "geometry": [
        "alignment_candidate.csv",
        "girder_line_candidate.csv",
        "cross_section_candidate.csv",
        "elevation_crossfall_candidate.csv",
        "support_line_candidate.csv",
        "grid_point_candidate.csv",
    ],
    "structural_model": [
        "member_candidate.csv",
        "node_candidate.csv",
        "section_assignment_candidate.csv",
        "support_restraint_candidate.csv",
        "connectivity_candidate.csv",
        "local_axis_candidate.csv",
        "rigid_offset_candidate.csv",
    ],
}

DOMAIN_PREFIX = {
    "geometry": "G-GEO",
    "structural_model": "G-SM",
}


def read_csv(p):
    """Read a CSV as list of dicts."""
    if not os.path.exists(p):
        return []
    with open(p, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_candidates(phase2_dir):
    candidates = []
    for domain, files in DOMAIN_GROUPS.items():
        for fn in files:
            path = os.path.join(phase2_dir, "candidates", domain, fn)
            for row in read_csv(path):
                row["_domain"] = domain
                row["_source_file"] = fn
                candidates.append(row)
    return candidates


def is_excluded_semantic(semantic):
    """Result/derived classes never promoted to Golden even if GOLDEN_ELIGIBLE."""
    excluded = [
        "DERIVED_VALUE", "ANALYSIS_RESULT", "DESIGN_RESULT",
        "ADOPTED_VALUE", "JUDGMENT_RESULT", "CHECK_RATIO",
        "STRESS", "LIMIT_VALUE", "REACTION", "DISPLACEMENT",
        "ROTATION", "MEMBER_FORCE",
    ]
    return semantic in excluded


def build_golden(args):
    phase2_dir = args.phase2_dir
    output_dir = args.output_dir
    candidates = load_candidates(phase2_dir)

    counts = {
        "promoted": 0, "human_track": 0, "hold_conflict": 0,
        "hold_insufficient": 0, "rejected_result": 0, "excluded": 0,
    }
    records = []
    counter = {d: 0 for d in DOMAIN_GROUPS}

    for cand in sorted(candidates, key=lambda r: r.get("candidate_id", "")):
        domain = cand["_domain"]
        adoption = cand.get("adoption_status", "")
        phase4_action = cand.get("phase3_action", "")
        semantic = cand.get("semantic_class", "")
        confidence = cand.get("confidence", "UNKNOWN")
        conf_id = cand.get("human_confirmation_id", "") or ""
        conflict_id = cand.get("conflict_id", "") or ""

        if adoption == "EXCLUDED_DERIVED_VALUE":
            counts["rejected_result"] += 1
            continue
        if is_excluded_semantic(semantic):
            counts["rejected_result"] += 1
            continue
        if adoption == "CONFLICT_REQUIRES_REVIEW":
            counts["hold_conflict"] += 1
            continue
        if phase4_action == "REVIEW_CONFLICT":
            counts["hold_conflict"] += 1
            continue
        if phase4_action in ("HUMAN_VALIDATION", "GOLDEN_EXCLUDED", "ORPHAN_LOG"):
            counts["hold_insufficient"] += 1
            continue
        if phase4_action != "GOLDEN_ELIGIBLE":
            counts["excluded"] += 1
            continue
        if adoption != "CANDIDATE_ONLY":
            counts["excluded"] += 1
            continue
        # Golden Model excludes coordinates with empty normalized value (panel gaps etc.)
        if semantic == "COORDINATE" and not cand.get("normalized_value", "").strip():
            counts["hold_insufficient"] += 1
            continue

        counter[domain] += 1
        golden_id = f"{DOMAIN_PREFIX[domain]}-{counter[domain]:04d}"

        if conf_id:
            promotion_status = "APPROVED_WITH_HUMAN_CONFIRMATION_TRACK"
            counts["human_track"] += 1
        else:
            promotion_status = "APPROVED_GOLDEN_MODEL"
            counts["promoted"] += 1

        calc_loc = cand.get("calculation_locator", "") or ""
        drawing_loc = cand.get("drawing_locator", "") or ""
        if calc_loc and drawing_loc:
            sp = "BOTH"
        elif calc_loc:
            sp = "CALCULATION"
        elif drawing_loc:
            sp = "DRAWING"
        else:
            sp = "UNKNOWN"

        reason = f"{domain} Golden from Phase 2-II candidate; {confidence} confidence"
        if conf_id:
            reason += f"; human confirmation {conf_id} tracked"
        if conflict_id:
            reason += f"; conflict {conflict_id} registered"

        notes = cand.get("notes", "")

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
        rec["calculation_locator"] = calc_loc
        rec["drawing_locator"] = drawing_loc
        rec["source_priority"] = sp
        rec["confidence"] = confidence
        rec["verification_status"] = cand.get("verification_status", "UNVERIFIED")
        rec["promotion_status"] = promotion_status
        rec["promotion_reason"] = reason
        rec["human_confirmation_id"] = conf_id
        rec["conflict_id"] = conflict_id
        rec["standard_profile"] = "H29_REFERENCE"
        rec["notes"] = notes
        records.append(rec)

    os.makedirs(output_dir, exist_ok=True)
    golden_dir = os.path.join(output_dir, "golden")
    os.makedirs(golden_dir, exist_ok=True)

    unified_csv = os.path.join(golden_dir, "reference_bridge_001_model_golden.csv")
    with open(unified_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=GOLDEN_RECORD_FIELDS)
        writer.writeheader()
        for rec in records:
            writer.writerow(rec)

    unified_json = os.path.join(golden_dir, "reference_bridge_001_model_golden.json")
    with open(unified_json, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    for domain in DOMAIN_GROUPS:
        recs = [r for r in records if r["domain"] == domain]
        if not recs:
            continue
        csv_path = os.path.join(golden_dir, f"{domain}.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=GOLDEN_RECORD_FIELDS)
            writer.writeheader()
            for rec in recs:
                writer.writerow(rec)

    print(f"Golden records written: {len(records)}")
    print(f"  APPROVED_GOLDEN_MODEL: {counts['promoted']}")
    print(f"  APPROVED_WITH_HUMAN_CONFIRMATION_TRACK: {counts['human_track']}")
    print(f"  HOLD_CONFLICT: {counts['hold_conflict']}")
    print(f"  HOLD_INSUFFICIENT_SOURCE: {counts['hold_insufficient']}")
    print(f"  REJECTED_RESULT/DERIVED: {counts['rejected_result']}")
    print(f"  EXCLUDED_OTHER: {counts['excluded']}")
    per = {}
    for r in records:
        per.setdefault(r["domain"], 0)
        per[r["domain"]] += 1
    print(f"  Per domain: {per}")
    return records, counts


def main():
    parser = argparse.ArgumentParser(description="Build Reference Bridge 001 Model Golden")
    parser.add_argument("--phase2-dir", default=os.path.join(os.getcwd(), PHASE2_II_BASE))
    parser.add_argument("--output-dir", default=os.path.join(os.getcwd(), PHASE4_BASE))
    args = parser.parse_args()
    build_golden(args)


if __name__ == "__main__":
    main()