#!/usr/bin/env python3
"""Independent development reference calculator for GOLD-SP-001 / GOLD-SP-002.

DEVELOPMENT USE ONLY — NOT FOR DESIGN OR CONSTRUCTION.
Does NOT import frontend/src/apollo, backend/engine, or production tests.
Uses decimal.Decimal only (no float intermediates).
"""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 80

ROOT = Path(__file__).resolve().parent
OUT_JSON = ROOT / "reference_results.json"
OUT_CSV = ROOT / "reference_working.csv"
OUT_TRACE = ROOT / "reference_formula_trace.md"
OUT_SUMS = ROOT / "SHA256SUMS.txt"

CASES = {
    "GOLD-SP-001": {
        "topFlangeWidth": Decimal("0.500"),
        "topFlangeThickness": Decimal("0.030"),
        "bottomFlangeWidth": Decimal("0.500"),
        "bottomFlangeThickness": Decimal("0.030"),
        "webThickness": Decimal("0.012"),
        "girderDepth": Decimal("2.500"),
        "bridgeLength": Decimal("40.000"),
    },
    "GOLD-SP-002": {
        "topFlangeWidth": Decimal("0.500"),
        "topFlangeThickness": Decimal("0.020"),
        "bottomFlangeWidth": Decimal("0.600"),
        "bottomFlangeThickness": Decimal("0.025"),
        "webThickness": Decimal("0.012"),
        "girderDepth": Decimal("2.500"),
        "bridgeLength": Decimal("200.000"),
    },
}


def dstr(value: Decimal) -> str:
    # Fixed decimal string without float conversion.
    return format(value, "f")


