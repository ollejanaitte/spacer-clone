#!/usr/bin/env python3
"""
Build Input Golden for Reference Bridge 001 (RB-S10-001) Phase 3.

Reads Phase 2-II candidate CSVs and registers, promotes SOURCE_INPUT
candidates to APPROVED_GOLDEN_INPUT per the promotion contract, and
writes domain-specific Golden CSVs + the unified Golden CSV/JSON.

Usage: python build_input_golden.py [--phase2-dir PATH] [--output-dir PATH]
"""

import argparse
import csv
import json
import os
import sys
from collections import OrderedDict

PHASE2_II_BASE = "docs/apollo/step10/reference_bridge_001/phase2/phase2_ii"
PHASE3_BASE = "docs/apollo/step10/reference_bridge_001/phase3"

GOLDEN_RECORD_FIELDS = [
    "golden_id",
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

DOMAIN_MAP = {
    "bridge_identity": [
        "road_spec.road_spec", "road_spec.design_speed",
        "live_load.standard", "bridge_type.type",
        "code.applicable_code", "code.applicable_manual",
        "code.live_load_reference", "bridge.bridge_id",
        "bridge.project_id", "bridge.standard_profile",
        "bridge.source_revision",
    ],
    "geometry_inputs": [
        "bridge.bridge_length", "bridge.span_length",
        "bridge.total_width", "bridge.effective_width",
        "girder.girder_length",
        "alignment.bridge_length", "alignment.span_length",
        "elevation.longitudinal_gradient", "elevation.cross_gradient",
        "elevation.deck_elevation", "elevation.ground_level",
        "alignment.station",
    ],
    "girder_inputs": [
        "girder.girder_length",
        "girder_line.girder_spacing", "girder_line.girder_height",
        "girder_line.panel_points", "girder_line.ag1", "girder_line.ag2",
        "cross_section.upper_flange_width", "cross_section.bottom_flange_width",
        "cross_section.deck_total_width", "cross_section.web_height",
        "cross_section.web_thickness",
    ],
    "deck_inputs": [
        "deck.deck_thickness", "deck.pavement_thickness",
        "cross_section.deck_total_width", "cross_section.deck_thickness",
        "cross_section.pavement_thickness",
    ],
    "material_inputs": [
        "material.steel_grade", "material.concrete_strength",
        "material.elastic_modulus_steel", "material.shear_modulus_steel",
        "material.yield_strength",
    ],
    "cross_member_inputs": [
        "member.AG1", "member.AG2", "member.GE1", "member.GE2",
        "member.C1-C7", "member.C8-C13", "member.C14-C20", "member.C21-C23",
        "member.A-L1", "member.A-L2",
    ],
    "support_bearing_inputs": [
        "support_line.pu15", "support_line.pr1", "support_line.pr2",
        "support_line.ar2", "member.S1", "member.S2", "member.PR1", "member.PR2",
    ],
    "load_inputs": [
        "load_value.pavement", "load_value.deck", "load_value.haunch",
        "load_value.wall_rail", "load_value.sound_barrier", "load_value.steel",
        "load_value.inspection", "load_value.nose", "load_value.curb",
        "load_value.wind_outer", "load_value.wind_inner", "load_value.collision_vehicle",
        "load_value.wind_WS", "load_value.seismic_L1", "load_value.wheel_P",
        "load_value.collision_F", "load_value.node_load",
        "load_application.distributed_dead_load", "load_application.panel_point_loads",
    ],
    "member_section_inputs": [
        "section_assignment", "member.",
    ],
}


def read_csv(path):
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def read_issue_register(phase2_dir):
    path = os.path.join(phase2_dir, "registers", "issue_register.csv")
    if not os.path.exists(path):
        return {}
    issues = {}
    for row in read_csv(path):
        issues[row["issue_id"]] = row
    return issues


def load_candidates(phase2_dir):
    """Load candidates from all candidate layers."""
    candidates = {}
    candidate_layers = {
        "input": os.path.join(phase2_dir, "candidates", "input", "input_candidate_register.csv"),
        "geometry": [
            os.path.join(phase2_dir, "candidates", "geometry", "alignment_candidate.csv"),
            os.path.join(phase2_dir, "candidates", "geometry", "girder_line_candidate.csv"),
            os.path.join(phase2_dir, "candidates", "geometry", "cross_section_candidate.csv"),
            os.path.join(phase2_dir, "candidates", "geometry", "elevation_crossfall_candidate.csv"),
            os.path.join(phase2_dir, "candidates", "geometry", "support_line_candidate.csv"),
            os.path.join(phase2_dir, "candidates", "geometry", "grid_point_candidate.csv"),
        ],
        "structural_model": [
            os.path.join(phase2_dir, "candidates", "structural_model", "member_candidate.csv"),
            os.path.join(phase2_dir, "candidates", "structural_model", "node_candidate.csv"),
            os.path.join(phase2_dir, "candidates", "structural_model", "section_assignment_candidate.csv"),
            os.path.join(phase2_dir, "candidates", "structural_model", "support_restraint_candidate.csv"),
            os.path.join(phase2_dir, "candidates", "structural_model", "connectivity_candidate.csv"),
        ],
        "load": [
            os.path.join(phase2_dir, "candidates", "load", "load_value_candidate.csv"),
            os.path.join(phase2_dir, "candidates", "load", "load_application_candidate.csv"),
            os.path.join(phase2_dir, "candidates", "load", "load_case_candidate.csv"),
            os.path.join(phase2_dir, "candidates", "load", "load_combination_candidate.csv"),
        ],
    }
    for layer_type, paths in candidate_layers.items():
        if isinstance(paths, str):
            paths = [paths]
        for p in paths:
            if os.path.exists(p):
                for row in read_csv(p):
                    cid = row.get("candidate_id", "")
                    candidates[cid] = {**row, "_source_file": p, "_layer_type": layer_type}
    return candidates


def is_source_input_semantic(semantic_class):
    """Check if semantic class is a SOURCE_INPUT type."""
    input_classes = [
        "road_spec", "design_speed", "live_load", "bridge_type",
        "bridge_length", "girder_length", "span_length",
        "total_width", "effective_width",
        "steel_grade", "concrete_strength", "elastic_modulus",
        "shear_modulus", "yield_strength",
        "deck_thickness", "DIMENSION",
        "member_id", "SUPPORT_CONDITION",
        "LOAD_VALUE", "COORDINATE",
        "longitudinal_gradient", "cross_gradient",
        "girder_spacing", "girder_height",
        "applicable_code", "applicable_manual", "REFERENCE_TEXT",
    ]
    return semantic_class in input_classes


def is_excluded_semantic(semantic_class):
    """Check if semantic class is an excluded (result/derived) type."""
    excluded = [
        "DERIVED_VALUE", "ANALYSIS_RESULT", "DESIGN_RESULT",
        "ADOPTED_VALUE", "JUDGMENT_RESULT", "CHECK_RATIO",
        "STRESS", "LIMIT_VALUE", "REACTION",
        "DISPLACEMENT", "ROTATION", "MEMBER_FORCE",
    ]
    return semantic_class in excluded


def match_domain(field_path, domain_prefixes):
    for prefix in domain_prefixes:
        if field_path.startswith(prefix):
            return True
    return False


def get_domain(field_path, candidate):
    """Determine the domain for a candidate based on field_path and entity."""
    for domain, prefixes in DOMAIN_MAP.items():
        if match_domain(field_path, prefixes):
            return domain
    entity = candidate.get("entity_id", "")
    if "GIRDER" in entity and "DECK" not in entity:
        return "girder_inputs"
    if "DECK" in entity:
        return "deck_inputs"
    if "SUPPORT" in entity:
        return "support_bearing_inputs"
    if "XBEAM" in entity or "BRACE" in entity:
        return "cross_member_inputs"
    if "STIFF" in entity or "STUD" in entity or "SOLEPL" in entity or "NOSE" in entity:
        return "member_section_inputs"
    return "geometry_inputs"


def build_golden(args):
    phase2_dir = args.phase2_dir
    output_dir = args.output_dir

    issues = read_issue_register(phase2_dir)
    candidates = load_candidates(phase2_dir)

    golden_records = []
    golden_id_counter = 0
    counts = {
        "approved": 0, "human_track": 0, "hold_conflict": 0,
        "rejected_result": 0, "rejected_derived": 0, "rejected_drawing": 0,
        "excluded": 0,
    }

    for cid, cand in sorted(candidates.items()):
        adoption = cand.get("adoption_status", "")
        phase3_action = cand.get("phase3_action", "")
        semantic = cand.get("semantic_class", "")
        field_path = cand.get("field_path_candidate", "")
        confidence = cand.get("confidence", "UNKNOWN")

        if adoption == "EXCLUDED_DERIVED_VALUE":
            counts["rejected_derived"] += 1
            continue
        if is_excluded_semantic(semantic):
            counts["rejected_result"] += 1
            continue
        if phase3_action in ("GOLDEN_EXCLUDED", "HUMAN_VALIDATION"):
            if phase3_action == "HUMAN_VALIDATION":
                pass
            else:
                pass
            counts["excluded"] += 1
            continue

        if adoption == "CONFLICT_REQUIRES_REVIEW":
            counts["hold_conflict"] += 1
            continue

        if phase3_action == "REVIEW_CONFLICT":
            counts["hold_conflict"] += 1
            continue

        if not is_source_input_semantic(semantic):
            counts["excluded"] += 1
            continue
        if phase3_action not in ("GOLDEN_ELIGIBLE",):
            counts["excluded"] += 1
            continue

        golden_id_counter += 1
        golden_id = f"GIN-{golden_id_counter:04d}"

        conf_id = cand.get("human_confirmation_id", "") or ""
        conflict_id = cand.get("conflict_id", "") or ""
        issue_id = cand.get("issue_id", "") or ""

        if conf_id:
            promotion_status = "APPROVED_WITH_HUMAN_CONFIRMATION_TRACK"
            counts["human_track"] += 1
        else:
            promotion_status = "APPROVED_INPUT_GOLDEN"
            counts["approved"] += 1

        source_records = cand.get("source_record_ids", "")
        calc_loc = cand.get("calculation_locator", "") or ""
        drawing_loc = cand.get("drawing_locator", "") or ""

        if calc_loc and drawing_loc:
            source_priority = "BOTH"
        elif calc_loc:
            source_priority = "CALCULATION"
        elif drawing_loc:
            source_priority = "DRAWING"
        else:
            source_priority = "UNKNOWN"

        promotion_reason = f"SOURCE_INPUT from {cand.get('_layer_type', 'unknown')} layer; Phase 2-II candidate with {confidence} confidence"
        if conf_id:
            promotion_reason += f"; human confirmation {conf_id} tracked"
        if conflict_id:
            promotion_reason += f"; conflict {conflict_id} registered"

        domain = get_domain(field_path, cand)

        raw_value = cand.get("raw_value", "")
        raw_unit = cand.get("raw_unit", "")
        norm_value = cand.get("normalized_value", "")
        norm_unit = cand.get("normalized_unit", "")

        notes = cand.get("notes", "")
        if issue_id:
            issue = issues.get(issue_id, {})
            notes = notes + f" [ISSUE: {issue_id} - {issue.get('title', '')}]" if issue else notes + f" [ISSUE: {issue_id}]"

        rec = OrderedDict()
        rec["golden_id"] = golden_id
        rec["field_path"] = field_path
        rec["entity_id"] = cand.get("entity_id", "")
        rec["raw_value"] = raw_value
        rec["raw_unit"] = raw_unit
        rec["normalized_value"] = norm_value
        rec["normalized_unit"] = norm_unit
        rec["semantic_class"] = semantic
        rec["source_record_ids"] = source_records
        rec["candidate_ids"] = cid
        rec["calculation_locator"] = calc_loc
        rec["drawing_locator"] = drawing_loc
        rec["source_priority"] = source_priority
        rec["confidence"] = confidence
        rec["verification_status"] = cand.get("verification_status", "UNVERIFIED")
        rec["promotion_status"] = promotion_status
        rec["promotion_reason"] = promotion_reason
        rec["human_confirmation_id"] = conf_id
        rec["conflict_id"] = conflict_id
        rec["standard_profile"] = "H29_REFERENCE"
        rec["notes"] = notes

        golden_records.append(rec)

    os.makedirs(output_dir, exist_ok=True)
    golden_dir = os.path.join(output_dir, "golden")
    os.makedirs(golden_dir, exist_ok=True)

    unified_csv = os.path.join(golden_dir, "reference_bridge_001_input_golden.csv")
    with open(unified_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=GOLDEN_RECORD_FIELDS)
        writer.writeheader()
        for rec in golden_records:
            writer.writerow(rec)

    unified_json = os.path.join(golden_dir, "reference_bridge_001_input_golden.json")
    with open(unified_json, "w", encoding="utf-8") as f:
        json.dump(golden_records, f, ensure_ascii=False, indent=2)

    domain_files = {}
    for rec in golden_records:
        domain = get_domain(rec["field_path"], rec)
        if domain not in domain_files:
            domain_files[domain] = []
        domain_files[domain].append(rec)

    for domain, recs in domain_files.items():
        csv_path = os.path.join(golden_dir, f"{domain}.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=GOLDEN_RECORD_FIELDS)
            writer.writeheader()
            for rec in recs:
                writer.writerow(rec)

    print(f"Golden records written: {len(golden_records)}")
    print(f"  APPROVED_INPUT_GOLDEN: {counts['approved']}")
    print(f"  APPROVED_WITH_HUMAN_CONFIRMATION_TRACK: {counts['human_track']}")
    print(f"  HOLD_CONFLICT: {counts['hold_conflict']}")
    print(f"  REJECTED_DERIVED: {counts['rejected_derived']}")
    print(f"  REJECTED_RESULT: {counts['rejected_result']}")
    print(f"  EXCLUDED_OTHER: {counts['excluded']}")
    print(f"  Domain files: {list(domain_files.keys())}")

    return golden_records, counts


def main():
    parser = argparse.ArgumentParser(description="Build Reference Bridge 001 Input Golden")
    parser.add_argument("--phase2-dir", default=os.path.join(os.getcwd(), PHASE2_II_BASE))
    parser.add_argument("--output-dir", default=os.path.join(os.getcwd(), PHASE3_BASE))
    args = parser.parse_args()
    build_golden(args)


if __name__ == "__main__":
    main()