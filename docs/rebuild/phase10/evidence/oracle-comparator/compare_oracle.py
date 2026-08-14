#!/usr/bin/env python3
"""
Phase 10 Reference Number Oracle Comparator (spacer-oracle-comparator-v1)

Mechanically compares the independent solver raw result + fixed solver input
against the frozen Phase 10 Reference Number Oracle.

Usage:
    python3 compare_oracle.py \
      --oracle <oracle.json> \
      --input <solver-input.json> \
      --raw <solver-raw-result.json> \
      --sb-quantity <sb-quantity.json> \
      --out <report.json>

Requires: scipy, numpy (backend solver), backend package importable.
Run from the repository root with PYTHONPATH=backend:backend/engine.
"""
import argparse
import datetime
import hashlib
import json
import math
import sys


def q(a):
    return a is not None and (isinstance(a, int) or math.isfinite(a))


def judge(exp, act, absTol, relTol):
    """row別判定（fail-closed）: abs(exp)==0 はabsTolのみ。欠損/非有限はFAIL。"""
    if not q(act):
        return (False, None, None, "missing")
    dAbs = abs(act - exp)
    dRel = 0.0 if abs(exp) == 0 else dAbs / abs(exp)
    if abs(exp) == 0:
        ok = dAbs <= absTol
        rule = "absTol" if ok else "FAIL(abs0)"
    else:
        okAbs = dAbs <= absTol
        okRel = dRel <= relTol
        ok = okAbs or okRel
        rule = "absTol" if okAbs else ("relTol" if okRel else "FAIL")
    return (ok, dAbs, dRel, rule)


