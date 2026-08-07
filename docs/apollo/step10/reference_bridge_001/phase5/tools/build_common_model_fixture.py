#!/usr/bin/env python3
"""
Golden -> Common Bridge Data Model adapter for Reference Bridge 001 (P5-3).

Mechanically builds the Reference Bridge 001 Common Bridge Data Model fixture
from the Phase 3 Input Golden and Phase 4 Golden CSVs plus carry-forward
registers (conflict, HCR, HOLD). No Golden value is hard-coded; mapping rules
live in cbdm_mapping.py and the mapping registers.

Outputs:
  fixtures/reference_bridge_001_common_model.json          (Common Model fixture)
  fixtures/reference_bridge_001_common_model.fingerprint.txt
  validation/golden_to_common_model_parity.csv             (per-Golden mapping)

Usage: python build_common_model_fixture.py --root <repo root>
"""

import argparse
import csv
import json
import os
from collections import OrderedDict

import cbdm_mapping as M
import common_model as C

RB = "docs/apollo/step10/reference_bridge_001"

FIXTURE_METADATA = {
    "bridgeId": "RB-S10-001",
    "displayName": "Reference Bridge 001",
    "standardProfile": "H29_REFERENCE",
    "r7Compliance": "NOT_VERIFIED",
    "numericDesignAuthorization": "NOT_GRANTED",
    "designOrConstructionUse": "PROHIBITED",
    "referenceType": "REFERENCE",
}

HOLD_NODE_RANGES = [
    ("AG1", range(1002, 1027)),
    ("AG2", range(2002, 2027)),
]
HOLD_REASON = ("Intermediate panel-point coordinates not extracted in Phase 2; "
               "no interpolation or back-calculation performed.")


def load_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def conflict_candidates_map(root):
    """Parse conflict_resolution_register.csv into conflictId -> candidates."""
    out = {}
    path = os.path.join(root, RB, "phase4", "review", "conflict_resolution_register.csv")
    if not os.path.exists(path):
        return out
    for r in load_csv(path):
        cid = r.get("conflict_id", "").strip()
        if not cid:
            continue
        cands = []
        for key, src in (("calc_value", r.get("candidate_ids", "").split(",")[0] if r.get("candidate_ids") else ""),
                         ("drawing_value", r.get("candidate_ids", "").split(",")[1] if r.get("candidate_ids") and "," in r.get("candidate_ids", "") else "")):
            val = r.get(key, "").strip()
            if not val:
                continue
            m = val.split()
            value = M.parse_number(m[0]) if m else None
            unit = m[1] if len(m) > 1 else None
            cands.append({"value": value, "unit": unit,
                          "sourceRefs": [s.strip() for s in src.split(",") if s.strip()]})
        out[cid] = cands
    return out


