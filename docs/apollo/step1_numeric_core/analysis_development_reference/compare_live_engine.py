#!/usr/bin/env python3
"""Compare live /api/analysis/run against independent closed-form references.

UNVERIFIED DEVELOPMENT ONLY. Expected values are read from analytical_reference_results.json
fixed before this comparison (do not edit expected after seeing engine output).
"""

from __future__ import annotations

import json
import urllib.request
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REF = json.loads((ROOT / "analytical_reference_results.json").read_text())
BASE = "http://127.0.0.1:8000"
# Frozen before comparison (DS-07-like defaults for analysis quantities).
A = Decimal("1e-9")
R = Decimal("1e-9")


def project_center_point() -> dict:
    L, E, I, P, A_sec = 4.0, 205_000_000.0, 0.0001, 10.0, 0.02
    G = E / (2.0 * (1.0 + 0.3))
    return {
        "project": {
            "id": "dev-gold-an-002",
            "name": "DEV GOLD-AN-002",
            "schemaVersion": "1.0.0",
            "description": "development-only",
            "createdAt": "2026-08-02T00:00:00Z",
            "updatedAt": "2026-08-02T00:00:00Z",
        },
        "units": {
            "length": "m",
            "force": "kN",
            "moment": "kN_m",
            "modulus": "kN_per_m2",
            "area": "m2",
            "inertia": "m4",
        },
        "nodes": [
            {"id": "N1", "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": "N2", "x": L / 2.0, "y": 0.0, "z": 0.0},
            {"id": "N3", "x": L, "y": 0.0, "z": 0.0},
        ],
        "materials": [
            {
                "id": "MAT1",
                "name": "Steel",
                "elasticModulus": E,
                "shearModulus": G,
                "poissonRatio": 0.3,
                "density": 0.0,
            }
        ],
        "sections": [
            {
                "id": "SEC1",
                "name": "Verification Section",
                "area": A_sec,
                "iy": I,
                "iz": I,
                "j": 0.00005,
            }
        ],
        "members": [
            {
                "id": "M1",
                "nodeI": "N1",
                "nodeJ": "N2",
                "materialId": "MAT1",
                "sectionId": "SEC1",
                "orientationVector": {"x": 0.0, "y": 1.0, "z": 0.0},
            },
            {
                "id": "M2",
                "nodeI": "N2",
                "nodeJ": "N3",
                "materialId": "MAT1",
                "sectionId": "SEC1",
                "orientationVector": {"x": 0.0, "y": 1.0, "z": 0.0},
            },
        ],
        "supports": [
            {
                "nodeId": "N1",
                "ux": True,
                "uy": True,
                "uz": True,
                "rx": True,
                "ry": True,
                "rz": False,
            },
            {
                "nodeId": "N3",
                "ux": False,
                "uy": True,
                "uz": True,
                "rx": True,
                "ry": True,
                "rz": False,
            },
        ],
        "loadCases": [{"id": "LC1", "name": "LC1", "type": "static"}],
        "nodalLoads": [
            {
                "id": "NL1",
                "loadCaseId": "LC1",
                "nodeId": "N2",
                "fx": 0.0,
                "fy": -P,
                "fz": 0.0,
                "mx": 0.0,
                "my": 0.0,
                "mz": 0.0,
            }
        ],
        "memberLoads": [],
        "massCases": [],
        "analysisSettings": {
            "analysisType": "linear_static",
            "solver": "scipy_sparse",
            "includeShearDeformation": False,
            "largeDisplacement": False,
            "tolerance": 1e-9,
        },
    }


def project_udl() -> dict:
    p = project_center_point()
    p["project"]["id"] = "dev-gold-an-001"
    p["project"]["name"] = "DEV GOLD-AN-001"
    p["nodalLoads"] = []
    W = 2.0
    p["memberLoads"] = [
        {
            "id": "ML1",
            "loadCaseId": "LC1",
            "memberId": "M1",
            "coordinateSystem": "local",
            "type": "uniform",
            "wx": 0.0,
            "wy": -W,
            "wz": 0.0,
        },
        {
            "id": "ML2",
            "loadCaseId": "LC1",
            "memberId": "M2",
            "coordinateSystem": "local",
            "type": "uniform",
            "wx": 0.0,
            "wy": -W,
            "wz": 0.0,
        },
    ]
    return p


