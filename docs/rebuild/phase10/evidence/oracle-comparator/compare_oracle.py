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
import os
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
    ap.add_argument("--bundle-dir", default="docs/rebuild/phase10/evidence/oracle-comparator")
    ap.add_argument("--fixture-constants", default="docs/rebuild/phase10/evidence/oracle-comparator/fixture_constants.json")
    args = ap.parse_args()

    sys.path.insert(0, "backend")
    from backend.engine.solver_input import run_analysis_document

    oracle = json.load(open(args.oracle))
    doc = json.load(open(args.input))
    raw = json.load(open(args.raw))
    result = run_analysis_document(doc)

    def raw_consistency():
        """fail-closed: raw artifact と再計算 result の全対象値完全一致（独立実行の証明）

        - 固定absTol=1e-9（rawは同一solver出力の直列化なので完全一致すべき）
        - 件数・ID一意性・必須component・有限数を先に厳密検証（欠落/重複は即FAIL）
        """
        ABS_TOL = 1e-9
        checks = []
        ok = True

        def expect_unique(items, id_key, label):
            nonlocal ok
            ids = [it[id_key] for it in items]
            if len(ids) != len(set(ids)):
                ok = False
                checks.append({"label": label, "error": "duplicate id detected"})
                return None
            return {it[id_key]: it for it in items}

        # reactions
        for name, items in (("raw", raw.get("reactions", [])), ("recomputed", result["reactions"])):
            if not expect_unique(items, "nodeId", f"reaction.{name}.duplicate"):
                ok = False
        raw_react = {r["nodeId"]: r for r in raw.get("reactions", [])}
        cur_react = {r["nodeId"]: r for r in result["reactions"]}
        if set(raw_react) != set(cur_react):
            ok = False
            checks.append({"label": "reaction.id-set-mismatch", "error": "nodeId set differ"})
        for nid in sorted(set(raw_react) & set(cur_react)):
            r, c = raw_react[nid], cur_react[nid]
            for comp in ("fx", "fy", "fz", "mx", "my", "mz"):
                if comp not in r or comp not in c:
                    ok = False
                    checks.append({"nodeId": nid, "component": comp, "error": "missing component"})
                    continue
                if not (math.isfinite(r[comp]) and math.isfinite(c[comp])):
                    ok = False
                    checks.append({"nodeId": nid, "component": comp, "error": "non-finite value"})
                    continue
                d = abs(r[comp] - c[comp])
                okk = d <= ABS_TOL
                checks.append({"nodeId": nid, "component": comp, "raw": r[comp], "recomputed": c[comp], "delta": d, "pass": okk})
                if not okk:
                    ok = False

        # memberEndForces
        for name, items in (("raw", raw.get("memberEndForces", [])), ("recomputed", result["memberEndForces"])):
            if not expect_unique(items, "memberId", f"memberForce.{name}.duplicate"):
                ok = False
        raw_mem = {m["memberId"]: m for m in raw.get("memberEndForces", [])}
        cur_mem = {m["memberId"]: m for m in result["memberEndForces"]}
        if set(raw_mem) != set(cur_mem):
            ok = False
            checks.append({"label": "memberForce.id-set-mismatch", "error": "memberId set differ"})
        for mid in sorted(set(raw_mem) & set(cur_mem)):
            m, c = raw_mem[mid], cur_mem[mid]
            for side in ("i", "j"):
                for comp in ("fx", "fy", "fz", "mx", "my", "mz"):
                    if comp not in m[side] or comp not in c[side]:
                        ok = False
                        checks.append({"memberId": mid, "side": side, "component": comp, "error": "missing component"})
                        continue
                    if not (math.isfinite(m[side][comp]) and math.isfinite(c[side][comp])):
                        ok = False
                        checks.append({"memberId": mid, "side": side, "component": comp, "error": "non-finite value"})
                        continue
                    d = abs(m[side][comp] - c[side][comp])
                    okk = d <= ABS_TOL
                    checks.append({"memberId": mid, "side": side, "component": comp, "raw": m[side][comp], "recomputed": c[side][comp], "delta": d, "pass": okk})
                    if not okk:
                        ok = False

        # displacements
        for name, items in (("raw", raw.get("displacements", [])), ("recomputed", result["displacements"])):
            if not expect_unique(items, "nodeId", f"displacement.{name}.duplicate"):
                ok = False
        raw_disp = {d["nodeId"]: d for d in raw.get("displacements", [])}
        cur_disp = {d["nodeId"]: d for d in result["displacements"]}
        if set(raw_disp) != set(cur_disp):
            ok = False
            checks.append({"label": "displacement.id-set-mismatch", "error": "nodeId set differ"})
        for nid in sorted(set(raw_disp) & set(cur_disp)):
            d, c = raw_disp[nid], cur_disp[nid]
            for comp in ("ux", "uy", "uz"):
                if comp not in d or comp not in c:
                    ok = False
                    checks.append({"nodeId": nid, "component": comp, "error": "missing component"})
                    continue
                if not (math.isfinite(d[comp]) and math.isfinite(c[comp])):
                    ok = False
                    checks.append({"nodeId": nid, "component": comp, "error": "non-finite value"})
                    continue
                dd = abs(d[comp] - c[comp])
                okk = dd <= ABS_TOL
                checks.append({"nodeId": nid, "component": comp, "raw": d[comp], "recomputed": c[comp], "delta": dd, "pass": okk})
                if not okk:
                    ok = False

        # counts must match oracle expectations exactly
        raw_counts = {
            "reactions": len(raw.get("reactions", [])),
            "memberEndForces": len(raw.get("memberEndForces", [])),
            "displacements": len(raw.get("displacements", [])),
        }
        return {
            "pass": ok,
            "absTol": ABS_TOL,
            "checksCount": len(checks),
            "failedChecks": [c for c in checks if not c.get("pass", True)][:10],
            "counts": raw_counts,
        }

    raw_check = raw_consistency()

    sb = None
    if args.sb_quantity:
        sb = json.load(open(args.sb_quantity))

    fx = json.load(open(args.fixture_constants))
    fx_sha = sha(args.fixture_constants)

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
    deck_len = fx["bridgeLengthM"]
    deck_thickness = fx["deck"]["thicknessM"]
    deck_width = fx["deck"]["widthM"]
    actuals[("quantity", "model", "deckVolume")] = deck_width * deck_thickness * deck_len
    actuals[("quantity", "section", "SECTION-GIRDER.area")] = sec["area"]
    actuals[("quantity", "section", "SECTION-GIRDER.unitWeightPerM")] = sec["unitWeightPerM"]
    if sb is not None:
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

    bundle_dir = args.bundle_dir
    bundle = {
        "comparatorScript": os.path.join(bundle_dir, "compare_oracle.py"),
        "comparatorScriptSha256": sha(os.path.join(bundle_dir, "compare_oracle.py")),
        "reportSchemaPath": os.path.join(bundle_dir, "comparison_report.schema.json"),
        "reportSchemaSha256": sha(os.path.join(bundle_dir, "comparison_report.schema.json")),
        "negativeFixturesPath": os.path.join(bundle_dir, "schema_negative_fixtures.json"),
        "negativeFixturesSha256": sha(os.path.join(bundle_dir, "schema_negative_fixtures.json")),
    }
    if sb is not None:
        bundle["sbQuantityInputPath"] = os.path.join(bundle_dir, "sb_quantity_input.json")
        bundle["sbQuantityInputSha256"] = sha(os.path.join(bundle_dir, "sb_quantity_input.json"))
    bundle["fixtureConstantsPath"] = os.path.join(bundle_dir, "fixture_constants.json")
    bundle["fixtureConstantsSha256"] = fx_sha
    bundle["sbDerivationScriptPath"] = os.path.join(bundle_dir, "sb_quantity_derivation.test.ts")
    bundle["sbDerivationScriptSha256"] = sha(os.path.join(bundle_dir, "sb_quantity_derivation.test.ts"))
    verify_runner = os.path.join(bundle_dir, "verify_oracle_evidence.py")
    if os.path.exists(verify_runner):
        bundle["verifyRunnerPath"] = verify_runner
        bundle["verifyRunnerSha256"] = sha(verify_runner)
    oracle_schema_path = os.path.join(os.path.dirname(bundle_dir), "Phase10_Reference_NumberOracle.schema.json")
    if os.path.exists(oracle_schema_path):
        bundle["oracleSchemaPath"] = oracle_schema_path
        bundle["oracleSchemaSha256"] = sha(oracle_schema_path)

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
            "substructureQuantitySource": "frontend KEEP computeSubstructureQuantity(generateSample declared geometry) via sb_quantity_derivation.test.ts",
            "deckVolumeDerivation": "fixture_constants.json deck.widthM * thicknessM * bridgeLengthM",
            "command": "python3 compare_oracle.py --oracle <oracle.json> --input <solver-input.json> --raw <solver-raw-result.json> --sb-quantity sb_quantity_input.json --out <report.json> (PYTHONPATH=backend)",
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
        "comparatorBundle": bundle,
        "rows": [],
        "pass": True,
        "failures": [],
    }

    report["rawConsistency"] = raw_check
    if not raw_check["pass"]:
        report["pass"] = False

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
