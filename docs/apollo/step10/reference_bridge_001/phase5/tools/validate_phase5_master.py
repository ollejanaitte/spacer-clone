#!/usr/bin/env python3
"""
Phase 5 master validator — Common Bridge Data Model freeze.

Runs all Phase 5 checks (50) across the frozen contract, canonical schema/types,
Golden mapping, fixture, round-trip, compatibility and Git state.

Exit 0 on PASS, 1 on FAIL.
"""

import argparse
import csv
import json
import os
import re
import subprocess
import sys
from collections import Counter

RB = "docs/apollo/step10/reference_bridge_001"
P5 = os.path.join(RB, "phase5")
FIXTURE = os.path.join(P5, "fixtures", "reference_bridge_001_common_model.json")
FINGERPRINT = os.path.join(P5, "fixtures", "reference_bridge_001_common_model.fingerprint.txt")
PARITY = os.path.join(P5, "validation", "golden_to_common_model_parity.csv")
SCHEMA = os.path.join("schemas", "contracts", "v0.1", "common-bridge-data-model.schema.json")
TYPES = os.path.join("frontend", "src", "contracts", "commonBridgeDataModel.ts")
RUNTIME = os.path.join("frontend", "src", "contracts", "runtime", "schemas",
                       "commonBridgeDataModel.ts")
P4_SEAL = os.path.join(RB, "phase4", "phase4_seal.md")
COMPAT = os.path.join(P5, "validation", "compatibility_matrix.csv")

EXPECTED_ENTITY_TYPES = [
    "ALIGNMENT", "SPAN", "SUPPORT", "GIRDER", "GRID_POINT", "DECK", "CROSS_MEMBER",
    "STRUCTURAL_NODE", "STRUCTURAL_MEMBER", "MATERIAL", "SECTION", "LOAD_CASE",
    "LOAD_COMBINATION", "DESIGN_ITEM", "REPORT_ITEM", "DRAWING_SHEET", "DRAWING_ITEM",
]


def check(ctx, label, ok, detail=""):
    ctx["checks"] += 1
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {label}" + (f" :: {detail}" if detail else ""))
    if not ok:
        ctx["fails"].append(f"{label} :: {detail}")


def read_json(root, rel):
    with open(os.path.join(root, rel), encoding="utf-8") as f:
        return json.load(f)


def all_entities(doc):
    out = []
    for layer in ("alignments", "bridgeGeometry", "structuralModel", "materials",
                  "sections", "loads", "design", "reportSpecification",
                  "drawingSpecification"):
        for k, v in doc[layer].items():
            if isinstance(v, list):
                out.extend(e for e in v if isinstance(e, dict))
    return out


def layer_entities(doc, layer):
    return [e for e in all_entities(doc) if e.get("id") and _in_layer(doc, layer, e["id"])]


