#!/usr/bin/env python3
"""
Round-trip / parity validation for the Reference Bridge 001 Common Model fixture.

Checks (P5-3):
  1. fixture validates against canonical JSON Schema + semantic rules
  2. serialization -> deserialization -> semantic parity (all IDs/values/units/
     states/traceability/report refs/drawing refs preserved)
  3. canonical serialization is deterministic (serialize twice, identical text)
  4. semantic fingerprint reproducibility (recomputed == checked-in fingerprint)
  5. Golden count reconciliation: golden records == parity rows == traceability links
  6. unexplained unmapped = 0
  7. conflict / HCR / HOLD preservation
  8. analysisReference empty state preserved
  9. 141-sheet drawing coverage
  10. bridge ID / entity count / entity IDs preserved

Exit 0 on PASS.
"""

import argparse
import csv
import json
import os
import sys
from collections import Counter

import common_model as C

RB = "docs/apollo/step10/reference_bridge_001"
FIXTURE = os.path.join(RB, "phase5", "fixtures", "reference_bridge_001_common_model.json")
FINGERPRINT = os.path.join(RB, "phase5", "fixtures",
                           "reference_bridge_001_common_model.fingerprint.txt")
PARITY = os.path.join(RB, "phase5", "validation", "golden_to_common_model_parity.csv")


def load(root, rel):
    with open(os.path.join(root, rel), encoding="utf-8") as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.getcwd())
    args = ap.parse_args()
    root = args.root
    doc = load(root, FIXTURE)
    fails = []
    checks = 0

    def check(label, ok, detail=""):
        nonlocal checks
        checks += 1
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {label}" + (f" :: {detail}" if detail else ""))
        if not ok:
            fails.append(f"{label} :: {detail}")

    # 1. fixture schema + semantic validation
    sys.path.insert(0, os.path.join(root, RB, "phase5", "tools"))
    from validate_common_bridge_model import load_normalized_schema, validate_semantic, SCHEMA_REL
    from jsonschema import Draft202012Validator
    schema = load_normalized_schema(os.path.join(root, SCHEMA_REL))
    schema_errors = list(Draft202012Validator(schema).iter_errors(doc))
    check("fixture JSON Schema validation", not schema_errors,
          f"{len(schema_errors)} errors" if schema_errors else "")
    sem = validate_semantic(doc)
    check("fixture semantic validation", not sem, f"{len(sem)} issues" if sem else "")

    # 2. round-trip semantic parity
    rt = C.round_trip(doc)
    check("round-trip semantic parity", C.semantic_parity(doc, rt))
    # entity count / ids / bridge id preserved
    def entity_ids(d):
        out = []
        for layer in ("alignments", "bridgeGeometry", "structuralModel", "materials",
                      "sections", "loads", "design", "reportSpecification", "drawingSpecification"):
            for k, v in d[layer].items():
                if isinstance(v, list):
                    out.extend(e["id"] for e in v)
        return out
    check("entity count preserved", len(entity_ids(doc)) == len(entity_ids(rt)))
    check("entity IDs preserved", sorted(entity_ids(doc)) == sorted(entity_ids(rt)))
    check("bridge ID preserved", doc["metadata"]["bridgeId"] == rt["metadata"]["bridgeId"]
          == "RB-S10-001")
    check("schema version preserved", rt["schemaVersion"] == "1.0.0")

    # 3. deterministic canonical serialization
    check("deterministic serialization", C.serialize(doc) == C.serialize(rt))

    # 4. fingerprint reproducibility
    fp = C.semantic_fingerprint(doc)
    with open(os.path.join(root, FINGERPRINT), encoding="utf-8") as f:
        checked = f.read().strip()
    check("fingerprint reproducibility", fp == checked, fp)

    # 5/6. golden reconciliation + unexplained unmapped
    with open(os.path.join(root, PARITY), newline="", encoding="utf-8") as f:
        parity = list(csv.DictReader(f))
    golden_total = 141 + 67 + 99 + 3650
    check("parity rows == golden records", len(parity) == golden_total,
          f"{len(parity)} vs {golden_total}")
    check("traceability links == golden records", len(doc["traceability"]["links"]) == golden_total,
          f"{len(doc['traceability']['links'])} vs {golden_total}")
    statuses = Counter(r["mapping_status"] for r in parity)
    unmapped = statuses.get("ERROR_UNMAPPED", 0)
    check("unexplained unmapped = 0", unmapped == 0, f"statuses={dict(statuses)}")

    # 7. conflict / HCR / HOLD preservation
    reg = doc["resolutionRegistry"]
    check("CONF-P2II-001 preserved",
          any(c["conflictId"] == "CONF-P2II-001" and c["selected"] is None
              and c["resolutionStatus"] == "UNRESOLVED" and len(c["candidates"]) == 2
              for c in reg["conflicts"]))
    check("HCR-001 preserved",
          any(h["humanConfirmationId"] == "HCR-001" and h["state"] == "PENDING"
              for h in reg["humanConfirmations"]))
    holds = reg["holds"]
    check("HOLD panel-point registry preserved",
          any(h["holdId"] == "HOLD-PANEL-COORDS" and len(h["affectedEntityIds"]) == 50
              for h in holds))
    hcr_count = sum(1 for r in parity if r["mapping_status"] == "MAPPED_WITH_HUMAN_TRACK")
    conf_count = sum(1 for r in parity if r["mapping_status"] == "MAPPED_CONFLICT")
    check("HCR golden count preserved", hcr_count == 95, f"{hcr_count} vs 95")
    check("CONFLICT golden count preserved", conf_count == 7, f"{conf_count} vs 7")
    # HOLD values actually present as HOLD on panel point nodes
    hold_fields = sum(1 for e in doc["structuralModel"]["nodes"]
                      if e["id"].startswith("NODE-1") or e["id"].startswith("NODE-2")
                      for fld in e["fields"].values() if fld.get("state") == "HOLD_INSUFFICIENT_SOURCE")
    check("HOLD values present on panel nodes", hold_fields == 150, f"{hold_fields} vs 150")

    # 8. analysisReference empty state
    check("analysisReference NOT_AVAILABLE preserved",
          doc["analysisReference"]["status"] == "NOT_AVAILABLE" and not doc["analysisReference"]["results"])

    # 9. 141-sheet coverage
    sheets = sorted(e["id"] for e in doc["drawingSpecification"]["sheets"])
    check("141-sheet coverage", len(sheets) == 141
          and sheets[0] == "DWG-S001" and sheets[-1] == "DWG-S141", f"{len(sheets)} sheets")

    # 10. deterministic IDs across round-trip (byte-for-byte entity ids)
    check("entity IDs byte-for-byte after round-trip",
          sorted(entity_ids(doc)) == sorted(entity_ids(rt)))

    overall = "PASS" if not fails else "FAIL"
    print(f"\nCOMMON_MODEL_ROUNDTRIP_PARITY: {overall} ({checks} checks)")
    for f in fails:
        print(f"  FAIL: {f}")
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
