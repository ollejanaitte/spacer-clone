#!/usr/bin/env python3
"""Independent demand-only candidate checks for Step 1-D development.

UNVERIFIED DEVELOPMENT ONLY — NOT FOR DESIGN OR CONSTRUCTION.
No formal OK/NG against design standards. No production imports.
Decimal only.

Uses:
- GOLD-AN-001 demand (Mmax, Vmax=reaction, uy)
- GOLD-SP-001 section moduli / web area from development section reference
"""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 80
ROOT = Path(__file__).resolve().parent

# Demand from closed-form GOLD-AN-001 (independent analysis reference).
MMAX = Decimal("4.0")  # kN·m
VMAX = Decimal("4.0")  # kN (support reaction = wL/2)
UY = Decimal("-0.00032520325203252032520325203252032520325203252032520325203252032520325203252032520")

# Section from GOLD-SP-001 development reference (independent Decimal I-section).
S_TOP = Decimal("0.0482286272")  # m3
S_BOT = Decimal("0.0482286272")  # m3
A_WEB = Decimal("0.029280")  # m2


def dstr(v: Decimal) -> str:
    return format(v, "f")


def main() -> None:
    sigma_top = MMAX / S_TOP
    sigma_bot = MMAX / S_BOT
    tau_web = VMAX / A_WEB
    payload = {
        "schemaVersion": "1.0.0",
        "label": "UNVERIFIED_DEVELOPMENT_ONLY",
        "numericDesignAuthorization": "NOT_GRANTED",
        "designOrConstructionUse": "PROHIBITED",
        "checkStatus": "CANDIDATE",
        "verificationStatus": "UNVERIFIED",
        "reviewerAction": "USER REVIEW REQUIRED",
        "formalOkNg": "NOT_EMITTED",
        "precision": getcontext().prec,
        "method": "demand-only σ=M/S, τ=V/Aw, δ=uy; no code limits; Decimal; no production imports",
        "inputs": {
            "sourceDemand": "GOLD-AN-001 closed-form",
            "sourceSection": "GOLD-SP-001 development reference",
            "Mmax_kNm": dstr(MMAX),
            "Vmax_kN": dstr(VMAX),
            "sectionModulusTop_m3": dstr(S_TOP),
            "sectionModulusBottom_m3": dstr(S_BOT),
            "webArea_m2": dstr(A_WEB),
            "centerDeflection_uy_m": dstr(UY),
        },
        "candidates": {
            "bendingStressTop_kNpm2": dstr(sigma_top),
            "bendingStressBottom_kNpm2": dstr(sigma_bot),
            "shearStressWeb_kNpm2": dstr(tau_web),
            "deflection_uy_m": dstr(UY),
        },
        "notes": [
            "No allowable stress / resistance factor applied.",
            "No DEC-ID. No human Golden. Formal release NOT_GRANTED.",
        ],
    }
    out = ROOT / "demand_candidate_results.json"
    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    out.write_text(text, encoding="utf-8")
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    (ROOT / "SHA256SUMS.txt").write_text(
        f"{digest}  demand_candidate_results.json\n"
        f"{hashlib.sha256((ROOT / 'independent_demand_reference.py').read_bytes()).hexdigest()}  independent_demand_reference.py\n",
        encoding="utf-8",
    )
    print(json.dumps({"wrote": str(out), "sha256": digest}, indent=2))


if __name__ == "__main__":
    main()