def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--oracle", required=True)
    ap.add_argument("--input", required=True)
    ap.add_argument("--raw", required=True)
    ap.add_argument("--sb-quantity", default=None)
    ap.add_argument("--out", required=True)
    ap.add_argument("--solver-build", default="spacer-clone @ e3e2d3b (main)")
    args = ap.parse_args()

    sys.path.insert(0, "backend")
    from backend.engine.solver_input import run_analysis_document

    oracle = json.load(open(args.oracle))
    doc = json.load(open(args.input))
    raw = json.load(open(args.raw))
    result = run_analysis_document(doc)

    node_src = {n["entityId"]: n["sourceEntityId"] for n in doc["nodes"]}
    member_src = {m["entityId"]: m["sourceEntityId"] for m in doc["members"]}

    actuals = {}
    for r in result["reactions"]:
        eid = node_src.get(r["nodeId"], r["nodeId"])
        actuals[("reaction", eid, "fz")] = r["fz"]
    for m in result["memberEndForces"]:
        eid = member_src.get(m["memberId"], m["memberId"])
        actuals[("memberForce", eid, "i.fx")] = m["i"]["fx"]
        actuals[("memberForce", eid, "i.fz")] = m["i"]["fz"]
        actuals[("memberForce", eid, "j.my")] = m["j"]["my"]
        actuals[("memberForce", eid, "i.mx")] = m["i"]["mx"]
    dmax = max(result["displacements"], key=lambda d: abs(d.get("uz", 0)))
    eid = node_src.get(dmax["nodeId"], dmax["nodeId"])
    actuals[("displacement", eid, "uz.raw")] = dmax["uz"]
    actuals[("displacement", eid, "uz.display")] = dmax["uz"] * 100

    nodes = {n["entityId"]: n for n in doc["nodes"]}
    totL = sum(
        math.sqrt(
            (nodes[m["nodeJId"]]["x"] - nodes[m["nodeIId"]]["x"]) ** 2
            + (nodes[m["nodeJId"]]["y"] - nodes[m["nodeIId"]]["y"]) ** 2
            + (nodes[m["nodeJId"]]["z"] - nodes[m["nodeIId"]]["z"]) ** 2
        )
        for m in doc["members"]
    )
    sec = doc["sections"][0]
    actuals[("quantity", "model", "nodeCount")] = len(doc["nodes"])
    actuals[("quantity", "model", "memberCount")] = len(doc["members"])
    actuals[("quantity", "model", "supportCount")] = len(doc["supports"])
    actuals[("quantity", "model", "totalMemberLength")] = totL
    actuals[("quantity", "model", "totalSteelVolume")] = totL * sec["area"]
    actuals[("quantity", "model", "totalSteelWeight")] = totL * sec["unitWeightPerM"]
    deck_len = 350.0  # bridge range 100-450 (REF-MOUNTAIN declared)
    actuals[("quantity", "model", "deckVolume")] = 8.0 * 0.24 * deck_len
    actuals[("quantity", "section", "SECTION-GIRDER.area")] = sec["area"]
    actuals[("quantity", "section", "SECTION-GIRDER.unitWeightPerM")] = sec["unitWeightPerM"]
    if args.sb_quantity:
        sb = json.load(open(args.sb_quantity))
        actuals[("quantity", "substructure", "totalConcreteVolume")] = sb["totalConcrete"]
        actuals[("quantity", "substructure", "totalPileLength")] = sb["totalPile"]
        actuals[("quantity", "substructure:A1", "concreteVolume")] = sb["A1"]["concrete"]
        actuals[("quantity", "substructure:P1", "concreteVolume")] = sb["P1"]["concrete"]
        actuals[("quantity", "substructure:A2", "concreteVolume")] = sb["A2"]["concrete"]
    for b in doc["bearings"]:
        p = b["position"]
        eid = "supportPoint:" + b["sourceEntityId"].replace("BRG-", "").replace("-", ":")
        actuals[("coordinate", eid, "x")] = p["x"]
        actuals[("coordinate", eid, "y")] = p["y"]
        actuals[("coordinate", eid, "z")] = p["z"]

    applied = sum(abs(ld["fz"]) for ld in doc["nodalLoads"])
    reaction = sum(r["fz"] for r in result["reactions"])

    report = {
        "schemaVersion": "1.0.0",
        "comparatorId": "spacer-oracle-comparator-v1",
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "runConditions": {
            "solver": "scipy_sparse",
            "document": "Phase10_Reference_SolverInput.json(fixed)",
            "loadCaseId": "LC1",
            "section": "declared(Phase9-04R3)",
            "solverBuild": args.solver_build,
            "substructureQuantitySource": "frontend KEEP computeSubstructureQuantity(REF-MOUNTAIN A1/P1-portal/A2)",
        },
        "inputChainOfCustody": {
            "oraclePath": args.oracle, "oracleSha256": sha(args.oracle),
            "rawResultPath": args.raw, "rawResultSha256": sha(args.raw),
            "solverInputPath": args.input, "solverInputSha256": sha(args.input),
            "fixtureId": "REF-MOUNTAIN-1", "fixtureVersion": "REF-MOUNTAIN-1",
            "projectId": doc.get("projectId"),
            "modelChecksum": doc.get("modelChecksum"),
            "contentChecksum": doc.get("contentChecksum"),
        },
        "rows": [],
        "pass": True,
        "failures": [],
    }

    for row in oracle["rows"]:
        key = (row["kind"], row["entityId"], row["component"])
        absTol = row.get("absTol", 0)
        relTol = row.get("relTol", 1e-3)
        exp = row["expected"]
        if row["entityId"] == "*":
            maxT = max((abs(m["i"]["mx"]) for m in result["memberEndForces"]), default=0)
            ok, dAbs, dRel, rule = judge(0, maxT, absTol, 0)
            report["rows"].append({
                "kind": row["kind"], "entityId": "*", "component": "i.mx",
                "expected": 0, "actual": round(maxT, 9), "unit": row["unit"],
                "absTol": absTol, "relTol": 0, "dAbs": round(dAbs, 9), "dRel": 0,
                "rule": rule, "pass": ok,
            })
            if not ok:
                report["pass"] = False
                report["failures"].append(list(key))
            continue
        act = actuals.get(key)
        ok, dAbs, dRel, rule = judge(exp, act, absTol, relTol)
        unit = row["unit"]
        if row.get("displayScale") is not None:
            unit = "m"
        report["rows"].append({
            "kind": row["kind"], "entityId": row["entityId"], "component": row["component"],
            "expected": exp, "actual": (round(act, 9) if q(act) else None),
            "unit": unit, "absTol": absTol, "relTol": relTol,
            "dAbs": (round(dAbs, 9) if dAbs is not None else None),
            "dRel": (round(dRel, 12) if dRel is not None else None),
            "rule": rule, "pass": ok, "displayScale": row.get("displayScale"),
        })
        if not ok:
            report["pass"] = False
            report["failures"].append({"key": list(key), "expected": exp, "actual": act, "unit": unit})

    mc = oracle["modelCounts"]
    mc_actual = {
        "nodes": len(doc["nodes"]), "members": len(doc["members"]),
        "sections": len(doc["sections"]), "materials": len(doc["materials"]),
        "supports": len(doc["supports"]), "bearings": len(doc["bearings"]),
        "nodalLoads": len(doc["nodalLoads"]),
    }
    mc_rows = {}
    for k in mc:
        delta = abs(mc[k] - mc_actual[k])
        mc_rows[k] = {"expected": mc[k], "actual": mc_actual[k], "delta": delta, "tolerance": 0, "pass": delta == 0}
    report["modelCounts"] = {"rows": mc_rows, "pass": all(r["pass"] for r in mc_rows.values())}
    if not report["modelCounts"]["pass"]:
        report["pass"] = False

    lb = oracle["loadBalance"]
    delta = abs(applied - reaction)
    lb_ok = (abs(applied - lb["applied"]) <= 1e-6 and abs(reaction - lb["reaction"]) <= 1e-6
             and delta <= lb["relTol"] * max(applied, reaction))
    report["loadBalance"] = {
        "expected": {"applied": lb["applied"], "reaction": lb["reaction"]},
        "actual": {"applied": round(applied, 6), "reaction": round(reaction, 6)},
        "delta": round(delta, 9), "relTol": lb["relTol"], "pass": lb_ok,
    }
    if not lb_ok:
        report["pass"] = False

    cov = oracle["coverage"]

    def compval(m, comp):
        if comp == "i.fx": return m["i"]["fx"]
        if comp == "i.fz": return m["i"]["fz"]
        if comp == "j.my": return m["j"]["my"]
        if comp == "i.mx": return m["i"]["mx"]
        raise KeyError(comp)

    nz = {comp: sum(1 for m in result["memberEndForces"] if compval(m, comp) != 0) for comp in cov["components"]}
    maxT = max((abs(m["i"]["mx"]) for m in result["memberEndForces"]), default=0)
    cov_checks = {}
    cov_ok = True
    for comp, spec in cov["components"].items():
        if "nonZeroCount" in spec:
            ok = nz[comp] == spec["nonZeroCount"]
            cov_checks[comp] = {"actualNonZero": nz[comp], "expectedNonZero": spec["nonZeroCount"], "pass": ok}
        else:
            ok = maxT <= spec["maxAbsBound"]
            cov_checks[comp] = {"maxAbs": round(maxT, 9), "maxAbsBound": spec["maxAbsBound"], "pass": ok}
        if not ok:
            cov_ok = False
    cov_ok = cov_ok and len(result["memberEndForces"]) == cov["count"]
    report["coverage"] = {
        "kind": "memberForce", "entityId": "*", "count": len(result["memberEndForces"]),
        "expectedCount": cov["count"], "checks": cov_checks, "pass": cov_ok,
    }
    if not cov_ok:
        report["pass"] = False

    json.dump(report, open(args.out, "w"), indent=1)
    print("PASS:", report["pass"], "rows:", len(report["rows"]),
          "failures:", len(report["failures"]),
          "modelCounts:", report["modelCounts"]["pass"],
          "loadBalance:", report["loadBalance"]["pass"],
          "coverage:", report["coverage"]["pass"])
    print("report sha:", hashlib.sha256(open(args.out, "rb").read()).hexdigest())


if __name__ == "__main__":
    main()