def build_document(root):
    conflict_map = conflict_candidates_map(root)
    p3 = load_csv(os.path.join(root, RB, "phase3", "golden",
                               "reference_bridge_001_input_golden.csv"))
    p4_goldens = [
        "reference_bridge_001_model_golden.csv",
        "reference_bridge_001_design_golden.csv",
        "reference_bridge_001_report_drawing_golden.csv",
    ]
    p4 = []
    for g in p4_goldens:
        p4.extend(load_csv(os.path.join(root, RB, "phase4", "golden", g)))

    # rd traceability for drawing sheet numbers
    rd_trace = {}
    tp = os.path.join(root, RB, "phase4", "traceability", "traceability_phase4_rd_golden.csv")
    if os.path.exists(tp):
        for r in load_csv(tp):
            gid = r.get("golden_id", "").strip()
            if gid and r.get("drawing_sheet_number"):
                rd_trace[gid] = r["drawing_sheet_number"].strip()

    entities = OrderedDict()  # (layer, entity_id) -> entity dict
    trace_links = []
    parity_rows = []

    def entity(layer, eid):
        key = (layer, eid)
        if key not in entities:
            entities[key] = {"id": eid, "entityType": "ALIGNMENT", "fields": {}}
        return entities[key]

    def add_record(rec, index):
        layer, section, eid = M.resolve_target(rec, index)
        etype = M.entity_type_for(section)
        domain = (rec.get("domain") or "").strip()
        fp = rec.get("field_path") or ""
        ent = entity(layer, eid)
        ent["entityType"] = etype
        gid = rec.get("golden_id", "")
        sheet_no = rd_trace.get(gid, "")

        # node coordinate -> per-axis fields
        axes = None
        if (rec.get("semantic_class") or "") == "COORDINATE":
            axes = M.parse_coordinate_record(rec)
        values = M.build_resolved_value(rec, conflict_candidates=conflict_map.get(rec.get("conflict_id", "").strip()), coord_axes=axes)
        for field_key, val in values:
            ent["fields"][field_key] = val

        # traceability link
        refs = [x for x in (rec.get("source_record_ids") or "").split(",") if x.strip()]
        link = {
            "traceabilityId": f"T-{gid}",
            "goldenId": gid,
            "commonEntityId": eid,
        }
        if refs:
            link["sourceRecordIds"] = refs
        if domain:
            link["domain"] = domain
        if sheet_no:
            link["drawingSheetId"] = sheet_no
        trace_links.append(link)

        # parity row
        state = {"CONFIRMED": "MAPPED", "HUMAN_CONFIRMATION_REQUIRED": "MAPPED_WITH_HUMAN_TRACK",
                 "CONFLICT": "MAPPED_CONFLICT"}.get(values[0][1].get("state"), "MAPPED")
        parity_rows.append({
            "golden_id": gid,
            "domain": domain,
            "field_path": fp,
            "entity_id": rec.get("entity_id", ""),
            "common_layer": layer,
            "common_section": section,
            "target_id": eid,
            "mapping_status": state,
            "resolution_state": values[0][1].get("state"),
            "mapping_reason": f"domain {domain or 'phase3'} field_path {fp}",
        })

    for i, rec in enumerate(p3, start=1):
        add_record(rec, i)
    base = len(p3)
    for i, rec in enumerate(p4, start=1):
        add_record(rec, base + i)

    # ---- HOLD intermediate panel points (structural nodes, not from golden) ----
    hold_entity_ids = []
    for girder, rng in HOLD_NODE_RANGES:
        for n in rng:
            eid = f"NODE-{n}"
            ent = entity("structuralModel", eid)
            ent["entityType"] = "STRUCTURAL_NODE"
            for axis in ("x", "y", "z"):
                ent["fields"][axis] = {"state": "HOLD_INSUFFICIENT_SOURCE",
                                       "stateReason": HOLD_REASON}
            hold_entity_ids.append(eid)

    # ---- assemble layers ----
    def collect(layer):
        return [entities[k] for k in sorted(entities) if k[0] == layer]

    document = C.build_envelope(FIXTURE_METADATA["bridgeId"], FIXTURE_METADATA["displayName"])
    document["metadata"] = dict(FIXTURE_METADATA)
    document["alignments"] = {"alignments": collect("alignment")}
    document["bridgeGeometry"] = {
        "spans": [e for e in collect("bridgeGeometry") if e["entityType"] == "SPAN"],
        "supports": [e for e in collect("bridgeGeometry") if e["entityType"] == "SUPPORT"],
        "girders": [e for e in collect("bridgeGeometry") if e["entityType"] == "GIRDER"],
        "gridPoints": [e for e in collect("bridgeGeometry") if e["entityType"] == "GRID_POINT"],
        "deck": [e for e in collect("bridgeGeometry") if e["entityType"] == "DECK"],
        "crossMembers": [e for e in collect("bridgeGeometry") if e["entityType"] == "CROSS_MEMBER"],
    }
    sm = collect("structuralModel")
    document["structuralModel"] = {
        "nodes": [e for e in sm if e["entityType"] == "STRUCTURAL_NODE"],
        "members": [e for e in sm if e["entityType"] == "STRUCTURAL_MEMBER"],
    }
    document["materials"] = {"materials": collect("materials")}
    document["sections"] = {"sections": collect("sections")}
    document["loads"] = {
        "loadCases": [e for e in collect("loads") if e["entityType"] == "LOAD_CASE"],
        "loadCombinations": [],
    }
    document["analysisReference"] = {
        "status": "NOT_AVAILABLE",
        "stateReason": "Analysis Golden = 0 in current Phase 4 contract; slot reserved for Phase 7.",
        "results": [],
    }
    document["design"] = {"items": collect("design")}
    document["reportSpecification"] = {"items": collect("reportSpecification")}
    dwg = collect("drawingSpecification")
    document["drawingSpecification"] = {
        "sheets": [e for e in dwg if e["entityType"] == "DRAWING_SHEET"],
        "items": [e for e in dwg if e["entityType"] == "DRAWING_ITEM"],
    }
    document["traceability"] = {"links": trace_links}

    # ---- resolution registry ----
    document["resolutionRegistry"] = {
        "conflicts": [{
            "conflictId": cid,
            "description": f"conflict {cid} carried from Phase 4; selected value unresolved",
            "candidates": cands,
            "selected": None,
            "resolutionStatus": "UNRESOLVED",
            "affectedEntityIds": sorted({r["target_id"] for r in parity_rows
                                         if r["mapping_status"] == "MAPPED_CONFLICT"}),
        } for cid, cands in sorted(conflict_map.items())],
        "humanConfirmations": [{
            "humanConfirmationId": "HCR-001",
            "description": "Drawing sheet 141 OCR cells; human visual confirmation pending",
            "state": "PENDING",
            "affectedEntityIds": sorted({r["target_id"] for r in parity_rows
                                         if r["mapping_status"] == "MAPPED_WITH_HUMAN_TRACK"}),
        }],
        "holds": [{
            "holdId": "HOLD-PANEL-COORDS",
            "state": "HOLD_INSUFFICIENT_SOURCE",
            "stateReason": HOLD_REASON,
            "affectedEntityIds": sorted(hold_entity_ids),
        }],
    }

    C.finalize_document(document)
    return document, parity_rows


def write_outputs(root, document, parity_rows):
    base = os.path.join(root, RB, "phase5")
    fixture_path = os.path.join(base, "fixtures", "reference_bridge_001_common_model.json")
    with open(fixture_path, "w", encoding="utf-8") as f:
        f.write(C.canonical_dumps(document) + "\n")
    fp_path = os.path.join(base, "fixtures", "reference_bridge_001_common_model.fingerprint.txt")
    with open(fp_path, "w", encoding="utf-8") as f:
        f.write(C.semantic_fingerprint(document) + "\n")
    parity_path = os.path.join(base, "validation", "golden_to_common_model_parity.csv")
    with open(parity_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(parity_rows[0].keys()))
        w.writeheader()
        w.writerows(parity_rows)
    print(f"fixture: {fixture_path}")
    print(f"fingerprint: {fp_path}")
    print(f"parity: {parity_path}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.getcwd())
    args = ap.parse_args()
    document, parity_rows = build_document(args.root)
    write_outputs(args.root, document, parity_rows)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
