#!/usr/bin/env python3
"""Independent development quantity reference (GOLD-QTY-001 / GOLD-QTY-002).

UNVERIFIED DEVELOPMENT ONLY — NOT FOR DESIGN OR CONSTRUCTION.
Does not import production Apollo/frontend/backend code. Decimal only.
"""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 80
ROOT = Path(__file__).resolve().parent

CASES = {
    "GOLD-QTY-001": {
        "title": "GOLD-SP-001 section, single-span sample geometry",
        "bridgeLength": Decimal("40.000"),
        "width": Decimal("10.500"),
        "girderCount": Decimal("4"),
        "girderSpacing": Decimal("3.000"),
        "deckThickness": Decimal("0.220"),
        "girderDepth": Decimal("2.500"),
        "topFlangeWidth": Decimal("0.500"),
        "topFlangeThickness": Decimal("0.030"),
        "bottomFlangeWidth": Decimal("0.500"),
        "bottomFlangeThickness": Decimal("0.030"),
        "webThickness": Decimal("0.012"),
        "crossBeamSpacing": Decimal("5.000"),
        "steelUnitWeight": Decimal("77.0"),
        "rcUnitWeight": Decimal("24.5"),
        "spanCount": Decimal("1"),
    },
    "GOLD-QTY-002": {
        "title": "Asymmetric section (GOLD-SP-002), multi-girder",
        "bridgeLength": Decimal("200.000"),
        "width": Decimal("12.000"),
        "girderCount": Decimal("5"),
        "girderSpacing": Decimal("2.500"),
        "deckThickness": Decimal("0.250"),
        "girderDepth": Decimal("2.500"),
        "topFlangeWidth": Decimal("0.500"),
        "topFlangeThickness": Decimal("0.020"),
        "bottomFlangeWidth": Decimal("0.600"),
        "bottomFlangeThickness": Decimal("0.025"),
        "webThickness": Decimal("0.012"),
        "crossBeamSpacing": Decimal("5.000"),
        "steelUnitWeight": None,
        "rcUnitWeight": None,
        "spanCount": Decimal("1"),
    },
}


def dstr(v: Decimal | None) -> str | None:
    if v is None:
        return None
    return format(v, "f")


def compute(case_id: str, inp: dict) -> dict:
    L = inp["bridgeLength"]
    B = inp["width"]
    n = inp["girderCount"]
    s = inp["girderSpacing"]
    td = inp["deckThickness"]
    H = inp["girderDepth"]
    btf = inp["topFlangeWidth"]
    ttf = inp["topFlangeThickness"]
    bbf = inp["bottomFlangeWidth"]
    tbf = inp["bottomFlangeThickness"]
    tw = inp["webThickness"]
    cs = inp["crossBeamSpacing"]

    web_h = H - ttf - tbf
    a_tf = btf * ttf
    a_bf = bbf * tbf
    a_w = tw * web_h
    a_tot = a_tf + a_bf + a_w

    v_tf_1 = a_tf * L
    v_bf_1 = a_bf * L
    v_w_1 = a_w * L
    v_1 = a_tot * L
    v_tf_all = v_tf_1 * n
    v_bf_all = v_bf_1 * n
    v_w_all = v_w_1 * n
    v_all = v_1 * n

    deck_area = B * L
    deck_vol = deck_area * td
    cross_beam_count = (L / cs).to_integral_value(rounding="ROUND_FLOOR") + 1
    overhang = (B - (n - 1) * s) / Decimal(2)

    # Paint estimate: exposed outer faces of I-girder (development geometric).
    # per girder length: outer TF top + BF bottom + 2*(web sides) + TF edges + BF edges
    # Contact with deck (TF top under deck) excluded from estimate → TF top not counted.
    paint_per_girder = (
        bbf  # bottom flange bottom face
        + Decimal(2) * web_h  # web sides
        + Decimal(2) * ttf  # top flange edges
        + Decimal(2) * tbf  # bottom flange edges
        + (btf - tw)  # top flange underside (both sides combined as (btf-tw))
        + (bbf - tw)  # bottom flange topside beside web
    ) * L
    paint_all = paint_per_girder * n

    steel_w = None
    rc_w = None
    if inp["steelUnitWeight"] is not None:
        steel_w = v_all * inp["steelUnitWeight"]
    if inp["rcUnitWeight"] is not None:
        rc_w = deck_vol * inp["rcUnitWeight"]

    return {
        "caseId": case_id,
        "title": inp["title"],
        "inputs": {k: dstr(v) if isinstance(v, Decimal) or v is None else v for k, v in inp.items() if k != "title"},
        "results": {
            "webHeight": dstr(web_h),
            "topFlangeArea": dstr(a_tf),
            "webArea": dstr(a_w),
            "bottomFlangeArea": dstr(a_bf),
            "totalSectionArea": dstr(a_tot),
            "topFlangeVolumePerGirder": dstr(v_tf_1),
            "webVolumePerGirder": dstr(v_w_1),
            "bottomFlangeVolumePerGirder": dstr(v_bf_1),
            "totalSteelVolumePerGirder": dstr(v_1),
            "topFlangeVolumeAllGirders": dstr(v_tf_all),
            "webVolumeAllGirders": dstr(v_w_all),
            "bottomFlangeVolumeAllGirders": dstr(v_bf_all),
            "totalMainGirderSteelVolume": dstr(v_all),
            "deckArea": dstr(deck_area),
            "deckVolume": dstr(deck_vol),
            "spanCount": dstr(inp["spanCount"]),
            "girderCount": dstr(n),
            "crossBeamCount": dstr(cross_beam_count),
            "overhang": dstr(overhang),
            "mainGirderSteelWeight": dstr(steel_w) if steel_w is not None else None,
            "rcDeckWeight": dstr(rc_w) if rc_w is not None else None,
            "paintAreaGeometricEstimate": dstr(paint_all),
            "pavementVolume": None,
        },
        "classification": {
            "exactGeometry": [
                "topFlangeArea",
                "webArea",
                "bottomFlangeArea",
                "totalMainGirderSteelVolume",
                "deckVolume",
                "girderCount",
                "crossBeamCount",
            ],
            "userProvidedUnverified": ["mainGirderSteelWeight", "rcDeckWeight"],
            "developmentGeometricSurfaceEstimate": ["paintAreaGeometricEstimate"],
            "incompleteInput": ["pavementVolume"],
            "approximateVisualizationAssumption": [],
        },
    }