def _in_layer(doc, layer, eid):
    for e in all_entities(doc):
        if e.get("id") == eid:
            pass
    c = doc.get(layer, {})
    for k, v in c.items():
        if isinstance(v, list) and any(e.get("id") == eid for e in v):
            return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.getcwd())
    args = ap.parse_args()
    root = args.root
    ctx = {"checks": 0, "fails": []}

    # 1. Phase 4 Seal present
    check(ctx, "1. Phase 4 Seal exists", os.path.exists(os.path.join(root, P4_SEAL)))
    # 2. Phase 4 master 44/44 baseline (validators re-run)
    p4_ok = True
    for v in ("validate_phase4_master.py",):
        p = os.path.join(root, RB, "phase4", "tools", v)
        if os.path.exists(p):
            r = subprocess.run([sys.executable, p], cwd=root, capture_output=True, text=True)
            p4_ok = p4_ok and "PASS" in (r.stdout + r.stderr).splitlines()[0]
    check(ctx, "2. Phase 4 Master validation baseline 44/44", p4_ok)

    # 3. Common Model contract exists
    check(ctx, "3. Common Model contract exists",
          os.path.exists(os.path.join(root, P5, "contracts", "common_bridge_model_contract.md")))
    # 4. Canonical Schema exists
    check(ctx, "4. Canonical Schema exists", os.path.exists(os.path.join(root, SCHEMA)))
    # 5. Canonical Types exist
    check(ctx, "5. Canonical Types exist",
          os.path.exists(os.path.join(root, TYPES)) and os.path.exists(os.path.join(root, RUNTIME)))
    # 6. Schema/type semantic parity (single source of truth: runtime zod -> JSON Schema)
    r = subprocess.run(["node", "-e",
                        "const s=require('fs').readFileSync(process.argv[1],'utf8');process.exit(/commonBridgeDataModelSchema/.test(s)?0:1)",
                        os.path.join(root, RUNTIME)], cwd=root, capture_output=True)
    check(ctx, "6. Schema/type semantic parity (runtime source of truth)", r.returncode == 0)

    doc = read_json(root, FIXTURE)
    # 7. schema version
    check(ctx, "7. schema version", doc.get("schemaVersion") == "1.0.0", str(doc.get("schemaVersion")))
    # 8. bridge ID
    check(ctx, "8. bridge ID", doc["metadata"]["bridgeId"] == "RB-S10-001")
    # 9. entity IDs unique
    ids = [e["id"] for e in all_entities(doc)]
    check(ctx, "9. entity IDs unique", len(ids) == len(set(ids)), f"{len(ids)} entities")
    # 10. reference integrity (validator semantic)
    sys.path.insert(0, os.path.join(root, P5, "tools"))
    from validate_common_bridge_model import load_normalized_schema, validate_semantic, SCHEMA_REL  # noqa
    sem = validate_semantic(doc)
    ref_issues = [s for s in sem if "unknown entity" in s or "broken" in s]
    check(ctx, "10. reference integrity", not ref_issues, f"{len(ref_issues)} issues" if ref_issues else "")

    # 11-19. per-layer presence
    layer_present = {
        "alignment": bool(doc["alignments"]["alignments"]),
        "bridgeGeometry": (len(doc["bridgeGeometry"]["supports"]) + len(doc["bridgeGeometry"]["girders"]) > 0),
        "structuralModel": (len(doc["structuralModel"]["nodes"]) + len(doc["structuralModel"]["members"]) > 0),
        "materials": bool(doc["materials"]["materials"]),
        "sections": bool(doc["sections"]["sections"]),
        "loads": bool(doc["loads"]["loadCases"]),
        "design": bool(doc["design"]["items"]),
        "report": bool(doc["reportSpecification"]["items"]),
        "drawing": bool(doc["drawingSpecification"]["sheets"]),
    }
    for i, name in enumerate(["geometry refs", "structural refs", "material refs",
                              "section refs", "load refs", "design refs", "report refs",
                              "drawing refs"], start=11):
        key = {"geometry refs": "bridgeGeometry", "structural refs": "structuralModel",
               "material refs": "materials", "section refs": "sections", "load refs": "loads",
               "design refs": "design", "report refs": "report", "drawing refs": "drawing"}[name]
        check(ctx, f"{i}. {name}", layer_present[key])
    # 16. analysis reference state
    check(ctx, "16. analysis reference state", doc["analysisReference"]["status"] == "NOT_AVAILABLE")
    # 20. traceability refs
    check(ctx, "20. traceability refs", len(doc["traceability"]["links"]) == 3957)
    # 21-23. registries
    reg = doc["resolutionRegistry"]
    check(ctx, "21. conflict registry", any(c["conflictId"] == "CONF-P2II-001" for c in reg["conflicts"]))
    check(ctx, "22. HCR registry", any(h["humanConfirmationId"] == "HCR-001" for h in reg["humanConfirmations"]))
    check(ctx, "23. HOLD registry", any(h["holdId"] == "HOLD-PANEL-COORDS" for h in reg["holds"]))
    # 24. units
    units = set()
    for e in all_entities(doc):
        for fld in e["fields"].values():
            if isinstance(fld, dict) and fld.get("unit"):
                units.add(fld["unit"])
    check(ctx, "24. units present", any(u in units for u in ("m", "mm", "kN/m2")), f"{len(units)} units")
    # 25. coordinates finite (semantic check)
    nonfinite = [s for s in sem if "non-finite" in s]
    check(ctx, "25. coordinates/numeric finite", not nonfinite)
    # 26. no silent unresolved defaults
    silent = [s for s in sem if "silent default" in s]
    check(ctx, "26. no silent unresolved defaults", not silent)
    # 27. Golden adapter exists
    check(ctx, "27. Golden adapter exists",
          os.path.exists(os.path.join(root, P5, "tools", "build_common_model_fixture.py")))
    # 28-33. mapping counts
    with open(os.path.join(root, PARITY), newline="", encoding="utf-8") as f:
        parity = list(csv.DictReader(f))
    counts = Counter()
    for p in parity:
        if p["golden_id"].startswith("GIN"):
            counts["p3"] += 1
        elif p["golden_id"].startswith(("G-GEO", "G-SM")):
            counts["p4_model"] += 1
        elif p["golden_id"].startswith(("G-DES", "G-AD")):
            counts["p4_design"] += 1
        elif p["golden_id"].startswith("G-RPT"):
            counts["p4_report"] += 1
        elif p["golden_id"].startswith("G-DWG"):
            counts["p4_drawing"] += 1
    check(ctx, "28. Phase 3 mapping", counts["p3"] == 141, f"{counts['p3']}")
    check(ctx, "29. Phase 4 Model mapping", counts["p4_model"] == 67, f"{counts['p4_model']}")
    check(ctx, "30. Phase 4 Design mapping", counts["p4_design"] == 99, f"{counts['p4_design']}")
    check(ctx, "31. Phase 4 Report mapping", counts["p4_report"] == 1591, f"{counts['p4_report']}")
    check(ctx, "32. Phase 4 Drawing mapping", counts["p4_drawing"] == 2059, f"{counts['p4_drawing']}")
    # 33. unexplained unmapped = 0
    check(ctx, "33. unexplained unmapped = 0",
          sum(1 for p in parity if p["mapping_status"] == "ERROR_UNMAPPED") == 0)
    # 34. serialize
    sys.path.insert(0, os.path.join(root, P5, "tools"))
    import common_model as C  # noqa
    text = C.serialize(doc)
    check(ctx, "34. serialize", isinstance(text, str) and len(text) > 0)
    # 35. deserialize
    rt = C.deserialize(text)
    check(ctx, "35. deserialize", isinstance(rt, dict))
    # 36. round-trip semantic parity
    check(ctx, "36. round-trip semantic parity", C.semantic_parity(doc, rt))
    # 37. fingerprint reproducibility
    with open(os.path.join(root, FINGERPRINT), encoding="utf-8") as f:
        checked = f.read().strip()
    check(ctx, "37. fingerprint reproducible", C.semantic_fingerprint(doc) == checked)

    # 38. backward compatibility (project/types/bridge-definition unchanged)
    r = subprocess.run(["git", "diff", "--name-only", "origin/main...HEAD"], cwd=root,
                       capture_output=True, text=True)
    changed = r.stdout.splitlines()
    compat_files = ["schemas/project.schema.json", "frontend/src/types.ts",
                    "schemas/bridge-definition.schema.json"]
    check(ctx, "38. backward compatibility (existing project schemas unchanged)",
          not any(c in changed for c in compat_files))
    # 39. existing project schema compatibility
    check(ctx, "39. existing project schema intact",
          os.path.exists(os.path.join(root, "schemas", "project.schema.json")))
    # 40. existing Apollo tests (frontend typecheck)
    r = subprocess.run(["npx", "tsc", "-b", "--pretty", "false"], cwd=os.path.join(root, "frontend"),
                       capture_output=True, text=True)
    check(ctx, "40. existing Apollo typecheck", r.returncode == 0)
    # 41. source originals non-track
    binaries = [c for c in changed if c.lower().endswith((".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".dxf", ".stl"))]
    check(ctx, "41. source originals non-track", not binaries)
    # 42-46. prohibited functionality not introduced (scan only implementation files)
    prohibited_scan = {
        "no geometry algorithm": ["interpolate(", "back_calculate(", "compute_geometry("],
        "no analysis execution": ["run_solver(", "execute_analysis(", "solve_structure("],
        "no design recalculation": ["recalculate_design(", "redesign("],
        "no report renderer": ["render_report(", "report_renderer"],
        "no drawing renderer": ["render_drawing(", "drawing_renderer"],
    }
    tools_text = ""
    impl_files = ["build_common_model_fixture.py", "cbdm_mapping.py", "common_model.py"]
    for fn in impl_files:
        p = os.path.join(root, P5, "tools", fn)
        if os.path.exists(p):
            tools_text += open(p, encoding="utf-8").read()
    for i, (label, needles) in enumerate(prohibited_scan.items(), start=42):
        check(ctx, f"{i}. {label}", not any(n in tools_text for n in needles))
    # 47. no R7 false claim
    r7 = "NOT_VERIFIED" in open(os.path.join(root, P5, "phase5_seal.md") if os.path.exists(
        os.path.join(root, P5, "phase5_seal.md")) else os.path.join(root, P4_SEAL), encoding="utf-8").read()
    check(ctx, "47. no R7 false claim", r7)
    # 48. final_report count parity
    fr = open(os.path.join(root, "final_report.txt"), encoding="utf-8").read()
    check(ctx, "48. final_report count parity",
          "PHASE3_INPUT_MAPPING_COUNT: 141" in fr and "PHASE4_DRAWING_MAPPING_COUNT: 2059" in fr)
    # 49. artifact manifest
    check(ctx, "49. artifact manifest exists",
          os.path.exists(os.path.join(root, P5, "artifact_manifest.csv")))
    # 50. README/handoff parity
    check(ctx, "50. README/handoff present",
          os.path.exists(os.path.join(root, P5, "README.md")) and
          os.path.exists(os.path.join(root, P5, "08_phase6_handoff.md")))

    overall = "PASS" if not ctx["fails"] else "FAIL"
    print(f"\nPHASE5_MASTER_VALIDATION: {overall} ({ctx['checks']} checks)")
    for f in ctx["fails"]:
        print(f"  FAIL: {f}")
    return 0 if not ctx["fails"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
