#!/usr/bin/env python3
"""
spacer-oracle-comparator-v1 検証runner（fail-closed・決定論的）

手順:
  1. oracle JSON が Phase10_Reference_NumberOracle.schema.json をPASSすること
  2. 7件のnegative fixtures が全てrejectされること
  3. compare_oracle.py を実行して comparison report を生成（rawConsistency含む）
  4. comparison report が comparison_report.schema.json をPASSすること
  5. 全結果とvalidator version を検証結果JSONに構造化記録

Usage:
    python3 verify_oracle_evidence.py \
      --oracle <oracle.json> \
      --input <solver-input.json> \
      --raw <solver-raw-result.json> \
      --sb-quantity <sb_quantity_input.json> \
      --out <report.json> \
      --report-schema <comparison_report.schema.json> \
      --oracle-schema <oracle.schema.json> \
      --result <verify-result.json>
"""
import argparse
import copy
import json
import subprocess
import sys

import jsonschema


def apply_mutations(oracle):
    """negative fixtures を決定論的に適用した 7 個の不正JSONを生成。"""
    cases = []

    def make():
        return copy.deepcopy(oracle)

    c = make()
    c["coverage"]["components"].pop("i.mx")
    cases.append(("NEG-1", "coverage.components missing i.mx", c))

    c = make()
    c["coverage"]["components"]["i.fx"].pop("nonZeroCount")
    cases.append(("NEG-2", "coverage.i.fx missing nonZeroCount", c))

    c = make()
    c["coverage"]["components"]["i.mx"] = {"nonZeroCount": 70}
    cases.append(("NEG-3", "coverage.i.mx has nonZeroCount instead of maxAbsBound", c))

    c = make()
    c["coverage"]["components"]["j.fy"] = {"nonZeroCount": 70}
    cases.append(("NEG-4", "coverage extra component j.fy", c))

    c = make()
    row = c["rows"][0]
    row["entityId"] = "*"
    row.pop("wildcard", None)
    cases.append(("NEG-5", "row entityId='*' without wildcard", c))

    c = make()
    row = c["rows"][0]
    row["wildcard"] = "all-members"
    row["entityId"] = "X"
    cases.append(("NEG-6", "row wildcard=all-members but entityId!='*'", c))

    c = make()
    c["coverage"]["components"] = {}
    cases.append(("NEG-7", "coverage empty components object", c))

    return cases


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--oracle", required=True)
    ap.add_argument("--input", required=True)
    ap.add_argument("--raw", required=True)
    ap.add_argument("--sb-quantity", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--report-schema", required=True)
    ap.add_argument("--oracle-schema", required=True)
    ap.add_argument("--result", required=True)
    ap.add_argument("--comparator", default="docs/rebuild/phase10/evidence/oracle-comparator/compare_oracle.py")
    args = ap.parse_args()

    oracle = json.load(open(args.oracle))
    oracle_schema = json.load(open(args.oracle_schema))
    report_schema = json.load(open(args.report_schema))

    validator = f"jsonschema {jsonschema.__version__} Draft202012Validator"

    # 1) oracle validates
    ov = jsonschema.Draft202012Validator(oracle_schema)
    oracle_ok = ov.is_valid(oracle)
    print("oracle validates:", oracle_ok)

    # 2) negative fixtures all reject
    neg_results = []
    for fid, name, mutated in apply_mutations(oracle):
        rejected = not ov.is_valid(mutated)
        neg_results.append({"id": fid, "name": name, "expected": "reject", "result": ("reject" if rejected else "PASS(!!)")})
        print(f"{fid} rejected:", rejected)
    neg_ok = all(r["result"] == "reject" for r in neg_results)

    # 3) run comparator
    cmd = [sys.executable, args.comparator, "--oracle", args.oracle, "--input", args.input,
           "--raw", args.raw, "--sb-quantity", args.sb_quantity, "--out", args.out]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    print("comparator rc:", proc.returncode)
    if proc.returncode != 0:
        print(proc.stderr[-2000:])
        sys.exit(1)
    report = json.load(open(args.out))
    report_pass = report.get("pass") is True
    print("report pass:", report_pass)

    # 4) report validates
    rv = jsonschema.Draft202012Validator(report_schema)
    report_ok = rv.is_valid(report)
    print("report validates:", report_ok)

    # 5) record
    result = {
        "comparatorId": "spacer-oracle-comparator-v1",
        "validator": validator,
        "oracleSchemaValid": oracle_ok,
        "negativeFixtures": {"count": len(neg_results), "allRejected": neg_ok, "cases": neg_results},
        "comparison": {"pass": report_pass, "rows": len(report.get("rows", [])), "failures": len(report.get("failures", [])), "rawConsistency": report.get("rawConsistency")},
        "reportSchemaValid": report_ok,
        "overallPass": oracle_ok and neg_ok and report_pass and report_ok,
    }
    json.dump(result, open(args.result, "w"), indent=1)
    print("OVERALL PASS:", result["overallPass"])
    if not result["overallPass"]:
        sys.exit(2)


if __name__ == "__main__":
    main()
