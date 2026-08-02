#!/usr/bin/env python3
"""Independent GOLD-DRW-001 layout reference. No production imports."""
from __future__ import annotations
import hashlib, json
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 80
ROOT = Path(__file__).resolve().parent

W = Decimal("12.0")
N = Decimal("4")
S = Decimal("3.0")
overhang = (W - (N - 1) * S) / Decimal(2)
first = -((N - 1) * S) / Decimal(2)
centers = [first + i * S for i in range(int(N))]
payload = {
    "caseId": "GOLD-DRW-001",
    "label": "UNVERIFIED_DEVELOPMENT_ONLY",
    "numericDesignAuthorization": "NOT_GRANTED",
    "inputs": {"width": str(W), "girderCount": str(N), "girderSpacing": str(S)},
    "results": {
        "overhang": format(overhang, "f"),
        "girderCentersX": [format(c, "f") for c in centers],
        "deckLeft": format(-W / 2, "f"),
        "deckRight": format(W / 2, "f"),
    },
}
text = json.dumps(payload, indent=2) + "\n"
(ROOT / "drawing_reference_results.json").write_text(text)
(ROOT / "SHA256SUMS.txt").write_text(
    hashlib.sha256(text.encode()).hexdigest() + "  drawing_reference_results.json\n"
)
print(text)