def compute(inputs: dict[str, Decimal]) -> dict[str, Decimal]:
    b_tf = inputs["topFlangeWidth"]
    t_tf = inputs["topFlangeThickness"]
    b_bf = inputs["bottomFlangeWidth"]
    t_bf = inputs["bottomFlangeThickness"]
    t_w = inputs["webThickness"]
    depth = inputs["girderDepth"]
    length = inputs["bridgeLength"]

    web_height = depth - t_tf - t_bf
    a_tf = b_tf * t_tf
    a_bf = b_bf * t_bf
    a_w = t_w * web_height
    total_area = a_tf + a_bf + a_w

    z_tf = depth - t_tf / Decimal(2)
    z_bf = t_bf / Decimal(2)
    z_w = t_bf + web_height / Decimal(2)
    first_moment_sum = a_tf * z_tf + a_bf * z_bf + a_w * z_w
    centroid = first_moment_sum / total_area

    i_tf_local = (b_tf * t_tf ** 3) / Decimal(12)
    i_tf_parallel = a_tf * (z_tf - centroid) ** 2
    i_tf = i_tf_local + i_tf_parallel

    i_bf_local = (b_bf * t_bf ** 3) / Decimal(12)
    i_bf_parallel = a_bf * (z_bf - centroid) ** 2
    i_bf = i_bf_local + i_bf_parallel

    i_w_local = (t_w * web_height ** 3) / Decimal(12)
    i_w_parallel = a_w * (z_w - centroid) ** 2
    i_w = i_w_local + i_w_parallel

    second_moment = i_tf + i_bf + i_w
    top_extreme = depth - centroid
    bottom_extreme = centroid
    s_top = second_moment / top_extreme
    s_bottom = second_moment / bottom_extreme
    unit_volume = total_area
    steel_volume = total_area * length

    return {
        "webHeight": web_height,
        "topFlangeArea": a_tf,
        "bottomFlangeArea": a_bf,
        "webArea": a_w,
        "totalArea": total_area,
        "topFlangeCentroidFromBottom": z_tf,
        "bottomFlangeCentroidFromBottom": z_bf,
        "webCentroidFromBottom": z_w,
        "firstMomentSum": first_moment_sum,
        "centroidFromBottom": centroid,
        "topFlangeLocalI": i_tf_local,
        "topFlangeParallelAxisI": i_tf_parallel,
        "I_tf": i_tf,
        "bottomFlangeLocalI": i_bf_local,
        "bottomFlangeParallelAxisI": i_bf_parallel,
        "I_bf": i_bf,
        "webLocalI": i_w_local,
        "webParallelAxisI": i_w_parallel,
        "I_w": i_w,
        "secondMomentOfArea": second_moment,
        "topExtremeDistance": top_extreme,
        "bottomExtremeDistance": bottom_extreme,
        "sectionModulusTop": s_top,
        "sectionModulusBottom": s_bottom,
        "unitLengthVolume": unit_volume,
        "steelVolumePerGirder": steel_volume,
    }


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def main() -> None:
    payload: dict = {
        "schemaVersion": "1.0.0",
        "label": "UNVERIFIED_DEVELOPMENT_ONLY",
        "designOrConstructionUse": "PROHIBITED",
        "numericDesignAuthorization": "NOT_GRANTED",
        "precision": getcontext().prec,
        "method": "decimal.Decimal I-section composition; no float; no production imports",
        "cases": {},
    }

    csv_lines = [
        "golden_id,quantity,value,unit",
    ]
    trace_lines = [
        "# Development Reference Formula Trace",
        "",
        "UNVERIFIED DEVELOPMENT RESULT — NOT FOR DESIGN OR CONSTRUCTION",
        "",
        f"Decimal precision: {getcontext().prec}",
        "",
    ]

    for case_id, inputs in CASES.items():
        results = compute(inputs)
        payload["cases"][case_id] = {
            "inputs": {k: dstr(v) for k, v in inputs.items()},
            "results": {k: dstr(v) for k, v in results.items()},
        }
        for k, v in inputs.items():
            csv_lines.append(f"{case_id},input.{k},{dstr(v)},m")
        units = {
            "webHeight": "m",
            "topFlangeArea": "m^2",
            "bottomFlangeArea": "m^2",
            "webArea": "m^2",
            "totalArea": "m^2",
            "topFlangeCentroidFromBottom": "m",
            "bottomFlangeCentroidFromBottom": "m",
            "webCentroidFromBottom": "m",
            "firstMomentSum": "m^3",
            "centroidFromBottom": "m",
            "topFlangeLocalI": "m^4",
            "topFlangeParallelAxisI": "m^4",
            "I_tf": "m^4",
            "bottomFlangeLocalI": "m^4",
            "bottomFlangeParallelAxisI": "m^4",
            "I_bf": "m^4",
            "webLocalI": "m^4",
            "webParallelAxisI": "m^4",
            "I_w": "m^4",
            "secondMomentOfArea": "m^4",
            "topExtremeDistance": "m",
            "bottomExtremeDistance": "m",
            "sectionModulusTop": "m^3",
            "sectionModulusBottom": "m^3",
            "unitLengthVolume": "m^3/m",
            "steelVolumePerGirder": "m^3",
        }
        for k, v in results.items():
            csv_lines.append(f"{case_id},{k},{dstr(v)},{units[k]}")

        trace_lines.extend(
            [
                f"## {case_id}",
                "",
                "### Inputs",
                "",
            ]
        )
        for k, v in inputs.items():
            trace_lines.append(f"- `{k}` = {dstr(v)} m")
        trace_lines.extend(
            [
                "",
                "### Steps",
                "",
                f"1. webHeight = girderDepth - t_tf - t_bf = {dstr(results['webHeight'])}",
                f"2. A_tf = b_tf * t_tf = {dstr(results['topFlangeArea'])}",
                f"3. A_bf = b_bf * t_bf = {dstr(results['bottomFlangeArea'])}",
                f"4. A_w = t_w * webHeight = {dstr(results['webArea'])}",
                f"5. A = ΣA = {dstr(results['totalArea'])}",
                f"6. ΣAz = {dstr(results['firstMomentSum'])}",
                f"7. z_bar = ΣAz / A = {dstr(results['centroidFromBottom'])}",
                f"8. I_tf = I_local + Ad^2 = {dstr(results['topFlangeLocalI'])} + {dstr(results['topFlangeParallelAxisI'])} = {dstr(results['I_tf'])}",
                f"9. I_bf = {dstr(results['bottomFlangeLocalI'])} + {dstr(results['bottomFlangeParallelAxisI'])} = {dstr(results['I_bf'])}",
                f"10. I_w = {dstr(results['webLocalI'])} + {dstr(results['webParallelAxisI'])} = {dstr(results['I_w'])}",
                f"11. I = ΣI = {dstr(results['secondMomentOfArea'])}",
                f"12. S_t = I / y_t = {dstr(results['sectionModulusTop'])}",
                f"13. S_b = I / y_b = {dstr(results['sectionModulusBottom'])}",
                f"14. unitLengthVolume = A = {dstr(results['unitLengthVolume'])}",
                f"15. steelVolumePerGirder = A * L = {dstr(results['steelVolumePerGirder'])}",
                "",
            ]
        )

    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    OUT_CSV.write_text("\n".join(csv_lines) + "\n", encoding="utf-8")
    OUT_TRACE.write_text("\n".join(trace_lines) + "\n", encoding="utf-8")

    # Checksums after writing outputs (script itself + outputs + canonical inputs).
    script_path = Path(__file__).resolve()
    input_blob = json.dumps(
        {k: {ik: dstr(iv) for ik, iv in v.items()} for k, v in CASES.items()},
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    input_sha = hashlib.sha256(input_blob).hexdigest()

    lines = [
        f"{sha256_file(script_path)}  {script_path.name}",
        f"{input_sha}  canonical_inputs.json",
        f"{sha256_file(OUT_JSON)}  {OUT_JSON.name}",
        f"{sha256_file(OUT_CSV)}  {OUT_CSV.name}",
        f"{sha256_file(OUT_TRACE)}  {OUT_TRACE.name}",
    ]
    OUT_SUMS.write_text("\n".join(lines) + "\n", encoding="utf-8")
    # Recompute sums file hash is intentionally excluded to avoid self-reference churn.
    print("Wrote:", OUT_JSON)
    print("Wrote:", OUT_CSV)
    print("Wrote:", OUT_TRACE)
    print("Wrote:", OUT_SUMS)
    print("canonical_inputs_sha256:", input_sha)


if __name__ == "__main__":
    main()
