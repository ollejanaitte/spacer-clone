#!/usr/bin/env python3
"""下部工スキーマ検証スクリプト。正常・異常データを検証する。"""
import json
import os
import sys

try:
    from jsonschema import validate, ValidationError, SchemaError, Draft202012Validator
    from referencing import Registry, Resource
except ImportError:
    print("Python jsonschema / referencing がありません: pip install jsonschema")
    sys.exit(2)

HERE = os.path.dirname(os.path.abspath(__file__))
PLANNING = os.path.dirname(HERE)  # substructure-planning
REPO_ROOT = os.path.dirname(PLANNING)  # spacer-clone ルート（統合後）または LAB の親

def _first_dir(*paths):
    for p in paths:
        if os.path.isdir(p):
            return p
    return None

# 配置は LAB（schemas/ が隣接）と統合先（repo-root の schemas/substructure/）で異なる
SCHEMA_DIR = _first_dir(
    os.path.join(REPO_ROOT, "schemas", "substructure"),
    os.path.join(PLANNING, "schemas"),
) or os.path.join(PLANNING, "schemas")

SAMPLE_CANDIDATES = [
    os.path.join(REPO_ROOT, "substructure-planning", "examples", "sample-project.json"),
    os.path.join(SCHEMA_DIR, "sample-project.json"),
]

def load(name):
    p = os.path.join(SCHEMA_DIR, name)
    with open(p, encoding="utf-8") as f:
        return json.load(f)

def load_sample():
    for p in SAMPLE_CANDIDATES:
        if os.path.isfile(p):
            with open(p, encoding="utf-8") as f:
                return json.load(f)
    raise FileNotFoundError("sample-project.json が見つかりません: " + "; ".join(SAMPLE_CANDIDATES))

def build_registry():
    files = [
        "substructure-project.schema.json",
        "support-interface.schema.json",
        "pier.schema.json",
        "abutment.schema.json",
        "foundation.schema.json",
    ]
    resources = {}
    for f in files:
        schema = load(f)
        sid = schema.get("$id")
        if sid:
            resources[sid] = Resource.from_contents(schema)
    return Registry(resources=resources)

def check(label, schema, data, expect_valid):
    try:
        validator = Draft202012Validator(schema, registry=build_registry())
        errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
        ok = (len(errors) == 0)
        err = "; ".join(e.message for e in errors[:3])
    except SchemaError as e:
        ok = False
        err = "SCHEMA_ERROR: " + e.message
    passed = (ok == expect_valid)
    print(f"[{'PASS' if passed else 'FAIL'}] {label}: expect_valid={expect_valid} got_valid={ok}"
          + (f" -- {err}" if err else ""))
    return passed

def main():
    results = []
    proj_schema = load("substructure-project.schema.json")
    ifc_schema = load("support-interface.schema.json")
    sample = load_sample()

    print("=== verifier: schema_validation ===")
    # valid
    results.append(check("正常データ検証(sample-project)", proj_schema, sample, True))

    # 負の寸法
    bad_neg = json.loads(json.dumps(sample))
    bad_neg["supports"][0]["pier"]["column"]["width"] = -1.0
    results.append(check("負の寸法の拒否(column.width=-1)", proj_schema, bad_neg, False))

    # ゼロ寸法
    bad_zero = json.loads(json.dumps(sample))
    bad_zero["supports"][0]["pier"]["column"]["height"] = 0
    results.append(check("ゼロ寸法の拒否(column.height=0)", proj_schema, bad_zero, False))

    # 必須項目欠落
    bad_missing = json.loads(json.dumps(sample))
    del bad_missing["coordinateSystem"]
    results.append(check("必須欠落の拒否(coordinateSystem欠落)", proj_schema, bad_missing_removed(bad_missing), False))
    # 単位系不明
    bad_unit = json.loads(json.dumps(sample))
    bad_unit["unitSystem"] = "imperial"
    results.append(check("単位系不明時(si^でない)の拒否", proj_schema, bad_unit, False))
    # 座標系不明
    bad_coord = json.loads(json.dumps(sample))
    bad_coord["coordinateSystem"] = "y-up-left-handed"
    results.append(check("座標系不明時の拒否", proj_schema, bad_coord, False))
    # schemaVersion不一致
    bad_ver = json.loads(json.dumps(sample))
    bad_ver["schemaVersion"] = "1.0.0"
    results.append(check("schemaVersion不一致の拒否", proj_schema, bad_ver, False))
    # 未対応構造形式
    bad_form = json.loads(json.dumps(sample))
    bad_form["supports"][0]["pier"]["formType"] = "two_column"
    results.append(check("未対応構造成形の拒否(formType=two_column)", proj_schema, bad_form, False))
    # 未対応部位サイズ・ピア構造
    bad_ptype = json.loads(json.dumps(sample))
    bad_ptype["supports"][0]["supportType"] = "virtual_pier"
    results.append(check("未対応supportTypeの拒否(virtual_pier)", proj_schema, bad_ptype, False))

    print("\n=== verifier: support-interface) ===")
    ifc = {
        "schemaVersion": "0.1.0",
        "projectId": "proj-x",
        "supportId": "P1",
        "supportType": "pier",
        "sourceApplication": "spacer-clone",
        "sourceVersion": "0.3.0-preview",
        "coordinateSystem": "x-longitudinal-y-transverse-z-up",
        "unitSystem": "si",
        "origin": {"x": 0, "y": 0, "z": 0},
        "position": {"x": 0, "y": 0, "z": 0},
        "bearingSeats": [
            {
                "bearingId": "B1",
                "bearingPosition": {"x": 0, "y": -3.25, "z": 6.0},
                "bearingDimensions": {"w": 0.5, "d": 0.5, "h": 0.2},
                "bearingHeight": 0.25
            }
        ],
        "girderBottomElevation": 6.0,
        "deckElevation": 6.4,
        "reactionCases": [
            {"caseId": "DL", "caseKind": "permanent", "force": {"x": 0, "y": 0, "z": -2000}}
        ]
    }
    results.append(check("support-interface 正常(反例あり)", ifc_schema, ifc, True))
    ifc_noreact = json.loads(json.dumps(ifc))
    del ifc_noreact["reactionCases"]
    results.append(check("support-interface 反離なしでも可能", ifc_schema, ifc_noreact, True))
    bad_ifc = json.loads(json.dumps(ifc))
    bad_ifc["coordinateSystem"] = "y-up"
    results.append(check("support-interface 座標系不明拒否", ifc_schema, bad_ifc, False))

    passed_count = sum(results)
    print(f"\n=== 結果 {passed_count}/{len(results)} PASS ===")
    return 0 if passed_count == len(results) else 1

def bad_missing_removed(d):
    return d

if __name__ == "__main__":
    sys.exit(main())