def main() -> None:
    payload = {
        "schemaVersion": "1.0.0",
        "label": "UNVERIFIED_DEVELOPMENT_ONLY",
        "numericDesignAuthorization": "NOT_GRANTED",
        "designOrConstructionUse": "PROHIBITED",
        "precision": getcontext().prec,
        "tolerance": {"A": "1e-9", "R": "1e-12", "status": "FROZEN_BEFORE_APP_COMPARISON"},
        "method": "Decimal I-section + deck prism; no production imports",
        "cases": {cid: compute(cid, dict(inp)) for cid, inp in CASES.items()},
    }
    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    (ROOT / "quantity_reference_results.json").write_text(text, encoding="utf-8")
    (ROOT / "quantity_reference_inputs.json").write_text(
        json.dumps({cid: {k: dstr(v) if isinstance(v, Decimal) else v for k, v in inp.items()} for cid, inp in CASES.items()}, indent=2)
        + "\n",
        encoding="utf-8",
    )
    rows = ["caseId,quantityId,value,unit,status\n"]
    for cid, case in payload["cases"].items():
        for qid, val in case["results"].items():
            status = "EXACT_GEOMETRY_DEVELOPMENT"
            if qid in ("mainGirderSteelWeight", "rcDeckWeight"):
                status = "USER_PROVIDED_UNVERIFIED" if val is not None else "INCOMPLETE_INPUT"
            elif qid == "paintAreaGeometricEstimate":
                status = "DEVELOPMENT_GEOMETRIC_SURFACE_ESTIMATE"
            elif qid == "pavementVolume":
                status = "INCOMPLETE_INPUT"
            unit = "m3" if "Volume" in qid or qid.endswith("Volume") else "m2" if "Area" in qid or "paint" in qid else "kN" if "Weight" in qid else "m" if qid in ("webHeight", "overhang") else "count"
            rows.append(f"{cid},{qid},{val if val is not None else ''},{unit},{status}\n")
    (ROOT / "quantity_reference_working.csv").write_text("".join(rows), encoding="utf-8")
    (ROOT / "quantity_formula_trace.md").write_text(
        "\n".join(
            [
                "# Quantity Formula Trace (Development)",
                "",
                "UNVERIFIED DEVELOPMENT ONLY — NOT FOR DESIGN OR CONSTRUCTION",
                "",
                "- webHeight = girderDepth - topFlangeThickness - bottomFlangeThickness",
                "- topFlangeArea = topFlangeWidth * topFlangeThickness",
                "- bottomFlangeArea = bottomFlangeWidth * bottomFlangeThickness",
                "- webArea = webThickness * webHeight",
                "- volumePerGirder component = area * bridgeLength",
                "- totalMainGirderSteelVolume = totalSectionArea * bridgeLength * girderCount",
                "- deckVolume = width * bridgeLength * deckThickness",
                "- crossBeamCount = floor(bridgeLength / crossBeamSpacing) + 1",
                "- overhang = (width - (girderCount - 1) * girderSpacing) / 2",
                "- weight = volume * userUnitWeight (USER_PROVIDED_UNVERIFIED)",
                "- paintAreaGeometricEstimate: exposed I faces excl. deck contact top (development estimate)",
                "- pavementVolume: NOT_AVAILABLE without canonical pavement inputs",
                "",
            ]
        ),
        encoding="utf-8",
    )
    files = [
        "quantity_reference_calculator.py",
        "quantity_reference_inputs.json",
        "quantity_reference_results.json",
        "quantity_reference_working.csv",
        "quantity_formula_trace.md",
    ]
    lines = []
    for name in files:
        digest = hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
        lines.append(f"{digest}  {name}")
    (ROOT / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"wrote": str(ROOT / "quantity_reference_results.json")}, indent=2))


if __name__ == "__main__":
    main()
