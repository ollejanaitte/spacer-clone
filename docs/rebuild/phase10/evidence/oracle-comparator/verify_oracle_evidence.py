#!/usr/bin/env python3
"""
spacer-oracle-comparator-v1 検証runner（fail-closed・決定論的）

手順:
  1. SB-04導出test（vitest）を実行し、固定 sb_quantity_input.json と厳密比較する
  2. oracle JSON が Phase10_Reference_NumberOracle.schema.json をPASSすること
  3. schema_negative_fixtures.json（唯一正本）の7件が全てrejectされること
  4. compare_oracle.py を実行して comparison report を生成（rawConsistency含む）
  5. comparison report が comparison_report.schema.json をPASSすること
  6. 全結果・runner SHA・全入力SHA・生成report SHA を検証結果JSONに構造化記録

Usage (repository root):
    python3 docs/rebuild/phase10/evidence/oracle-comparator/verify_oracle_evidence.py \
      --oracle docs/rebuild/phase10/Phase10_Reference_NumberOracle.json \
      --input docs/rebuild/phase10/evidence/Phase10_Reference_SolverInput.json \
      --raw docs/rebuild/phase10/evidence/Phase10_Reference_SolverRawResult.json \
      --sb-quantity docs/rebuild/phase10/evidence/oracle-comparator/sb_quantity_input.json \
      --sb-output /tmp/opencode/p10-oracle/sb_quantity_output.json \
      --sb-derivation-test src/next/modules/substructure/__tests__/phase10SbQuantityDerivation.test.ts \
      --fixture-constants docs/rebuild/phase10/evidence/oracle-comparator/fixture_constants.json \
      --negatives docs/rebuild/phase10/evidence/oracle-comparator/schema_negative_fixtures.json \
      --out docs/rebuild/phase10/evidence/Phase10_Reference_NumberOracle_ComparisonReport.json \
      --report-schema docs/rebuild/phase10/evidence/oracle-comparator/comparison_report.schema.json \
      --oracle-schema docs/rebuild/phase10/evidence/Phase10_Reference_NumberOracle.schema.json \
      --result docs/rebuild/phase10/evidence/oracle-comparator/verification_result.json
"""
import argparse
import copy
import hashlib
import json
import os
import subprocess
import sys

import jsonschema


def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def apply_mutation(oracle, mut):
    """schema_negative_fixtures.json の mutation 仕様に従い決定論的に不正JSONを生成。

    仕様: ";"区切りの操作列。各操作 = "pop:PATH" | "set:PATH=VALUE"
    PATHは">"区切り・数値は配列index。VALUEはJSONとして解釈（"*"/"X"等の文字列はそのまま）。"""
    c = copy.deepcopy(oracle)

    def resolve(parent, pathparts):
        node = parent
        for p in pathparts:
            if isinstance(node, list):
                node = node[int(p)]
            else:
                node = node[p]
        return node

    for op_spec in mut["mutation"].split(";"):
        op_spec = op_spec.strip()
        if not op_spec:
            continue
        op, _, rest = op_spec.partition(":")
        parts = rest.split(">")
        if op == "set":
            path, _, raw = rest.partition("=")
            pathparts = path.split(">")
            parent = resolve(c, pathparts[:-1])
            if isinstance(parent, list):
                parent[int(pathparts[-1])] = _parse_val(raw)
            else:
                parent[pathparts[-1]] = _parse_val(raw)
        elif op == "pop":
            pathparts = rest.split(">")
            parent = resolve(c, pathparts[:-1])
            if isinstance(parent, list):
                del parent[int(pathparts[-1])]
            else:
                parent.pop(pathparts[-1], None)
        else:
            raise ValueError(f"unknown mutation op: {op}")
    return c