def post_analysis(project: dict) -> dict:
    req = urllib.request.Request(
        f"{BASE}/api/analysis/run",
        data=json.dumps({"project": project, "loadCaseId": "LC1"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def by_id(rows, key, value):
    for row in rows:
        if row.get(key) == value:
            return row
    raise KeyError(value)


def cmp(name: str, expected: Decimal, actual: float) -> dict:
    act = Decimal(str(actual))
    abs_diff = abs(act - expected)
    thr = max(A, R * abs(expected))
    return {
        "quantity": name,
        "expected": format(expected, "f"),
        "actual": format(act, "f"),
        "absoluteDifference": format(abs_diff, "f"),
        "threshold": format(thr, "f"),
        "verdict": "PASS" if abs_diff <= thr else "FAIL",
    }


def evaluate_case(case_id: str, project: dict) -> dict:
    ref = REF["cases"][case_id]
    raw = post_analysis(project)
    result = raw.get("result", raw)
    center = by_id(result["displacements"], "nodeId", "N2")
    left = by_id(result["reactions"], "nodeId", "N1")
    right = by_id(result["reactions"], "nodeId", "N3")
    max_abs_mz = max(
        abs(force[end]["mz"])
        for force in result["memberEndForces"]
        for end in ("i", "j")
    )
    rows = [
        cmp("leftReaction_fy_kN", Decimal(ref["leftReaction_fy_kN"]), left["fy"]),
        cmp("rightReaction_fy_kN", Decimal(ref["rightReaction_fy_kN"]), right["fy"]),
        cmp("Mmax_kNm", Decimal(ref["Mmax_kNm"]), max_abs_mz),
        cmp("centerDeflection_uy_m", Decimal(ref["centerDeflection_uy_m"]), center["uy"]),
    ]
    return {
        "caseId": case_id,
        "status": result.get("analysisSummary", {}).get("status"),
        "comparisons": rows,
        "developmentParity": "PASS" if all(r["verdict"] == "PASS" for r in rows) else "FAIL",
        "label": "UNVERIFIED_DEVELOPMENT_ONLY",
    }


def main() -> None:
    report = {
        "schemaVersion": "1.0.0",
        "baseUrl": BASE,
        "tolerance": {"A": format(A, "f"), "R": format(R, "f"), "status": "FROZEN_BEFORE_ENGINE_COMPARISON"},
        "numericDesignAuthorization": "NOT_GRANTED",
        "cases": [
            evaluate_case("GOLD-AN-001", project_udl()),
            evaluate_case("GOLD-AN-002", project_center_point()),
        ],
    }
    report["overallDevelopmentParity"] = (
        "PASS" if all(c["developmentParity"] == "PASS" for c in report["cases"]) else "FAIL"
    )
    out = ROOT / "analytical_comparison_report.json"
    out.write_text(json.dumps(report, indent=2) + "\n")
    md = [
        "# Analytical Development Comparison",
        "",
        "UNVERIFIED DEVELOPMENT RESULT — NOT FOR DESIGN OR CONSTRUCTION",
        "",
        f"Overall: **{report['overallDevelopmentParity']}**",
        f"Tolerance frozen: A={A}, R={R}",
        "",
    ]
    for c in report["cases"]:
        md.append(f"## {c['caseId']} — {c['developmentParity']}")
        md.append("")
        md.append("| quantity | expected | actual | absDiff | threshold | verdict |")
        md.append("|----------|----------|--------|---------|-----------|---------|")
        for r in c["comparisons"]:
            md.append(
                f"| {r['quantity']} | {r['expected']} | {r['actual']} | {r['absoluteDifference']} | {r['threshold']} | {r['verdict']} |"
            )
        md.append("")
    (ROOT / "analytical_comparison_report.md").write_text("\n".join(md) + "\n")
    print(json.dumps({"overall": report["overallDevelopmentParity"], "out": str(out)}))
    if report["overallDevelopmentParity"] != "PASS":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
