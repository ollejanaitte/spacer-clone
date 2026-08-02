#!/usr/bin/env python3
"""Independent closed-form references for GOLD-AN-001 / GOLD-AN-002.

UNVERIFIED DEVELOPMENT ONLY — NOT FOR DESIGN OR CONSTRUCTION.
Does not import backend/engine. Decimal only.
"""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 80
ROOT = Path(__file__).resolve().parent

# Same numeric inputs as backend/tests/sample_models.py symbols (documented as development fixtures).
L = Decimal("4.0")  # m
E = Decimal("205000000")  # kN/m2
I = Decimal("0.0001")  # m4
P = Decimal("10.0")  # kN
W = Decimal("2.0")  # kN/m


def dstr(v: Decimal) -> str:
    return format(v, "f")


def gold_an_001_udl() -> dict[str, str]:
    # Simply supported + full-span UDL w (downward).
    # R = wL/2, Mmax = wL^2/8 at midspan, uy_mid = -5wL^4/(384EI)
    r = W * L / Decimal(2)
    mmax = W * L**2 / Decimal(8)
    uy = -(Decimal(5) * W * L**4) / (Decimal(384) * E * I)
    return {
        "caseId": "GOLD-AN-001",
        "title": "Simple span + UDL",
        "L_m": dstr(L),
        "w_kNpm": dstr(W),
        "E_kNpm2": dstr(E),
        "I_m4": dstr(I),
        "leftReaction_fy_kN": dstr(r),
        "rightReaction_fy_kN": dstr(r),
        "Mmax_kNm": dstr(mmax),
        "Mmax_position_m": dstr(L / Decimal(2)),
        "centerDeflection_uy_m": dstr(uy),
    }


def gold_an_002_point() -> dict[str, str]:
    # Simply supported + center point load P (downward).
    # R = P/2, Mmax = PL/4, uy_mid = -PL^3/(48EI)
    r = P / Decimal(2)
    mmax = P * L / Decimal(4)
    uy = -(P * L**3) / (Decimal(48) * E * I)
    return {
        "caseId": "GOLD-AN-002",
        "title": "Simple span + center point load",
        "L_m": dstr(L),
        "P_kN": dstr(P),
        "E_kNpm2": dstr(E),
        "I_m4": dstr(I),
        "leftReaction_fy_kN": dstr(r),
        "rightReaction_fy_kN": dstr(r),
        "Mmax_kNm": dstr(mmax),
        "Mmax_position_m": dstr(L / Decimal(2)),
        "centerDeflection_uy_m": dstr(uy),
    }


def main() -> None:
    payload = {
        "schemaVersion": "1.0.0",
        "label": "UNVERIFIED_DEVELOPMENT_ONLY",
        "numericDesignAuthorization": "NOT_GRANTED",
        "designOrConstructionUse": "PROHIBITED",
        "precision": getcontext().prec,
        "method": "closed-form Euler-Bernoulli simply-supported beam; Decimal; no engine import",
        "cases": {
            "GOLD-AN-001": gold_an_001_udl(),
            "GOLD-AN-002": gold_an_002_point(),
        },
    }
    out = ROOT / "analytical_reference_results.json"
    out.write_text(json.dumps(payload, indent=2) + "\n")
    digest = hashlib.sha256(out.read_bytes()).hexdigest()
    (ROOT / "SHA256SUMS.txt").write_text(
        f"{digest}  analytical_reference_results.json\n"
        f"{hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}  {Path(__file__).name}\n"
    )
    print(out, digest)


if __name__ == "__main__":
    main()