def _parse_val(raw):
    raw = raw.strip()
    if raw.startswith("{") or raw.startswith("[") or raw.lower() in ("null", "true", "false"):
        return json.loads(raw)
    return raw


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--oracle", required=True)
    ap.add_argument("--input", required=True)
    ap.add_argument("--raw", required=True)
    ap.add_argument("--sb-quantity", required=True)
    ap.add_argument("--sb-output", required=True)
    ap.add_argument("--sb-derivation-test", required=True)
    ap.add_argument("--fixture-constants", required=True)
    ap.add_argument("--negatives", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--report-schema", required=True)
    ap.add_argument("--oracle-schema", required=True)
    ap.add_argument("--result", required=True)
    ap.add_argument("--comparator", default="docs/rebuild/phase10/evidence/oracle-comparator/compare_oracle.py")
    ap.add_argument("--frontend-dir", default="frontend")
    args = ap.parse_args()

    runner_sha = sha(os.path.abspath(__file__))
    oracle = json.load(open(args.oracle))
    oracle_schema = json.load(open(args.oracle_schema))
    report_schema = json.load(open(args.report_schema))
    negatives_spec = json.load(open(args.negatives))
    validator = f"jsonschema {jsonschema.__version__} Draft202012Validator"

    # 0) run SB derivation test and strictly compare with fixed input
    derive_ok = False
    derive_detail = {}
    os.makedirs(os.path.dirname(args.sb_output) or ".", exist_ok=True)
    if os.path.exists(args.sb_output):
        os.remove(args.sb_output)
    env = dict(os.environ)
    env["P10_SB_OUTPUT"] = args.sb_output
    proc = subprocess.run(
        ["npx", "vitest", "run", args.sb_derivation_test],
        cwd=args.frontend_dir, capture_output=True, text=True, env=env,
    )
    print("sb derivation vitest rc:", proc.returncode)
    if proc.returncode == 0 and os.path.exists(args.sb_output):
        derived = json.load(open(args.sb_output))
        fixed = json.load(open(args.sb_quantity))
        # strict: key set + nested structure + exact numeric equality
        derive_ok = derived == fixed
        derive_detail = {"derivedMatchesFixed": derive_ok, "outputPath": args.sb_output, "fixedPath": args.sb_quantity}
    else:
        derive_detail = {"derivedMatchesFixed": False, "error": "vitest failed or output missing", "stderr": (proc.stderr or "")[-1500:]}
    print("SB derivation matches fixed input (strict):", derive_ok)

    # 1) oracle validates
    ov = jsonschema.Draft202012Validator(oracle_schema)
    oracle_ok = ov.is_valid(oracle)
    print("oracle validates:", oracle_ok)

    # 2) negative fixtures all reject (loaded from single-source JSON)
    neg_results = []
    for c in negatives_spec["cases"]:
        mutated = apply_mutation(oracle, c)
        rejected = not ov.is_valid(mutated)
        neg_results.append({"id": c["id"], "name": c["name"], "mutation": c["mutation"], "expected": "reject", "result": ("reject" if rejected else "PASS(!!)")})
        print(f"{c['id']} rejected:", rejected)
    neg_ok = all(r["result"] == "reject" for r in neg_results)

    # 3) run comparator
    cmd = [sys.executable, args.comparator, "--oracle", args.oracle, "--input", args.input,
           "--raw", args.raw, "--sb-quantity", args.sb_quantity,
           "--fixture-constants", args.fixture_constants, "--out", args.out]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    print("comparator rc:", proc.returncode)
    if proc.returncode != 0:
        print((proc.stderr or "")[-2000:])
        sys.exit(1)
    report = json.load(open(args.out))
    report_pass = report.get("pass") is True
    print("report pass:", report_pass)

    # 4) report validates
    rv = jsonschema.Draft202012Validator(report_schema)
    report_ok = rv.is_valid(report)
    print("report validates:", report_ok)

    # 4b) row-key multiset exact match + uniqueness (fail-closed)
    def rowkey(r):
        return (r["kind"], r["entityId"], r["component"])
    oracle_keys = sorted(rowkey(r) for r in oracle["rows"])
    report_keys = sorted(rowkey(r) for r in report.get("rows", []))
    oracle_unique = len(set(oracle_keys)) == len(oracle_keys)
    report_unique = len(set(report_keys)) == len(report_keys)
    row_keys_ok = oracle_keys == report_keys and oracle_unique and report_unique
    print("row-key multiset match:", row_keys_ok)
    print("oracle unique:", oracle_unique, "report unique:", report_unique)

    # 4b2) uniqueness negative: duplicate a report row -> rowKeysMatch must FAIL
    dup_report = dict(report)
    dup_report["rows"] = list(report["rows"]) + [dict(report["rows"][0])]
    dup_keys = sorted(rowkey(r) for r in dup_report["rows"])
    uniqueness_negative_ok = not (dup_keys == oracle_keys and len(set(dup_keys)) == len(dup_keys))
    print("uniqueness negative (dup report row) detected:", uniqueness_negative_ok)

    # 4c) fixture consistency: oracle reference vs fixture constants fixtureId, and report fixtureId/version
    fx = json.load(open(args.fixture_constants))
    oracle_ref = oracle.get("reference")
    fx_id = fx.get("fixtureId")
    report_chain = report.get("inputChainOfCustody", {})
    ref_ok = oracle_ref == fx_id == report_chain.get("fixtureId") == report_chain.get("fixtureVersion")
    # solver input projectId consistency
    doc = json.load(open(args.input))
    project_ok = doc.get("projectId") == report_chain.get("projectId")
    fixture_ok = ref_ok and project_ok
    print("fixture consistency:", fixture_ok)

    # 5) record (chain: runner SHA + all input SHAs + generated report SHA)
    result = {
        "comparatorId": "spacer-oracle-comparator-v1",
        "runnerSha256": runner_sha,
        "validator": validator,
        "inputs": {
            "oracle": {"path": args.oracle, "sha256": sha(args.oracle)},
            "solverInput": {"path": args.input, "sha256": sha(args.input)},
            "rawResult": {"path": args.raw, "sha256": sha(args.raw)},
            "sbQuantityFixed": {"path": args.sb_quantity, "sha256": sha(args.sb_quantity)},
            "sbDerivationTest": {"path": args.sb_derivation_test, "sha256": sha(os.path.join(args.frontend_dir, args.sb_derivation_test))},
            "fixtureConstants": {"path": args.fixture_constants, "sha256": sha(args.fixture_constants)},
            "negativesSpec": {"path": args.negatives, "sha256": sha(args.negatives)},
            "reportSchema": {"path": args.report_schema, "sha256": sha(args.report_schema)},
            "oracleSchema": {"path": args.oracle_schema, "sha256": sha(args.oracle_schema)},
            "comparator": {"path": args.comparator, "sha256": sha(args.comparator)},
        },
        "generatedReportSha256": sha(args.out),
        "sbDerivation": {"executed": True, **derive_detail},
        "oracleSchemaValid": oracle_ok,
        "negativeFixtures": {"count": len(neg_results), "allRejected": neg_ok, "cases": neg_results},
        "comparison": {"pass": report_pass, "rows": len(report.get("rows", [])), "failures": len(report.get("failures", [])), "rawConsistency": report.get("rawConsistency")},
        "reportSchemaValid": report_ok,
        "rowKeysMatch": {"ok": row_keys_ok, "oracleUnique": oracle_unique, "reportUnique": report_unique, "oracleKeyCount": len(oracle_keys), "reportKeyCount": len(report_keys), "uniquenessNegativeDetected": uniqueness_negative_ok},
        "fixtureConsistency": {"ok": fixture_ok, "oracleReference": oracle_ref, "fixtureConstantsId": fx_id, "reportFixtureId": report_chain.get("fixtureId"), "reportFixtureVersion": report_chain.get("fixtureVersion"), "projectIdMatch": project_ok},
        "overallPass": oracle_ok and neg_ok and report_pass and report_ok and derive_ok and row_keys_ok and fixture_ok and uniqueness_negative_ok,
    }
    json.dump(result, open(args.result, "w"), indent=1)
    print("OVERALL PASS:", result["overallPass"])
    if not result["overallPass"]:
        sys.exit(2)


if __name__ == "__main__":
    main()
